import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

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

// Middleware
app.use(cors({
  origin: ['http://localhost:5000', 'http://0.0.0.0:5000', process.env.CLIENT_URL || ''],
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SMARTCLASS API running on port ${PORT}`)
})

export default app
