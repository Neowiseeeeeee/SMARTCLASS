import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { studentsApi } from '../../lib/api'
import { formatDate, formatTime } from '../../lib/utils'
import { ClipboardList } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { AttendanceBadge } from '../../components/ui/Badge'

export default function StudentAttendance() {
  const { user } = useAuth()
  const studentId = user?.profile?.id

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['student-attendance', studentId],
    queryFn: () => studentsApi.getAttendance(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 }
    records.forEach((r: any) => { if (r.status in counts) counts[r.status as keyof typeof counts]++ })
    return counts
  }, [records])

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Attendance</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Your attendance history and summary</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: stats.present, color: 'bg-success/10 text-success' },
          { label: 'Absent', value: stats.absent, color: 'bg-danger/10 text-danger' },
          { label: 'Late', value: stats.late, color: 'bg-warning/10 text-yellow-700' },
          { label: 'Excused', value: stats.excused, color: 'bg-info/10 text-info' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-poppins font-bold ${color.split(' ')[1]}`}>{value}</p>
            <p className="text-text-secondary font-inter text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="card">
        <h2 className="section-heading mb-4">Attendance Records</h2>
        {records.length === 0 ? (
          <EmptyState
            title="No Records Yet"
            description="Attendance records will appear here once your teacher conducts sessions."
            icon={<ClipboardList className="w-8 h-8 text-primary" />}
          />
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Subject</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Time Recorded</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id}>
                    <td className="font-medium">{formatDate(r.session?.attendanceDate)}</td>
                    <td>{r.session?.subject?.name}</td>
                    <td>{r.session?.section?.name}</td>
                    <td><AttendanceBadge status={r.status} /></td>
                    <td className="text-text-secondary">{formatTime(r.timeRecorded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
