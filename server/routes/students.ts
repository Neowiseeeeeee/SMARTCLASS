import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../prisma.js'
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
    const students = await prisma.student.findMany({
      where: {
        ...(search ? {
          OR: [
            { fullName: { contains: String(search), mode: 'insensitive' } },
            { studentNumber: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
          ],
        } : {}),
        ...(status ? { status: String(status) } : {}),
        ...(sectionId ? {
          sectionAssignments: { some: { sectionId: String(sectionId) } },
        } : {}),
      },
      include: {
        profile: true,
        sectionAssignments: {
          include: { section: { include: { gradeLevel: true, strand: true } }, academicYear: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: { select: { status: true, isFirstLogin: true, lastLogin: true } },
      },
      orderBy: { fullName: 'asc' },
    })
    res.json(students)
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

    const existing = await prisma.student.findFirst({
      where: { OR: [{ studentNumber: data.studentNumber }, { email: data.email }] },
    })
    if (existing) return res.status(400).json({ error: 'Student number or email already exists' })

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const studentCode = generateStudentCode()

    const student = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, role: 'STUDENT', isFirstLogin: true },
      })
      const s = await tx.student.create({
        data: {
          userId: user.id,
          studentNumber: data.studentNumber,
          studentCode,
          fullName: data.fullName,
          email: data.email,
          gender: data.gender,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          contactNumber: data.contactNumber,
        },
      })
      await tx.studentProfile.create({
        data: {
          studentId: s.id,
          guardianName: data.guardianName,
          guardianContact: data.guardianContact,
        },
      })
      if (data.sectionId && data.academicYearId && data.gradeLevelId) {
        await tx.studentSectionAssignment.create({
          data: {
            studentId: s.id,
            sectionId: data.sectionId,
            academicYearId: data.academicYearId,
            gradeLevelId: data.gradeLevelId,
          },
        })
      }
      return s
    })

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
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        profile: true,
        heightWeightRecords: { orderBy: { recordedAt: 'desc' } },
        sectionAssignments: {
          include: { section: { include: { gradeLevel: true, strand: true } }, academicYear: true },
        },
        user: { select: { status: true, isFirstLogin: true, lastLogin: true, email: true } },
      },
    })
    if (!student) return res.status(404).json({ error: 'Student not found' })
    res.json(student)
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

    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      },
    })
    res.json(student)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Archive student
router.patch('/:id/archive', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: { status: 'archived' },
    })
    await prisma.user.update({ where: { id: student.userId }, data: { status: 'inactive' } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Reset password
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } })
    if (!student) return res.status(404).json({ error: 'Not found' })
    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    await prisma.user.update({ where: { id: student.userId }, data: { passwordHash, isFirstLogin: true } })
    res.json({ tempPassword })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Student: get own attendance
router.get('/:id/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId: req.params.id },
      include: { session: { include: { subject: true, section: true } } },
      orderBy: { timeRecorded: 'desc' },
    })
    res.json(records)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Student: get own scores
router.get('/:id/scores', requireAuth, async (req: Request, res: Response) => {
  try {
    const scores = await prisma.studentScore.findMany({
      where: { studentId: req.params.id },
      include: { activity: { include: { subject: true, section: true } } },
      orderBy: { dateRecorded: 'desc' },
    })
    res.json(scores)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
