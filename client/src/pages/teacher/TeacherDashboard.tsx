import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { attendanceApi, announcementsApi } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import { LayoutDashboard, Users, ClipboardList, BookOpen, Calendar, Megaphone } from 'lucide-react'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const teacher = user?.profile

  const { data: sessions = [] } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => attendanceApi.getSessions().then(r => r.data),
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => announcementsApi.getPublic().then(r => r.data),
  })

  const todaySessions = sessions.filter((s: any) =>
    format(new Date(s.attendanceDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  )

  const totalPresent = todaySessions.reduce((sum: number, s: any) =>
    sum + s.attendanceRecords.filter((r: any) => r.status === 'present').length, 0)
  const totalAbsent = todaySessions.reduce((sum: number, s: any) =>
    sum + s.attendanceRecords.filter((r: any) => r.status === 'absent').length, 0)

  const recentAnnouncements = announcements
    .flatMap((c: any) => c.announcements)
    .slice(0, 3)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Teacher Info */}
      <div className="card bg-gradient-to-br from-primary to-primary-dark text-white">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="font-poppins font-bold text-2xl">{teacher?.fullName}</h2>
            <p className="text-white/70 font-inter text-sm">{teacher?.department || 'Faculty'}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {teacher?.subjectAssignments?.slice(0, 3).map((a: any) => (
                <span key={a.id} className="badge bg-white/20 text-white text-xs">
                  {a.subject?.name}
                </span>
              ))}
              {(teacher?.subjectAssignments?.length || 0) > 3 && (
                <span className="badge bg-white/20 text-white text-xs">
                  +{teacher.subjectAssignments.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Summary */}
        <div
          className="card-hover"
          onClick={() => navigate('/teacher/attendance')}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-success" />
            </div>
            <h3 className="font-poppins font-semibold">Today's Attendance</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-2xl font-poppins font-bold text-text-primary">{todaySessions.length}</p>
              <p className="text-xs text-text-secondary">Sessions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-poppins font-bold text-success">{totalPresent}</p>
              <p className="text-xs text-text-secondary">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-poppins font-bold text-danger">{totalAbsent}</p>
              <p className="text-xs text-text-secondary">Absent</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-poppins font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/teacher/attendance')}
              className="w-full flex items-center gap-3 p-3 bg-background hover:bg-primary-light rounded-xl transition-colors text-left"
            >
              <ClipboardList className="w-4 h-4 text-primary" />
              <span className="font-inter text-sm font-medium text-text-primary">Take Attendance</span>
            </button>
            <button
              onClick={() => navigate('/teacher/presentation')}
              className="w-full flex items-center gap-3 p-3 bg-background hover:bg-primary-light rounded-xl transition-colors text-left"
            >
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-inter text-sm font-medium text-text-primary">Start Presentation</span>
            </button>
            <button
              onClick={() => navigate('/teacher/academic')}
              className="w-full flex items-center gap-3 p-3 bg-background hover:bg-primary-light rounded-xl transition-colors text-left"
            >
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span className="font-inter text-sm font-medium text-text-primary">Record Grades</span>
            </button>
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="card">
          <h3 className="font-poppins font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" /> Announcements
          </h3>
          {recentAnnouncements.length === 0 ? (
            <p className="text-text-secondary font-inter text-sm">No announcements.</p>
          ) : (
            <div className="space-y-3">
              {recentAnnouncements.map((a: any) => (
                <div key={a.id} className="border-l-2 border-primary-light pl-3">
                  <p className="font-inter text-sm font-medium text-text-primary line-clamp-1">{a.title}</p>
                  {a.publishedAt && (
                    <p className="text-xs text-text-secondary mt-0.5">{formatDate(a.publishedAt)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
