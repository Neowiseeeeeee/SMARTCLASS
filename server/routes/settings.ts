import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, ensureDefaultSettings, resetDatabase, saveDb } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const logoDir = path.join(__dirname, '../../uploads/branding')
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true })

const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, logoDir),
    filename: (_req, file, cb) => cb(null, `school-logo${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    cb(null, allowed.includes(file.mimetype))
  },
})

const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

const PUBLIC_KEYS = [
  'schoolName', 'schoolLogo', 'schoolAddress', 'schoolTagline',
  'schoolContactNumber', 'schoolContactEmail', 'currentAcademicYear',
  'currentSemester', 'systemVersion', 'slideRotationInterval',
  'tabRotationInterval', 'weatherLatitude', 'weatherLongitude',
  'weatherLocation', 'kioskIdleTimeout', 'passingGrade', 'gradingPeriods',
  'currentGradingPeriod',
]

const INTEGER_RANGES: Record<string, [number, number]> = {
  passingGrade: [0, 100],
  gradingPeriods: [1, 4],
  slideRotationInterval: [1, 3600],
  tabRotationInterval: [1, 3600],
  kioskIdleTimeout: [1, 1440],
  maxLoginAttempts: [1, 100],
  lockoutDuration: [1, 1440],
  inactivityTimeout: [1, 1440],
  sessionCodeExpiry: [1, 1440],
}

function validateUpdates(updates: Record<string, string>) {
  for (const [key, value] of Object.entries(updates)) {
    if (value.length > 500) throw new Error(`${key} is too long`)
    const range = INTEGER_RANGES[key]
    if (range) {
      const n = Number(value)
      if (!Number.isInteger(n) || n < range[0] || n > range[1]) {
        throw new Error(`${key} must be a whole number from ${range[0]} to ${range[1]}`)
      }
    }
    if (key === 'currentGradingPeriod' && !['1st', '2nd', '3rd', '4th'].includes(value)) {
      throw new Error('Current grading period is invalid')
    }
    if (key === 'forceFirstLoginPasswordChange' && !['true', 'false'].includes(value)) {
      throw new Error('Force first-login password change must be true or false')
    }
  }
}

function applyUpdates(updates: Record<string, string>) {
  validateUpdates(updates)
  const now = new Date().toISOString()
  for (const [key, value] of Object.entries(updates)) {
    const existing = db.systemSettings.find(s => s.key === key)
    if (existing) { existing.value = value; existing.updatedAt = now }
    else db.systemSettings.push({ id: uuidv4(), key, value, updatedAt: now })
  }
}

router.get('/public', async (_req, res: Response) => {
  try {
    ensureDefaultSettings()
    const map: Record<string, string> = {}
    for (const s of db.systemSettings) if (PUBLIC_KEYS.includes(s.key)) map[s.key] = s.value
    res.json(map)
  } catch { res.status(500).json({ error: 'Server error' }) }
})

router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    ensureDefaultSettings()
    const map: Record<string, string> = {}
    for (const s of db.systemSettings) map[s.key] = s.value
    res.json(map)
  } catch { res.status(500).json({ error: 'Server error' }) }
})

router.put('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const updates = z.record(z.string(), z.string()).parse(req.body) as Record<string, string>
    applyUpdates(updates)
    res.json({ success: true })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(400).json({ error: err.message || 'Invalid settings' })
  }
})

router.post('/logo', requireAuth, requireRole('ADMIN'), logoUpload.single('logo'), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Please upload a PNG, JPG, GIF, WebP, or SVG logo.' })
  const logoUrl = `/uploads/branding/${req.file.filename}`
  applyUpdates({ schoolLogo: logoUrl })
  res.json({ schoolLogo: logoUrl })
})

router.delete('/logo', requireAuth, requireRole('ADMIN'), (_req, res: Response) => {
  const setting = db.systemSettings.find(s => s.key === 'schoolLogo')
  if (setting?.value) {
    const oldPath = path.join(__dirname, '../../', setting.value.replace(/^\//, ''))
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
  }
  applyUpdates({ schoolLogo: '' })
  res.json({ success: true })
})

router.get('/backup/export', requireAuth, requireRole('ADMIN'), (_req, res: Response) => {
  const payload = {
    format: 'smartclass-json-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: db,
  }
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="smartclass-backup-${new Date().toISOString().slice(0, 10)}.json"`)
  res.send(JSON.stringify(payload, null, 2))
})

router.post('/backup/import', requireAuth, requireRole('ADMIN'), backupUpload.single('backup'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Please choose a backup JSON file.' })
    const parsed = JSON.parse(req.file.buffer.toString('utf8'))
    const incoming = parsed?.format === 'smartclass-json-backup' ? parsed.data : parsed
    const keys = Object.keys(db)
    if (!incoming || keys.some(key => !Array.isArray(incoming[key]))) {
      return res.status(400).json({ error: 'This is not a valid SMARTCLASS backup.' })
    }
    const snapshot = JSON.stringify(db)
    try {
      for (const key of keys) (db as any)[key] = incoming[key]
      ensureDefaultSettings()
      saveDb()
    } catch (err) {
      const restored = JSON.parse(snapshot)
      for (const key of keys) (db as any)[key] = restored[key]
      throw err
    }
    res.json({ success: true, message: 'Backup restored successfully.' })
  } catch (err: any) {
    res.status(400).json({ error: err instanceof SyntaxError ? 'Backup file is not valid JSON.' : (err.message || 'Could not restore backup.') })
  }
})

router.post('/reset-demo', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  await resetDatabase()
  res.json({ success: true, message: 'Demo data has been restored.' })
})

router.put('/admin-account', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      username: z.string().trim().min(3).max(50).optional(),
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6).optional(),
    }).refine(d => d.username || d.newPassword, { message: 'Enter a username or a new password.' }).parse(req.body)
    const user = db.users.find(u => u.id === req.user!.userId)
    if (!user) return res.status(404).json({ error: 'Admin account not found.' })
    if (!await bcrypt.compare(data.currentPassword, user.passwordHash)) {
      return res.status(401).json({ error: 'Current password is incorrect.' })
    }
    if (data.username && db.users.some(u => u.id !== user.id && u.role === 'ADMIN' && u.username?.toLowerCase() === data.username!.toLowerCase())) {
      return res.status(409).json({ error: 'That username is already in use.' })
    }
    if (data.username) user.username = data.username
    if (data.newPassword) {
      user.passwordHash = await bcrypt.hash(data.newPassword, 12)
      user.isFirstLogin = false
    }
    res.json({ success: true, username: user.username })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/dashboard-stats', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    res.json({
      totalStudents: db.students.filter(s => s.status === 'active').length,
      totalTeachers: db.teachers.filter(t => t.status === 'active').length,
      totalSections: db.sections.filter(s => s.status === 'active').length,
      totalSubjects: db.subjects.filter(s => s.status === 'active').length,
    })
  } catch { res.status(500).json({ error: 'Server error' }) }
})

export default router