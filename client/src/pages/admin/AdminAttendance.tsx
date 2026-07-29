import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceApi } from '../../lib/api'
import { formatDate, formatTime } from '../../lib/utils'
import { AttendanceBadge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { ClipboardList } from 'lucide-react'

export default function AdminAttendance() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: () => attendanceApi.getAdminSessions().then(r => r.data),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Attendance Management</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">View and oversee all attendance sessions</p>
      </div>

      {(sessions as any[]).length === 0 ? (
        <EmptyState title="No Sessions Yet" description="Attendance sessions created by teachers will appear here." icon={<ClipboardList className="w-8 h-8 text-primary" />} />
      ) : (
        <div className="space-y-4">
          {(sessions as any[]).map((s: any) => {
            const present = s.attendanceRecords?.filter((r: any) => r.status === 'present').length || 0
            const total = s.attendanceRecords?.length || 0
            const pct = total > 0 ? Math.round((present / total) * 100) : 0
            return (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-poppins font-semibold">{s.subject?.name}</h3>
                      <span className="badge bg-border text-text-secondary">{s.section?.name}</span>
                      <span className={`badge ${s.sessionStatus === 'open' ? 'bg-success/10 text-success' : 'bg-border text-text-secondary'}`}>
                        {s.sessionStatus}
                      </span>
                    </div>
                    <p className="text-text-secondary font-inter text-sm mt-1">
                      Teacher: {s.teacher?.fullName} · {formatDate(s.attendanceDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-poppins font-bold text-xl text-primary">{present}/{total}</p>
                    <p className="text-xs text-text-secondary">{pct}% present</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
