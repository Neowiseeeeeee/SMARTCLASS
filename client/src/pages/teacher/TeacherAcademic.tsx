import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/auth'
import { academicApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import { Plus, BarChart2, Edit } from 'lucide-react'

const CATEGORIES = ['Quiz', 'Assignment', 'Project', 'Examination', 'Laboratory', 'Participation', 'Other']

export default function TeacherAcademic() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const teacher = user?.profile
  const assignments = teacher?.subjectAssignments || []
  const [showCreate, setShowCreate] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [form, setForm] = useState({
    title: '', subjectId: '', sectionId: '', academicYearId: '',
    category: 'Quiz', totalScore: 100, activityDate: ''
  })

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['teacher-activities'],
    queryFn: () => academicApi.getActivities().then(r => r.data),
  })

  const { data: structure = [] } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: () => structureApi.getAcademicYears().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d: any) => academicApi.createActivity(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-activities'] }); setShowCreate(false); setForm({ title: '', subjectId: '', sectionId: '', academicYearId: '', category: 'Quiz', totalScore: 100, activityDate: '' }) },
  })

  const scoreMutation = useMutation({
    mutationFn: ({ id, scores }: any) => academicApi.recordScores(id, scores),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-activities'] }); setSelectedActivity(null) },
  })

  const subjectSections = assignments.filter((a: any) => a.subjectId === form.subjectId)

  const handleSaveScores = () => {
    const payload = Object.entries(scores).map(([studentId, scoreObtained]) => ({ studentId, scoreObtained }))
    scoreMutation.mutate({ id: selectedActivity.id, scores: payload })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Academic Performance</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">Create activities and record student scores</p>
        </div>
        <Button onClick={() => setShowCreate(true)} icon={<Plus className="w-4 h-4" />}>
          New Activity
        </Button>
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title="No Activities Yet"
          description="Create academic activities to start tracking student performance."
          action={<Button onClick={() => setShowCreate(true)}>Create Activity</Button>}
          icon={<BarChart2 className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="grid gap-4">
          {activities.map((a: any) => {
            const submitted = a.studentScores?.length || 0
            const avg = submitted > 0
              ? Math.round(a.studentScores.reduce((s: number, sc: any) => s + sc.scoreObtained, 0) / submitted)
              : 0
            return (
              <div key={a.id} className="card-hover" onClick={() => { setSelectedActivity(a); const s: Record<string, number> = {}; a.studentScores?.forEach((sc: any) => { s[sc.studentId] = sc.scoreObtained }); setScores(s) }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-poppins font-semibold text-text-primary">{a.title}</h3>
                      <span className="badge bg-secondary/10 text-secondary capitalize">{a.category}</span>
                    </div>
                    <p className="text-text-secondary font-inter text-sm mt-1">
                      {a.subject?.name} · {a.section?.name} · {formatDate(a.activityDate)}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-poppins font-bold text-lg text-primary">{submitted} scored</p>
                    <p className="text-xs text-text-secondary">Avg: {avg}/{a.totalScore}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Activity */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Academic Activity"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.subjectId || !form.sectionId || !form.academicYearId}>
              Create Activity
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Activity Title" placeholder="e.g., Quiz 1 – Introduction" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Subject</label>
            <select className="input-field" value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value, sectionId: '' }))}>
              <option value="">Select Subject</option>
              {[...new Map(assignments.map((a: any) => [a.subjectId, a])).values()].map((a: any) => (
                <option key={a.subjectId} value={a.subjectId}>{a.subject?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Section</label>
            <select className="input-field" value={form.sectionId} onChange={e => { const a = subjectSections.find((x: any) => x.sectionId === e.target.value); setForm(f => ({ ...f, sectionId: e.target.value, academicYearId: a?.academicYearId || '' })) }} disabled={!form.subjectId}>
              <option value="">Select Section</option>
              {subjectSections.map((a: any) => <option key={a.sectionId} value={a.sectionId}>{a.section?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Category</label>
            <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Total Score" type="number" value={form.totalScore} onChange={e => setForm(f => ({ ...f, totalScore: Number(e.target.value) }))} />
          <Input label="Activity Date" type="date" value={form.activityDate} onChange={e => setForm(f => ({ ...f, activityDate: e.target.value }))} />
        </div>
      </Modal>

      {/* Score Recording Modal */}
      <Modal
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
        title={selectedActivity?.title || ''}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setSelectedActivity(null)}>Cancel</Button>
            <Button loading={scoreMutation.isPending} onClick={handleSaveScores}>Save Scores</Button>
          </div>
        }
      >
        {selectedActivity && (
          <div>
            <p className="text-text-secondary font-inter text-sm mb-4">
              Total Score: <strong>{selectedActivity.totalScore}</strong> · {selectedActivity.subject?.name} · {selectedActivity.section?.name}
            </p>
            <div className="space-y-2">
              {selectedActivity.studentScores?.length === 0 && (
                <p className="text-text-secondary text-sm font-inter py-4 text-center">No students in roster yet.</p>
              )}
              {selectedActivity.studentScores?.map((sc: any) => (
                <div key={sc.id} className="flex items-center gap-4">
                  <span className="flex-1 font-inter text-sm text-text-primary">{sc.student?.fullName}</span>
                  <Input
                    type="number"
                    className="w-24"
                    value={scores[sc.studentId] ?? sc.scoreObtained}
                    min={0}
                    max={selectedActivity.totalScore}
                    onChange={e => setScores(s => ({ ...s, [sc.studentId]: Number(e.target.value) }))}
                  />
                  <span className="text-text-secondary font-inter text-sm">/ {selectedActivity.totalScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
