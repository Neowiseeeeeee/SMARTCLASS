import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { studentsApi, authApi } from '../../lib/api'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import { User, Phone, Users, BookOpen, CheckCircle2, KeyRound, Eye, EyeOff } from 'lucide-react'

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-inter text-text-secondary mb-0.5">{label}</p>
      <p className="font-inter text-text-primary text-sm font-medium">
        {value || <span className="text-text-secondary/60 italic">Not set</span>}
      </p>
    </div>
  )
}

export default function StudentProfile() {
  const { user, refetch } = useAuth() as any
  const qc = useQueryClient()
  const studentId = user?.profile?.id

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => studentsApi.getOne(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  // ── Profile edit state ─────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    contactNumber: '',
    gender: '',
    birthDate: '',
    address: '',
    guardianName: '',
    guardianContact: '',
    emergencyContact: '',
    biography: '',
  })

  useEffect(() => {
    if (student) {
      setForm({
        contactNumber: student.contactNumber || '',
        gender: student.gender || '',
        birthDate: student.birthDate ? student.birthDate.split('T')[0] : '',
        address: student.profile?.address || '',
        guardianName: student.profile?.guardianName || '',
        guardianContact: student.profile?.guardianContact || '',
        emergencyContact: student.profile?.emergencyContact || '',
        biography: student.profile?.biography || '',
      })
    }
  }, [student])

  const updateMut = useMutation({
    mutationFn: (data: any) => studentsApi.updateProfile(studentId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-profile', studentId] })
      if (refetch) refetch()
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // ── Change password state ──────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  const changePwMut = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(data),
    onSuccess: () => {
      setPwSaved(true)
      setPwError('')
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 4000)
    },
    onError: (err: any) => {
      setPwError(err.response?.data?.error || 'Failed to change password. Please try again.')
    },
  })

  const handleChangePw = () => {
    setPwError('')
    if (!pwForm.current) { setPwError('Current password is required.'); return }
    if (pwForm.next.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return }
    changePwMut.mutate({ currentPassword: pwForm.current, newPassword: pwForm.next })
  }

  if (isLoading) return <LoadingSpinner />

  const assignment = student?.sectionAssignments?.[0]

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">View and update your personal information</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-xl text-sm font-inter font-medium">
            <CheckCircle2 className="w-4 h-4" /> Saved successfully
          </div>
        )}
      </div>

      {/* Identity card */}
      <div className="card bg-primary-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
            <User className="w-8 h-8 text-white/80" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-poppins font-bold text-xl text-white leading-tight">{student?.fullName}</h2>
            <p className="font-inter text-white/60 text-sm mt-0.5">{student?.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white/90 text-xs font-inter font-medium">
                #{student?.studentNumber}
              </span>
              {assignment && (
                <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white/90 text-xs font-inter font-medium">
                  {assignment.section?.name}
                </span>
              )}
              {assignment && (
                <span className="px-2.5 py-1 rounded-lg bg-white/15 text-white/90 text-xs font-inter font-medium">
                  {assignment.academicYear?.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Profile info / edit ── */}
      {!editing ? (
        <div className="space-y-4">
          {/* Personal Info */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h2 className="font-poppins font-semibold text-text-primary">Personal Information</h2>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Gender" value={student?.gender} />
              <Field label="Date of Birth" value={student?.birthDate
                ? new Date(student.birthDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
                : undefined} />
              <Field label="Contact Number" value={student?.contactNumber} />
              <div className="col-span-2 sm:col-span-3">
                <Field label="Address" value={student?.profile?.address} />
              </div>
              {student?.profile?.biography && (
                <div className="col-span-2 sm:col-span-3">
                  <Field label="About Me" value={student.profile.biography} />
                </div>
              )}
            </div>
          </div>

          {/* Guardian Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-secondary" />
              <h2 className="font-poppins font-semibold text-text-primary">Guardian & Emergency Contact</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Guardian Name" value={student?.profile?.guardianName} />
              <Field label="Guardian Contact" value={student?.profile?.guardianContact} />
              <Field label="Emergency Contact" value={student?.profile?.emergencyContact} />
            </div>
          </div>

          {/* Academic Info (read-only) */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-accent" />
              <h2 className="font-poppins font-semibold text-text-primary">Academic Information</h2>
              <span className="text-xs text-text-secondary font-inter italic ml-1">(managed by admin)</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Student Number" value={student?.studentNumber} />
              <Field label="Student Code" value={student?.studentCode} />
              <Field label="Email" value={student?.email} />
              <Field label="Section" value={assignment?.section?.name} />
              <Field label="Grade Level" value={assignment?.section?.gradeLevel?.name} />
              <Field label="Academic Year" value={assignment?.academicYear?.name} />
            </div>
          </div>
        </div>
      ) : (
        <div className="card space-y-5">
          <h2 className="font-poppins font-semibold text-text-primary">Edit Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Gender</label>
              <select className="input-field" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Date of Birth</label>
              <input type="date" className="input-field" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
            </div>
            <Input label="Contact Number" placeholder="e.g. 09XX-XXX-XXXX" value={form.contactNumber} onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))} />
            <div className="sm:col-span-2">
              <Input label="Home Address" placeholder="Street, Barangay, City, Province" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
          </div>

          <hr className="border-border" />
          <h3 className="font-poppins font-medium text-text-primary text-sm">Guardian & Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Guardian / Parent Name" placeholder="Full name" value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} />
            <Input label="Guardian Contact Number" placeholder="09XX-XXX-XXXX" value={form.guardianContact} onChange={e => setForm(f => ({ ...f, guardianContact: e.target.value }))} />
            <div className="sm:col-span-2">
              <Input label="Emergency Contact" placeholder="Name & number for emergencies" value={form.emergencyContact} onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))} />
            </div>
          </div>

          <hr className="border-border" />
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
              About Me <span className="text-text-secondary font-normal">(optional)</span>
            </label>
            <textarea
              className="input-field resize-none"
              rows={3}
              placeholder="A short bio about yourself..."
              value={form.biography}
              onChange={e => setForm(f => ({ ...f, biography: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button loading={updateMut.isPending} onClick={() => updateMut.mutate(form)}>Save Changes</Button>
          </div>
          {updateMut.isError && (
            <p className="text-sm text-danger font-inter text-right">Failed to save. Please try again.</p>
          )}
        </div>
      )}

      {/* ── Change Password ── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-warning" />
          <h2 className="font-poppins font-semibold text-text-primary">Change Password</h2>
        </div>
        <p className="text-text-secondary font-inter text-sm">
          Update your login password. You'll need your current password to make changes.
        </p>

        {pwSaved && (
          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 text-success rounded-xl text-sm font-inter font-medium">
            <CheckCircle2 className="w-4 h-4" /> Password changed successfully!
          </div>
        )}

        <div className="space-y-3 max-w-sm">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="Enter your current password"
                value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showNext ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="At least 6 characters"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNext(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showNext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Re-enter new password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </div>

          {pwError && (
            <p className="text-sm text-danger font-inter">{pwError}</p>
          )}

          <Button
            loading={changePwMut.isPending}
            onClick={handleChangePw}
            disabled={!pwForm.current || !pwForm.next || !pwForm.confirm}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Update Password
          </Button>
        </div>
      </div>
    </div>
  )
}
