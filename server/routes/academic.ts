import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function expandActivity(act: (typeof db.academicActivities)[0]) {
  return {
    ...act,
    subject: db.subjects.find(s => s.id === act.subjectId) || null,
    section: db.sections.find(s => s.id === act.sectionId) || null,
    studentScores: db.studentScores
      .filter(s => s.activityId === act.id)
      .map(s => ({ ...s, student: db.students.find(st => st.id === s.studentId) || null })),
  }
}

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

    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    if (!teacher && req.user!.role !== 'ADMIN') return res.status(404).json({ error: 'Teacher not found' })

    const now = new Date().toISOString()
    const activity = {
      id: uuidv4(),
      ...data,
      teacherId: teacher?.id || '',
      activityDate: data.activityDate ? new Date(data.activityDate).toISOString() : now,
      createdAt: now,
    }
    db.academicActivities.push(activity)
    res.json(expandActivity(activity))
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Teacher: list own activities
router.get('/activities', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    const activities = db.academicActivities
      .filter(a => teacher ? a.teacherId === teacher.id : true)
      .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .map(expandActivity)
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

    const activity = db.academicActivities.find(a => a.id === req.params.id)
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const now = new Date().toISOString()
    const results = scores.map(s => {
      const existing = db.studentScores.find(
        sc => sc.studentId === s.studentId && sc.activityId === req.params.id
      )
      if (existing) {
        existing.scoreObtained = s.scoreObtained
        existing.totalScore = activity.totalScore
        return existing
      } else {
        const record = {
          id: uuidv4(),
          studentId: s.studentId,
          activityId: req.params.id,
          scoreObtained: s.scoreObtained,
          totalScore: activity.totalScore,
          dateRecorded: now,
        }
        db.studentScores.push(record)
        return record
      }
    })
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

    const student = db.students.find(s => s.userId === req.user!.userId)
    if (!student) return res.status(404).json({ error: 'Not found' })

    const activity = db.academicActivities.find(a => a.id === data.activityId)
    if (!activity) return res.status(404).json({ error: 'Activity not found' })

    const now = new Date().toISOString()
    const existing = db.studentScores.find(
      s => s.studentId === student.id && s.activityId === data.activityId
    )
    if (existing) {
      existing.scoreObtained = data.scoreObtained
      existing.totalScore = activity.totalScore
      return res.json(existing)
    }

    const score = {
      id: uuidv4(),
      studentId: student.id,
      activityId: data.activityId,
      scoreObtained: data.scoreObtained,
      totalScore: activity.totalScore,
      dateRecorded: now,
    }
    db.studentScores.push(score)
    res.json(score)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Update activity (title / category / totalScore / activityDate)
router.patch('/activities/:id', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      title:        z.string().min(1).optional(),
      category:     z.string().optional(),
      totalScore:   z.number().optional(),
      activityDate: z.string().optional(),
    }).parse(req.body)

    const idx = db.academicActivities.findIndex(a => a.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Activity not found' })

    const activity = db.academicActivities[idx]
    if (data.totalScore !== undefined && data.totalScore !== activity.totalScore) {
      db.studentScores.filter(s => s.activityId === activity.id).forEach(s => {
        s.totalScore = data.totalScore!
      })
    }
    if (data.title)        activity.title        = data.title
    if (data.category)     activity.category     = data.category
    if (data.totalScore)   activity.totalScore   = data.totalScore
    if (data.activityDate) activity.activityDate = new Date(data.activityDate).toISOString()

    res.json(expandActivity(activity))
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete activity and all its scores
router.delete('/activities/:id', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const idx = db.academicActivities.findIndex(a => a.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Activity not found' })
    db.academicActivities.splice(idx, 1)
    for (let i = db.studentScores.length - 1; i >= 0; i--) {
      if (db.studentScores[i].activityId === req.params.id) db.studentScores.splice(i, 1)
    }
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin: all activities
router.get('/admin/activities', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const activities = db.academicActivities
      .sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime())
      .map(act => ({
        ...expandActivity(act),
        teacher: db.teachers.find(t => t.id === act.teacherId) || null,
      }))
    res.json(activities)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// ─── Imported Sheets ─────────────────────────────────────────────────────────

// Get all imported sheets for a section (scoped to teacher)
router.get('/sheets', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.query
    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    const sheets = db.importedSheets.filter(s =>
      (!sectionId || s.sectionId === sectionId) &&
      (req.user!.role === 'ADMIN' || s.teacherId === (teacher?.id || ''))
    )
    res.json(sheets)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

// Create / replace an imported sheet
router.post('/sheets', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      sectionId:  z.string(),
      subjectId:  z.string().optional(),
      name:       z.string().min(1),
      headers:    z.array(z.string()),
      rows:       z.array(z.array(z.string())),
    }).parse(req.body)

    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    const teacherId = teacher?.id || ''

    // If replacing a subject tab, remove any prior sheet for the same section+subject
    if (data.subjectId) {
      const idx = db.importedSheets.findIndex(
        s => s.sectionId === data.sectionId && s.subjectId === data.subjectId && s.teacherId === teacherId
      )
      if (idx !== -1) db.importedSheets.splice(idx, 1)
    }

    const sheet = {
      id: (await import('uuid')).v4(),
      teacherId,
      sectionId: data.sectionId,
      subjectId: data.subjectId,
      name: data.name,
      headers: data.headers,
      rows: data.rows,
      createdAt: new Date().toISOString(),
    }
    db.importedSheets.push(sheet)
    res.json(sheet)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Delete an imported sheet
router.delete('/sheets/:id', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const idx = db.importedSheets.findIndex(s => s.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Sheet not found' })
    db.importedSheets.splice(idx, 1)
    res.json({ deleted: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
