import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { studentsApi, announcementsApi } from '../../lib/api'
import { calculatePerformance, formatDate } from '../../lib/utils'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import {
  User, BookOpen, Clock, CalendarDays, TrendingUp, Award, Target, CheckSquare, Megaphone
} from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const studentId = user?.profile?.id

  const { data: studentData } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.getOne(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const { data: scores = [] } = useQuery({
    queryKey: ['student-scores', studentId],
    queryFn: () => studentsApi.getScores(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => announcementsApi.getPublic().then(r => r.data),
    refetchInterval: 60_000,
  })

  const perf = calculatePerformance(scores)
  const currentAssignment = studentData?.sectionAssignments?.[0]
  const latestAnn = announcements.flatMap((c: any) => c.announcements).sort((a: any, b: any) =>
    new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
  )[0]

  if (!studentData) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Student Info */}
        <div className="card xl:col-span-1">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-poppins font-semibold text-text-primary text-lg truncate">
                {studentData.fullName}
              </h3>
              <p className="text-text-secondary font-inter text-sm">{studentData.studentNumber}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {currentAssignment && (
                  <>
                    <span className="badge bg-primary-light text-primary-dark">
                      {currentAssignment.section?.gradeLevel?.name}
                    </span>
                    {currentAssignment.section?.strand && (
                      <span className="badge bg-secondary/10 text-secondary">
                        {currentAssignment.section.strand.name}
                      </span>
                    )}
                    <span className="badge bg-border text-text-secondary">
                      {currentAssignment.section?.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Academic Performance */}
        <div className="card xl:col-span-1">
          <h3 className="font-poppins font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Performance Summary
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary-light rounded-xl p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-primary">{perf.percentage}%</p>
              <p className="text-xs text-text-secondary font-inter">Overall</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-text-primary">{perf.completed}</p>
              <p className="text-xs text-text-secondary font-inter">Activities</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-success">{perf.totalEarned}</p>
              <p className="text-xs text-text-secondary font-inter">Score Earned</p>
            </div>
            <div className="bg-background rounded-xl p-3 text-center">
              <p className="text-2xl font-poppins font-bold text-text-secondary">{perf.totalPossible}</p>
              <p className="text-xs text-text-secondary font-inter">Total Possible</p>
            </div>
          </div>
        </div>

        {/* Latest Announcement */}
        <div className="card xl:col-span-1">
          <h3 className="font-poppins font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-accent" />
            Latest Announcement
          </h3>
          {latestAnn ? (
            <div>
              <h4 className="font-poppins font-semibold text-text-primary mb-1 line-clamp-2">
                {latestAnn.title}
              </h4>
              {latestAnn.description && (
                <p className="text-text-secondary font-inter text-sm line-clamp-3">
                  {latestAnn.description}
                </p>
              )}
              {latestAnn.publishedAt && (
                <p className="text-xs text-text-secondary mt-2 font-inter">
                  {formatDate(latestAnn.publishedAt)}
                </p>
              )}
            </div>
          ) : (
            <p className="text-text-secondary font-inter text-sm">No announcements yet.</p>
          )}
        </div>
      </div>

      {/* Today's Schedule placeholder */}
      <div className="card">
        <h3 className="font-poppins font-semibold text-text-primary mb-4 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-info" />
          Today's Schedule — {format(new Date(), 'EEEE')}
        </h3>
        <div className="text-center py-8 text-text-secondary font-inter">
          <BookOpen className="w-10 h-10 mx-auto mb-2 text-border" />
          <p>Class schedules are managed by your administrator.</p>
          <p className="text-sm mt-1">Check the Class Schedule module for your full timetable.</p>
        </div>
      </div>
    </div>
  )
}
