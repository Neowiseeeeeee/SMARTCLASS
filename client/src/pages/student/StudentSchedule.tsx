import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { structureApi } from '../../lib/api'
import { Calendar, Download } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'

export default function StudentSchedule() {
  const { user } = useAuth()
  const currentAssignment = user?.profile?.sectionAssignments?.[0]

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', currentAssignment?.sectionId],
    queryFn: () => structureApi.getSchedules({ sectionId: currentAssignment?.sectionId }).then(r => r.data),
    enabled: !!currentAssignment?.sectionId,
  })

  // Group by academic year
  const byYear = schedules.reduce((acc: any, s: any) => {
    const y = s.academicYear?.name || 'Unknown'
    if (!acc[y]) acc[y] = []
    acc[y].push(s)
    return acc
  }, {})

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Class Schedule</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Your class schedules by academic year</p>
      </div>

      {Object.keys(byYear).length === 0 ? (
        <EmptyState
          title="No Schedules Available"
          description="No class schedules have been assigned to your section yet."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(byYear).map(([year, items]: any) => (
            <div key={year} className="card">
              <h2 className="section-heading mb-4">Academic Year {year}</h2>
              <div className="grid gap-3">
                {items.map((s: any) => (
                  <div key={s.id} className="flex items-center gap-4 p-4 bg-background rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-poppins font-semibold text-text-primary">{s.subject?.name}</span>
                        {s.dayOfWeek && (
                          <span className="badge bg-primary-light text-primary-dark">{s.dayOfWeek}</span>
                        )}
                        {s.startTime && s.endTime && (
                          <span className="badge bg-background border border-border text-text-secondary">
                            {s.startTime} – {s.endTime}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary font-inter mt-1">
                        {s.teacher?.fullName || 'TBA'}
                      </p>
                    </div>
                    {s.scheduleImage && (
                      <a
                        href={s.scheduleImage}
                        download
                        className="p-2 hover:bg-primary-light rounded-lg transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <Download className="w-4 h-4 text-primary" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
