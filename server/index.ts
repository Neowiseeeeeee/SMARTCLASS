import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { seedDatabase, saveDb } from './db.js'
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import teacherRoutes from './routes/teachers.js'
import attendanceRoutes from './routes/attendance.js'
import announcementRoutes from './routes/announcements.js'
import academicRoutes from './routes/academic.js'
import structureRoutes from './routes/structure.js'
import settingsRoutes from './routes/settings.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.API_PORT || '3001')

// CORS — allow the Vite dev proxy and the Replit preview domain
const allowedOrigins = [
  'http://localhost:5000',
  'http://0.0.0.0:5000',
  process.env.CLIENT_URL || '',
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
].filter(Boolean)

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Auto-save db to disk after every successful mutating request
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) saveDb()
    })
  }
  next()
})

// Uploads directory
const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/teachers', teacherRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/academic', academicRoutes)
app.use('/api/structure', structureRoutes)
app.use('/api/settings', settingsRoutes)

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

// Seed mock data then start server
seedDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SMARTCLASS API running on port ${PORT}`)
    console.log('📦 Using in-memory mock database (no external DB required)')
    console.log('\n📋 Demo credentials:')
    console.log('  Admin:   username=admin     password=admin123')
    console.log('  Teacher: email=teacher@erlhs.edu.ph  password=teacher123')
    console.log('  Student: number=2024-00001  password=student123')
  })
}).catch(err => {
  console.error('Failed to seed database:', err)
  process.exit(1)
})

export default app
