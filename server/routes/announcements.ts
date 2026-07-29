import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../prisma.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// Public: get all published announcements with categories
router.get('/public', async (_req, res: Response) => {
  try {
    const categories = await prisma.announcementCategory.findMany({
      where: { status: 'active' },
      orderBy: { order: 'asc' },
      include: {
        announcements: {
          where: { publishStatus: 'published' },
          orderBy: [{ displayPriority: 'desc' }, { publishedAt: 'desc' }],
        },
      },
    })
    res.json(categories)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all categories (admin)
router.get('/categories', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const cats = await prisma.announcementCategory.findMany({ orderBy: { order: 'asc' } })
    res.json(cats)
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

    const cat = await prisma.announcementCategory.create({ data: { name, icon, order: order || 0 } })
    res.json(cat)
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors[0].message })
    res.status(500).json({ error: 'Server error' })
  }
})

// Get all announcements (admin)
router.get('/', requireAuth, requireRole('ADMIN'), async (_req, res: Response) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
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

    const ann = await prisma.announcement.create({
      data: {
        ...data,
        publishedAt: data.publishStatus === 'published' ? new Date() : null,
      },
      include: { category: true },
    })
    res.json(ann)
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

    const ann = await prisma.announcement.update({
      where: { id: req.params.id },
      data: {
        ...data,
        publishedAt: data.publishStatus === 'published' ? new Date() : undefined,
      },
      include: { category: true },
    })
    res.json(ann)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
