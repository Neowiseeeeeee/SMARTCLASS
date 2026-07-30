import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  Trash2, Pencil, Download, Calculator, X,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Formula column type ──────────────────────────────────────────────────────

interface FormulaCol {
  id: string
  name: string
  /** Each term: which activity and what weight percentage (0–100) */
  terms: { activityId: string; weight: number }[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherAcademic() {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const teacher  = user?.profile
  const assignments: any[] = useMemo(() => teacher?.subjectAssignments || [], [teacher])

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [selectedSection,   setSelectedSection]   = useState<any>(null)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  // ── Excel grid: score state ─────────────────────────────────────────────────
  const [localScores,  setLocalScores]  = useState<Record<string, Record<string, number | ''>>>({})
  const [savingSet,    setSavingSet]    = useState<Set<string>>(new Set())
  const [savedSet,     setSavedSet]     = useState<Set<string>>(new Set())
  const saveTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const localScoresRef = useRef(localScores)
  localScoresRef.current = localScores

  // ── Add-activity modal ──────────────────────────────────────────────────────
  const [showAddActivity, setShowAddActivity] = useState(false)
  const [addForm, setAddForm] = useState({
    title: '', category: 'Quiz', totalScore: 100,
    activityDate: format(new Date(), 'yyyy-MM-dd'),
  })

  // ── Edit-activity modal ─────────────────────────────────────────────────────
  const [editingActivity, setEditingActivity] = useState<any>(null)
  const [editForm, setEditForm] = useState({
    title: '', category: 'Quiz', totalScore: 100, activityDate: '',
  })

  // ── Formula columns (stored in localStorage per section+subject) ────────────
  const formulaKey = `smartclass_formula_${selectedSection?.id ?? ''}_${selectedSubjectId}`
  const [formulaCols,       setFormulaCols]       = useState<FormulaCol[]>([])
  const [showFormulaModal,  setShowFormulaModal]  = useState(false)
  const [editingFormula,    setEditingFormula]    = useState<FormulaCol | null>(null)
  const [formulaForm, setFormulaForm] = useState<{
    name: string
    terms: { activityId: string; weight: number }[]
  }>({ name: '', terms: [] })

  // Load formula cols from localStorage when section/subject changes
  useEffect(() => {
    if (!selectedSection || !selectedSubjectId) { setFormulaCols([]); return }
    try {
      const stored = localStorage.getItem(formulaKey)
      setFormulaCols(stored ? JSON.parse(stored) : [])
    } catch { setFormulaCols([]) }
  }, [formulaKey, selectedSection, selectedSubjectId])

  const saveFormulaCols = useCallback((cols: FormulaCol[]) => {
    setFormulaCols(cols)
    try { localStorage.setItem(formulaKey, JSON.stringify(cols)) } catch {}
  }, [formulaKey])

  // ── Section groups ──────────────────────────────────────────────────────────
  const sectionGroups = useMemo(() => {
    const map: Record<string, { section: any; subjects: any[] }> = {}
    assignments.forEach(a => {
      if (!a.sectionId) return
      if (!map[a.sectionId]) map[a.sectionId] = { section: a.section, subjects: [] }
      if (!map[a.sectionId].subjects.find((s: any) => s.subjectId === a.subjectId))
        map[a.sectionId].subjects.push(a)
    })
    return Object.values(map)
  }, [assignments])

  // ── Student counts for landing cards ───────────────────────────────────────
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

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['teacher-activities'],
    queryFn: () => academicApi.getActivities().then(r => r.data),
  })

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['section-students', selectedSection?.id],
    queryFn: () => structureApi.getSectionStudents(selectedSection!.id).then(r => r.data),
    enabled: !!selectedSection?.id,
  })

  // ── Subjects in section ─────────────────────────────────────────────────────
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

  useEffect(() => {
    setSelectedSubjectId(subjectsInSection.length > 0 ? subjectsInSection[0].subjectId : '')
  }, [subjectsInSection])

  // ── Activities for current view ─────────────────────────────────────────────
  const filteredActivities = useMemo(() => {
    if (!selectedSection || !selectedSubjectId) return []
    return (activities as any[])
      .filter(a => a.subjectId === selectedSubjectId && a.sectionId === selectedSection.id)
      .sort((a: any, b: any) => new Date(a.activityDate).getTime() - new Date(b.activityDate).getTime())
  }, [activities, selectedSubjectId, selectedSection])

  // ── Sync local scores from server ───────────────────────────────────────────
  useEffect(() => {
    const scores: Record<string, Record<string, number | ''>> = {}
    filteredActivities.forEach((act: any) => {
      scores[act.id] = {}
      act.studentScores?.forEach((sc: any) => { scores[act.id][sc.studentId] = sc.scoreObtained })
    })
    setLocalScores(scores)
  }, [filteredActivities])

  // ── Score editing helpers ───────────────────────────────────────────────────
  function handleScoreChange(activityId: string, studentId: string, value: string) {
    const num = value === '' ? '' : Math.max(0, Number(value))
    setLocalScores(prev => ({
      ...prev,
      [activityId]: { ...(prev[activityId] || {}), [studentId]: num },
    }))
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

  // ── Edit activity ───────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => academicApi.updateActivity(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teacher-activities'] }); setEditingActivity(null) },
  })

  function openEdit(act: any) {
    setEditingActivity(act)
    setEditForm({
      title: act.title, category: act.category, totalScore: act.totalScore,
      activityDate: format(new Date(act.activityDate), 'yyyy-MM-dd'),
    })
  }

  // ── Delete activity ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => academicApi.deleteActivity(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher-activities'] }),
  })

  function handleDeleteActivity(act: any) {
    if (!window.confirm(`Delete "${act.title}" and all its scores? This cannot be undone.`)) return
    deleteMutation.mutate(act.id)
  }

  // ── Formula column helpers ──────────────────────────────────────────────────
  function computeFormula(col: FormulaCol, studentId: string): string {
    let sum = 0; let hasAny = false
    for (const term of col.terms) {
      const act = filteredActivities.find((a: any) => a.id === term.activityId)
      if (!act) continue
      const score = localScores[term.activityId]?.[studentId]
      if (score === undefined || score === '') continue
      sum += (Number(score) / act.totalScore) * (term.weight / 100)
      hasAny = true
    }
    return hasAny ? (sum * 100).toFixed(1) + '%' : '—'
  }

  function openFormulaModal(existing?: FormulaCol) {
    if (existing) {
      setEditingFormula(existing)
      setFormulaForm({ name: existing.name, terms: [...existing.terms] })
    } else {
      setEditingFormula(null)
      setFormulaForm({
        name: '',
        terms: filteredActivities.map((a: any) => ({ activityId: a.id, weight: 0 })),
      })
    }
    setShowFormulaModal(true)
  }

  function saveFormula() {
    if (!formulaForm.name.trim()) return
    const validTerms = formulaForm.terms.filter(t => t.weight > 0)
    if (validTerms.length === 0) return
    if (editingFormula) {
      saveFormulaCols(formulaCols.map(c =>
        c.id === editingFormula.id ? { ...c, name: formulaForm.name, terms: validTerms } : c
      ))
    } else {
      saveFormulaCols([...formulaCols, { id: Date.now().toString(), name: formulaForm.name, terms: validTerms }])
    }
    setShowFormulaModal(false)
  }

  function updateTermWeight(activityId: string, weight: number) {
    setFormulaForm(f => {
      const existing = f.terms.find(t => t.activityId === activityId)
      if (existing) return { ...f, terms: f.terms.map(t => t.activityId === activityId ? { ...t, weight } : t) }
      return { ...f, terms: [...f.terms, { activityId, weight }] }
    })
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const subjectName = subjectsInSection.find(a => a.subjectId === selectedSubjectId)?.subject?.name || 'Subject'
    const actHeaders  = filteredActivities.map((a: any) => `${a.title} (/${a.totalScore} ${a.category})`)
    const fmtHeaders  = formulaCols.map(c => c.name)
    const headers     = ['Student Name', 'Student No.', ...actHeaders, ...fmtHeaders]

    const rows = (students as any[]).map(student => {
      const scores   = filteredActivities.map((act: any) => {
        const v = localScores[act.id]?.[student.id]
        return (v !== undefined && v !== '') ? String(v) : ''
      })
      const formulas = formulaCols.map(c => computeFormula(c, student.id))
      return [student.fullName, student.studentNumber, ...scores, ...formulas]
    })

    const avgRow = ['CLASS AVERAGE', '', ...filteredActivities.map((act: any) => {
      const vals = (students as any[]).map(s => localScores[act.id]?.[s.id]).filter(v => v !== undefined && v !== '') as number[]
      return vals.length > 0 ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : ''
    }), ...formulaCols.map(() => '')]

    const csv = [headers, ...rows, avgRow]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `${selectedSection?.name}_${subjectName}_grades.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Back ────────────────────────────────────────────────────────────────────
  function handleBack() {
    Object.values(saveTimeoutRef.current).forEach(clearTimeout)
    saveTimeoutRef.current = {}
    setSelectedSection(null); setSelectedSubjectId('')
    setLocalScores({}); setFormulaCols([])
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
            description="Contact your administrator to get sections assigned."
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
  const totalFormulaPct = formulaForm.terms.reduce((a, b) => a + (b.weight || 0), 0)

  return (
    <div className="animate-fade-in">
      {/* Page header */}
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
        {/* Section name */}
        <p className="font-poppins font-bold text-lg text-text-primary mb-3">{selectedSection.name}</p>

        {/* Subject tabs */}
        <div className="flex items-center flex-wrap border-b border-border mb-4">
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

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <p className="font-inter text-sm text-text-secondary">
            {isGridLoading ? 'Loading…' : (
              `${(students as any[]).length} student${(students as any[]).length !== 1 ? 's' : ''}` +
              ` · ${filteredActivities.length} activit${filteredActivities.length !== 1 ? 'ies' : 'y'}` +
              (formulaCols.length > 0 ? ` · ${formulaCols.length} formula column${formulaCols.length !== 1 ? 's' : ''}` : '')
            )}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={exportCSV}
              disabled={filteredActivities.length === 0 || (students as any[]).length === 0}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<Calculator className="w-3.5 h-3.5" />}
              onClick={() => openFormulaModal()}
              disabled={filteredActivities.length === 0}
              title="Add a computed column (weighted formula)"
            >
              Formula
            </Button>
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowAddActivity(true)}
              disabled={!selectedSubjectId}
            >
              Add Activity
            </Button>
          </div>
        </div>

        <div className="border-t border-border mb-4" />

        {/* Grid */}
        {isGridLoading ? (
          <LoadingSpinner />
        ) : (students as any[]).length === 0 ? (
          <EmptyState title="No Students in This Section" description="Students will appear here once enrolled." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table
              className="border-collapse w-full"
              style={{ minWidth: Math.max(560, 200 + (filteredActivities.length + formulaCols.length) * 150 + 60) }}
            >
              {/* ── Column headers ──────────────────────────────────────────── */}
              <thead>
                <tr className="bg-surface">
                  {/* Sticky student column */}
                  <th className="sticky left-0 z-20 bg-surface px-4 py-3 text-left border-b border-r border-border min-w-[180px] max-w-[220px]">
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
                        className="px-3 py-2 border-b border-r border-border text-center align-top min-w-[140px] group"
                      >
                        <div className="space-y-1.5">
                          {/* Title + save indicator + edit/delete */}
                          <div className="flex items-start justify-center gap-1">
                            {isSaving && <Loader2 className="w-3 h-3 text-primary animate-spin flex-shrink-0 mt-0.5" />}
                            {isSaved && !isSaving && <Check className="w-3 h-3 text-success flex-shrink-0 mt-0.5" />}
                            <span className="font-inter font-semibold text-xs text-text-primary leading-tight line-clamp-2 flex-1 text-left">
                              {act.title}
                            </span>
                            {/* Edit / delete — visible on hover */}
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                              <button
                                onClick={() => openEdit(act)}
                                className="p-0.5 rounded hover:bg-primary/10 text-text-secondary hover:text-primary transition-colors"
                                title="Edit activity"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteActivity(act)}
                                className="p-0.5 rounded hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                                title="Delete activity and all scores"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {/* Category badge */}
                          <div>
                            <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[act.category] || CATEGORY_COLORS.Other}`}>
                              {act.category}
                            </span>
                          </div>
                          <p className="font-inter text-[10px] text-text-secondary">
                            /{act.totalScore} pts · {formatDate(act.activityDate, 'MMM d')}
                          </p>
                        </div>
                      </th>
                    )
                  })}

                  {/* Formula columns */}
                  {formulaCols.map(fc => (
                    <th
                      key={fc.id}
                      className="px-3 py-2 border-b border-r border-border text-center align-top min-w-[130px] bg-purple-50 group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-center gap-1">
                          <span className="font-inter font-semibold text-xs text-purple-700 leading-tight line-clamp-2 flex-1 text-left">
                            {fc.name}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-1">
                            <button
                              onClick={() => openFormulaModal(fc)}
                              className="p-0.5 rounded hover:bg-purple-100 text-purple-400 hover:text-purple-700 transition-colors"
                              title="Edit formula"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => saveFormulaCols(formulaCols.filter(c => c.id !== fc.id))}
                              className="p-0.5 rounded hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                              title="Remove formula column"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div>
                          <span className="inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            f(x) · {fc.terms.reduce((a, b) => a + b.weight, 0)}%
                          </span>
                        </div>
                      </div>
                    </th>
                  ))}

                  {/* + Add column button */}
                  <th className="px-3 py-3 border-b border-border min-w-[56px] text-center">
                    <button
                      onClick={() => setShowAddActivity(true)}
                      title="Add activity column"
                      className="w-8 h-8 rounded-lg bg-primary-light text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </th>
                </tr>
              </thead>

              {/* ── Student rows ─────────────────────────────────────────────── */}
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
                        <p className="font-inter text-sm font-medium text-text-primary leading-tight">{student.fullName}</p>
                        <p className="font-inter text-[11px] text-text-secondary">{student.studentNumber}</p>
                      </td>

                      {/* Score input cells */}
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

                      {/* Formula cells (read-only, computed) */}
                      {formulaCols.map(fc => (
                        <td key={fc.id} className="border-r border-border px-2 py-3 text-center bg-purple-50/40">
                          <span className="font-poppins font-semibold text-sm text-purple-700">
                            {computeFormula(fc, student.id)}
                          </span>
                        </td>
                      ))}

                      {/* Empty add-column spacer */}
                      <td className="bg-background/20" />
                    </tr>
                  )
                })}

                {/* ── Class average row ─────────────────────────────────────── */}
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
                      const pct = vals.length > 0 ? Math.round((Number(avg) / act.totalScore) * 100) : null
                      return (
                        <td key={act.id} className="border-r border-border px-2 py-2.5 text-center">
                          <p className="font-poppins font-bold text-sm text-primary">{avg}</p>
                          {pct !== null && <p className="font-inter text-[10px] text-text-secondary">{pct}%</p>}
                        </td>
                      )
                    })}
                    {formulaCols.map(fc => {
                      const vals = (students as any[])
                        .map(s => { const v = computeFormula(fc, s.id); return v === '—' ? null : parseFloat(v) })
                        .filter(v => v !== null) as number[]
                      const avg = vals.length > 0
                        ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '%'
                        : '—'
                      return (
                        <td key={fc.id} className="border-r border-border px-2 py-2.5 text-center bg-purple-50/40">
                          <p className="font-poppins font-bold text-sm text-purple-700">{avg}</p>
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

        {/* Hints */}
        {filteredActivities.length > 0 && (students as any[]).length > 0 && (
          <p className="font-inter text-[11px] text-text-secondary/60 mt-3 text-right italic">
            Scores auto-save · Hover column header to edit (✏) or delete (🗑) · Purple columns are formula-computed
          </p>
        )}
      </div>

      {/* ── Add Activity Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        title="Add Activity"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowAddActivity(false)}>Cancel</Button>
            <Button loading={createMutation.isPending} onClick={handleCreateActivity} disabled={!addForm.title.trim()}>
              Add Activity
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-primary-light/30 rounded-xl text-sm font-inter text-text-primary">
            <span className="font-semibold">{selectedSection?.name}</span>{' · '}
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
              <select className="input-field" value={addForm.category}
                onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Total Score" type="number" min={1} value={addForm.totalScore}
              onChange={e => setAddForm(f => ({ ...f, totalScore: Number(e.target.value) }))} />
          </div>
          <Input label="Activity Date" type="date" value={addForm.activityDate}
            onChange={e => setAddForm(f => ({ ...f, activityDate: e.target.value }))} />
        </div>
      </Modal>

      {/* ── Edit Activity Modal ───────────────────────────────────────────────── */}
      <Modal
        open={!!editingActivity}
        onClose={() => setEditingActivity(null)}
        title="Edit Activity"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setEditingActivity(null)}>Cancel</Button>
            <Button loading={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ id: editingActivity.id, data: editForm })}
              disabled={!editForm.title.trim()}>
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Title" value={editForm.title} autoFocus
            onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">Category</label>
              <select className="input-field" value={editForm.category}
                onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Input label="Total Score" type="number" min={1} value={editForm.totalScore}
              onChange={e => setEditForm(f => ({ ...f, totalScore: Number(e.target.value) }))} />
          </div>
          <Input label="Activity Date" type="date" value={editForm.activityDate}
            onChange={e => setEditForm(f => ({ ...f, activityDate: e.target.value }))} />
          {editingActivity && Number(editForm.totalScore) !== editingActivity.totalScore && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-700 font-inter">
                ⚠️ Changing the total score will update the denominator for all existing scores in this activity.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Formula Column Modal ──────────────────────────────────────────────── */}
      <Modal
        open={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        title={editingFormula ? 'Edit Formula Column' : 'Add Formula Column'}
        size="lg"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowFormulaModal(false)}>Cancel</Button>
            <Button
              onClick={saveFormula}
              disabled={!formulaForm.name.trim() || formulaForm.terms.filter(t => t.weight > 0).length === 0}
            >
              {editingFormula ? 'Update Column' : 'Add Column'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Explanation */}
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-sm font-inter text-purple-700 leading-relaxed">
              <span className="font-semibold">Formula columns</span> compute a weighted score from your activities.
              Set the weight (%) each activity contributes — e.g., Quiz = 10%, Examination = 30%.
              The result per student is: <span className="font-semibold">Σ (score ÷ total × weight)</span>.
            </p>
          </div>

          <Input
            label="Column Name"
            placeholder="e.g., 1st Quarter Grade, Weighted Average"
            value={formulaForm.name}
            onChange={e => setFormulaForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium font-inter text-text-primary">
                Activity Weights
              </label>
              <span className={`text-xs font-inter font-semibold px-2 py-0.5 rounded-full ${
                totalFormulaPct === 100
                  ? 'bg-success/10 text-success'
                  : totalFormulaPct > 100
                    ? 'bg-danger/10 text-danger'
                    : 'bg-border text-text-secondary'
              }`}>
                Total: {totalFormulaPct}%
                {totalFormulaPct === 100 && ' ✓'}
              </span>
            </div>

            {filteredActivities.length === 0 ? (
              <p className="text-sm text-text-secondary font-inter italic py-4 text-center">
                No activities yet — add activities first, then create formula columns.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {filteredActivities.map((act: any) => {
                  const term   = formulaForm.terms.find(t => t.activityId === act.id)
                  const weight = term?.weight ?? 0
                  return (
                    <div key={act.id} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-inter text-sm font-medium text-text-primary truncate">{act.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[act.category] || CATEGORY_COLORS.Other}`}>
                            {act.category}
                          </span>
                          <span className="text-xs text-text-secondary font-inter">/{act.totalScore} pts</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={weight || ''}
                          placeholder="0"
                          onChange={e => updateTermWeight(act.id, Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                          className="w-16 text-center px-2 py-1.5 border border-border rounded-lg text-sm font-poppins font-semibold
                            focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors
                            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <span className="text-sm text-text-secondary font-inter w-4">%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
