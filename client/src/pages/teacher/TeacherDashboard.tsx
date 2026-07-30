import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, getDay } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { announcementsApi, structureApi } from '../../lib/api'
import { formatDate } from '../../lib/utils'
import {
  ClipboardList, BookOpen, LayoutDashboard,
  Megaphone, Calendar, ChevronRight, GraduationCap,
} from 'lucide-react'

// ─── Calendar constants ───────────────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
const HOUR_START = 7    // 7 AM
const HOUR_END   = 18   // 6 PM
const SLOT_MIN   = 30   // 30-min increments
const TOTAL_SLOTS = ((HOUR_END - HOUR_START) * 60) / SLOT_MIN // 22 slots
const SLOT_H     = 36   // px per slot

// Subject colour palette (cycled by subject index)
const SUBJECT_COLORS: { bg: string; text: string; shadow: string }[] = [
  { bg: 'bg-primary',   text: 'text-white', shadow: 'shadow-primary/30' },
  { bg: 'bg-accent',    text: 'text-white', shadow: 'shadow-accent/30'  },
  { bg: 'bg-secondary', text: 'text-white', shadow: 'shadow-yellow-400/30' },
  { bg: 'bg-info',      text: 'text-white', shadow: 'shadow-blue-400/30' },
  { bg: 'bg-success',   text: 'text-white', shadow: 'shadow-green-400/30' },
]

function timeToSlot(time: string): number {
  const [hStr, mStr = '0'] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  return ((h - HOUR_START) * 60 + m) / SLOT_MIN
}

function slotLabel(slotIdx: number): string {
  const totalMins = slotIdx * SLOT_MIN + HOUR_START * 60
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const teacher   = user?.profile

  // Which column (0-4) is today? -1 for weekends
  const todayDayIndex = useMemo(() => {
    const d = getDay(new Date()) // 0=Sun … 6=Sat
    return d >= 1 && d <= 5 ? d - 1 : -1
  }, [])

  const { data: schedules = [] } = useQuery({
    queryKey: ['teacher-schedules-dash', teacher?.id],
    queryFn: () => structureApi.getSchedules({ teacherId: teacher?.id }).then(r => r.data),
    enabled: !!teacher?.id,
  })

  const { data: announcements = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => announcementsApi.getPublic().then(r => r.data),
  })

  // Assign a stable colour index to each unique subject
  const subjectColorMap = useMemo(() => {
    const map: Record<string, number> = {}
    let idx = 0
    schedules.forEach((s: any) => {
      if (s.subjectId && !(s.subjectId in map)) map[s.subjectId] = idx++
    })
    return map
  }, [schedules])

  const recentAnnouncements = announcements.flatMap((c: any) => c.announcements).slice(0, 3)

  // Safe fallbacks so the card never appears empty
  const teacherName  = teacher?.fullName  || user?.name || 'Teacher'
  const department   = teacher?.department || 'Faculty'
  const employeeId   = teacher?.employeeId
  const assignments  = teacher?.subjectAssignments ?? []

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ── */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* ── Faculty info card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-card-hover p-6">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-16 -right-4  w-64 h-64 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-5">
          {/* Avatar */}
          <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center">
            <span className="font-poppins font-bold text-2xl">{getInitials(teacherName)}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-poppins font-bold text-xl leading-tight">{teacherName}</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 border border-white/25">
                <GraduationCap className="w-3 h-3" /> Teacher
              </span>
            </div>
            <p className="text-white/75 font-inter text-sm mt-0.5">{department}</p>
            {employeeId && (
              <p className="text-white/55 font-inter text-xs mt-0.5">ID: {employeeId}</p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {assignments.slice(0, 4).map((a: any) => (
                <span
                  key={a.id}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-inter font-medium bg-white/15 border border-white/20"
                >
                  {a.subject?.code ?? a.subject?.name}
                </span>
              ))}
              {assignments.length > 4 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-inter font-medium bg-white/15 border border-white/20">
                  +{assignments.length - 4} more
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Weekly Schedule Calendar ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-poppins font-semibold text-lg text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Weekly Schedule
            </h3>
            <p className="text-text-secondary font-inter text-xs mt-0.5">
              {schedules.length > 0
                ? `${schedules.length} class${schedules.length !== 1 ? 'es' : ''} scheduled this week`
                : 'No schedule assigned yet — contact the administrator'}
            </p>
          </div>
          <button
            onClick={() => navigate('/teacher/schedule')}
            className="flex items-center gap-1 text-primary text-sm font-inter font-medium hover:text-primary-dark transition-colors"
          >
            Full schedule <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto -mx-2">
          <div className="min-w-[580px] px-2">

            {/* Day header row */}
            <div className="flex mb-2">
              <div className="w-14 flex-shrink-0" />
              {DAY_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 mx-0.5 py-2 rounded-xl text-center ${
                    i === todayDayIndex
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-background text-text-secondary'
                  }`}
                >
                  <p className="font-poppins font-semibold text-xs">{label}</p>
                  {i === todayDayIndex && (
                    <p className="font-inter text-[10px] opacity-75 mt-0.5">Today</p>
                  )}
                </div>
              ))}
            </div>

            {/* Grid body */}
            <div className="flex" style={{ height: TOTAL_SLOTS * SLOT_H }}>

              {/* Time labels column */}
              <div className="w-14 flex-shrink-0 relative select-none">
                {Array.from({ length: TOTAL_SLOTS + 1 }).map((_, i) =>
                  i % 2 === 0 ? (
                    <div
                      key={i}
                      className="absolute right-2 text-right leading-none"
                      style={{ top: i * SLOT_H - 7 }}
                    >
                      <span className="text-[10px] text-text-secondary font-inter">{slotLabel(i)}</span>
                    </div>
                  ) : null
                )}
              </div>

              {/* One column per day */}
              {DAYS.map((day, dayIdx) => {
                const daySchedules = schedules.filter((s: any) => s.dayOfWeek === day)
                const isToday = dayIdx === todayDayIndex

                return (
                  <div
                    key={day}
                    className={`flex-1 relative mx-0.5 rounded-xl overflow-hidden ${
                      isToday ? 'bg-primary-light/50' : 'bg-background/70'
                    }`}
                  >
                    {/* Horizontal grid lines */}
                    {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                      <div
                        key={i}
                        className={`absolute left-0 right-0 border-t ${
                          i % 2 === 0 ? 'border-border/50' : 'border-border/20'
                        }`}
                        style={{ top: i * SLOT_H }}
                      />
                    ))}

                    {/* No-class placeholder */}
                    {daySchedules.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-[10px] text-text-secondary/30 font-inter">no class</span>
                      </div>
                    )}

                    {/* Schedule blocks */}
                    {daySchedules.map((s: any) => {
                      const startSlot = timeToSlot(s.startTime ?? '0:0')
                      const endSlot   = timeToSlot(s.endTime   ?? '0:0')
                      const span      = Math.max(1, endSlot - startSlot)
                      const col = SUBJECT_COLORS[
                        (subjectColorMap[s.subjectId] ?? 0) % SUBJECT_COLORS.length
                      ]

                      return (
                        <div
                          key={s.id}
                          className={`absolute inset-x-1 ${col.bg} ${col.text} rounded-lg overflow-hidden shadow-sm`}
                          style={{
                            top:    startSlot * SLOT_H + 1,
                            height: span * SLOT_H - 2,
                          }}
                        >
                          <div className="p-1.5 h-full flex flex-col justify-center">
                            <p className="font-poppins font-bold text-[11px] leading-tight truncate">
                              {s.subject?.code}
                            </p>
                            <p className="font-inter text-[10px] opacity-85 leading-tight mt-0.5 line-clamp-2">
                              {s.subject?.name}
                            </p>
                            {span >= 3 && (
                              <p className="font-inter text-[10px] opacity-70 leading-tight mt-0.5">
                                {s.section?.name}
                              </p>
                            )}
                            {span >= 4 && (
                              <p className="font-inter text-[10px] opacity-65 leading-tight">
                                {s.startTime} – {s.endTime}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* Legend */}
            {schedules.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border">
                {Object.entries(subjectColorMap).map(([subjectId, idx]) => {
                  const s = schedules.find((sc: any) => sc.subjectId === subjectId)
                  if (!s) return null
                  const col = SUBJECT_COLORS[idx % SUBJECT_COLORS.length]
                  return (
                    <div key={subjectId} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${col.bg}`} />
                      <span className="font-inter text-xs text-text-secondary">
                        {s.subject?.code} — {s.subject?.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom row: Quick Actions + Announcements ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Quick Actions */}
        <div className="card">
          <h3 className="font-poppins font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              {
                label: 'Take Attendance',
                sub: 'Open or create a session',
                icon: <ClipboardList className="w-4 h-4 text-success" />,
                iconBg: 'bg-success/10',
                path: '/teacher/attendance',
              },
              {
                label: 'Start Presentation',
                sub: 'Display slides for classroom',
                icon: <BookOpen className="w-4 h-4 text-info" />,
                iconBg: 'bg-info/10',
                path: '/teacher/presentation',
              },
              {
                label: 'Record Grades',
                sub: 'Activities & scores',
                icon: <LayoutDashboard className="w-4 h-4 text-secondary" />,
                iconBg: 'bg-secondary/10',
                path: '/teacher/academic',
              },
            ].map(action => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center gap-3 p-3 bg-background hover:bg-primary-light rounded-xl transition-colors text-left group"
              >
                <div className={`w-9 h-9 ${action.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter text-sm font-semibold text-text-primary">{action.label}</p>
                  <p className="font-inter text-xs text-text-secondary">{action.sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-primary transition-colors flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="card">
          <h3 className="font-poppins font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" /> Announcements
          </h3>
          {recentAnnouncements.length === 0 ? (
            <p className="text-text-secondary font-inter text-sm">No announcements.</p>
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-background rounded-xl">
                  <div className="w-2 h-2 mt-1.5 flex-shrink-0 rounded-full bg-accent" />
                  <div className="flex-1 min-w-0">
                    <p className="font-inter text-sm font-medium text-text-primary line-clamp-1">{a.title}</p>
                    {a.publishedAt && (
                      <p className="text-xs text-text-secondary mt-0.5">{formatDate(a.publishedAt)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
