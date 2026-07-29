import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Teacher: create activity
router.post('/activities', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      subjectId: z.string(),
      sectionId: z.string(),
      academicYearId: z.string(),
      category: z.string(),
      totalScore: z.number(),
      activityDate: z.string().optional(),
    }).parse(req.body)

    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } })
    if (!teacher && req.user!.role !== 'ADMIN') return res.status(404).json({ error: 'Teacher not found' })

    const activity = await prisma.academicActivity.create({
      data: {
        ...data,
        teacherId: teacher?.id || '',
        activityDate: data.activityDate ? new Date(data.activityDate) : new Date(),
      },
      include: { subject: true, section: true },
    })
    res.json(activity)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: list own activities
router.get('/activities', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.userId } })
    const activities = await prisma.academicActivity.findMany({
      where: teacher ? { teacherId: teacher.id } : {},
      include: {
        subject: true,
        section: true,
        studentScores: { include: { student: true } },
      },
      orderBy: { activityDate: 'desc' },
    })
    res.json(activities)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Record/update student scores for an activity
router.post('/activities/:id/scores', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const scores = z.array(z.object({
      studentId: z.string(),
      scoreObtained: z.number(),
    })).parse(req.body)

    const activity = await prisma.academicActivity.findUnique({ where: { id: req.params.id } })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const results = await prisma.$transaction(
      scores.map((s) =>
        prisma.studentScore.upsert({
          where: { studentId_activityId: { studentId: s.studentId, activityId: req.params.id } },
          update: { scoreObtained: s.scoreObtained, totalScore: activity.totalScore },
          create: {
            studentId: s.studentId,
            activityId: req.params.id,
            scoreObtained: s.scoreObtained,
            totalScore: activity.totalScore,
          },
        })
      )
    )
    res.json(results)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Student: submit own score
router.post('/scores', requireAuth, requireRole('STUDENT'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      activityId: z.string(),
      scoreObtained: z.number(),
    }).parse(req.body)

    const student = await prisma.student.findUnique({ where: { userId: req.user!.userId } })
    if (!student) return res.status(404).json({ error: 'Not found' })

    const activity = await prisma.academicActivity.findUnique({ where: { id: data.activityId } })
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const score = await prisma.studentScore.upsert({
      where: { studentId_activityId: { studentId: student.id, activityId: data.activityId } },
      update: { scoreObtained: data.scoreObtained, totalScore: activity.totalScore },
      create: {
        studentId: student.id,
        activityId: data.activityId,
        scoreObtained: data.scoreObtained,
        totalScore: activity.totalScore,
      },
    })
    res.json(score)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: all activities
router.get('/admin/activities', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const activities = await prisma.academicActivity.findMany({
      include: { subject: true, section: true, teacher: true, studentScores: true },
      orderBy: { activityDate: 'desc' },
    })
    res.json(activities)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
