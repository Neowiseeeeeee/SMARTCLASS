import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Monitor, BarChart2, Calendar } from 'lucide-react'
import PortalLayout from '../../components/layout/PortalLayout'
import TeacherDashboard from './TeacherDashboard'
import TeacherAttendance from './TeacherAttendance'
import TeacherPresentation from './TeacherPresentation'
import TeacherAcademic from './TeacherAcademic'
import TeacherSchedule from './TeacherSchedule'

const navItems = [
  { label: 'Dashboard', path: '/teacher', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Attendance', path: '/teacher/attendance', icon: <ClipboardList className="w-5 h-5" /> },
  { label: 'Presentation', path: '/teacher/presentation', icon: <Monitor className="w-5 h-5" /> },
  { label: 'Academic Performance', path: '/teacher/academic', icon: <BarChart2 className="w-5 h-5" /> },
  { label: 'Class Schedule', path: '/teacher/schedule', icon: <Calendar className="w-5 h-5" /> },
]

export default function TeacherPortal() {
  return (
    <PortalLayout navItems={navItems} inactivityMinutes={15}>
      <Routes>
        <Route index element={<TeacherDashboard />} />
        <Route path="attendance" element={<TeacherAttendance />} />
        <Route path="presentation" element={<TeacherPresentation />} />
        <Route path="academic" element={<TeacherAcademic />} />
        <Route path="schedule" element={<TeacherSchedule />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </PortalLayout>
  )
}
