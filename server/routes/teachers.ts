import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, expandTeacher } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function generateTempPassword() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6).toUpperCase()
}

// Admin: list all teachers
router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query
    let teachers = db.teachers

    if (search) {
      const q = String(search).toLowerCase()
      teachers = teachers.filter(t =>
        t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      )
    }
    if (status) teachers = teachers.filter(t => t.status === String(status))

    const result = [...teachers]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(t => expandTeacher(t, { includeUser: true }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: create teacher
router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      fullName: z.string().min(1),
      email: z.string().email(),
      employeeId: z.string().optional(),
      department: z.string().optional(),
      contactNumber: z.string().optional(),
    }).parse(req.body)

    const existing = db.teachers.find(t => t.email === data.email)
    if (existing) return res.status(400).json({ error: 'Email already exists' })

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const now = new Date().toISOString()

    const userId = uuidv4()
    db.users.push({
      id: userId,
      email: data.email,
      passwordHash,
      role: 'TEACHER',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    })

    const teacherId = uuidv4()
    const teacher = { id: teacherId, userId, ...data, status: 'active', createdAt: now }
    db.teachers.push(teacher)
    db.teacherProfiles.push({ id: uuidv4(), teacherId, updatedAt: now })

    res.json({ teacher, tempPassword })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get single teacher
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const t = db.teachers.find(t => t.id === req.params.id)
    if (!t) return res.status(404).json({ error: 'Teacher not found' })
    res.json(expandTeacher(t, { includeUser: true }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update teacher
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      fullName: z.string().optional(),
      department: z.string().optional(),
      contactNumber: z.string().optional(),
      employeeId: z.string().optional(),
    }).parse(req.body)

    const idx = db.teachers.findIndex(t => t.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    db.teachers[idx] = { ...db.teachers[idx], ...data }
    res.json(db.teachers[idx])
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Archive teacher
router.patch('/:id/archive', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const t = db.teachers.find(t => t.id === req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    t.status = 'archived'
    const u = db.users.find(u => u.id === t.userId)
    if (u) u.status = 'inactive'
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Assign subject/section
router.post('/:id/assignments', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      subjectId: z.string(),
      sectionId: z.string(),
      academicYearId: z.string(),
    }).parse(req.body)

    const now = new Date().toISOString()
    const assignment = {
      id: uuidv4(),
      teacherId: req.params.id,
      ...data,
      createdAt: now,
    }
    db.teacherSubjectAssignments.push(assignment)

    res.json({
      ...assignment,
      subject: db.subjects.find(s => s.id === data.subjectId) || null,
      section: db.sections.find(s => s.id === data.sectionId) || null,
      academicYear: db.academicYears.find(y => y.id === data.academicYearId) || null,
    })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Reset password
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const t = db.teachers.find(t => t.id === req.params.id)
    if (!t) return res.status(404).json({ error: 'Not found' })
    const tempPassword = generateTempPassword()
    const u = db.users.find(u => u.id === t.userId)
    if (u) {
      u.passwordHash = await bcrypt.hash(tempPassword, 12)
      u.isFirstLogin = true
    }
    res.json({ tempPassword })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
