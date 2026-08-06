import React, { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { settingsApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import {
  Settings, Save, Check, Upload, Trash2, Download, Database,
  ShieldCheck, GraduationCap, Monitor, Phone, KeyRound, RotateCcw, ExternalLink,
} from 'lucide-react'

const PERIODS = ['1st', '2nd', '3rd', '4th']

function Section({ title, description, icon, children }: {
  title: string; description: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="card max-w-4xl">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center text-primary flex-shrink-0">{icon}</div>
        <div>
          <h2 className="section-heading">{title}</h2>
          <p className="text-text-secondary font-inter text-sm mt-1">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({ label, description, value, onChange, type = 'text', placeholder }: {
  label: string; description?: string; value: string; onChange: (value: string) => void
  type?: string; placeholder?: string
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
      <div className="flex-1">
        <p className="font-inter font-medium text-sm text-text-primary">{label}</p>
        {description && <p className="font-inter text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      <Input
        className="sm:w-64"
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export default function AdminSettings() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [adminForm, setAdminForm] = useState({ username: '', currentPassword: '', newPassword: '' })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then(r => r.data as Record<string, string>),
  })

  useEffect(() => { if (settings) { setForm(settings); setAdminForm(p => ({ ...p, username: '' })) } }, [settings])

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] }); qc.invalidateQueries({ queryKey: ['public-settings'] })
      setSaved(true); setError(''); setTimeout(() => setSaved(false), 2200)
    },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not save settings.'),
  })
  const logoMutation = useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: r => { setForm(p => ({ ...p, schoolLogo: r.data.schoolLogo })); qc.invalidateQueries({ queryKey: ['settings'] }); setMessage('School logo uploaded.') },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not upload logo.'),
  })
  const removeLogoMutation = useMutation({
    mutationFn: () => settingsApi.removeLogo(),
    onSuccess: () => { setForm(p => ({ ...p, schoolLogo: '' })); setMessage('School logo removed.') },
  })
  const accountMutation = useMutation({
    mutationFn: () => settingsApi.updateAdminAccount({
      username: adminForm.username || undefined,
      currentPassword: adminForm.currentPassword,
      newPassword: adminForm.newPassword || undefined,
    }),
    onSuccess: r => { setAdminForm({ username: '', currentPassword: '', newPassword: '' }); setMessage(`Admin account updated${r.data.username ? ` for ${r.data.username}` : ''}.`) },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not update admin account.'),
  })
  const importMutation = useMutation({
    mutationFn: (file: File) => settingsApi.importBackup(file),
    onSuccess: () => { setMessage('Backup restored. Reloading current data.'); qc.invalidateQueries(); setTimeout(() => window.location.reload(), 800) },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not restore backup.'),
  })
  const resetMutation = useMutation({
    mutationFn: () => settingsApi.resetDemo(),
    onSuccess: () => { setMessage('Demo data restored. Reloading.'); setTimeout(() => window.location.reload(), 800) },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not reset demo data.'),
  })

  const set = (key: string, value: string) => setForm(p => ({ ...p, [key]: value }))
  const save = () => { setError(''); saveMutation.mutate(form) }
  const currentLogo = form.schoolLogo ? `${form.schoolLogo}?v=${settings?.schoolLogo}` : ''

  const downloadBackup = async () => {
    try {
      const response = await settingsApi.exportBackup()
      const url = URL.createObjectURL(response.data)
      const a = document.createElement('a'); a.href = url; a.download = 'smartclass-backup.json'; a.click(); URL.revokeObjectURL(url)
      setMessage('Database backup downloaded.')
    } catch { setError('Could not export the database.') }
  }

  if (isLoading) return <LoadingSpinner />
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">System Settings</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Configure branding, academics, kiosk behavior, and administrator controls.</p>
      </div>

      {(message || error) && (
        <div className={`rounded-xl px-4 py-3 text-sm font-inter ${error ? 'bg-danger/10 border border-danger/20 text-danger' : 'bg-success/10 border border-success/20 text-success'}`}>
          {error || message}
        </div>
      )}

      <Section title="School Branding" description="Shown on the login screen, kiosk, footer, and emergency information." icon={<Settings className="w-5 h-5" />}>
        <div className="space-y-4">
          <Field label="School Name" value={form.schoolName} placeholder="Exequiel R. Lina High School" onChange={v => set('schoolName', v)} />
          <Field label="School Address" value={form.schoolAddress} placeholder="Campus address" onChange={v => set('schoolAddress', v)} />
          <Field label="Tagline / Motto" value={form.schoolTagline} placeholder="Learning today, leading tomorrow." onChange={v => set('schoolTagline', v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Number" value={form.schoolContactNumber} placeholder="+63..." onChange={v => set('schoolContactNumber', v)} />
            <Field label="Contact Email" value={form.schoolContactEmail} type="email" placeholder="office@school.edu.ph" onChange={v => set('schoolContactEmail', v)} />
          </div>
          <div className="pt-2">
            <p className="font-inter font-medium text-sm text-text-primary">School Logo</p>
            <p className="font-inter text-xs text-text-secondary mb-3">PNG, JPG, GIF, WebP, or SVG up to 5 MB. Replaces the default shield icon.</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-border bg-gray-50 flex items-center justify-center overflow-hidden">
                {currentLogo ? <img src={currentLogo} alt="School logo" className="w-full h-full object-contain" /> : <ShieldCheck className="w-8 h-8 text-primary" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*,.svg" className="hidden" onChange={e => e.target.files?.[0] && logoMutation.mutate(e.target.files[0])} />
              <Button size="sm" variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()} loading={logoMutation.isPending}>Upload Logo</Button>
              {form.schoolLogo && <Button size="sm" variant="ghost" icon={<Trash2 className="w-4 h-4" />} onClick={() => removeLogoMutation.mutate()} loading={removeLogoMutation.isPending}>Remove</Button>}
            </div>
          </div>
          <Button onClick={save} loading={saveMutation.isPending} icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}>{saved ? 'Saved!' : 'Save Branding'}</Button>
        </div>
      </Section>

      <Section title="Grading & Academic" description="Set the passing threshold and the active grading period used across academic pages." icon={<GraduationCap className="w-5 h-5" />}>
        <div className="space-y-4">
          <Field label="Passing Grade Threshold" description="DepEd default is 75. Drives pass/fail color coding." type="number" value={form.passingGrade} placeholder="75" onChange={v => set('passingGrade', v)} />
          <Field label="Grading Periods" description="Number of quarters available, from 1 to 4." type="number" value={form.gradingPeriods} placeholder="4" onChange={v => set('gradingPeriods', v)} />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
            <div className="flex-1"><p className="font-inter font-medium text-sm text-text-primary">Current Grading Period</p><p className="font-inter text-xs text-text-secondary mt-0.5">Default period when teachers submit grades.</p></div>
            <select className="input sm:w-64" value={form.currentGradingPeriod || '1st'} onChange={e => set('currentGradingPeriod', e.target.value)}>
              {PERIODS.slice(0, Number(form.gradingPeriods) || 4).map(p => <option key={p} value={p}>{p} Quarter</option>)}
            </select>
          </div>
          <Button onClick={save} loading={saveMutation.isPending} icon={<Save className="w-4 h-4" />}>Save Academic Settings</Button>
          <div className="border-t border-border pt-4 mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <p className="font-inter font-medium text-sm text-text-primary">Release Grade Reset</p>
                <p className="font-inter text-xs text-text-secondary mt-0.5">Remove a specific released grade so it can be re-submitted by the teacher. Admin only.</p>
              </div>
              <Button
                variant="secondary"
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => navigate('/admin/grade-reset')}
              >
                Open Grade Reset
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Kiosk / Landing Screen" description="Control announcement rotation, weather, and return-to-kiosk behavior." icon={<Monitor className="w-5 h-5" />}>
        <div className="space-y-4">
          <Field label="Slide Rotation Interval" description="Seconds each announcement slide displays." type="number" value={form.slideRotationInterval} placeholder="6" onChange={v => set('slideRotationInterval', v)} />
          <Field label="Tab Rotation Interval" description="Seconds before switching to the next kiosk tab." type="number" value={form.tabRotationInterval} placeholder="30" onChange={v => set('tabRotationInterval', v)} />
          <Field label="Weather Location" description="Friendly city name shown beside the weather widget." value={form.weatherLocation} placeholder="Manila" onChange={v => set('weatherLocation', v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Weather Latitude" value={form.weatherLatitude} placeholder="14.5995" onChange={v => set('weatherLatitude', v)} />
            <Field label="Weather Longitude" value={form.weatherLongitude} placeholder="120.9842" onChange={v => set('weatherLongitude', v)} />
          </div>
          <Field label="Kiosk Idle Timeout" description="Minutes before a logged-in user is returned to the kiosk." type="number" value={form.kioskIdleTimeout} placeholder="10" onChange={v => set('kioskIdleTimeout', v)} />
          <Button onClick={save} loading={saveMutation.isPending} icon={<Save className="w-4 h-4" />}>Save Kiosk Settings</Button>
        </div>
      </Section>

      <Section title="Security" description="Set password-change policy and temporary login lockout protection." icon={<ShieldCheck className="w-5 h-5" />}>
        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 cursor-pointer">
            <span><span className="block font-inter font-medium text-sm text-text-primary">Force first-login password change</span><span className="block font-inter text-xs text-text-secondary mt-0.5">Require students, teachers, and admins to replace temporary passwords.</span></span>
            <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.forceFirstLoginPasswordChange !== 'false'} onChange={e => set('forceFirstLoginPasswordChange', String(e.target.checked))} />
          </label>
          <Field label="Max Login Attempts" description="Failed attempts before a temporary lockout." type="number" value={form.maxLoginAttempts} placeholder="5" onChange={v => set('maxLoginAttempts', v)} />
          <Field label="Temporary Lockout Duration" description="Minutes an account stays locked." type="number" value={form.lockoutDuration} placeholder="15" onChange={v => set('lockoutDuration', v)} />
          <Button onClick={save} loading={saveMutation.isPending} icon={<Save className="w-4 h-4" />}>Save Security Settings</Button>
        </div>
      </Section>

      <Section title="Data Management" description="Download a complete JSON backup, restore a previous backup, or reset this environment to demo data." icon={<Database className="w-5 h-5" />}>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={<Download className="w-4 h-4" />} onClick={downloadBackup}>Export Database</Button>
          <input ref={backupRef} type="file" accept=".json,application/json" className="hidden" onChange={e => e.target.files?.[0] && importMutation.mutate(e.target.files[0])} />
          <Button variant="secondary" icon={<Upload className="w-4 h-4" />} onClick={() => backupRef.current?.click()} loading={importMutation.isPending}>Import / Restore</Button>
          <Button variant="danger" icon={<RotateCcw className="w-4 h-4" />} loading={resetMutation.isPending} onClick={() => { if (window.confirm('Reset all data to the original demo dataset? This cannot be undone unless you export a backup first.')) resetMutation.mutate() }}>Reset to Demo Data</Button>
        </div>
      </Section>

      <Section title="Admin Account" description="Change the administrator username and/or password. Your current password is required." icon={<KeyRound className="w-5 h-5" />}>
        <div className="space-y-4">
          <Field label="New Admin Username" value={adminForm.username} placeholder="Leave blank to keep current username" onChange={v => setAdminForm(p => ({ ...p, username: v }))} />
          <Field label="Current Password" type="password" value={adminForm.currentPassword} placeholder="Required" onChange={v => setAdminForm(p => ({ ...p, currentPassword: v }))} />
          <Field label="New Password" type="password" value={adminForm.newPassword} placeholder="Leave blank to keep current password" onChange={v => setAdminForm(p => ({ ...p, newPassword: v }))} />
          <Button onClick={() => { setError(''); setMessage(''); accountMutation.mutate() }} loading={accountMutation.isPending} icon={<KeyRound className="w-4 h-4" />}>Update Admin Account</Button>
        </div>
      </Section>
    </div>
  )
}