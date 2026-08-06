/**
 * In-memory database for SMARTCLASS with JSON file persistence.
 * Data is loaded from data/db.json on startup and auto-saved after every mutation.
 * When migrating to a real database, swap this file and keep the route files unchanged.
 */

import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '../data/db.json')

/** Write the current db state to disk (synchronous, fast). */
export function saveDb() {
  try {
    const dir = path.dirname(DB_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (err) {
    console.error('[db] Failed to save:', err)
  }
}

/** Load db state from disk. Returns true if data was found and loaded. */
export function loadDb(): boolean {
  try {
    if (!fs.existsSync(DB_FILE)) return false
    const raw = fs.readFileSync(DB_FILE, 'utf-8')
    const data = JSON.parse(raw)
    // Assign each known collection; skip unknown keys
    ;(Object.keys(db) as Array<keyof typeof db>).forEach(key => {
      if (Array.isArray(data[key])) (db as any)[key] = data[key]
    })
    console.log('[db] Loaded persisted data from', DB_FILE)
    // Scrub stale media references at boot (files may have been deleted externally)
    _sanitiseMediaRefs()
    return true
  } catch (err) {
    console.error('[db] Failed to load persisted data:', err)
    return false
  }
}

/**
 * Internal helper: strips image/pdf fields that reference files no longer on disk.
 * Exported for use in route handlers that need to call it directly.
 * Returns true if any record was mutated.
 */
export function _sanitiseMediaRefs(): boolean {
  const uploadsBase = path.join(__dirname, '../uploads')
  let dirty = false
  db.announcements.forEach((a: any, idx: number) => {
    for (const field of ['image', 'pdf'] as const) {
      const val: string | undefined = a[field]
      if (!val) continue
      // Strip leading slash and resolve against project root
      const rel = val.replace(/^\//, '')
      const abs = path.join(__dirname, '../', rel)
      if (!fs.existsSync(abs)) {
        ;(db.announcements[idx] as any)[field] = undefined
        dirty = true
        console.log(`[db] Cleared missing ${field} ref on announcement "${a.title}":`, val)
      }
    }
  })
  if (dirty) saveDb()
  return dirty
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: string
  email?: string
  username?: string
  passwordHash: string
  role: Role
  status: string
  isFirstLogin: boolean
  lastLogin?: string
  failedLoginAttempts?: number
  lockedUntil?: string
  createdAt: string
}

export interface Admin {
  id: string
  userId: string
  fullName: string
  createdAt: string
}

export interface StudentProfile {
  id: string
  studentId: string
  profilePicture?: string
  address?: string
  guardianName?: string
  guardianContact?: string
  emergencyContact?: string
  biography?: string
  weight?: number
  height?: number
  updatedAt: string
}

export interface Student {
  id: string
  userId: string
  studentNumber: string
  studentCode: string
  fullName: string
  gender?: string
  birthDate?: string
  email: string
  contactNumber?: string
  status: string
  createdAt: string
}

export interface TeacherProfile {
  id: string
  teacherId: string
  profilePicture?: string
  gender?: string
  birthDate?: string
  updatedAt: string
}

export interface Teacher {
  id: string
  userId: string
  employeeId?: string
  fullName: string
  email: string
  department?: string
  contactNumber?: string
  status: string
  createdAt: string
}

export interface AcademicYear {
  id: string
  name: string
  startDate?: string
  endDate?: string
  isCurrent: boolean
  status: string
  createdAt: string
}

export interface GradeLevel {
  id: string
  name: string
  order: number
}

export interface Strand {
  id: string
  gradeLevelId: string
  name: string
}

export interface Section {
  id: string
  gradeLevelId: string
  strandId?: string
  name: string
  status: string
  createdAt: string
}

export interface Subject {
  id: string
  name: string
  code: string
  description?: string
  status: string
  createdAt: string
}

export interface StudentSectionAssignment {
  id: string
  studentId: string
  academicYearId: string
  gradeLevelId: string
  sectionId: string
  createdAt: string
}

export interface TeacherSubjectAssignment {
  id: string
  teacherId: string
  subjectId: string
  sectionId: string
  academicYearId: string
  createdAt: string
}

export interface ClassSchedule {
  id: string
  subjectId: string
  teacherId: string
  sectionId: string
  academicYearId: string
  assignmentId?: string
  scheduleImage?: string
  description?: string
  dayOfWeek?: string
  startTime?: string
  endTime?: string
  color?: string
  status?: 'draft' | 'published'
  uploadedAt: string
}

export interface AttendanceSession {
  id: string
  subjectId: string
  sectionId: string
  teacherId: string
  attendanceDate: string
  sessionCode?: string
  sessionStatus: string
  sessionExpiry?: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  sessionId: string
  status: string
  timeRecorded: string
  verificationStatus: string
}

export interface AcademicActivity {
  id: string
  title: string
  subjectId: string
  sectionId: string
  teacherId: string
  academicYearId: string
  category: string
  totalScore: number
  activityDate: string
  createdAt: string
}

export interface StudentScore {
  id: string
  studentId: string
  activityId: string
  scoreObtained: number
  totalScore: number
  evidenceFile?: string
  dateRecorded: string
}

export interface AnnouncementCategory {
  id: string
  name: string
  icon?: string
  coverImage?: string
  order: number
  status: string
  createdAt: string
}

export interface Announcement {
  id: string
  title: string
  categoryId: string
  description?: string
  image?: string
  pdf?: string
  content?: string
  publishStatus: string
  displayPriority: number
  publishedAt?: string
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface SystemSetting {
  id: string
  key: string
  value: string
  updatedAt: string
}

export interface PresentationMaterial {
  id: string
  teacherId: string
  subjectId: string
  sectionId: string
  title: string
  filePath: string
  fileType: string   // 'image' | 'pdf' | 'pptx' | 'other'
  originalName: string
  uploadedAt: string
}

export interface ImportedSheet {
  id: string
  teacherId: string
  sectionId: string
  subjectId?: string   // set when replacing an existing subject tab's view
  name: string
  headers: string[]
  rows: string[][]
  createdAt: string
}

export interface FinalGrade {
  id: string
  studentId: string
  subjectId: string
  teacherId: string
  sectionId: string
  academicYearId: string
  gradingPeriod: string   // '1st' | '2nd' | '3rd' | '4th'
  grade: number
  releasedAt: string
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const db = {
  users: [] as User[],
  admins: [] as Admin[],
  students: [] as Student[],
  studentProfiles: [] as StudentProfile[],
  teachers: [] as Teacher[],
  teacherProfiles: [] as TeacherProfile[],
  academicYears: [] as AcademicYear[],
  gradeLevels: [] as GradeLevel[],
  strands: [] as Strand[],
  sections: [] as Section[],
  subjects: [] as Subject[],
  studentSectionAssignments: [] as StudentSectionAssignment[],
  teacherSubjectAssignments: [] as TeacherSubjectAssignment[],
  classSchedules: [] as ClassSchedule[],
  attendanceSessions: [] as AttendanceSession[],
  attendanceRecords: [] as AttendanceRecord[],
  academicActivities: [] as AcademicActivity[],
  studentScores: [] as StudentScore[],
  announcementCategories: [] as AnnouncementCategory[],
  announcements: [] as Announcement[],
  systemSettings: [] as SystemSetting[],
  presentationMaterials: [] as PresentationMaterial[],
  importedSheets: [] as ImportedSheet[],
  finalGrades: [] as FinalGrade[],
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

export async function seedDatabase() {
  // If persisted data exists, load it and skip seeding
  const loaded = loadDb()
  if (loaded && db.users.length > 0) {
    ensureDefaultSettings()
    saveDb()
    return
  }

  const now = new Date().toISOString()

  // ── Users ──
  const adminId = uuidv4()
  const teacherUserId = uuidv4()
  const studentUserId = uuidv4()

  db.users.push(
    {
      id: adminId,
      username: 'admin',
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'ADMIN',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    },
    {
      id: teacherUserId,
      email: 'teacher@erlhs.edu.ph',
      passwordHash: await bcrypt.hash('teacher123', 12),
      role: 'TEACHER',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    },
    {
      id: studentUserId,
      email: 'student@erlhs.edu.ph',
      passwordHash: await bcrypt.hash('student123', 12),
      role: 'STUDENT',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    },
  )

  // ── Admin profile ──
  const adminProfileId = uuidv4()
  db.admins.push({ id: adminProfileId, userId: adminId, fullName: 'System Administrator', createdAt: now })

  // ── Academic year ──
  const yearId = uuidv4()
  db.academicYears.push({
    id: yearId, name: '2024-2025', isCurrent: true, status: 'active', createdAt: now,
  })

  // ── Grade levels ──
  const grade11Id = uuidv4()
  const grade12Id = uuidv4()
  db.gradeLevels.push(
    { id: grade11Id, name: 'Grade 11', order: 11 },
    { id: grade12Id, name: 'Grade 12', order: 12 },
  )

  // ── Strands ──
  const stemId = uuidv4()
  const abmId = uuidv4()
  db.strands.push(
    { id: stemId, gradeLevelId: grade11Id, name: 'STEM' },
    { id: abmId, gradeLevelId: grade11Id, name: 'ABM' },
  )

  // ── Sections ──
  const sectionAId = uuidv4()
  const sectionBId = uuidv4()
  db.sections.push(
    { id: sectionAId, gradeLevelId: grade11Id, strandId: stemId, name: 'Section A', status: 'active', createdAt: now },
    { id: sectionBId, gradeLevelId: grade11Id, strandId: abmId, name: 'Section B', status: 'active', createdAt: now },
  )

  // ── Subjects ──
  const mathId = uuidv4()
  const engId = uuidv4()
  const sciId = uuidv4()
  const peId = uuidv4()
  db.subjects.push(
    { id: mathId, name: 'General Mathematics', code: 'MATH-GEN-11', status: 'active', createdAt: now },
    { id: engId, name: 'Oral Communication', code: 'ENG-ORAL-11', status: 'active', createdAt: now },
    { id: sciId, name: 'General Chemistry', code: 'SCI-CHEM-11', status: 'active', createdAt: now },
    { id: peId, name: 'Physical Education', code: 'PE-11', status: 'active', createdAt: now },
  )

  // ── Teacher ──
  const teacherId = uuidv4()
  db.teachers.push({
    id: teacherId,
    userId: teacherUserId,
    employeeId: 'EMP-001',
    fullName: 'Maria Santos',
    email: 'teacher@erlhs.edu.ph',
    department: 'Science Department',
    status: 'active',
    createdAt: now,
  })
  db.teacherProfiles.push({ id: uuidv4(), teacherId, updatedAt: now })

  // Teacher assignments
  const ta1Id = uuidv4()
  const ta2Id = uuidv4()
  db.teacherSubjectAssignments.push(
    { id: ta1Id, teacherId, subjectId: mathId, sectionId: sectionAId, academicYearId: yearId, createdAt: now },
    { id: ta2Id, teacherId, subjectId: engId, sectionId: sectionAId, academicYearId: yearId, createdAt: now },
  )

  // ── Class schedules ──
  db.classSchedules.push(
    { id: uuidv4(), teacherId, subjectId: mathId, sectionId: sectionAId, academicYearId: yearId, dayOfWeek: 'Monday',    startTime: '08:00', endTime: '09:30', color: '#6366f1', status: 'published', uploadedAt: now },
    { id: uuidv4(), teacherId, subjectId: mathId, sectionId: sectionAId, academicYearId: yearId, dayOfWeek: 'Wednesday', startTime: '08:00', endTime: '09:30', color: '#6366f1', status: 'published', uploadedAt: now },
    { id: uuidv4(), teacherId, subjectId: engId,  sectionId: sectionAId, academicYearId: yearId, dayOfWeek: 'Tuesday',   startTime: '10:00', endTime: '11:30', color: '#22c55e', status: 'published', uploadedAt: now },
    { id: uuidv4(), teacherId, subjectId: engId,  sectionId: sectionAId, academicYearId: yearId, dayOfWeek: 'Thursday',  startTime: '10:00', endTime: '11:30', color: '#22c55e', status: 'published', uploadedAt: now },
  )

  // ── Student ──
  const studentId = uuidv4()
  db.students.push({
    id: studentId,
    userId: studentUserId,
    studentNumber: '2024-00001',
    studentCode: 'SC-DEMO01',
    fullName: 'Juan Dela Cruz',
    gender: 'Male',
    email: 'student@erlhs.edu.ph',
    status: 'active',
    createdAt: now,
  })
  db.studentProfiles.push({ id: uuidv4(), studentId, updatedAt: now })
  db.studentSectionAssignments.push({
    id: uuidv4(),
    studentId,
    sectionId: sectionAId,
    academicYearId: yearId,
    gradeLevelId: grade11Id,
    createdAt: now,
  })

  // ── Announcement categories ──
  const cat1Id = uuidv4()
  const cat2Id = uuidv4()
  const cat3Id = uuidv4()
  const cat4Id = uuidv4()
  db.announcementCategories.push(
    { id: cat1Id, name: 'School Announcements', icon: '📢', order: 1, status: 'active', createdAt: now },
    { id: cat2Id, name: 'Upcoming Events', icon: '📅', order: 2, status: 'active', createdAt: now },
    { id: cat3Id, name: 'Class Schedule', icon: '📚', order: 3, status: 'active', createdAt: now },
    { id: cat4Id, name: 'Emergency Hotlines', icon: '📞', order: 4, status: 'active', createdAt: now },
  )

  // ── Announcements ──
  db.announcements.push(
    {
      id: uuidv4(),
      title: 'Welcome to SMARTCLASS!',
      categoryId: cat1Id,
      description: 'SMARTCLASS is now live! Students and teachers can log in using their assigned credentials.',
      publishStatus: 'published',
      displayPriority: 10,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      title: '1st Quarter Examinations',
      categoryId: cat2Id,
      description: 'First quarter exams scheduled for next week. Please review your study materials.',
      publishStatus: 'published',
      displayPriority: 8,
      publishedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  )

  // ── Sample attendance session ──
  const sessionId = uuidv4()
  db.attendanceSessions.push({
    id: sessionId,
    subjectId: mathId,
    sectionId: sectionAId,
    teacherId,
    attendanceDate: now,
    sessionStatus: 'closed',
    createdAt: now,
    updatedAt: now,
  })
  db.attendanceRecords.push({
    id: uuidv4(),
    studentId,
    sessionId,
    status: 'present',
    timeRecorded: now,
    verificationStatus: 'verified',
  })

  // ── Sample academic activity ──
  const activityId = uuidv4()
  db.academicActivities.push({
    id: activityId,
    title: 'Unit 1 Quiz',
    subjectId: mathId,
    sectionId: sectionAId,
    teacherId,
    academicYearId: yearId,
    category: 'Quiz',
    totalScore: 50,
    activityDate: now,
    createdAt: now,
  })
  db.studentScores.push({
    id: uuidv4(),
    studentId,
    activityId,
    scoreObtained: 45,
    totalScore: 50,
    dateRecorded: now,
  })

  // ── System settings ──
  const settingKeys = [
    ['schoolName', 'Exequiel R. Lina High School'],
    ['schoolLogo', ''],
    ['schoolAddress', 'ERLHS Campus, Philippines'],
    ['schoolTagline', 'Learning today, leading tomorrow.'],
    ['schoolContactNumber', ''],
    ['schoolContactEmail', ''],
    ['currentAcademicYear', '2024-2025'],
    ['currentSemester', '1st Semester'],
    ['systemVersion', 'v1.0.0'],
    ['inactivityTimeout', '10'],
    ['sessionCodeExpiry', '30'],
    ['passingGrade', '75'],
    ['gradingPeriods', '4'],
    ['currentGradingPeriod', '1st'],
    ['slideRotationInterval', '6'],
    ['tabRotationInterval', '30'],
    ['weatherLatitude', '14.5995'],
    ['weatherLongitude', '120.9842'],
    ['weatherLocation', 'Manila'],
    ['kioskIdleTimeout', '10'],
    ['forceFirstLoginPasswordChange', 'true'],
    ['maxLoginAttempts', '5'],
    ['lockoutDuration', '15'],
  ]
  for (const [key, value] of settingKeys) {
    db.systemSettings.push({ id: uuidv4(), key, value, updatedAt: now })
  }
}

/** Add settings introduced after the original seed without overwriting admin changes. */
export function ensureDefaultSettings() {
  const defaults: Record<string, string> = {
    schoolLogo: '', schoolAddress: 'ERLHS Campus, Philippines',
    schoolTagline: 'Learning today, leading tomorrow.', schoolContactNumber: '',
    schoolContactEmail: '', passingGrade: '75', gradingPeriods: '4',
    currentGradingPeriod: '1st', slideRotationInterval: '6',
    tabRotationInterval: '30', weatherLatitude: '14.5995',
    weatherLongitude: '120.9842', weatherLocation: 'Manila',
    kioskIdleTimeout: '10', forceFirstLoginPasswordChange: 'true',
    maxLoginAttempts: '5', lockoutDuration: '15',
  }
  const now = new Date().toISOString()
  for (const [key, value] of Object.entries(defaults)) {
    if (!db.systemSettings.some(s => s.key === key)) {
      db.systemSettings.push({ id: uuidv4(), key, value, updatedAt: now })
    }
  }
}

/** Clear the in-memory store and create a fresh demo dataset. */
export async function resetDatabase() {
  ;(Object.keys(db) as Array<keyof typeof db>).forEach(key => {
    ;(db[key] as unknown as unknown[]).length = 0
  })
  try { if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE) } catch (err) {
    console.error('[db] Failed to remove backup during reset:', err)
  }
  await seedDatabase()
  saveDb()
}

// ─── Expand helpers (attach related records like Prisma's "include") ───────────

export function expandSection(s: Section) {
  return {
    ...s,
    gradeLevel: db.gradeLevels.find(g => g.id === s.gradeLevelId) || null,
    strand: s.strandId ? db.strands.find(st => st.id === s.strandId) || null : null,
  }
}

export function expandStudent(s: Student, opts: { includeUser?: boolean } = {}) {
  const profile = db.studentProfiles.find(p => p.studentId === s.id) || null
  const sectionAssignments = db.studentSectionAssignments
    .filter(a => a.studentId === s.id)
    .map(a => ({
      ...a,
      section: expandSection(db.sections.find(sec => sec.id === a.sectionId)!),
      academicYear: db.academicYears.find(y => y.id === a.academicYearId) || null,
    }))
  const userRecord = opts.includeUser
    ? (() => {
        const u = db.users.find(u => u.id === s.userId)
        return u ? { status: u.status, isFirstLogin: u.isFirstLogin, lastLogin: u.lastLogin, email: u.email } : null
      })()
    : undefined
  return { ...s, profile, sectionAssignments, ...(userRecord !== undefined ? { user: userRecord } : {}) }
}

export function expandTeacher(t: Teacher, opts: { includeUser?: boolean } = {}) {
  const profile = db.teacherProfiles.find(p => p.teacherId === t.id) || null
  const subjectAssignments = db.teacherSubjectAssignments
    .filter(a => a.teacherId === t.id)
    .map(a => ({
      ...a,
      subject: db.subjects.find(s => s.id === a.subjectId) || null,
      section: expandSection(db.sections.find(s => s.id === a.sectionId)!),
      academicYear: db.academicYears.find(y => y.id === a.academicYearId) || null,
    }))
  const classSchedules = db.classSchedules
    .filter(sc => sc.teacherId === t.id)
    .map(sc => ({
      ...sc,
      subject: db.subjects.find(s => s.id === sc.subjectId) || null,
      section: expandSection(db.sections.find(s => s.id === sc.sectionId)!),
      academicYear: db.academicYears.find(y => y.id === sc.academicYearId) || null,
    }))
  const userRecord = opts.includeUser
    ? (() => {
        const u = db.users.find(u => u.id === t.userId)
        return u ? { status: u.status, isFirstLogin: u.isFirstLogin, lastLogin: u.lastLogin } : null
      })()
    : undefined
  return { ...t, profile, subjectAssignments, classSchedules, ...(userRecord !== undefined ? { user: userRecord } : {}) }
}

export function expandAttendanceSession(sess: AttendanceSession, opts: { includeRecords?: boolean } = {}) {
  const records = opts.includeRecords
    ? db.attendanceRecords
        .filter(r => r.sessionId === sess.id)
        .map(r => ({
          ...r,
          student: (() => {
            const st = db.students.find(s => s.id === r.studentId)
            if (!st) return null
            const profile = db.studentProfiles.find(p => p.studentId === st.id) || null
            return { ...st, profile }
          })(),
        }))
    : undefined
  return {
    ...sess,
    subject: db.subjects.find(s => s.id === sess.subjectId) || null,
    section: expandSection(db.sections.find(s => s.id === sess.sectionId)!),
    teacher: db.teachers.find(t => t.id === sess.teacherId) || null,
    ...(records !== undefined ? { attendanceRecords: records } : {}),
  }
}
