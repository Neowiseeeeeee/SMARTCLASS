import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../prisma.js'
import { signToken, requireAuth } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password, role } = loginSchema.parse(req.body)

    let user = null

    if (role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { studentNumber: identifier },
        include: { user: true },
      })
      user = student?.user
    } else if (role === 'TEACHER') {
      user = await prisma.user.findFirst({
        where: { email: identifier, role: 'TEACHER' },
      })
    } else if (role === 'ADMIN') {
      user = await prisma.user.findFirst({
        where: { username: identifier, role: 'ADMIN' },
      })
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.status !== 'active') return res.status(401).json({ error: 'Account is inactive' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // Get display name
    let name = 'User'
    if (role === 'STUDENT') {
      const s = await prisma.student.findUnique({ where: { userId: user.id } })
      name = s?.fullName || 'Student'
    } else if (role === 'TEACHER') {
      const t = await prisma.teacher.findUnique({ where: { userId: user.id } })
      name = t?.fullName || 'Teacher'
    } else {
      const a = await prisma.admin.findUnique({ where: { userId: user.id } })
      name = a?.fullName || 'Administrator'
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })

    const token = signToken({ userId: user.id, role: user.role as any, name })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    })

    res.json({ user: { id: user.id, role: user.role, name, isFirstLogin: user.isFirstLogin } })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/logout', (_req, res: Response) => {
  res.clearCookie('token')
  res.json({ success: true })
})

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    let profile: any = null
    if (user.role === 'STUDENT') {
      profile = await prisma.student.findUnique({
        where: { userId: user.id },
        include: {
          profile: true,
          sectionAssignments: {
            include: { section: { include: { gradeLevel: true, strand: true } }, academicYear: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })
    } else if (user.role === 'TEACHER') {
      profile = await prisma.teacher.findUnique({
        where: { userId: user.id },
        include: {
          profile: true,
          subjectAssignments: { include: { subject: true, section: true, academicYear: true } },
        },
      })
    } else {
      profile = await prisma.admin.findUnique({ where: { userId: user.id } })
    }

    res.json({ id: user.id, role: user.role, isFirstLogin: user.isFirstLogin, profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6),
    }).parse(req.body)

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hash, isFirstLogin: false },
    })

    res.json({ success: true })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
