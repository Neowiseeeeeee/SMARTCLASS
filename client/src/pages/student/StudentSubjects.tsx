import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { structureApi } from '../../lib/api'
import { BookOpen, User } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'

export default function StudentSubjects() {
  const { user } = useAuth()
  const currentAssignment = user?.profile?.sectionAssignments?.[0]

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', currentAssignment?.sectionId],
    queryFn: () => structureApi.getSchedules({ sectionId: currentAssignment?.sectionId }).then(r => r.data),
    enabled: !!currentAssignment?.sectionId,
  })

  // Deduplicate subjects
  const subjects = Array.from(new Map(schedules.map((s: any) => [s.subjectId, s])).values())

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Subjects</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Your enrolled subjects for the current academic year
        </p>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          title="No Subjects Found"
          description="No subjects have been assigned to your section yet."
          icon={<BookOpen className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((s: any) => (
            <div key={s.subjectId} className="card hover:shadow-card-hover transition-all">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-poppins font-semibold text-text-primary truncate">
                    {s.subject?.name}
                  </h3>
                  <p className="text-xs text-text-secondary font-inter mt-0.5">{s.subject?.code}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <User className="w-3.5 h-3.5 text-text-secondary" />
                    <span className="text-sm text-text-secondary font-inter truncate">
                      {s.teacher?.fullName || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="badge bg-primary-light text-primary-dark">{s.section?.name}</span>
                    <span className="badge bg-background text-text-secondary">{s.academicYear?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
