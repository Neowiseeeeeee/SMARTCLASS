import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { structureApi } from '../../lib/api'
import { teachersApi } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'
import {
  Plus, ChevronRight, Calendar, LayoutGrid, Clock, BookOpen,
  Pencil, Trash2, GraduationCap, CalendarDays, X
} from 'lucide-react'

// ─── Calendar constants ────────────────────────────────────────────────────────
const DAYS       = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const HOUR_START  = 6
const HOUR_END    = 20
const SLOT_MIN    = 30
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MIN
const SLOT_H      = 36 // px per 30-min slot

// ─── Block colour palette ──────────────────────────────────────────────────────
const PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
  '#f43f5e', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
]
const DEFAULT_COLOR = PALETTE[0]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeToSlot(time: string): number {
  const [h = '0', m = '0'] = time.split(':')
  return ((parseInt(h, 10) - HOUR_START) * 60 + parseInt(m, 10)) / SLOT_MIN
}

function slotToTime(slot: number): string {
  const total = slot * SLOT_MIN + HOUR_START * 60
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

function slotLabel(i: number): string {
  const total = i * SLOT_MIN + HOUR_START * 60
  const h  = Math.floor(total / 60)
  const m  = total % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ap}`
}

function textColorForBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1e293b' : '#ffffff'
}

type View = 'years' | 'sections' | 'grid'

interface FormState {
  subjectId: string
  teacherId: string
  dayOfWeek: string
  startTime: string
  endTime: string
  color: string
  description: string
}

const EMPTY_FORM: FormState = {
  subjectId: '',
  teacherId: '',
  dayOfWeek: 'Monday',
  startTime: '07:00',
  endTime: '08:30',
  color: DEFAULT_COLOR,
  description: '',
}

// ─── Colour Picker ─────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium font-inter text-text-primary mb-2">Block Color</label>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-7 h-7 rounded-lg transition-transform hover:scale-110 focus:outline-none"
            style={{
              background: c,
              boxShadow: value === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : undefined,
              transform: value === c ? 'scale(1.15)' : undefined,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Schedule Block ────────────────────────────────────────────────────────────
interface BlockProps {
  schedule: any
  onEdit: (s: any) => void
  onDelete: (id: string) => void
  onDragStart: (e: React.DragEvent, s: any) => void
}

function ScheduleBlock({ schedule, onEdit, onDelete, onDragStart }: BlockProps) {
  const startSlot = timeToSlot(schedule.startTime ?? '0:0')
  const endSlot   = timeToSlot(schedule.endTime   ?? '1:0')
  const span      = Math.max(1, endSlot - startSlot)
  const color     = schedule.color || DEFAULT_COLOR
  const textColor = textColorForBg(color)

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, schedule)}
      className="absolute inset-x-1 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none group"
      style={{
        top: startSlot * SLOT_H + 2,
        height: span * SLOT_H - 4,
        background: color,
        color: textColor,
        zIndex: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      <div className="h-full p-2 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 min-h-0">
          <p className="font-poppins font-bold text-[11px] leading-tight truncate">
            {schedule.subject?.code}
          </p>
          {span >= 2 && (
            <p className="font-inter text-[10px] opacity-90 leading-tight mt-0.5 line-clamp-2">
              {schedule.subject?.name}
            </p>
          )}
          {span >= 3 && (
            <p className="font-inter text-[10px] opacity-75 leading-tight mt-0.5 truncate">
              {schedule.teacher?.fullName}
            </p>
          )}
          {span >= 4 && (
            <p className="font-inter text-[9px] opacity-60 leading-tight mt-0.5">
              {schedule.startTime} – {schedule.endTime}
            </p>
          )}
        </div>

        {/* Action buttons — show on hover */}
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(schedule) }}
            className="p-1 rounded-md hover:bg-black/20 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(schedule.id) }}
            className="p-1 rounded-md hover:bg-black/20 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminSchedule() {
  const qc = useQueryClient()
  const [view, setView]                   = useState<View>('years')
  const [selectedYear, setSelectedYear]   = useState<any>(null)
  const [selectedSection, setSelectedSection] = useState<any>(null)
  const [modal, setModal]                 = useState<'year' | 'block' | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [form, setForm]                   = useState<FormState>(EMPTY_FORM)
  const [yearForm, setYearForm]           = useState({ name: '', isCurrent: false })
  const [dragOverDay, setDragOverDay]     = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: years    = [], isLoading: yearsLoading }    = useQuery({ queryKey: ['academic-years'],  queryFn: () => structureApi.getAcademicYears().then(r => r.data) })
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({ queryKey: ['sections'],         queryFn: () => structureApi.getSections().then(r => r.data) })
  const { data: subjects = [] }                             = useQuery({ queryKey: ['subjects'],          queryFn: () => structureApi.getSubjects().then(r => r.data) })
  const { data: teachers = [] }                             = useQuery({ queryKey: ['teachers'],          queryFn: () => teachersApi.getAll().then(r => r.data) })
  const { data: schedules = [], isLoading: schedLoading }   = useQuery({
    queryKey: ['schedules', selectedSection?.id, selectedYear?.id],
    queryFn:  () => structureApi.getSchedules({ sectionId: selectedSection?.id, academicYearId: selectedYear?.id }).then(r => r.data),
    enabled:  view === 'grid' && !!selectedSection?.id && !!selectedYear?.id,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createYear = useMutation({
    mutationFn: (d: any) => structureApi.createAcademicYear(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academic-years'] }); setModal(null); setYearForm({ name: '', isCurrent: false }) },
  })

  const createSchedule = useMutation({
    mutationFn: (d: any) => structureApi.createSchedule(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); closeBlockModal() },
  })

  const updateSchedule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => structureApi.updateSchedule(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); closeBlockModal() },
  })

  const deleteSchedule = useMutation({
    mutationFn: (id: string) => structureApi.deleteSchedule(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); setConfirmDelete(null) },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const sectionsForYear = useMemo(() => {
    if (!selectedYear) return sections as any[]
    return (sections as any[]).filter(() => true) // all sections belong to a year via schedules; show all
  }, [sections, selectedYear])

  const scheduleCountForSection = useCallback((sectionId: string) => {
    return (schedules as any[]).filter((s: any) => s.sectionId === sectionId).length
  }, [schedules])

  function openAddBlock(day?: string, startSlot?: number) {
    setEditingSchedule(null)
    setForm({
      ...EMPTY_FORM,
      dayOfWeek: day || 'Monday',
      startTime: startSlot !== undefined ? slotToTime(startSlot) : '07:00',
      endTime: startSlot !== undefined ? slotToTime(startSlot + 3) : '08:30',
      color: DEFAULT_COLOR,
      subjectId: (subjects as any[])[0]?.id || '',
      teacherId: (teachers as any[])[0]?.id || '',
    })
    setModal('block')
  }

  function openEditBlock(schedule: any) {
    setEditingSchedule(schedule)
    setForm({
      subjectId: schedule.subjectId || '',
      teacherId: schedule.teacherId || '',
      dayOfWeek: schedule.dayOfWeek || 'Monday',
      startTime: schedule.startTime || '07:00',
      endTime:   schedule.endTime   || '08:30',
      color:     schedule.color     || DEFAULT_COLOR,
      description: schedule.description || '',
    })
    setModal('block')
  }

  function closeBlockModal() {
    setModal(null)
    setEditingSchedule(null)
    setForm(EMPTY_FORM)
  }

  function submitBlockModal() {
    const payload = {
      subjectId:      form.subjectId,
      teacherId:      form.teacherId,
      sectionId:      selectedSection?.id,
      academicYearId: selectedYear?.id,
      dayOfWeek:      form.dayOfWeek,
      startTime:      form.startTime,
      endTime:        form.endTime,
      color:          form.color,
      description:    form.description,
    }
    if (editingSchedule) {
      updateSchedule.mutate({ id: editingSchedule.id, data: payload })
    } else {
      createSchedule.mutate(payload)
    }
  }

  const isBlockValid = !!form.subjectId && !!form.teacherId && !!form.startTime && !!form.endTime

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const dragData = useRef<{ scheduleId: string; offsetY: number } | null>(null)

  function handleDragStart(e: React.DragEvent, schedule: any) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    dragData.current = { scheduleId: schedule.id, offsetY }
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, day: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverDay(day)
  }

  function handleDrop(e: React.DragEvent, day: string) {
    e.preventDefault()
    setDragOverDay(null)
    if (!dragData.current || !gridRef.current) return

    const { scheduleId, offsetY } = dragData.current
    const gridRect = gridRef.current.getBoundingClientRect()
    const relY     = e.clientY - gridRect.top - offsetY
    const rawSlot  = relY / SLOT_H
    const snapped  = Math.round(rawSlot * 2) / 2 // snap to 30-min
    const clamped  = Math.max(0, Math.min(TOTAL_SLOTS - 1, snapped))

    const schedule = (schedules as any[]).find((s: any) => s.id === scheduleId)
    if (!schedule) return

    const origStart = timeToSlot(schedule.startTime ?? '0:0')
    const origEnd   = timeToSlot(schedule.endTime   ?? '1:0')
    const duration  = origEnd - origStart
    const newStart  = Math.min(clamped, TOTAL_SLOTS - duration)
    const newEnd    = newStart + duration

    updateSchedule.mutate({
      id:   scheduleId,
      data: {
        subjectId:      schedule.subjectId,
        teacherId:      schedule.teacherId,
        sectionId:      schedule.sectionId,
        academicYearId: schedule.academicYearId,
        dayOfWeek:      day,
        startTime:      slotToTime(newStart),
        endTime:        slotToTime(newEnd),
        color:          schedule.color,
        description:    schedule.description,
      },
    })
    dragData.current = null
  }

  function handleColumnClick(e: React.MouseEvent, day: string) {
    // Only fire if clicking the column background (not a block)
    if ((e.target as HTMLElement).closest('[data-block]')) return
    if (!gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const rawSlot = relY / SLOT_H
    const snapped = Math.round(rawSlot * 2) / 2
    const clamped = Math.max(0, Math.min(TOTAL_SLOTS - 3, snapped))
    openAddBlock(day, clamped)
  }

  // ── Views ────────────────────────────────────────────────────────────────────

  // School Years view
  if (view === 'years') return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Class Schedules</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Select a school year to manage section schedules.
          </p>
        </div>
        <Button onClick={() => setModal('year')} icon={<Plus className="w-4 h-4" />} size="sm">
          Add School Year
        </Button>
      </div>

      {yearsLoading ? <LoadingSpinner /> : (years as any[]).length === 0 ? (
        <EmptyState
          title="No School Years"
          description="Add a school year to start building schedules."
          icon={<CalendarDays className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(years as any[]).map((y: any) => (
            <button
              key={y.id}
              onClick={() => { setSelectedYear(y); setView('sections') }}
              className="card text-left group hover:border-primary/40 hover:shadow-md transition-all duration-200 border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-poppins font-semibold text-text-primary">{y.name}</p>
                    {y.isCurrent && (
                      <span className="badge bg-success/10 text-success text-[11px]">Current</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary font-inter mt-0.5">
                    {(sections as any[]).length} section{(sections as any[]).length !== 1 ? 's' : ''} available
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Add Year Modal */}
      <Modal
        open={modal === 'year'}
        onClose={() => { setModal(null); setYearForm({ name: '', isCurrent: false }) }}
        title="New School Year"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              loading={createYear.isPending}
              onClick={() => createYear.mutate(yearForm)}
              disabled={!yearForm.name}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Academic Year *"
            placeholder="2024-2025"
            value={yearForm.name}
            onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isCurrent"
              checked={yearForm.isCurrent}
              onChange={e => setYearForm(f => ({ ...f, isCurrent: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="isCurrent" className="text-sm font-inter text-text-primary">
              Set as current year
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )

  // Sections view
  if (view === 'sections') return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-inter text-text-secondary">
        <button onClick={() => setView('years')} className="hover:text-primary transition-colors">
          School Years
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium">{selectedYear?.name}</span>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Sections — {selectedYear?.name}</h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            Select a section to view and edit its class schedule.
          </p>
        </div>
      </div>

      {sectionsLoading ? <LoadingSpinner /> : sectionsForYear.length === 0 ? (
        <EmptyState
          title="No Sections"
          description="Create sections in Academic Structure first."
          icon={<LayoutGrid className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionsForYear.map((sec: any) => (
            <button
              key={sec.id}
              onClick={() => { setSelectedSection(sec); setView('grid') }}
              className="card text-left group hover:border-primary/40 hover:shadow-md transition-all duration-200 border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-secondary/20 transition-colors">
                  <GraduationCap className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-poppins font-semibold text-text-primary">{sec.name}</p>
                  <p className="text-xs text-text-secondary font-inter mt-0.5 truncate">
                    {sec.gradeLevel?.name}{sec.strand ? ` · ${sec.strand.name}` : ''}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )

  // Schedule Grid view
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm font-inter text-text-secondary flex-wrap">
        <button onClick={() => setView('years')} className="hover:text-primary transition-colors">
          School Years
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <button onClick={() => setView('sections')} className="hover:text-primary transition-colors">
          {selectedYear?.name}
        </button>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-primary font-medium">{selectedSection?.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">
            {selectedSection?.name} — Class Schedule
          </h1>
          <p className="text-text-secondary font-inter text-sm mt-1">
            {selectedYear?.name} · Click any empty slot to add a block, or drag blocks to reschedule.
          </p>
        </div>
        <Button onClick={() => openAddBlock()} icon={<Plus className="w-4 h-4" />} size="sm">
          Add Block
        </Button>
      </div>

      {/* Timetable card */}
      <div className="card overflow-hidden">
        {schedLoading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <div className="min-w-[700px]">

              {/* Day headers */}
              <div className="flex mb-2 pl-14">
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className="flex-1 mx-0.5 py-2.5 rounded-xl text-center bg-background"
                  >
                    <p className="font-poppins font-semibold text-xs text-text-secondary">{label}</p>
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div className="flex" ref={gridRef} style={{ height: TOTAL_SLOTS * SLOT_H }}>

                {/* Time axis */}
                <div className="w-14 flex-shrink-0 relative select-none">
                  {Array.from({ length: TOTAL_SLOTS + 1 }).map((_, i) =>
                    i % 2 === 0 ? (
                      <div
                        key={i}
                        className="absolute right-2 text-right leading-none"
                        style={{ top: i * SLOT_H - 7 }}
                      >
                        <span className="text-[10px] text-text-secondary font-inter">
                          {slotLabel(i)}
                        </span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* Day columns */}
                {DAYS.map((day) => {
                  const daySched = (schedules as any[]).filter((s: any) => s.dayOfWeek === day)
                  const isOver   = dragOverDay === day

                  return (
                    <div
                      key={day}
                      className={`flex-1 relative mx-0.5 rounded-xl overflow-hidden transition-colors cursor-crosshair
                        ${isOver ? 'bg-primary/10 ring-2 ring-primary/30' : 'bg-background/70 hover:bg-background'}`}
                      onDragOver={e => handleDragOver(e, day)}
                      onDragLeave={() => setDragOverDay(null)}
                      onDrop={e => handleDrop(e, day)}
                      onClick={e => handleColumnClick(e, day)}
                    >
                      {/* Hour grid lines */}
                      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                        <div
                          key={i}
                          className={`absolute left-0 right-0 border-t pointer-events-none ${
                            i % 2 === 0 ? 'border-border/40' : 'border-border/15'
                          }`}
                          style={{ top: i * SLOT_H }}
                        />
                      ))}

                      {/* Empty hint */}
                      {daySched.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-text-secondary/25 font-inter rotate-90 whitespace-nowrap">
                            click to add
                          </span>
                        </div>
                      )}

                      {/* Blocks */}
                      {daySched.map((s: any) => (
                        <div key={s.id} data-block="1">
                          <ScheduleBlock
                            schedule={s}
                            onEdit={openEditBlock}
                            onDelete={id => setConfirmDelete(id)}
                            onDragStart={handleDragStart}
                          />
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              {(schedules as any[]).length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-border">
                  {Array.from(new Map((schedules as any[]).map((s: any) => [s.subjectId, s]))).map(([, s]: any) => (
                    <div key={s.subjectId} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: s.color || DEFAULT_COLOR }} />
                      <span className="font-inter text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{s.subject?.code}</span>
                        {' — '}{s.subject?.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Block Modal */}
      <Modal
        open={modal === 'block'}
        onClose={closeBlockModal}
        title={editingSchedule ? 'Edit Schedule Block' : 'Add Schedule Block'}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={closeBlockModal}>Cancel</Button>
            <Button
              loading={createSchedule.isPending || updateSchedule.isPending}
              onClick={submitBlockModal}
              disabled={!isBlockValid}
            >
              {editingSchedule ? 'Save Changes' : 'Add Block'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
              Subject *
            </label>
            <select
              className="input-field"
              value={form.subjectId}
              onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}
            >
              <option value="">Select subject</option>
              {(subjects as any[]).map((s: any) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
              Teacher *
            </label>
            <select
              className="input-field"
              value={form.teacherId}
              onChange={e => setForm(f => ({ ...f, teacherId: e.target.value }))}
            >
              <option value="">Select teacher</option>
              {(teachers as any[]).map((t: any) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </select>
          </div>

          {/* Day */}
          <div>
            <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
              Day of Week
            </label>
            <select
              className="input-field"
              value={form.dayOfWeek}
              onChange={e => setForm(f => ({ ...f, dayOfWeek: e.target.value }))}
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
                Start Time
              </label>
              <input
                type="time"
                className="input-field"
                value={form.startTime}
                step="1800"
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium font-inter text-text-primary mb-1.5">
                End Time
              </label>
              <input
                type="time"
                className="input-field"
                value={form.endTime}
                step="1800"
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Color */}
          <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />

          {/* Description (optional) */}
          <Input
            label="Note (optional)"
            placeholder="e.g. Room 201"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove Schedule Block"
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              loading={deleteSchedule.isPending}
              onClick={() => confirmDelete && deleteSchedule.mutate(confirmDelete)}
            >
              Remove
            </Button>
          </div>
        }
      >
        <p className="text-text-secondary font-inter text-sm">
          Are you sure you want to remove this schedule block? This cannot be undone.
        </p>
      </Modal>
    </div>
  )
}
