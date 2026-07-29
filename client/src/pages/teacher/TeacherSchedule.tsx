import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { structureApi } from '../../lib/api'
import { Calendar, Download } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'

export default function TeacherSchedule() {
  const { user } = useAuth()
  const teacher = user?.profile

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['teacher-schedules', teacher?.id],
    queryFn: () => structureApi.getSchedules({ teacherId: teacher?.id }).then(r => r.data),
    enabled: !!teacher?.id,
  })

  const byYear = schedules.reduce((acc: any, s: any) => {
    const y = s.academicYear?.name || 'Unknown'
    if (!acc[y]) acc[y] = []
    acc[y].push(s)
    return acc
  }, {})

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Class Schedule</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Your official teaching schedule by academic year</p>
      </div>

      {Object.keys(byYear).length === 0 ? (
        <EmptyState
          title="No Schedule Yet"
          description="Your class schedule will appear here once assigned by the administrator."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />
      ) : (
        Object.entries(byYear).map(([year, items]: any) => (
          <div key={year} className="card">
            <h2 className="section-heading mb-4">Academic Year {year}</h2>
            <div className="grid gap-3">
              {items.map((s: any) => (
                <div key={s.id} className="flex items-center gap-4 p-4 bg-background rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-poppins font-semibold text-text-primary">{s.subject?.name}</span>
                      <span className="badge bg-primary-light text-primary-dark">{s.section?.name}</span>
                      {s.dayOfWeek && <span className="badge bg-border text-text-secondary">{s.dayOfWeek}</span>}
                      {s.startTime && s.endTime && (
                        <span className="badge bg-background border border-border text-text-secondary">
                          {s.startTime} – {s.endTime}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.scheduleImage && (
                    <a href={s.scheduleImage} download className="p-2 hover:bg-primary-light rounded-lg transition-colors">
                      <Download className="w-4 h-4 text-primary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
