import React, { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { academicApi, settingsApi, studentsApi, structureApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/EmptyState'
import { RotateCcw, Search, ShieldAlert } from 'lucide-react'

const PERIODS = ['1st', '2nd', '3rd', '4th']

export default function AdminGradeReset() {
  const qc = useQueryClient()
  const [sectionId, setSectionId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [academicYearId, setAcademicYearId] = useState('')
  const [gradingPeriod, setGradingPeriod] = useState('1st')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const { data: settings = {} } = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => settingsApi.getPublic().then(r => r.data as Record<string, string>),
  })
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: () => structureApi.getSections().then(r => r.data),
  })
  const { data: years = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => structureApi.getAcademicYears().then(r => r.data),
  })
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => structureApi.getSubjects().then(r => r.data),
  })
  const { data: students = [] } = useQuery({
    queryKey: ['students', 'grade-reset'],
    queryFn: () => studentsApi.getAll({ status: 'active' }).then(r => r.data),
  })
  const { data: grades = [], isLoading: gradesLoading } = useQuery({
    queryKey: ['admin-grades', sectionId, academicYearId, gradingPeriod, subjectId],
    queryFn: () => academicApi.getGrades({ sectionId, academicYearId, gradingPeriod, subjectId }).then(r => r.data),
    enabled: Boolean(sectionId && academicYearId && subjectId),
  })

  const sectionStudents = useMemo(() => (students as any[]).filter(s =>
    s.sectionAssignments?.some((a: any) => a.sectionId === sectionId)
  ), [students, sectionId])
  const selectedGrade = (grades as any[]).find(g => g.studentId === studentId)
  const periodCount = Math.min(4, Math.max(1, Number(settings.gradingPeriods) || 4))

  const resetMutation = useMutation({
    mutationFn: () => academicApi.resetGrade({ studentId, subjectId, sectionId, academicYearId, gradingPeriod }),
    onSuccess: () => {
      setNotice('The selected released grade was reset. The teacher can submit a replacement grade.')
      setError('')
      qc.invalidateQueries({ queryKey: ['admin-grades'] })
    },
    onError: (e: any) => setError(e.response?.data?.error || 'Could not reset that grade.'),
  })

  if (sectionsLoading) return <LoadingSpinner />
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Release Grade Reset</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">Admins can remove one exact released grade so it can be submitted again.</p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800 font-inter">This action removes only the selected student, subject, section, academic year, and grading period. It does not delete activity scores.</p>
      </div>

      {(notice || error) && <div className={`rounded-xl px-4 py-3 text-sm font-inter ${error ? 'bg-danger/10 border border-danger/20 text-danger' : 'bg-success/10 border border-success/20 text-success'}`}>{error || notice}</div>}

      <div className="card max-w-3xl space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary"><Search className="w-5 h-5" /></div>
          <div><h2 className="section-heading">Find a Released Grade</h2><p className="text-xs text-text-secondary font-inter">Choose the exact grade record to reset.</p></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm font-inter text-text-primary">Section
            <select className="input mt-1.5" value={sectionId} onChange={e => { setSectionId(e.target.value); setStudentId('') }}>
              <option value="">Select section</option>
              {(sections as any[]).map(s => <option key={s.id} value={s.id}>{s.gradeLevel?.name ? `${s.gradeLevel.name} — ` : ''}{s.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-inter text-text-primary">Student
            <select className="input mt-1.5" value={studentId} onChange={e => setStudentId(e.target.value)} disabled={!sectionId}>
              <option value="">Select student</option>
              {sectionStudents.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.studentNumber})</option>)}
            </select>
          </label>
          <label className="text-sm font-inter text-text-primary">Academic Year
            <select className="input mt-1.5" value={academicYearId} onChange={e => setAcademicYearId(e.target.value)}>
              <option value="">Select academic year</option>
              {(years as any[]).map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-inter text-text-primary">Subject
            <select className="input mt-1.5" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              <option value="">Select subject</option>
              {(subjects as any[]).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </label>
          <label className="text-sm font-inter text-text-primary sm:col-span-2">Grading Period
            <select className="input mt-1.5" value={gradingPeriod} onChange={e => setGradingPeriod(e.target.value)}>
              {PERIODS.slice(0, periodCount).map(p => <option key={p} value={p}>{p} Quarter</option>)}
            </select>
          </label>
        </div>

        {gradesLoading && <LoadingSpinner />}
        {studentId && selectedGrade ? (
          <div className="rounded-xl border border-border bg-background p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-poppins font-semibold text-text-primary">{selectedGrade.student?.fullName}</p>
              <p className="text-xs text-text-secondary font-inter">{selectedGrade.subject?.name} · {gradingPeriod} Quarter · {selectedGrade.academicYear?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`font-poppins font-bold text-xl ${selectedGrade.grade >= (Number(settings.passingGrade) || 75) ? 'text-success' : 'text-danger'}`}>{selectedGrade.grade}</span>
              <Button variant="danger" icon={<RotateCcw className="w-4 h-4" />} loading={resetMutation.isPending} onClick={() => { if (window.confirm('Reset this released grade?')) resetMutation.mutate() }}>Reset Grade</Button>
            </div>
          </div>
        ) : studentId && !gradesLoading ? (
          <p className="text-sm text-text-secondary font-inter text-center py-4">No released grade matches this selection.</p>
        ) : null}
      </div>
    </div>
  )
}