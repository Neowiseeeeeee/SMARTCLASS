import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

const PUBLIC_KEYS = ['schoolName', 'schoolLogo', 'currentAcademicYear', 'currentSemester', 'systemVersion']

router.get('/public', async (_req, res: Response) => {
  try {
    const map: Record<string, string> = {}
    for (const s of db.systemSettings) {
      if (PUBLIC_KEYS.includes(s.key)) map[s.key] = s.value
    }
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const map: Record<string, string> = {}
    for (const s of db.systemSettings) map[s.key] = s.value
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const updates = z.record(z.string(), z.string()).parse(req.body) as Record<string, string>
    const now = new Date().toISOString()
    for (const [key, value] of Object.entries(updates)) {
      const existing = db.systemSettings.find(s => s.key === key)
      if (existing) {
        existing.value = value
        existing.updatedAt = now
      } else {
        db.systemSettings.push({ id: uuidv4(), key, value, updatedAt: now })
      }
    }
    res.json({ success: true })
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
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
