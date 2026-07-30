import React, { useState, useMemo } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { attendanceApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { AttendanceBadge } from '../../components/ui/Badge'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import {
  Plus, Key, Lock, CheckCircle, XCircle, Clock,
  ChevronLeft, ChevronRight, Users, BookOpen, FolderOpen,
} from 'lucide-react'

export default function TeacherAttendance() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const teacher = user?.profile
  const assignments: any[] = useMemo(() => teacher?.subjectAssignments || [], [teacher])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [selectedSection, setSelectedSection] = useState<any>(null)

  // ── Session / modal state ───────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [codePassword, setCodePassword] = useState('')
  const [codeResult, setCodeResult] = useState<any>(null)
  const [codeError, setCodeError] = useState('')
  const [form, setForm] = useState({
    subjectId: '',
    sectionId: '',
    attendanceDate: format(new Date(), 'yyyy-MM-dd'),
  })

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['teacher-sessions'],
    queryFn: () => attendanceApi.getSessions().then(r => r.data),
  })

  const { data: sessionDetail } = useQuery({
    queryKey: ['session-detail', selectedSession?.id],
    queryFn: () => attendanceApi.getSession(selectedSession!.id).then(r => r.data),
    enabled: !!selectedSession?.id,
  })

  // ── Section groups ──────────────────────────────────────────────────────────
  const sectionGroups = useMemo(() => {
    const map: Record<string, { section: any; subjects: any[] }> = {}
    assignments.forEach(a => {
      if (!a.sectionId) return
      if (!map[a.sectionId]) map[a.sectionId] = { section: a.section, subjects: [] }
      if (!map[a.sectionId].subjects.find((s: any) => s.subjectId === a.subjectId)) {
        map[a.sectionId].subjects.push(a)
      }
    })
    return Object.values(map)
  }, [assignments])

  // ── Student counts per section ──────────────────────────────────────────────
  const sectionIds = useMemo(() => [...new Set(assignments.map(a => a.sectionId))], [assignments])
  const studentCountQueries = useQueries({
    queries: sectionIds.map(id => ({
      queryKey: ['section-students', id],
      queryFn: () => structureApi.getSectionStudents(id).then(r => r.data),
    })),
  })
  const studentCounts = useMemo(
    () => Object.fromEntries(sectionIds.map((id, i) => [id, studentCountQueries[i].data?.length ?? 0])),
    [sectionIds, studentCountQueries],
  )

  // ── Sessions filtered to selected section ───────────────────────────────────
  const visibleSessions = useMemo(
    () => selectedSection ? sessions.filter((s: any) => s.sectionId === selectedSection.id) : sessions,
    [sessions, selectedSection],
  )

  // ── Subjects available in selected section (for create form) ────────────────
  const sectionSubjects = useMemo(() => {
    if (!selectedSection) return [...new Map(assignments.map(a => [a.subjectId, a])).values()]
    return [...new Map(
      assignments.filter(a => a.sectionId === selectedSection.id).map(a => [a.subjectId, a])
    ).values()]
  }, [selectedSection, assignments])

  // For the create form: sections available for selected subject
  const subjectSections = assignments.filter((a: any) => a.subjectId === form.subjectId)

  // ── Mutations ───────────────────────────────────────────────────────────────
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

  function openCreateModal() {
    setForm({
      subjectId: '',
      sectionId: selectedSection?.id || '',
      attendanceDate: format(new Date(), 'yyyy-MM-dd'),
    })
    setShowCreate(true)
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSpinner />

  // ── Section card landing view ───────────────────────────────────────────────
  if (!selectedSection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Select a section to view and manage attendance sessions.
          </p>
        </div>

        {sectionGroups.length === 0 ? (
          <EmptyState
            title="No Assigned Sections"
            description="Contact your administrator to get sections assigned to your account."
            icon={<FolderOpen className="w-8 h-8 text-primary" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionGroups.map(({ section, subjects }) => {
              const sectionSessions = sessions.filter((s: any) => s.sectionId === section?.id)
              const openCount = sectionSessions.filter((s: any) => s.sessionStatus === 'open').length
              return (
                <div
                  key={section?.id}
                  onClick={() => setSelectedSection(section)}
                  className="card cursor-pointer hover:shadow-card-hover hover:ring-1 hover:ring-primary/30 transition-all duration-200 select-none"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-poppins font-semibold text-text-primary truncate">{section?.name}</p>
                      {openCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-inter text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                          {openCount} open session{openCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-background rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <p className="font-inter text-xs text-text-secondary">Students</p>
                      </div>
                      <p className="font-poppins font-bold text-xl text-text-primary">
                        {studentCounts[section?.id] ?? '—'}
                      </p>
                    </div>
                    <div className="bg-background rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-secondary" />
                        <p className="font-inter text-xs text-text-secondary">Subjects</p>
                      </div>
                      <p className="font-poppins font-bold text-xl text-text-primary">{subjects.length}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="font-inter text-xs text-text-secondary">
                      {sectionSessions.length} total session{sectionSessions.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Section detail view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Back */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-text-secondary font-inter text-sm mt-1 flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            {selectedSection.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedSection(null)}
            className="flex items-center gap-1.5 text-text-secondary font-inter text-sm hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Button onClick={openCreateModal} icon={<Plus className="w-4 h-4" />}>
            New Session
          </Button>
        </div>
      </div>

      {/* Session list */}
      {visibleSessions.length === 0 ? (
        <EmptyState
          title="No Sessions for This Section"
          description="Create an attendance session to start tracking attendance."
          action={<Button onClick={openCreateModal}>Create Session</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {visibleSessions.map((s: any) => {
            const present = s.attendanceRecords.filter((r: any) => r.status === 'present').length
            const total = s.attendanceRecords.length
            const pct = total > 0 ? Math.round((present / total) * 100) : 0
            return (
              <div key={s.id} className="card-hover" onClick={() => setSelectedSession(s)}>
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
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="New Attendance Session"
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
          {/* Section indicator */}
          <div className="p-3 bg-primary-light/30 rounded-xl flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="font-inter text-sm font-medium text-text-primary">{selectedSection.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Subject</label>
            <select
              className="input-field"
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">Select Subject</option>
              {sectionSubjects.map((a: any) => (
                <option key={a.subjectId} value={a.subjectId}>{a.subject?.name}</option>
              ))}
            </select>
          </div>

          {/* If teacher has subjects in multiple sections show section selector too */}
          {!selectedSection && (
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
          )}

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
            <Button
              variant="secondary"
              onClick={() => { setShowCodeModal(false); setCodeResult(null); setCodePassword('') }}
              className="w-full"
            >
              Back to Attendance Sheet
            </Button>
          </div>
        ) : sessionDetail ? (
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
        ) : <LoadingSpinner />}
      </Modal>
    </div>
  )
}
