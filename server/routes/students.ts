import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, expandStudent } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function generateStudentCode() {
  return 'SC-' + Math.random().toString(36).substring(2, 8).toUpperCase()
}

function generateTempPassword() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6).toUpperCase()
}

// Admin: list students
router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { search, status, sectionId } = req.query
    let students = db.students

    if (search) {
      const q = String(search).toLowerCase()
      students = students.filter(s =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentNumber.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
      )
    }
    if (status) students = students.filter(s => s.status === String(status))
    if (sectionId) {
      const ids = new Set(
        db.studentSectionAssignments
          .filter(a => a.sectionId === String(sectionId))
          .map(a => a.studentId)
      )
      students = students.filter(s => ids.has(s.id))
    }

    const result = [...students]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(s => expandStudent(s, { includeUser: true }))

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: create student
router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      studentNumber: z.string().min(1),
      fullName: z.string().min(1),
      email: z.string().email(),
      gender: z.string().optional(),
      birthDate: z.string().optional(),
      contactNumber: z.string().optional(),
      guardianName: z.string().optional(),
      guardianContact: z.string().optional(),
      gradeLevelId: z.string().optional(),
      strandId: z.string().optional(),
      sectionId: z.string().optional(),
      academicYearId: z.string().optional(),
    }).parse(req.body)

    const existing = db.students.find(s => s.studentNumber === data.studentNumber || s.email === data.email)
    if (existing) return res.status(400).json({ error: 'Student number or email already exists' })

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const now = new Date().toISOString()

    const userId = uuidv4()
    db.users.push({
      id: userId,
      email: data.email,
      passwordHash,
      role: 'STUDENT',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    })

    const studentId = uuidv4()
    const student = {
      id: studentId,
      userId,
      studentNumber: data.studentNumber,
      studentCode: generateStudentCode(),
      fullName: data.fullName,
      email: data.email,
      gender: data.gender,
      birthDate: data.birthDate,
      contactNumber: data.contactNumber,
      status: 'active',
      createdAt: now,
    }
    db.students.push(student)
    db.studentProfiles.push({
      id: uuidv4(),
      studentId,
      guardianName: data.guardianName,
      guardianContact: data.guardianContact,
      updatedAt: now,
    })

    if (data.sectionId && data.academicYearId && data.gradeLevelId) {
      db.studentSectionAssignments.push({
        id: uuidv4(),
        studentId,
        sectionId: data.sectionId,
        academicYearId: data.academicYearId,
        gradeLevelId: data.gradeLevelId,
        createdAt: now,
      })
    }

    res.json({ student, tempPassword })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get single student
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const s = db.students.find(s => s.id === req.params.id)
    if (!s) return res.status(404).json({ error: 'Student not found' })
    res.json(expandStudent(s, { includeUser: true }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update student
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      fullName: z.string().optional(),
      contactNumber: z.string().optional(),
      gender: z.string().optional(),
      birthDate: z.string().optional(),
    }).parse(req.body)

    const idx = db.students.findIndex(s => s.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    db.students[idx] = { ...db.students[idx], ...data }
    res.json(db.students[idx])
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Archive student
router.patch('/:id/archive', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const s = db.students.find(s => s.id === req.params.id)
    if (!s) return res.status(404).json({ error: 'Not found' })
    s.status = 'archived'
    const u = db.users.find(u => u.id === s.userId)
    if (u) u.status = 'inactive'
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Reset password
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const s = db.students.find(s => s.id === req.params.id)
    if (!s) return res.status(404).json({ error: 'Not found' })
    const tempPassword = generateTempPassword()
    const u = db.users.find(u => u.id === s.userId)
    if (u) {
      u.passwordHash = await bcrypt.hash(tempPassword, 12)
      u.isFirstLogin = true
    }
    res.json({ tempPassword })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Student: get own attendance
router.get('/:id/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const records = db.attendanceRecords
      .filter(r => r.studentId === req.params.id)
      .map(r => ({
        ...r,
        session: (() => {
          const sess = db.attendanceSessions.find(s => s.id === r.sessionId)
          if (!sess) return null
          return {
            ...sess,
            subject: db.subjects.find(s => s.id === sess.subjectId) || null,
            section: db.sections.find(s => s.id === sess.sectionId) || null,
          }
        })(),
      }))
      .sort((a, b) => new Date(b.timeRecorded).getTime() - new Date(a.timeRecorded).getTime())
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Student: get own scores
router.get('/:id/scores', requireAuth, async (req: Request, res: Response) => {
  try {
    const scores = db.studentScores
      .filter(s => s.studentId === req.params.id)
      .map(s => ({
        ...s,
        activity: (() => {
          const act = db.academicActivities.find(a => a.id === s.activityId)
          if (!act) return null
          return {
            ...act,
            subject: db.subjects.find(sub => sub.id === act.subjectId) || null,
            section: db.sections.find(sec => sec.id === act.sectionId) || null,
          }
        })(),
      }))
      .sort((a, b) => new Date(b.dateRecorded).getTime() - new Date(a.dateRecorded).getTime())
    res.json(scores)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
