import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Academic Years
router.get('/academic-years', requireAuth, async (_req, res: Response) => {
  try {
    const years = await prisma.academicYear.findMany({ orderBy: { name: 'desc' } })
    res.json(years)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/academic-years', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      name: z.string(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isCurrent: z.boolean().optional(),
    }).parse(req.body)

    if (data.isCurrent) {
      await prisma.academicYear.updateMany({ data: { isCurrent: false } })
    }

    const year = await prisma.academicYear.create({
      data: { ...data, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined },
    })
    res.json(year)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Grade Levels
router.get('/grade-levels', requireAuth, async (_req, res: Response) => {
  try {
    const levels = await prisma.gradeLevel.findMany({
      orderBy: { order: 'asc' },
      include: { strands: true, sections: { include: { strand: true } } },
    })
    res.json(levels)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/grade-levels', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({ name: z.string(), order: z.number() }).parse(req.body)
    const level = await prisma.gradeLevel.create({ data })
    res.json(level)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Strands
router.post('/strands', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({ name: z.string(), gradeLevelId: z.string() }).parse(req.body)
    const strand = await prisma.strand.create({ data })
    res.json(strand)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Sections
router.get('/sections', requireAuth, async (_req, res: Response) => {
  try {
    const sections = await prisma.section.findMany({
      include: { gradeLevel: true, strand: true },
      orderBy: { name: 'asc' },
    })
    res.json(sections)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/sections', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      name: z.string(),
      gradeLevelId: z.string(),
      strandId: z.string().optional(),
    }).parse(req.body)
    const section = await prisma.section.create({ data, include: { gradeLevel: true, strand: true } })
    res.json(section)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Subjects
router.get('/subjects', requireAuth, async (_req, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
    res.json(subjects)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/subjects', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      name: z.string(),
      code: z.string(),
      description: z.string().optional(),
    }).parse(req.body)
    const subject = await prisma.subject.create({ data })
    res.json(subject)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Schedules
router.get('/schedules', requireAuth, async (req: Request, res: Response) => {
  try {
    const { teacherId, sectionId, academicYearId } = req.query
    const schedules = await prisma.classSchedule.findMany({
      where: {
        ...(teacherId ? { teacherId: String(teacherId) } : {}),
        ...(sectionId ? { sectionId: String(sectionId) } : {}),
        ...(academicYearId ? { academicYearId: String(academicYearId) } : {}),
      },
      include: { subject: true, teacher: true, section: true, academicYear: true },
      orderBy: { uploadedAt: 'desc' },
    })
    res.json(schedules)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/schedules', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      subjectId: z.string(),
      teacherId: z.string(),
      sectionId: z.string(),
      academicYearId: z.string(),
      dayOfWeek: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      description: z.string().optional(),
    }).parse(req.body)

    const schedule = await prisma.classSchedule.create({
      data,
      include: { subject: true, teacher: true, section: true, academicYear: true },
    })
    res.json(schedule)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
