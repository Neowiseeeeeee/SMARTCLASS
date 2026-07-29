import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { attendanceApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { AttendanceBadge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import { Plus, Key, Lock, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function TeacherAttendance() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const teacher = user?.profile
  const assignments = teacher?.subjectAssignments || []

  const [showCreate, setShowCreate] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [codePassword, setCodePassword] = useState('')
  const [codeResult, setCodeResult] = useState<any>(null)
  const [codeError, setCodeError] = useState('')
  const [form, setForm] = useState({ subjectId: '', sectionId: '', attendanceDate: format(new Date(), 'yyyy-MM-dd') })

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => attendanceApi.getSessions().then(r => r.data),
  })

  const { data: sessionDetail } = useQuery({
    queryKey: ['session-detail', selectedSession?.id],
    queryFn: () => attendanceApi.getSession(selectedSession!.id).then(r => r.data),
    enabled: !!selectedSession?.id,
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => attendanceApi.createSession(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-sessions'] }); setShowCreate(false) },
  })

  const updateRecord = useMutation({
    mutationFn: ({ id, status }: any) => attendanceApi.updateRecord(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session-detail', selectedSession?.id] }),
  })

  const closeMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.closeSession(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-sessions'] }); setSelectedSession(null) },
  })

  const generateCode = async () => {
    setCodeError('')
    try {
      const res = await attendanceApi.generateCode(selectedSession.id, { password: codePassword })
      setCodeResult(res.data)
    } catch (err: any) {
      setCodeError(err.response?.data?.error || 'Failed')
    }
  }

  // Get unique sections for selected subject
  const subjectSections = assignments.filter((a: any) => a.subjectId === form.subjectId)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">Manage classroom attendance sessions</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>
          New Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="No Attendance Sessions"
          description="Create an attendance session to start tracking attendance."
          action={<Button onClick={() => setShowCreate(true)}>Create Session</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {sessions.map((s: any) => {
            const present = s.attendanceRecords.filter((r: any) => r.status === 'present').length
            const total = s.attendanceRecords.length
            const pct = total > 0 ? Math.round((present / total) * 100) : 0
            return (
              <div
                key={s.id}
                className="card-hover"
                onClick={() => setSelectedSession(s)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-poppins font-semibold text-text-primary">{s.subject?.name}</h3>
                      <span className="badge bg-border text-text-secondary">{s.section?.name}</span>
                      <span className={`badge ${s.sessionStatus === 'open' ? 'bg-success/10 text-success' : 'bg-border text-text-secondary'}`}>
                        {s.sessionStatus === 'open' ? '● Open' : '✓ Closed'}
                      </span>
                    </div>
                    <p className="text-text-secondary font-inter text-sm mt-1">{formatDate(s.attendanceDate)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-poppins font-bold text-xl text-primary">{present}/{total}</p>
                    <p className="text-xs text-text-secondary">{pct}% present</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Session Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Attendance Session"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={() => createMutation.mutate(form)}
              disabled={!form.subjectId || !form.sectionId}
            >
              Create Session
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Subject</label>
            <select
              className="input-field"
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, sectionId: '' }))}
            >
              <option value="">Select Subject</option>
              {[...new Map(assignments.map((a: any) => [a.subjectId, a])).values()].map((a: any) => (
                <option key={a.subjectId} value={a.subjectId}>{a.subject?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Section</label>
            <select
              className="input-field"
              value={form.sectionId}
              onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}
              disabled={!form.subjectId}
            >
              <option value="">Select Section</option>
              {subjectSections.map((a: any) => (
                <option key={a.sectionId} value={a.sectionId}>{a.section?.name}</option>
              ))}
            </select>
          </div>
          <Input
            label="Attendance Date"
            type="date"
            value={form.attendanceDate}
            onChange={e => setForm(f => ({ ...f, attendanceDate: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Session Detail Modal */}
      <Modal
        open={!!selectedSession}
        onClose={() => { setSelectedSession(null); setCodeResult(null); setShowCodeModal(false) }}
        title={`${selectedSession?.subject?.name} — ${selectedSession?.section?.name}`}
        size="xl"
        footer={
          <div className="flex gap-3 flex-wrap">
            {selectedSession?.sessionStatus === 'open' && (
              <>
                <Button
                  variant="secondary"
                  icon={<Key className="w-4 h-4" />}
                  onClick={() => setShowCodeModal(true)}
                >
                  Generate Session Code
                </Button>
                <Button
                  variant="danger"
                  onClick={() => closeMutation.mutate(selectedSession.id)}
                  loading={closeMutation.isPending}
                >
                  Close Session
                </Button>
              </>
            )}
          </div>
        }
      >
        {showCodeModal ? (
          <div className="space-y-4">
            <p className="font-inter text-sm text-text-secondary">
              Enter your password to generate an Attendance Session Code for student self-attendance.
            </p>
            <Input
              label="Your Password"
              type="password"
              placeholder="Verify your identity"
              icon={<Lock className="w-4 h-4" />}
              value={codePassword}
              onChange={e => setCodePassword(e.target.value)}
            />
            {codeError && <p className="text-danger text-sm">{codeError}</p>}
            {codeResult ? (
              <div className="p-6 bg-primary-light rounded-2xl text-center">
                <p className="text-xs text-text-secondary font-inter uppercase tracking-wider mb-2">Session Code</p>
                <p className="text-5xl font-poppins font-bold text-primary tracking-widest">{codeResult.sessionCode}</p>
                <p className="text-xs text-text-secondary mt-3 font-inter">
                  Expires: {format(new Date(codeResult.expiresAt), 'h:mm a')}
                </p>
              </div>
            ) : (
              <Button onClick={generateCode} className="w-full">Generate Code</Button>
            )}
            <Button variant="secondary" onClick={() => { setShowCodeModal(false); setCodeResult(null); setCodePassword('') }} className="w-full">
              Back to Attendance Sheet
            </Button>
          </div>
        ) : (
          sessionDetail ? (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionDetail.attendanceRecords.map((r: any) => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.student?.fullName}</td>
                      <td><AttendanceBadge status={r.status} /></td>
                      <td className="text-text-secondary text-sm">
                        {r.status !== 'absent' ? format(new Date(r.timeRecorded), 'h:mm a') : '—'}
                      </td>
                      <td>
                        {sessionDetail.sessionStatus === 'open' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateRecord.mutate({ id: r.id, status: 'present' })}
                              className={`p-1.5 rounded-lg transition-colors ${r.status === 'present' ? 'bg-success/20 text-success' : 'hover:bg-success/10 text-text-secondary hover:text-success'}`}
                              title="Present"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateRecord.mutate({ id: r.id, status: 'absent' })}
                              className={`p-1.5 rounded-lg transition-colors ${r.status === 'absent' ? 'bg-danger/20 text-danger' : 'hover:bg-danger/10 text-text-secondary hover:text-danger'}`}
                              title="Absent"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateRecord.mutate({ id: r.id, status: 'late' })}
                              className={`p-1.5 rounded-lg transition-colors ${r.status === 'late' ? 'bg-warning/20 text-yellow-700' : 'hover:bg-warning/10 text-text-secondary hover:text-yellow-700'}`}
                              title="Late"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <LoadingSpinner />
        )}
      </Modal>
    </div>
  )
}
