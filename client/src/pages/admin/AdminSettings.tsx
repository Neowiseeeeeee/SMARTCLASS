import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import { Settings, Save, Check } from 'lucide-react'

export default function AdminSettings() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data),
  })

  useEffect(() => {
    if (settings) setForm(settings as Record<string, string>)
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (d: any) => settingsApi.update(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); setSaved(true); setTimeout(() => setSaved(false), 2000) },
  })

  const fields = [
    { key: 'schoolName', label: 'School Name', placeholder: 'Exequiel R. Lina High School' },
    { key: 'currentAcademicYear', label: 'Current Academic Year', placeholder: '2024-2025' },
    { key: 'currentSemester', label: 'Current Semester', placeholder: '1st Semester' },
    { key: 'systemVersion', label: 'System Version', placeholder: 'v1.0.0' },
  ]

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">System Settings</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Configure SMARTCLASS system-wide settings</p>
      </div>

      <div className="card max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h2 className="section-heading">School Information</h2>
        </div>

        <div className="space-y-4">
          {fields.map(f => (
            <Input
              key={f.key}
              label={f.label}
              placeholder={f.placeholder}
              value={form[f.key] || ''}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            />
          ))}
        </div>

        <div className="mt-6">
          <Button
            onClick={() => saveMutation.mutate(form)}
            loading={saveMutation.isPending}
            icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            variant={saved ? 'secondary' : 'primary'}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="card max-w-2xl">
        <h2 className="section-heading mb-4">Security Settings</h2>
        <div className="space-y-3">
          {[
            { label: 'Inactivity Timeout', desc: 'Auto-logout after inactivity (minutes)', key: 'inactivityTimeout', placeholder: '10' },
            { label: 'Session Code Expiry', desc: 'Attendance session code validity (minutes)', key: 'sessionCodeExpiry', placeholder: '30' },
          ].map(f => (
            <div key={f.key} className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-inter font-medium text-sm text-text-primary">{f.label}</p>
                <p className="font-inter text-xs text-text-secondary">{f.desc}</p>
              </div>
              <Input
                className="w-24"
                type="number"
                placeholder={f.placeholder}
                value={form[f.key] || ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={() => saveMutation.mutate(form)} loading={saveMutation.isPending} size="sm">
            Save Security Settings
          </Button>
        </div>
      </div>
    </div>
  )
}
