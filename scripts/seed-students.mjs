/**
 * Seed script: adds 10 students to Section A and 10 to Section B.
 * Run once with: node scripts/seed-students.mjs
 */

import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '../data/db.json')

const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))

// ── Known IDs from db.json ───────────────────────────────────────────────────
const ACADEMIC_YEAR_ID = '20b5e3cb-1fab-481e-b8ee-66963ea62ed0'
const GRADE_11_ID      = '9666bc62-6db0-44b1-93f1-b64715759d55'
const SECTION_A_ID     = '12b08f31-0c67-4f0e-9c0f-fdb5ec3c7295'
const SECTION_B_ID     = 'a4864930-e27d-4a99-b25f-f47c9a30f5f5'
const DEFAULT_PASSWORD = 'student123'

const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 12)
const now = new Date().toISOString()

// ── Student roster ───────────────────────────────────────────────────────────
// [ name, gender, studentNumber, email ]
const sectionAStudents = [
  ['Ana Marie Reyes',      'Female', '2024-00002', 'ana.reyes@erlhs.edu.ph'],
  ['Carlo Miguel Mendoza', 'Male',   '2024-00003', 'carlo.mendoza@erlhs.edu.ph'],
  ['Diana Grace Santos',   'Female', '2024-00004', 'diana.santos@erlhs.edu.ph'],
  ['Eduardo Luis Garcia',  'Male',   '2024-00005', 'eduardo.garcia@erlhs.edu.ph'],
  ['Fe Angelica Cruz',     'Female', '2024-00006', 'fe.cruz@erlhs.edu.ph'],
  ['Gabriel Jose Torres',  'Male',   '2024-00007', 'gabriel.torres@erlhs.edu.ph'],
  ['Hannah Joy Villanueva','Female', '2024-00008', 'hannah.villanueva@erlhs.edu.ph'],
  ['Ivan Paolo Ramos',     'Male',   '2024-00009', 'ivan.ramos@erlhs.edu.ph'],
  ['Jasmine Rose Aquino',  'Female', '2024-00010', 'jasmine.aquino@erlhs.edu.ph'],
  ['Kevin James Bautista', 'Male',   '2024-00011', 'kevin.bautista@erlhs.edu.ph'],
]

const sectionBStudents = [
  ['Liza Mae Fernandez',   'Female', '2024-00012', 'liza.fernandez@erlhs.edu.ph'],
  ['Miguel Angel Castillo','Male',   '2024-00013', 'miguel.castillo@erlhs.edu.ph'],
  ['Nora Elena Dela Cruz', 'Female', '2024-00014', 'nora.delacruz@erlhs.edu.ph'],
  ['Oscar Ray Romero',     'Male',   '2024-00015', 'oscar.romero@erlhs.edu.ph'],
  ['Patricia Anne Gonzales','Female','2024-00016', 'patricia.gonzales@erlhs.edu.ph'],
  ['Ramon Carlo Flores',   'Male',   '2024-00017', 'ramon.flores@erlhs.edu.ph'],
  ['Sandra Claire Lopez',  'Female', '2024-00018', 'sandra.lopez@erlhs.edu.ph'],
  ['Teodoro Rex Morales',  'Male',   '2024-00019', 'teodoro.morales@erlhs.edu.ph'],
  ['Ursula Mae Espinoza',  'Female', '2024-00020', 'ursula.espinoza@erlhs.edu.ph'],
  ['Vicente Leon Navarro', 'Male',   '2024-00021', 'vicente.navarro@erlhs.edu.ph'],
]

function addStudent(roster, sectionId) {
  let count = 0
  for (const [fullName, gender, studentNumber, email] of roster) {
    // Skip if student number already exists
    if (db.students.some(s => s.studentNumber === studentNumber)) {
      console.log(`  ⚠️  Skip duplicate: ${studentNumber}`)
      continue
    }

    const userId    = uuidv4()
    const studentId = uuidv4()
    const profileId = uuidv4()
    const assignId  = uuidv4()
    const numPart   = studentNumber.split('-')[1]

    // User account
    db.users.push({
      id: userId,
      email,
      passwordHash,
      role: 'STUDENT',
      status: 'active',
      isFirstLogin: true,
      createdAt: now,
    })

    // Student record
    db.students.push({
      id: studentId,
      userId,
      studentNumber,
      studentCode: `SC-${numPart}`,
      fullName,
      gender,
      email,
      status: 'active',
      createdAt: now,
    })

    // Student profile
    db.studentProfiles.push({
      id: profileId,
      studentId,
      updatedAt: now,
    })

    // Section assignment
    db.studentSectionAssignments.push({
      id: assignId,
      studentId,
      sectionId,
      academicYearId: ACADEMIC_YEAR_ID,
      gradeLevelId: GRADE_11_ID,
      createdAt: now,
    })

    count++
  }
  return count
}

const addedA = addStudent(sectionAStudents, SECTION_A_ID)
const addedB = addStudent(sectionBStudents, SECTION_B_ID)

fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))

console.log(`✅ Done!`)
console.log(`   Section A: +${addedA} students`)
console.log(`   Section B: +${addedB} students`)
console.log(`   Total students now: ${db.students.length}`)
