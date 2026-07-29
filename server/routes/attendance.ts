import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../prisma.js'
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

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } })
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })

    const session = await prisma.attendanceSession.create({
      data: {
        teacherId: teacher.id,
        subjectId: data.subjectId,
        sectionId: data.sectionId,
        attendanceDate: new Date(data.attendanceDate),
        sessionStatus: 'open',
      },
      include: { subject: true, section: true },
    })

    // Pre-generate attendance records for all students in section
    const assignments = await prisma.studentSectionAssignment.findMany({
      where: { sectionId: data.sectionId },
      include: { student: true },
    })

    await prisma.attendanceRecord.createMany({
      data: assignments.map((a) => ({
        studentId: a.studentId,
        sessionId: session.id,
        status: 'absent',
        verificationStatus: 'pending',
      })),
      skipDuplicates: true,
    })

    res.json(session)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: list own sessions
router.get('/sessions', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } })
    if (!teacher) return res.status(404).json({ error: 'Not found' })

    const sessions = await prisma.attendanceSession.findMany({
      where: { teacherId: teacher.id },
      include: {
        subject: true,
        section: true,
        attendanceRecords: { include: { student: true } },
      },
      orderBy: { attendanceDate: 'desc' },
    })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get session + records
router.get('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = await prisma.attendanceSession.findUnique({
      where: { id: req.params.id },
      include: {
        subject: true,
        section: true,
        teacher: true,
        attendanceRecords: { include: { student: { include: { profile: true } } } },
      },
    })
    if (!session) return res.status(404).json({ error: 'Session not found' })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: update attendance record
router.patch('/records/:id', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { status } = z.object({ status: z.enum(['present', 'absent', 'late', 'excused']) }).parse(req.body)
    const record = await prisma.attendanceRecord.update({
      where: { id: req.params.id },
      data: { status, verificationStatus: 'verified', timeRecorded: new Date() },
    })
    res.json(record)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: generate session code for student-assisted attendance
router.post('/sessions/:id/generate-code', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const { password, expiryMinutes = 30 } = z.object({
      password: z.string(),
      expiryMinutes: z.number().default(30),
    }).parse(req.body)

    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user!.userId },
      include: { user: true },
    })
    if (!teacher) return res.status(404).json({ error: 'Not found' })

    const valid = await bcrypt.compare(password, teacher.user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid password' })

    let code = generateSessionCode()
    // Ensure unique code
    while (await prisma.attendanceSession.findUnique({ where: { sessionCode: code } })) {
      code = generateSessionCode()
    }

    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000)
    const session = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { sessionCode: code, sessionExpiry: expiry },
    })
    res.json({ sessionCode: session.sessionCode, expiresAt: session.sessionExpiry })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: close session
router.patch('/sessions/:id/close', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const session = await prisma.attendanceSession.update({
      where: { id: req.params.id },
      data: { sessionStatus: 'closed' },
    })
    res.json(session)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Public: verify session code and get sheet
router.get('/public/:code', async (req: Request, res: Response) => {
  try {
    const session = await prisma.attendanceSession.findUnique({
      where: { sessionCode: req.params.code },
      include: {
        subject: true,
        section: true,
        attendanceRecords: { include: { student: true } },
      },
    })
    if (!session) return res.status(404).json({ error: 'Invalid session code' })
    if (session.sessionStatus === 'closed') return res.status(400).json({ error: 'Session is closed' })
    if (session.sessionExpiry && session.sessionExpiry < new Date()) {
      return res.status(400).json({ error: 'Session code has expired' })
    }
    res.json(session)
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

    const session = await prisma.attendanceSession.findUnique({ where: { sessionCode } })
    if (!session) return res.status(404).json({ error: 'Invalid session code' })
    if (session.sessionStatus === 'closed') return res.status(400).json({ error: 'Session is closed' })
    if (session.sessionExpiry && session.sessionExpiry < new Date()) {
      return res.status(400).json({ error: 'Session has expired' })
    }

    const student = await prisma.student.findUnique({
      where: { studentNumber },
      include: { user: true },
    })
    if (!student) return res.status(401).json({ error: 'Student not found' })

    // Verify student belongs to this section
    const assignment = await prisma.studentSectionAssignment.findFirst({
      where: { studentId: student.id, sectionId: session.sectionId },
    })
    if (!assignment) return res.status(403).json({ error: 'Student not in this section' })

    const valid = await bcrypt.compare(password, student.user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    const existing = await prisma.attendanceRecord.findUnique({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
    })
    if (existing && existing.status === 'present') {
      return res.status(400).json({ error: 'Attendance already recorded' })
    }

    const record = await prisma.attendanceRecord.upsert({
      where: { studentId_sessionId: { studentId: student.id, sessionId: session.id } },
      update: { status: 'present', verificationStatus: 'verified', timeRecorded: new Date() },
      create: {
        studentId: student.id,
        sessionId: session.id,
        status: 'present',
        verificationStatus: 'verified',
      },
    })
    res.json({ success: true, record })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: get all sessions
router.get('/admin/sessions', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.attendanceSession.findMany({
      include: {
        subject: true,
        section: true,
        teacher: true,
        attendanceRecords: true,
      },
      orderBy: { attendanceDate: 'desc' },
      take: 100,
    })
    res.json(sessions)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
