import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { studentsApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Avatar } from '../../components/ui/Avatar'
import { X, Camera, CheckCircle2, Ruler, Weight } from 'lucide-react'

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']

interface Props {
  onClose: () => void
}

export default function StudentProfileModal({ onClose }: Props) {
  const { user, refetch } = useAuth() as any
  const qc = useQueryClient()
  const studentId = user?.profile?.id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => studentsApi.getOne(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const [saved, setSaved] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    contactNumber: '',
    gender: '',
    birthDate: '',
    address: '',
    guardianName: '',
    guardianContact: '',
    emergencyContact: '',
    biography: '',
    weight: '',
    height: '',
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
        weight: student.profile?.weight != null ? String(student.profile.weight) : '',
        height: student.profile?.height != null ? String(student.profile.height) : '',
      })
    }
  }, [student])

  const avatarMut = useMutation({
    mutationFn: (file: File) => studentsApi.uploadAvatar(studentId!, file),
  })

  const updateMut = useMutation({
    mutationFn: (data: any) => studentsApi.updateProfile(studentId!, data),
    onSuccess: async () => {
      if (avatarFile) {
        await avatarMut.mutateAsync(avatarFile)
      }
      qc.invalidateQueries({ queryKey: ['student-profile', studentId] })
      if (refetch) refetch()
      setSaved(true)
      setTimeout(() => { setSaved(false); onClose() }, 1500)
    },
  })

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    updateMut.mutate(form)
  }

  const currentPic = avatarPreview || user?.profile?.profile?.profilePicture || null
  const name = student?.fullName || user?.profile?.fullName || 'Student'

  // BMI calc
  const weightNum = parseFloat(form.weight)
  const heightNum = parseFloat(form.height)
  const bmi = (!isNaN(weightNum) && !isNaN(heightNum) && heightNum > 0)
    ? (weightNum / Math.pow(heightNum / 100, 2)).toFixed(1)
    : null
  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? 'Underweight'
      : parseFloat(bmi) < 25 ? 'Normal weight'
      : parseFloat(bmi) < 30 ? 'Overweight'
      : 'Obese'
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-poppins font-bold text-text-primary text-lg">Edit Profile</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-primary-light text-text-secondary hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar name={name} src={currentPic} size="xl" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors"
                    title="Change photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <div className="text-center">
                  <p className="font-poppins font-bold text-text-primary text-base">{name}</p>
                  <p className="font-inter text-text-secondary text-sm">
                    {student?.studentNumber}
                  </p>
                </div>
              </div>

              {/* Weight & Height */}
              <div>
                <h3 className="font-poppins font-semibold text-text-primary text-sm mb-3 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-primary" /> Physical Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
                      Weight <span className="text-text-secondary font-normal">(kg)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      placeholder="e.g. 55"
                      className="input-field"
                      value={form.weight}
                      onChange={e => setForm(f => ({ ...f, weight: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
                      Height <span className="text-text-secondary font-normal">(cm)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      step="0.1"
                      placeholder="e.g. 160"
                      className="input-field"
                      value={form.height}
                      onChange={e => setForm(f => ({ ...f, height: e.target.value }))}
                    />
                  </div>
                </div>
                {bmi && (
                  <p className="mt-2 text-xs font-inter text-text-secondary">
                    BMI: <span className="font-semibold text-text-primary">{bmi}</span>
                    <span className="ml-1 text-primary">({bmiLabel})</span>
                  </p>
                )}
              </div>

              {/* Personal Info */}
              <div>
                <h3 className="font-poppins font-semibold text-text-primary text-sm mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Gender</label>
                    <select
                      className="input-field"
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    >
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      className="input-field"
                      value={form.birthDate}
                      onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                    />
                  </div>
                  <Input
                    label="Contact Number"
                    placeholder="e.g. 09XX-XXX-XXXX"
                    value={form.contactNumber}
                    onChange={e => setForm(f => ({ ...f, contactNumber: e.target.value }))}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Home Address"
                      placeholder="Street, Barangay, City, Province"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian */}
              <div>
                <h3 className="font-poppins font-semibold text-text-primary text-sm mb-3">Guardian & Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Guardian / Parent Name"
                    placeholder="Full name"
                    value={form.guardianName}
                    onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))}
                  />
                  <Input
                    label="Guardian Contact Number"
                    placeholder="09XX-XXX-XXXX"
                    value={form.guardianContact}
                    onChange={e => setForm(f => ({ ...f, guardianContact: e.target.value }))}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Emergency Contact"
                      placeholder="Name & number for emergencies"
                      value={form.emergencyContact}
                      onChange={e => setForm(f => ({ ...f, emergencyContact: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex items-center justify-between gap-3">
          {saved ? (
            <span className="flex items-center gap-2 text-success text-sm font-inter font-medium">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          ) : (
            <span />
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button
              loading={updateMut.isPending || avatarMut.isPending}
              onClick={handleSave}
              disabled={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
        {updateMut.isError && (
          <p className="px-6 pb-3 text-sm text-danger font-inter text-right -mt-2">
            Failed to save. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
