import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import { Plus, Search, RotateCcw, Archive, Users } from 'lucide-react'

export default function AdminTeachers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<any>(null)
  const [form, setForm] = useState({ fullName: '', email: '', employeeId: '', department: '', contactNumber: '' })

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers', search],
    queryFn: () => teachersApi.getAll({ search: search || undefined, status: 'active' }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => teachersApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['teachers'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setCreatedCreds(res.data)
      setShowAdd(false)
      setForm({ fullName: '', email: '', employeeId: '', department: '', contactNumber: '' })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => teachersApi.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) },
  })

  const resetPwMutation = useMutation({
    mutationFn: (id: string) => teachersApi.resetPassword(id),
    onSuccess: (res) => setCreatedCreds({ teacher: { fullName: '' }, tempPassword: res.data.tempPassword }),
  })

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">{(teachers as any[]).length} active teachers</p>
        </div>
        <Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Teacher</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input className="input-field pl-10" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {(teachers as any[]).length === 0 ? (
        <EmptyState
          title="No Teachers Found"
          description={search ? 'Try a different search term.' : 'Add your first teacher to get started.'}
          action={!search ? <Button onClick={() => setShowAdd(true)}>Add Teacher</Button> : undefined}
          icon={<Users className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Teacher</th><th>Employee ID</th><th>Department</th><th>Subjects</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {(teachers as any[]).map((t: any) => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={t.fullName} size="sm" />
                      <div>
                        <p className="font-medium">{t.fullName}</p>
                        <p className="text-xs text-text-secondary">{t.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-text-secondary">{t.employeeId || '—'}</td>
                  <td>{t.department || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {t.subjectAssignments?.slice(0, 2).map((a: any) => (
                        <span key={a.id} className="badge bg-primary-light text-primary-dark">{a.subject?.name}</span>
                      ))}
                      {(t.subjectAssignments?.length || 0) > 2 && (
                        <span className="badge bg-border text-text-secondary">+{t.subjectAssignments.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Badge variant={t.user?.isFirstLogin ? 'warning' : 'success'}>
                      {t.user?.isFirstLogin ? 'Pending' : 'Active'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => resetPwMutation.mutate(t.id)} className="p-1.5 hover:bg-warning/10 text-warning rounded-lg transition-colors" title="Reset Password"><RotateCcw className="w-4 h-4" /></button>
                      <button onClick={() => archiveMutation.mutate(t.id)} className="p-1.5 hover:bg-danger/10 text-danger rounded-lg transition-colors" title="Archive"><Archive className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Teacher" size="md"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.fullName || !form.email}>Create Teacher</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name *" placeholder="Maria Santos" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <Input label="Email Address *" type="email" placeholder="maria@erlhs.edu.ph" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Employee ID" placeholder="EMP-001" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))} />
          <Input label="Department" placeholder="Science Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          <Input label="Contact Number" placeholder="+63 9XX XXX XXXX" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} />
        </div>
      </Modal>

      <Modal open={!!createdCreds} onClose={() => setCreatedCreds(null)} title="Teacher Account Created" size="sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-success" />
          </div>
          <p className="font-inter text-sm text-text-secondary">Share these credentials with the teacher:</p>
          <div className="p-4 bg-primary-light rounded-xl text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary font-inter">Email:</span>
              <span className="font-poppins font-semibold text-primary text-sm">{createdCreds?.teacher?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary font-inter">Temp Password:</span>
              <span className="font-poppins font-semibold text-primary font-mono">{createdCreds?.tempPassword}</span>
            </div>
          </div>
          <Button variant="primary" className="w-full" onClick={() => setCreatedCreds(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  )
}
