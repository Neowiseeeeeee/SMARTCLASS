import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function generateTempPassword() {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6).toUpperCase()
}

// Admin: list all teachers
router.get('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { search, status } = req.query
    const teachers = await prisma.teacher.findMany({
      where: {
        ...(search ? {
          OR: [
            { fullName: { contains: String(search), mode: 'insensitive' } },
            { email: { contains: String(search), mode: 'insensitive' } },
          ],
        } : {}),
        ...(status ? { status: String(status) } : {}),
      },
      include: {
        profile: true,
        subjectAssignments: { include: { subject: true, section: true, academicYear: true } },
        user: { select: { status: true, isFirstLogin: true, lastLogin: true } },
      },
      orderBy: { fullName: 'asc' },
    })
    res.json(teachers)
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

    const existing = await prisma.teacher.findUnique({ where: { email: data.email } })
    if (existing) return res.status(400).json({ error: 'Email already exists' })

    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const teacher = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, passwordHash, role: 'TEACHER', isFirstLogin: true },
      })
      const t = await tx.teacher.create({
        data: { userId: user.id, ...data },
      })
      await tx.teacherProfile.create({ data: { teacherId: t.id } })
      return t
    })

    res.json({ teacher, tempPassword })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get single teacher
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.params.id },
      include: {
        profile: true,
        subjectAssignments: { include: { subject: true, section: true, academicYear: true } },
        classSchedules: { include: { subject: true, section: true, academicYear: true } },
        user: { select: { status: true, isFirstLogin: true, lastLogin: true } },
      },
    })
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' })
    res.json(teacher)
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
    const teacher = await prisma.teacher.update({ where: { id: req.params.id }, data })
    res.json(teacher)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Archive teacher
router.patch('/:id/archive', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.update({ where: { id: req.params.id }, data: { status: 'archived' } })
    await prisma.user.update({ where: { id: teacher.userId }, data: { status: 'inactive' } })
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
    const assignment = await prisma.teacherSubjectAssignment.create({
      data: { teacherId: req.params.id, ...data },
      include: { subject: true, section: true, academicYear: true },
    })
    res.json(assignment)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Reset password
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.params.id } })
    if (!teacher) return res.status(404).json({ error: 'Not found' })
    const tempPassword = generateTempPassword()
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    await prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash, isFirstLogin: true } })
    res.json({ tempPassword })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
