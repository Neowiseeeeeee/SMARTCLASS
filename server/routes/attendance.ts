import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, expandAttendanceSession } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function generateSessionCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Teacher: create attendance session
router.post('/sessions', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      subjectId: z.string(),
      sectionId: z.string(),
      attendanceDate: z.string(),
    }).parse(req.body)

    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

    const now = new Date().toISOString()
    const session: (typeof db.attendanceSessions)[0] = {
      id: uuidv4(),
      teacherId: teacher.id,
      subjectId: data.subjectId,
      sectionId: data.sectionId,
      attendanceDate: new Date(data.attendanceDate).toISOString(),
      sessionStatus: 'open',
      createdAt: now,
      updatedAt: now,
    }
    db.attendanceSessions.push(session)

    // Pre-generate attendance records for all students in section
    const studentIds = db.studentSectionAssignments
      .filter(a => a.sectionId === data.sectionId)
      .map(a => a.studentId)

    for (const studentId of studentIds) {
      const existing = db.attendanceRecords.find(
        r => r.studentId === studentId && r.sessionId === session.id
      )
      if (!existing) {
        db.attendanceRecords.push({
          id: uuidv4(),
          studentId,
          sessionId: session.id,
          status: 'absent',
          timeRecorded: now,
          verificationStatus: 'pending',
        })
      }
    }

    res.json(expandAttendanceSession(session, { includeRecords: true }))
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: list own sessions
router.get('/sessions', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    if (!teacher) return res.status(404).json({ error: 'Not found' })

    const sessions = db.attendanceSessions
      .filter(s => s.teacherId === teacher.id)
      .sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime())
      .map(s => expandAttendanceSession(s, { includeRecords: true }))

    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get session + records
router.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = db.attendanceSessions.find(s => s.id === req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(expandAttendanceSession(session, { includeRecords: true }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update attendance record
router.patch('/records/:id', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status } = z.object({ status: z.enum(['present', 'absent', 'late', 'excused']) }).parse(req.body)
    const record = db.attendanceRecords.find(r => r.id === req.params.id)
    if (!record) return res.status(404).json({ error: 'Not found' })
    record.status = status
    record.verificationStatus = 'verified'
    record.timeRecorded = new Date().toISOString()
    res.json(record)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: generate session code
router.post('/sessions/:id/generate-code', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const { password, expiryMinutes = 30 } = z.object({
      password: z.string(),
      expiryMinutes: z.number().default(30),
    }).parse(req.body)

    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    if (!teacher) return res.status(404).json({ error: 'Not found' })

    const user = db.users.find(u => u.id === teacher.userId)
    if (!user) return res.status(404).json({ error: 'Not found' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid password' })

    let code = generateSessionCode()
    while (db.attendanceSessions.some(s => s.sessionCode === code)) {
      code = generateSessionCode()
    }

    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()
    const session = db.attendanceSessions.find(s => s.id === req.params.id)
    if (!session) return res.status(404).json({ error: 'Session not found' })

    session.sessionCode = code
    session.sessionExpiry = expiry
    session.updatedAt = new Date().toISOString()

    res.json({ sessionCode: session.sessionCode, expiresAt: session.sessionExpiry })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: close session
router.patch('/sessions/:id/close', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const session = db.attendanceSessions.find(s => s.id === req.params.id)
    if (!session) return res.status(404).json({ error: 'Not found' })
    session.sessionStatus = 'closed'
    session.updatedAt = new Date().toISOString()
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Public: verify session code
router.get('/public/:code', async (req: Request, res: Response) => {
  try {
    const session = db.attendanceSessions.find(s => s.sessionCode === req.params.code)
    if (!session) return res.status(404).json({ error: 'Invalid session code' })
    if (session.sessionStatus === 'closed') return res.status(400).json({ error: 'Session is closed' })
    if (session.sessionExpiry && new Date(session.sessionExpiry) < new Date()) {
      return res.status(400).json({ error: 'Session code has expired' })
    }
    res.json(expandAttendanceSession(session, { includeRecords: true }))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Student self-attendance via session code
router.post('/public/submit', async (req: Request, res: Response) => {
  try {
    const { sessionCode, studentNumber, password } = z.object({
      sessionCode: z.string(),
      studentNumber: z.string(),
      password: z.string(),
    }).parse(req.body)

    const session = db.attendanceSessions.find(s => s.sessionCode === sessionCode)
    if (!session) return res.status(404).json({ error: 'Invalid session code' })
    if (session.sessionStatus === 'closed') return res.status(400).json({ error: 'Session is closed' })
    if (session.sessionExpiry && new Date(session.sessionExpiry) < new Date()) {
      return res.status(400).json({ error: 'Session has expired' })
    }

    const student = db.students.find(s => s.studentNumber === studentNumber)
    if (!student) return res.status(401).json({ error: 'Student not found' })

    const assignment = db.studentSectionAssignments.find(
      a => a.studentId === student.id && a.sectionId === session.sectionId
    )
    if (!assignment) return res.status(403).json({ error: 'Student not in this section' })

    const user = db.users.find(u => u.id === student.userId)
    if (!user) return res.status(401).json({ error: 'User not found' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const existing = db.attendanceRecords.find(
      r => r.studentId === student.id && r.sessionId === session.id
    )
    if (existing?.status === 'present') {
      return res.status(400).json({ error: 'Attendance already recorded' })
    }

    const now = new Date().toISOString()
    let record
    if (existing) {
      existing.status = 'present'
      existing.verificationStatus = 'verified'
      existing.timeRecorded = now
      record = existing
    } else {
      record = { id: uuidv4(), studentId: student.id, sessionId: session.id, status: 'present', verificationStatus: 'verified', timeRecorded: now }
      db.attendanceRecords.push(record)
    }

    res.json({ success: true, record })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: get all sessions
router.get('/admin/sessions', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const sessions = db.attendanceSessions
      .sort((a, b) => new Date(b.attendanceDate).getTime() - new Date(a.attendanceDate).getTime())
      .slice(0, 100)
      .map(s => expandAttendanceSession(s, { includeRecords: true }))
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
