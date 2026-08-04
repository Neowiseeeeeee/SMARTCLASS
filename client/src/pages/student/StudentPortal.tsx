import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Calendar, ClipboardList, BarChart2 } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import StudentDashboard from './StudentDashboard'
import StudentSubjects from './StudentSubjects'
import StudentSchedule from './StudentSchedule'
import StudentAttendance from './StudentAttendance'
import StudentPerformance from './StudentPerformance'
import StudentProfileModal from './StudentProfileModal'

const navItems = [
  { label: 'Dashboard',            path: '/student',             icon: <LayoutDashboard className="w-5 h-5" />, exact: true },
  { label: 'Subjects',             path: '/student/subjects',    icon: <BookOpen className="w-5 h-5" /> },
  { label: 'Class Schedule',       path: '/student/schedule',    icon: <Calendar className="w-5 h-5" /> },
  { label: 'Attendance',           path: '/student/attendance',  icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Academic Performance', path: '/student/performance', icon: <BarChart2 className="w-5 h-5" /> },
]

export default function StudentPortal() {
  const [showProfile, setShowProfile] = useState(false)

  return (
    <>
      <PortalLayout navItems={navItems} inactivityMinutes={10} onProfileEdit={() => setShowProfile(true)}>
        <Routes>
          <Route index element={<StudentDashboard />} />
          <Route path="subjects"    element={<StudentSubjects />} />
          <Route path="schedule"    element={<StudentSchedule />} />
          <Route path="attendance"  element={<StudentAttendance />} />
          <Route path="performance" element={<StudentPerformance />} />
          <Route path="*"           element={<Navigate to="/student" replace />} />
        </Routes>
      </PortalLayout>
      {showProfile && <StudentProfileModal onClose={() => setShowProfile(false)} />}
    </>
  )
}
