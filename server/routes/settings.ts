import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Get all settings (public-safe fields)
router.get('/public', async (_req, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: ['schoolName', 'schoolLogo', 'currentAcademicYear', 'currentSemester', 'systemVersion'] },
      },
    })
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all settings (admin)
router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany()
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]))
    res.json(map)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Update settings
router.put('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const updates = z.record(z.string()).parse(req.body)
    await prisma.$transaction(
      Object.entries(updates).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    )
    res.json({ success: true })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin dashboard stats
router.get('/dashboard-stats', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const [totalStudents, totalTeachers, totalSections, totalSubjects] = await Promise.all([
      prisma.student.count({ where: { status: 'active' } }),
      prisma.teacher.count({ where: { status: 'active' } }),
      prisma.section.count({ where: { status: 'active' } }),
      prisma.subject.count({ where: { status: 'active' } }),
    ])
    res.json({ totalStudents, totalTeachers, totalSections, totalSubjects })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
