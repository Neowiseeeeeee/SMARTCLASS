import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { academicApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import { formatDate } from '../../lib/utils'
import {
  BarChart2, ChevronLeft, ChevronRight, Plus,
  Check, Loader2, Users, BookOpen, FolderOpen,
} from 'lucide-react'

const CATEGORIES = ['Quiz', 'Assignment', 'Project', 'Examination', 'Laboratory', 'Participation', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Quiz:          'bg-blue-100 text-blue-700',
  Assignment:    'bg-green-100 text-green-700',
  Project:       'bg-purple-100 text-purple-700',
  Examination:   'bg-red-100 text-red-700',
  Laboratory:    'bg-orange-100 text-orange-700',
  Participation: 'bg-yellow-100 text-yellow-700',
  Other:         'bg-gray-100 text-gray-700',
}

export default function TeacherAcademic() {
  const { user }  = useAuth()
  const qc        = useQueryClient()
  const teacher   = user?.profile
  const assignments: any[] = useMemo(() => teacher?.subjectAssignments || [], [teacher])

  // ── Navigation state ────────────────────────────────────────────────────────
  const [selectedSection,   setSelectedSection]   = useState<any>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  // ── Excel grid state ────────────────────────────────────────────────────────
  const [localScores, setLocalScores] = useState<Record<string, Record<string, number | ''>>>({})
  const [savingSet,   setSavingSet]   = useState<Set<string>>(new Set())
  const [savedSet,    setSavedSet]    = useState<Set<string>>(new Set())
  const saveTimeoutRef  = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const localScoresRef  = useRef(localScores)
  localScoresRef.current = localScores  // always points to latest

  // ── Add-activity modal state ────────────────────────────────────────────────
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [addForm, setAddForm] = useState({
    title: '',
    category: 'Quiz',
    totalScore: 100,
    activityDate: format(new Date(), 'yyyy-MM-dd'),
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

  // ── Student counts for section cards ───────────────────────────────────────
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

  // ── All activities ──────────────────────────────────────────────────────────
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['teacher-activities'],
    queryFn: () => academicApi.getActivities().then(r => r.data),
  })

  // ── Students in selected section ───────────────────────────────────────────
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['section-students', selectedSection?.id],
    queryFn: () => structureApi.getSectionStudents(selectedSection!.id).then(r => r.data),
    enabled: !!selectedSection?.id,
  })

  // ── Subjects the teacher has in the selected section ────────────────────────
  const subjectsInSection = useMemo(() => {
    if (!selectedSection) return []
    const seen = new Set<string>()
    return assignments.filter(a => {
      if (a.sectionId !== selectedSection.id) return false
      if (seen.has(a.subjectId)) return false
      seen.add(a.subjectId)
      return true
    })
  }, [selectedSection, assignments])

  // Auto-select first subject when section changes
  useEffect(() => {
    if (subjectsInSection.length > 0) {
      setSelectedSubjectId(subjectsInSection[0].subjectId)
    } else {
      setSelectedSubjectId('')
    }
  }, [subjectsInSection])

  // ── Activities for current subject + section (sorted by date) ──────────────
  const filteredActivities = useMemo(() => {
    if (!selectedSection || !selectedSubjectId) return []
    return (activities as any[])
      .filter(a => a.subjectId === selectedSubjectId && a.sectionId === selectedSection.id)
      .sort((a: any, b: any) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime())
  }, [activities, selectedSubjectId, selectedSection])

  // ── Initialise local scores from server data ────────────────────────────────
  useEffect(() => {
    const scores: Record<string, Record<string, number | ''>> = {}
    filteredActivities.forEach((act: any) => {
      scores[act.id] = {}
      act.studentScores?.forEach((sc: any) => {
        scores[act.id][sc.studentId] = sc.scoreObtained
      })
    })
    setLocalScores(scores)
  }, [filteredActivities])

  // ── Score helpers ────────────────────────────────────────────────────────────
  function handleScoreChange(activityId: string, studentId: string, value: string) {
    const num = value === '' ? '' : Math.max(0, Number(value))
    setLocalScores(prev => ({
      ...prev,
      [activityId]: { ...(prev[activityId] || {}), [studentId]: num },
    }))
    // Debounce auto-save: 800 ms after last keystroke in this activity column
    if (saveTimeoutRef.current[activityId]) clearTimeout(saveTimeoutRef.current[activityId])
    saveTimeoutRef.current[activityId] = setTimeout(() => saveActivity(activityId), 800)
  }

  async function saveActivity(activityId: string) {
    const scores = localScoresRef.current[activityId] || {}
    const payload = Object.entries(scores)
      .filter(([, v]) => v !== '')
      .map(([studentId, scoreObtained]) => ({ studentId, scoreObtained: Number(scoreObtained) }))
    if (payload.length === 0) return

    setSavingSet(prev => new Set(prev).add(activityId))
    try {
      await academicApi.recordScores(activityId, payload)
      await qc.invalidateQueries({ queryKey: ['teacher-activities'] })
      setSavedSet(prev => new Set(prev).add(activityId))
      setTimeout(() => setSavedSet(prev => { const n = new Set(prev); n.delete(activityId); return n }), 2500)
    } catch { /* silent — user can retry */ }
    setSavingSet(prev => { const n = new Set(prev); n.delete(activityId); return n })
  }

  // ── Create activity ─────────────────────────────────────────────────────────
  const selectedAssignment = assignments.find(
    a => a.subjectId === selectedSubjectId && a.sectionId === selectedSection?.id
  )

  const createMutation = useMutation({
    mutationFn: (data: any) => academicApi.createActivity(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher-activities'] })
      setShowAddActivity(false)
      setAddForm({ title: '', category: 'Quiz', totalScore: 100, activityDate: format(new Date(), 'yyyy-MM-dd') })
    },
  })

  function handleCreateActivity() {
    if (!selectedAssignment || !addForm.title.trim()) return
    createMutation.mutate({
      ...addForm,
      subjectId: selectedSubjectId,
      sectionId: selectedSection.id,
      academicYearId: selectedAssignment.academicYearId,
    })
  }

  function handleBack() {
    Object.values(saveTimeoutRef.current).forEach(clearTimeout)
    saveTimeoutRef.current = {}
    setSelectedSection(null)
    setSelectedSubjectId('')
    setLocalScores({})
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Section card landing
  // ────────────────────────────────────────────────────────────────────────────
  if (!selectedSection) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Academic Performance</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Select a section to record and manage student scores.
          </p>
        </div>

        {sectionGroups.length === 0 ? (
          <EmptyState
            title="No Assigned Sections"
            description="Contact your administrator to get sections assigned to your account."
            icon={<BarChart2 className="w-8 h-8 text-primary" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionGroups.map(({ section, subjects }) => (
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
                    <p className="text-text-secondary font-inter text-xs mt-0.5">Class Section</p>
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
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER: Section detail — subject tabs + Excel grid
  // ────────────────────────────────────────────────────────────────────────────
  const isGridLoading = loadingStudents || loadingActivities

  return (
    <div className="animate-fade-in">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="page-title">Academic Performance</h1>
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-text-secondary font-inter text-sm hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="card">
        {/* ── Section name ──────────────────────────────────────────────────── */}
        <p className="font-poppins font-bold text-lg text-text-primary mb-3">
          {selectedSection.name}
        </p>

        {/* ── Subject tabs ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-0 flex-wrap border-b border-border mb-4">
          {subjectsInSection.map(a => (
            <button
              key={a.subjectId}
              onClick={() => setSelectedSubjectId(a.subjectId)}
              className={`px-4 py-2.5 font-inter text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                selectedSubjectId === a.subjectId
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
              }`}
            >
              {a.subject?.name}
            </button>
          ))}
        </div>

        {/* ── Toolbar ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <p className="font-inter text-sm text-text-secondary">
            {isGridLoading ? 'Loading…' : (
              `${(students as any[]).length} student${(students as any[]).length !== 1 ? 's' : ''}` +
              ` · ${filteredActivities.length} activit${filteredActivities.length !== 1 ? 'ies' : 'y'}`
            )}
          </p>
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddActivity(true)}
            disabled={!selectedSubjectId}
          >
            Add Activity
          </Button>
        </div>

        {/* ── Divider ───────────────────────────────────────────────────────── */}
        <div className="border-t border-border mb-4" />

        {/* ── Excel grid ────────────────────────────────────────────────────── */}
        {isGridLoading ? (
          <LoadingSpinner />
        ) : (students as any[]).length === 0 ? (
          <EmptyState
            title="No Students in This Section"
            description="Students will appear here once enrolled."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table
              className="border-collapse w-full"
              style={{ minWidth: Math.max(560, 200 + filteredActivities.length * 150 + 80) }}
            >
              {/* ── Column headers ─────────────────────────────────────────── */}
              <thead>
                <tr className="bg-surface">
                  {/* Sticky student column */}
                  <th className="sticky left-0 z-20 bg-surface px-4 py-3 text-left border-b border-border border-r border-border min-w-[180px] max-w-[220px]">
                    <span className="font-poppins font-semibold text-[11px] text-text-secondary uppercase tracking-wider">
                      Student
                    </span>
                  </th>

                  {/* Activity columns */}
                  {filteredActivities.map((act: any) => {
                    const isSaving = savingSet.has(act.id)
                    const isSaved  = savedSet.has(act.id)
                    return (
                      <th
                        key={act.id}
                        className="px-3 py-2 border-b border-border border-r border-border text-center align-top min-w-[140px]"
                      >
                        <div className="space-y-1.5">
                          {/* Save indicator + title */}
                          <div className="flex items-start justify-center gap-1">
                            {isSaving && <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0 mt-0.5" />}
                            {isSaved && !isSaving && <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />}
                            <span className="font-inter font-semibold text-xs text-text-primary leading-tight line-clamp-2">
                              {act.title}
                            </span>
                          </div>
                          {/* Category badge */}
                          <div>
                            <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[act.category] || CATEGORY_COLORS.Other}`}>
                              {act.category}
                            </span>
                          </div>
                          {/* Score / date */}
                          <p className="font-inter text-[10px] text-text-secondary">
                            /{act.totalScore} pts · {formatDate(act.activityDate, 'MMM d')}
                          </p>
                        </div>
                      </th>
                    )
                  })}

                  {/* + Add column */}
                  <th className="px-3 py-3 border-b border-border min-w-[60px] text-center">
                    <button
                      onClick={() => setShowAddActivity(true)}
                      title="Add activity"
                      className="w-8 h-8 rounded-lg bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* ── Student rows ───────────────────────────────────────────── */}
              <tbody>
                {(students as any[]).map((student: any, rowIdx: number) => {
                  const rowBg = rowIdx % 2 === 0 ? 'bg-white' : 'bg-background/40'
                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-border hover:bg-primary-light/10 transition-colors ${rowBg}`}
                    >
                      {/* Sticky name cell */}
                      <td className={`sticky left-0 z-10 ${rowBg} px-4 py-2.5 border-r border-border`}>
                        <p className="font-inter text-sm font-medium text-text-primary leading-tight">
                          {student.fullName}
                        </p>
                        <p className="font-inter text-[11px] text-text-secondary">{student.studentNumber}</p>
                      </td>

                      {/* Score cells */}
                      {filteredActivities.map((act: any) => {
                        const raw      = localScores[act.id]?.[student.id]
                        const hasScore = raw !== undefined && raw !== ''
                        return (
                          <td key={act.id} className="border-r border-border p-0 text-center">
                            <input
                              type="number"
                              value={raw ?? ''}
                              min={0}
                              max={act.totalScore}
                              placeholder="—"
                              onChange={e => handleScoreChange(act.id, student.id, e.target.value)}
                              onBlur={() => {
                                // Also trigger on blur in case debounce hasn't fired yet
                                if (saveTimeoutRef.current[act.id]) {
                                  clearTimeout(saveTimeoutRef.current[act.id])
                                  delete saveTimeoutRef.current[act.id]
                                }
                                saveActivity(act.id)
                              }}
                              className={`w-full h-full px-2 py-3 text-center text-sm font-poppins font-semibold
                                bg-transparent focus:bg-primary/5 focus:outline-none transition-colors
                                placeholder:text-text-secondary/30
                                [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                                ${hasScore ? 'text-text-primary' : 'text-text-secondary/40'}`}
                            />
                          </td>
                        )
                      })}

                      {/* Empty add-column cell */}
                      <td className="bg-background/20" />
                    </tr>
                  )
                })}

                {/* ── Class average row ──────────────────────────────────── */}
                {filteredActivities.length > 0 && (
                  <tr className="border-t-2 border-primary/20 bg-primary-light/20">
                    <td className="sticky left-0 z-10 bg-primary-light/30 px-4 py-2.5 border-r border-border">
                      <span className="font-inter text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                        Class Avg
                      </span>
                    </td>
                    {filteredActivities.map((act: any) => {
                      const vals = (students as any[])
                        .map(s => localScores[act.id]?.[s.id])
                        .filter(v => v !== undefined && v !== '') as number[]
                      const avg = vals.length > 0
                        ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
                        : '—'
                      const pct = vals.length > 0
                        ? Math.round((Number(avg) / act.totalScore) * 100)
                        : null
                      return (
                        <td key={act.id} className="border-r border-border px-2 py-2.5 text-center">
                          <p className="font-poppins font-bold text-sm text-primary">{avg}</p>
                          {pct !== null && (
                            <p className="font-inter text-[10px] text-text-secondary">{pct}%</p>
                          )}
                        </td>
                      )
                    })}
                    <td className="bg-primary-light/10" />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Auto-save hint */}
        {filteredActivities.length > 0 && (students as any[]).length > 0 && (
          <p className="font-inter text-[11px] text-text-secondary/60 mt-3 text-right italic">
            Scores auto-save when you stop typing · Column header shows ✓ when saved
          </p>
        )}
      </div>

      {/* ── Add Activity Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        title="Add Activity"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAddActivity(false)}>Cancel</Button>
            <Button
              loading={createMutation.isPending}
              onClick={handleCreateActivity}
              disabled={!addForm.title.trim()}
            >
              Add Activity
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Context pill */}
          <div className="p-3 bg-primary-light/30 rounded-xl text-sm font-inter text-text-primary">
            <span className="font-semibold">{selectedSection?.name}</span>
            {' · '}
            {subjectsInSection.find(a => a.subjectId === selectedSubjectId)?.subject?.name}
          </div>

          <Input
            label="Activity Title"
            placeholder="e.g., Quiz 1 – Chapter 1"
            value={addForm.title}
            onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Category</label>
              <select
                className="input-field"
                value={addForm.category}
                onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input
              label="Total Score"
              type="number"
              min={1}
              value={addForm.totalScore}
              onChange={e => setAddForm(f => ({ ...f, totalScore: Number(e.target.value) }))}
            />
          </div>
          <Input
            label="Activity Date"
            type="date"
            value={addForm.activityDate}
            onChange={e => setAddForm(f => ({ ...f, activityDate: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  )
}
