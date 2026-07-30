import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.js'
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
    let name = 'User'

    if (role === 'STUDENT') {
      const student = db.students.find(s => s.studentNumber === identifier)
      if (student) {
        user = db.users.find(u => u.id === student.userId) || null
        name = student.fullName
      }
    } else if (role === 'TEACHER') {
      user = db.users.find(u => u.email === identifier && u.role === 'TEACHER') || null
      if (user) {
        const t = db.teachers.find(t => t.userId === user!.id)
        name = t?.fullName || 'Teacher'
      }
    } else if (role === 'ADMIN') {
      user = db.users.find(u => u.username === identifier && u.role === 'ADMIN') || null
      if (user) {
        const a = db.admins.find(a => a.userId === user!.id)
        name = a?.fullName || 'Administrator'
      }
    }

    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    if (user.status !== 'active') return res.status(401).json({ error: 'Account is inactive' })

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    user.lastLogin = new Date().toISOString()

    const token = signToken({ userId: user.id, role: user.role, name })

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    })

    res.json({ user: { id: user.id, role: user.role, name, isFirstLogin: user.isFirstLogin } })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
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
    const user = db.users.find(u => u.id === req.user!.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    let profile: any = null
    if (user.role === 'STUDENT') {
      const s = db.students.find(s => s.userId === user.id)
      if (s) {
        const sp = db.studentProfiles.find(p => p.studentId === s.id) || null
        const sectionAssignments = db.studentSectionAssignments
          .filter(a => a.studentId === s.id)
          .slice(0, 1)
          .map(a => ({
            ...a,
            section: (() => {
              const sec = db.sections.find(sc => sc.id === a.sectionId)
              if (!sec) return null
              return {
                ...sec,
                gradeLevel: db.gradeLevels.find(g => g.id === sec.gradeLevelId) || null,
                strand: sec.strandId ? db.strands.find(st => st.id === sec.strandId) || null : null,
              }
            })(),
            academicYear: db.academicYears.find(y => y.id === a.academicYearId) || null,
          }))
        profile = { ...s, profile: sp, sectionAssignments }
      }
    } else if (user.role === 'TEACHER') {
      const t = db.teachers.find(t => t.userId === user.id)
      if (t) {
        const tp = db.teacherProfiles.find(p => p.teacherId === t.id) || null
        const subjectAssignments = db.teacherSubjectAssignments
          .filter(a => a.teacherId === t.id)
          .map(a => ({
            ...a,
            subject: db.subjects.find(s => s.id === a.subjectId) || null,
            section: (() => {
              const sec = db.sections.find(sc => sc.id === a.sectionId)
              return sec ? {
                ...sec,
                gradeLevel: db.gradeLevels.find(g => g.id === sec.gradeLevelId) || null,
                strand: sec.strandId ? db.strands.find(st => st.id === sec.strandId) || null : null,
              } : null
            })(),
            academicYear: db.academicYears.find(y => y.id === a.academicYearId) || null,
          }))
        profile = { ...t, profile: tp, subjectAssignments }
      }
    } else {
      profile = db.admins.find(a => a.userId === user.id) || null
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

    const user = db.users.find(u => u.id === req.user!.userId)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })

    user.passwordHash = await bcrypt.hash(newPassword, 12)
    user.isFirstLogin = false

    res.json({ success: true })
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.issues?.[0]?.message ?? err.message })
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
