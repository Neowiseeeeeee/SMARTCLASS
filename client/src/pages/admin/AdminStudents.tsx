import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import { Plus, Search, RotateCcw, Archive, Eye, GraduationCap, BookOpen } from 'lucide-react'
import AdminSections from './AdminSections'

type Tab = 'students' | 'sections'

export default function AdminStudents() {
  const [activeTab, setActiveTab] = useState<Tab>('students')
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [viewStudent, setViewStudent] = useState<any>(null)
  const [createdCreds, setCreatedCreds] = useState<any>(null)
  const [form, setForm] = useState({
    studentNumber: '', fullName: '', email: '', gender: '',
    birthDate: '', contactNumber: '', guardianName: '', guardianContact: '',
    gradeLevelId: '', strandId: '', sectionId: '', academicYearId: ''
  })

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', search],
    queryFn: () => studentsApi.getAll({ search: search || undefined, status: 'active' }).then(r => r.data),
  })

  const { data: gradeLevels = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => structureApi.getGradeLevels().then(r => r.data),
  })

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => structureApi.getAcademicYears().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => studentsApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      setCreatedCreds(res.data)
      setShowAdd(false)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => studentsApi.archive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }) },
  })

  const resetPwMutation = useMutation({
    mutationFn: (id: string) => studentsApi.resetPassword(id),
    onSuccess: (res) => setCreatedCreds({ student: viewStudent, tempPassword: res.data.tempPassword }),
  })

  const selectedLevel = gradeLevels.find((g: any) => g.id === form.gradeLevelId) as any
  const strands = selectedLevel?.strands || []
  const sections = selectedLevel?.sections?.filter((s: any) => !form.strandId || s.strandId === form.strandId) || []

  if (isLoading && activeTab === 'students') return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Manage student records and section assignments
          </p>
        </div>
        {activeTab === 'students' && (
          <Button onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>Add Student</Button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { id: 'students', label: 'All Students', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'sections', label: 'Sections', icon: <BookOpen className="w-4 h-4" /> },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all duration-150 ${
              activeTab === tab.id
                ? 'bg-white text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sections tab */}
      {activeTab === 'sections' && <AdminSections />}

      {/* Students tab content below */}
      {activeTab === 'students' && <>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
        <input
          className="input-field pl-10"
          placeholder="Search by name, student number, or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {(students as any[]).length === 0 ? (
        <EmptyState
          title="No Students Found"
          description={search ? 'Try a different search term.' : 'Add your first student to get started.'}
          action={!search ? <Button onClick={() => setShowAdd(true)}>Add Student</Button> : undefined}
          icon={<GraduationCap className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student Number</th>
                <th>Section</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(students as any[]).map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={s.fullName} src={s.profile?.profilePicture} size="sm" />
                      <span className="font-medium">{s.fullName}</span>
                    </div>
                  </td>
                  <td className="font-mono text-sm">{s.studentNumber}</td>
                  <td>
                    {s.sectionAssignments?.[0] ? (
                      <span className="badge bg-primary-light text-primary-dark">
                        {s.sectionAssignments[0].section?.gradeLevel?.name} – {s.sectionAssignments[0].section?.name}
                      </span>
                    ) : <span className="text-text-secondary">—</span>}
                  </td>
                  <td>
                    <Badge variant={s.user?.isFirstLogin ? 'warning' : 'success'}>
                      {s.user?.isFirstLogin ? 'Pending Setup' : 'Active'}
                    </Badge>
                  </td>
                  <td className="text-text-secondary">{s.user?.lastLogin ? formatDate(s.user.lastLogin, 'MMM d, yyyy') : '—'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setViewStudent(s)} className="p-1.5 hover:bg-info/10 text-info rounded-lg transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => resetPwMutation.mutate(s.id)} className="p-1.5 hover:bg-warning/10 text-warning rounded-lg transition-colors" title="Reset Password">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button onClick={() => archiveMutation.mutate(s.id)} className="p-1.5 hover:bg-danger/10 text-danger rounded-lg transition-colors" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Student Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Student" size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.studentNumber || !form.fullName || !form.email}>
              Create Student
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Student Number *" placeholder="e.g. 2024-00001" value={form.studentNumber} onChange={e => setForm(f => ({ ...f, studentNumber: e.target.value }))} />
          <Input label="Full Name *" placeholder="Juan Dela Cruz" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          <Input label="Email Address *" type="email" placeholder="juan@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Contact Number" placeholder="+63 9XX XXX XXXX" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Gender</label>
            <select className="input-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Select Gender</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </div>
          <Input label="Birth Date" type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
          <Input label="Guardian Name" placeholder="Parent/Guardian" value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} />
          <Input label="Guardian Contact" placeholder="+63 9XX XXX XXXX" value={form.guardianContact} onChange={e => setForm(f => ({ ...f, guardianContact: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Academic Year</label>
            <select className="input-field" value={form.academicYearId} onChange={e => setForm(f => ({ ...f, academicYearId: e.target.value }))}>
              <option value="">Select Academic Year</option>
              {(academicYears as any[]).map((y: any) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Grade Level</label>
            <select className="input-field" value={form.gradeLevelId} onChange={e => setForm(f => ({ ...f, gradeLevelId: e.target.value, strandId: '', sectionId: '' }))}>
              <option value="">Select Grade Level</option>
              {(gradeLevels as any[]).map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {strands.length > 0 && (
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Strand</label>
              <select className="input-field" value={form.strandId} onChange={e => setForm(f => ({ ...f, strandId: e.target.value, sectionId: '' }))}>
                <option value="">Select Strand</option>
                {strands.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Section</label>
            <select className="input-field" value={form.sectionId} onChange={e => setForm(f => ({ ...f, sectionId: e.target.value }))}>
              <option value="">Select Section</option>
              {sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal open={!!createdCreds} onClose={() => setCreatedCreds(null)} title="Student Account Created" size="sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
            <GraduationCap className="w-8 h-8 text-success" />
          </div>
          <p className="font-inter text-sm text-text-secondary">Share these credentials with the student:</p>
          <div className="p-4 bg-primary-light rounded-xl text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary font-inter">Student Number:</span>
              <span className="font-poppins font-semibold text-primary">{createdCreds?.student?.studentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-secondary font-inter">Temp Password:</span>
              <span className="font-poppins font-semibold text-primary font-mono">{createdCreds?.tempPassword}</span>
            </div>
          </div>
          <p className="text-xs text-text-secondary font-inter">The student will be prompted to change this password on first login.</p>
          <Button variant="primary" className="w-full" onClick={() => setCreatedCreds(null)}>Done</Button>
        </div>
      </Modal>
    </div>
  )
}
