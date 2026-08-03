import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { db, saveDb } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const router = Router()

// ── Multer setup ──────────────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../../uploads/presentations')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      // Images
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      // PDF
      'application/pdf',
      // PowerPoint
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Word documents
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Video
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      // Some browsers/OS send octet-stream for office docs — allow and check extension below
      'application/octet-stream',
    ]
    const allowedExts = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.pdf',
      '.ppt', '.pptx',
      '.doc', '.docx',
      '.mp4', '.webm', '.mov', '.avi',
    ]
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true)
    } else if (allowedExts.includes(ext)) {
      // Extension is valid even if MIME is unexpected
      cb(null, true)
    } else {
      cb(new Error('Allowed types: images, PDF, PowerPoint, Word documents, and videos'))
    }
  },
})

// ── GET /api/presentations ─────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { teacherId, subjectId, sectionId } = req.query
    let materials = [...db.presentationMaterials]

    if (teacherId) materials = materials.filter(m => m.teacherId === String(teacherId))
    if (subjectId) materials = materials.filter(m => m.subjectId === String(subjectId))
    if (sectionId) materials = materials.filter(m => m.sectionId === String(sectionId))

    const result = materials
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map(m => ({
        ...m,
        subject: db.subjects.find(s => s.id === m.subjectId) || null,
        section: db.sections.find(s => s.id === m.sectionId) || null,
      }))
    res.json(result)
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

// ── POST /api/presentations/upload ────────────────────────────────────────────
router.post(
  '/upload',
  requireAuth,
  requireRole('TEACHER'),
  (req: Request, res: Response, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message })
      } else if (err) {
        return res.status(400).json({ error: err.message })
      }
      next()
    })
  },
  async (req: Request, res: Response) => {
    try {
      const { title, subjectId, sectionId } = req.body
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
      if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })
      if (!subjectId || !sectionId) return res.status(400).json({ error: 'subjectId and sectionId are required' })

      const teacher = db.teachers.find(t => t.userId === req.user!.userId)
      if (!teacher) return res.status(403).json({ error: 'Teacher profile not found' })

      const ext = path.extname(req.file.originalname).toLowerCase()
      let fileType: string
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) fileType = 'image'
      else if (ext === '.pdf') fileType = 'pdf'
      else if (['.ppt', '.pptx'].includes(ext)) fileType = 'pptx'
      else if (['.doc', '.docx'].includes(ext)) fileType = 'doc'
      else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) fileType = 'video'
      else fileType = 'other'

      const material = {
        id: uuidv4(),
        teacherId: teacher.id,
        subjectId,
        sectionId,
        title: title.trim(),
        filePath: `/uploads/presentations/${req.file.filename}`,
        fileType,
        originalName: req.file.originalname,
        uploadedAt: new Date().toISOString(),
      }
      db.presentationMaterials.push(material)
      saveDb()

      res.json({
        ...material,
        subject: db.subjects.find(s => s.id === subjectId) || null,
        section: db.sections.find(s => s.id === sectionId) || null,
      })
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error' })
    }
  }
)

// ── DELETE /api/presentations/:id ─────────────────────────────────────────────
router.delete('/:id', requireAuth, requireRole('TEACHER'), async (req: Request, res: Response) => {
  try {
    const idx = db.presentationMaterials.findIndex(m => m.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Material not found' })

    const material = db.presentationMaterials[idx]
    // Only allow the owning teacher to delete
    const teacher = db.teachers.find(t => t.userId === req.user!.userId)
    if (teacher && material.teacherId !== teacher.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Delete file from disk
    try {
      const abs = path.join(__dirname, '../../', material.filePath.replace(/^\//, ''))
      if (fs.existsSync(abs)) fs.unlinkSync(abs)
    } catch { /* ignore */ }

    db.presentationMaterials.splice(idx, 1)
    saveDb()
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ error: 'Server error' }) }
})

export default router
