import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDay } from 'date-fns'
import { useAuth } from '../../lib/auth'
import { structureApi } from '../../lib/api'
import { Calendar } from 'lucide-react'
import { LoadingSpinner, EmptyState } from '../../components/ui/EmptyState'

// ─── Calendar constants ───────────────────────────────────────────────────────
const DAYS        = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_LABELS  = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const HOUR_START  = 7
const HOUR_END    = 18
const SLOT_MIN    = 30
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MIN // 22
const SLOT_H      = 40 // px per slot

const SUBJECT_COLORS = [
  { bg: 'bg-primary',   text: 'text-white' },
  { bg: 'bg-accent',    text: 'text-white' },
  { bg: 'bg-secondary', text: 'text-white' },
  { bg: 'bg-info',      text: 'text-white' },
  { bg: 'bg-success',   text: 'text-white' },
]

function timeToSlot(time: string): number {
  const [hStr, mStr = '0'] = time.split(':')
  return ((parseInt(hStr, 10) - HOUR_START) * 60 + parseInt(mStr, 10)) / SLOT_MIN
}

function slotLabel(i: number): string {
  const totalMins = i * SLOT_MIN + HOUR_START * 60
  const h  = Math.floor(totalMins / 60)
  const m  = totalMins % 60
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${ap}`
}

export default function TeacherSchedule() {
  const { user } = useAuth()
  const teacher  = user?.profile
  const navigate = useNavigate()

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['teacher-schedules', teacher?.id],
    queryFn:  () => structureApi.getSchedules({ teacherId: teacher?.id, status: 'published' }).then(r => r.data),
    enabled:  !!teacher?.id,
  })

  // Which column is today (0–4 = Mon–Fri)
  const todayIdx = useMemo(() => {
    const d = getDay(new Date())
    return d >= 1 && d <= 5 ? d - 1 : -1
  }, [])

  // Stable colour per subject
  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    let idx = 0
    schedules.forEach((s: any) => {
      if (s.subjectId && !(s.subjectId in map)) map[s.subjectId] = idx++
    })
    return map
  }, [schedules])

  function handleBlockClick(s: any) {
    if (s.subjectId && s.sectionId) {
      navigate(`/teacher/subjects?sectionId=${s.sectionId}&subjectId=${s.subjectId}`)
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Class Schedule</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Your weekly teaching schedule. Click any subject block to manage its presentation materials.
        </p>
      </div>

      {schedules.length === 0 ? (
        <EmptyState
          title="No Schedule Yet"
          description="Your class schedule will appear here once assigned by the administrator."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />
      ) : (
        <div className="card">
          {/* Academic year label */}
          {schedules[0]?.academicYear && (
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-poppins font-semibold text-lg text-text-primary">
                  Weekly Timetable
                </h2>
                <p className="text-text-secondary font-inter text-xs mt-0.5">
                  Academic Year {schedules[0].academicYear.name}
                </p>
              </div>
              <span className="badge bg-primary-light text-primary-dark text-xs">
                {schedules.length} class{schedules.length !== 1 ? 'es' : ''}
              </span>
            </div>
          )}

          <div className="overflow-x-auto -mx-2">
            <div className="min-w-[620px] px-2">

              {/* Day headers */}
              <div className="flex mb-2">
                <div className="w-16 flex-shrink-0" />
                {DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`flex-1 mx-0.5 py-2.5 rounded-xl text-center ${
                      i === todayIdx
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-background text-text-secondary'
                    }`}
                  >
                    <p className="font-poppins font-semibold text-xs">{label}</p>
                    {i === todayIdx && (
                      <p className="font-inter text-[10px] opacity-75 mt-0.5">Today</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Grid body */}
              <div className="flex" style={{ height: TOTAL_SLOTS * SLOT_H }}>

                {/* Time labels */}
                <div className="w-16 flex-shrink-0 relative select-none">
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
                {DAYS.map((day, dayIdx) => {
                  const daySched = schedules.filter((s: any) => s.dayOfWeek === day)
                  const isToday  = dayIdx === todayIdx

                  return (
                    <div
                      key={day}
                      className={`flex-1 relative mx-0.5 rounded-xl overflow-hidden ${
                        isToday ? 'bg-primary-light/50' : 'bg-background/70'
                      }`}
                    >
                      {/* Grid lines */}
                      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                        <div
                          key={i}
                          className={`absolute left-0 right-0 border-t ${
                            i % 2 === 0 ? 'border-border/50' : 'border-border/20'
                          }`}
                          style={{ top: i * SLOT_H }}
                        />
                      ))}

                      {/* Empty label */}
                      {daySched.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] text-text-secondary/30 font-inter">no class</span>
                        </div>
                      )}

                      {/* Schedule blocks — clickable */}
                      {daySched.map((s: any) => {
                        const start = timeToSlot(s.startTime ?? '0:0')
                        const end   = timeToSlot(s.endTime   ?? '0:0')
                        const span  = Math.max(1, end - start)
                        const col   = SUBJECT_COLORS[
                          (subjectColorMap[s.subjectId] ?? 0) % SUBJECT_COLORS.length
                        ]

                        return (
                          <button
                            key={s.id}
                            onClick={() => handleBlockClick(s)}
                            title={`${s.subject?.name} — click to manage materials`}
                            className={`absolute inset-x-1 ${col.bg} ${col.text} rounded-lg overflow-hidden shadow-sm
                              cursor-pointer hover:brightness-110 hover:shadow-md active:scale-[0.98]
                              transition-all duration-150 text-left w-[calc(100%-8px)]`}
                            style={{ top: start * SLOT_H + 1, height: span * SLOT_H - 2 }}
                          >
                            <div className="p-2 h-full flex flex-col justify-center">
                              <p className="font-poppins font-bold text-xs leading-tight truncate">
                                {s.subject?.code}
                              </p>
                              <p className="font-inter text-[11px] opacity-90 leading-tight mt-0.5 line-clamp-2">
                                {s.subject?.name}
                              </p>
                              {span >= 3 && (
                                <p className="font-inter text-[11px] opacity-75 leading-tight mt-0.5">
                                  {s.section?.name}
                                </p>
                              )}
                              {span >= 3 && (
                                <p className="font-inter text-[10px] opacity-65 leading-tight mt-0.5">
                                  {s.startTime} – {s.endTime}
                                </p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-border">
                <p className="w-full text-[11px] text-text-secondary font-inter italic">
                  💡 Click any subject block to go directly to its presentation materials.
                </p>
                {Object.entries(subjectColorMap).map(([subjectId, idx]) => {
                  const s = schedules.find((sc: any) => sc.subjectId === subjectId)
                  if (!s) return null
                  const col = SUBJECT_COLORS[idx % SUBJECT_COLORS.length]
                  return (
                    <div key={subjectId} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${col.bg}`} />
                      <span className="font-inter text-xs text-text-secondary">
                        <span className="font-medium text-text-primary">{s.subject?.code}</span>
                        {' — '}{s.subject?.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
