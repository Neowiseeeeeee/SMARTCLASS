import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

function withCategory(a: (typeof db.announcements)[0]) {
  return { ...a, category: db.announcementCategories.find(c => c.id === a.categoryId) || null }
}

// Public: get all published announcements with categories
router.get('/public', async (_req, res: Response) => {
  try {
    const categories = db.announcementCategories
      .filter(c => c.status === 'active')
      .sort((a, b) => a.order - b.order)
      .map(c => ({
        ...c,
        announcements: db.announcements
          .filter(a => a.categoryId === c.id && a.publishStatus === 'published')
          .sort((a, b) => b.displayPriority - a.displayPriority),
      }))
    res.json(categories)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all categories (admin)
router.get('/categories', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    res.json([...db.announcementCategories].sort((a, b) => a.order - b.order))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/categories', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, icon, order } = z.object({
      name: z.string().min(1),
      icon: z.string().optional(),
      order: z.number().optional(),
    }).parse(req.body)

    const now = new Date().toISOString()
    const cat = {
      id: uuidv4(),
      name,
      icon,
      order: order || 0,
      status: 'active',
      createdAt: now,
    }
    db.announcementCategories.push(cat)
    res.json(cat)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all announcements (admin)
router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const announcements = [...db.announcements]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(withCategory)
    res.json(announcements)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      title: z.string().min(1),
      categoryId: z.string(),
      description: z.string().optional(),
      content: z.string().optional(),
      publishStatus: z.enum(['published', 'unpublished']).default('published'),
      displayPriority: z.number().optional(),
    }).parse(req.body)

    const now = new Date().toISOString()
    const ann = {
      id: uuidv4(),
      ...data,
      displayPriority: data.displayPriority || 0,
      publishedAt: data.publishStatus === 'published' ? now : undefined,
      createdAt: now,
      updatedAt: now,
    }
    db.announcements.push(ann)
    res.json(withCategory(ann))
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      content: z.string().optional(),
      publishStatus: z.enum(['published', 'unpublished', 'archived']).optional(),
      displayPriority: z.number().optional(),
    }).parse(req.body)

    const idx = db.announcements.findIndex(a => a.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })

    const now = new Date().toISOString()
    db.announcements[idx] = {
      ...db.announcements[idx],
      ...data,
      publishedAt: data.publishStatus === 'published' ? now : db.announcements[idx].publishedAt,
      updatedAt: now,
    }
    res.json(withCategory(db.announcements[idx]))
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const idx = db.announcements.findIndex(a => a.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Not found' })
    db.announcements.splice(idx, 1)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
