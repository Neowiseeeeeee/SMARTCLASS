import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db, expandSection } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Academic Years
router.get('/academic-years', requireAuth, async (_req, res: Response) => {
  try {
    res.json([...db.academicYears].sort((a, b) => b.name.localeCompare(a.name)))
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
      db.academicYears.forEach(y => { y.isCurrent = false })
    }

    const now = new Date().toISOString()
    const year = {
      id: uuidv4(),
      ...data,
      isCurrent: data.isCurrent || false,
      status: 'active',
      createdAt: now,
    }
    db.academicYears.push(year)
    res.json(year)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Grade Levels
router.get('/grade-levels', requireAuth, async (_req, res: Response) => {
  try {
    const levels = [...db.gradeLevels]
      .sort((a, b) => a.order - b.order)
      .map(g => ({
        ...g,
        strands: db.strands.filter(s => s.gradeLevelId === g.id),
        sections: db.sections
          .filter(s => s.gradeLevelId === g.id)
          .map(s => ({ ...s, strand: s.strandId ? db.strands.find(st => st.id === s.strandId) || null : null })),
      }))
    res.json(levels)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/grade-levels', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({ name: z.string(), order: z.number() }).parse(req.body)
    const level = { id: uuidv4(), ...data }
    db.gradeLevels.push(level)
    res.json(level)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Strands
router.post('/strands', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({ name: z.string(), gradeLevelId: z.string() }).parse(req.body)
    const strand = { id: uuidv4(), ...data }
    db.strands.push(strand)
    res.json(strand)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Sections
router.get('/sections', requireAuth, async (_req, res: Response) => {
  try {
    const sections = [...db.sections]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(expandSection)
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

    const now = new Date().toISOString()
    const section = { id: uuidv4(), ...data, status: 'active', createdAt: now }
    db.sections.push(section)
    res.json(expandSection(section))
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Subjects
router.get('/subjects', requireAuth, async (_req, res: Response) => {
  try {
    res.json([...db.subjects].sort((a, b) => a.name.localeCompare(b.name)))
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

router.post('/subjects', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      name: z.string(),
      code: z.string(),
      description: z.string().optional(),
    }).parse(req.body)

    if (db.subjects.find(s => s.code === data.code)) {
      return res.status(400).json({ error: 'Subject code already exists' })
    }

    const now = new Date().toISOString()
    const subject = { id: uuidv4(), ...data, status: 'active', createdAt: now }
    db.subjects.push(subject)
    res.json(subject)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Schedules — publish endpoint must come BEFORE /:id routes
router.post('/schedules/publish', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { sectionId, academicYearId } = z.object({
      sectionId: z.string(),
      academicYearId: z.string(),
    }).parse(req.body)

    let count = 0
    db.classSchedules.forEach(s => {
      if (s.sectionId === sectionId && s.academicYearId === academicYearId) {
        s.status = 'published'
        count++
      }
    })
    res.json({ published: count })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/schedules', requireAuth, async (req: Request, res: Response) => {
  try {
    const { teacherId, sectionId, academicYearId, status } = req.query
    let schedules = db.classSchedules

    if (teacherId) schedules = schedules.filter(s => s.teacherId === String(teacherId))
    if (sectionId) schedules = schedules.filter(s => s.sectionId === String(sectionId))
    if (academicYearId) schedules = schedules.filter(s => s.academicYearId === String(academicYearId))
    // Treat missing status as 'published' for backward-compat (seed data)
    if (status) schedules = schedules.filter(s => (s.status ?? 'published') === String(status))

    const result = [...schedules]
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map(s => ({
        ...s,
        subject: db.subjects.find(sub => sub.id === s.subjectId) || null,
        teacher: db.teachers.find(t => t.id === s.teacherId) || null,
        section: expandSection(db.sections.find(sec => sec.id === s.sectionId)!),
        academicYear: db.academicYears.find(y => y.id === s.academicYearId) || null,
      }))
    res.json(result)
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
      color: z.string().optional(),
    }).parse(req.body)

    const now = new Date().toISOString()
    const schedule = { id: uuidv4(), ...data, status: 'draft' as const, uploadedAt: now }
    db.classSchedules.push(schedule)

    res.json({
      ...schedule,
      subject: db.subjects.find(s => s.id === data.subjectId) || null,
      teacher: db.teachers.find(t => t.id === data.teacherId) || null,
      section: expandSection(db.sections.find(s => s.id === data.sectionId)!),
      academicYear: db.academicYears.find(y => y.id === data.academicYearId) || null,
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/schedules/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const idx = db.classSchedules.findIndex(s => s.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' })

    const data = z.object({
      subjectId: z.string().optional(),
      teacherId: z.string().optional(),
      sectionId: z.string().optional(),
      academicYearId: z.string().optional(),
      dayOfWeek: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    }).parse(req.body)

    db.classSchedules[idx] = { ...db.classSchedules[idx], ...data }
    const s = db.classSchedules[idx]

    res.json({
      ...s,
      subject: db.subjects.find(sub => sub.id === s.subjectId) || null,
      teacher: db.teachers.find(t => t.id === s.teacherId) || null,
      section: expandSection(db.sections.find(sec => sec.id === s.sectionId)!),
      academicYear: db.academicYears.find(y => y.id === s.academicYearId) || null,
    })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/schedules/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const idx = db.classSchedules.findIndex(s => s.id === id)
    if (idx === -1) return res.status(404).json({ error: 'Schedule not found' })
    db.classSchedules.splice(idx, 1)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// Students in a section — accessible by any authenticated user (teacher-friendly)
router.get('/section-students/:sectionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params
    const studentIds = new Set(
      db.studentSectionAssignments
        .filter(a => a.sectionId === sectionId)
        .map(a => a.studentId)
    )
    const students = db.students
      .filter(s => studentIds.has(s.id) && s.status !== 'archived')
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map(s => {
        const profile = db.studentProfiles.find(p => p.studentId === s.id) || null
        const canViewProfile = req.user!.role === 'ADMIN' || req.user!.role === 'TEACHER'
        return {
          id: s.id,
          fullName: s.fullName,
          studentNumber: s.studentNumber,
          status: s.status,
          profile: canViewProfile && profile
            ? {
                profilePicture: profile.profilePicture,
                address: profile.address,
                guardianName: profile.guardianName,
                guardianContact: profile.guardianContact,
                emergencyContact: profile.emergencyContact,
                bloodType: profile.bloodType,
                weight: profile.weight,
                height: profile.height,
              }
            : null,
        }
      })
    res.json(students)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

export default router
