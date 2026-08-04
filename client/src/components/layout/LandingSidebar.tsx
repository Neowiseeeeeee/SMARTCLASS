import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, LogIn, Heart, ChevronDown, GraduationCap,
  PenLine, LayoutTemplate, Calculator,
  LayoutDashboard, LogOut, User, ChevronRight,
  Activity, Droplets, Moon,
} from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { cn } from '../../lib/utils'

interface LandingSidebarProps {
  open: boolean
  onClose: () => void
}

const ROLE_DASHBOARD: Record<string, string> = {
  ADMIN: '/admin/dashboard',
  TEACHER: '/teacher/dashboard',
  STUDENT: '/student/dashboard',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrator',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN:   'bg-amber-400/20 text-amber-300',
  TEACHER: 'bg-blue-400/20 text-blue-300',
  STUDENT: 'bg-emerald-400/20 text-emerald-300',
}

export default function LandingSidebar({ open, onClose }: LandingSidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [learningOpen, setLearningOpen] = useState(false)
  const [healthOpen, setHealthOpen]     = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const goTo = (path: string) => { onClose(); navigate(path) }
  const handleLogout = async () => { onClose(); await logout() }

  const healthItems = [
    { label: 'Health Tips',  icon: <Heart    className="w-3.5 h-3.5" />, path: '/health?tab=tips',  color: 'text-rose-400'   },
    { label: 'BMI',          icon: <Activity className="w-3.5 h-3.5" />, path: '/health?tab=bmi',   color: 'text-orange-400' },
    { label: 'Water Intake', icon: <Droplets className="w-3.5 h-3.5" />, path: '/health?tab=water', color: 'text-sky-400'    },
    { label: 'Sleep',        icon: <Moon     className="w-3.5 h-3.5" />, path: '/health?tab=sleep', color: 'text-violet-400' },
  ]

  const learningItems = [
    { label: 'SMARTBOARD',             icon: <PenLine        className="w-3.5 h-3.5" />, path: '/smartboard', color: 'text-emerald-400' },
    { label: 'Canvas Mode',            icon: <LayoutTemplate className="w-3.5 h-3.5" />, path: '/canvas',     color: 'text-blue-400'    },
    { label: 'Formula / Graph Finder', icon: <Calculator     className="w-3.5 h-3.5" />, path: '/formula',    color: 'text-amber-400'   },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="SMARTCLASS Menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col',
          'w-64 sm:w-72',
          'bg-[#1a3228] border-r border-white/8 shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-white/8 flex-shrink-0">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-poppins font-bold text-sm leading-none">SMARTCLASS</p>
            <p className="text-white/35 font-inter text-[11px] mt-0.5 leading-none">Navigation</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">

          {/* Login / User section */}
          {!user ? (
            <NavButton
              icon={<LogIn className="w-4 h-4" />}
              iconBg="bg-white/8"
              iconColor="text-white/70"
              label="Login"
              onClick={() => goTo('/login')}
              suffix={<ChevronRight className="w-3.5 h-3.5 text-white/25" />}
            />
          ) : (
            <div className="rounded-xl overflow-hidden bg-white/5 border border-white/8 mb-1">
              {/* User info row */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/8">
                <div className="w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-poppins font-semibold text-xs leading-none truncate">{user.name}</p>
                  <span className={cn('inline-block text-[10px] px-1.5 py-0.5 rounded-full font-inter mt-1 leading-none', ROLE_COLOR[user.role] || 'bg-white/15 text-white/60')}>
                    {ROLE_LABEL[user.role] || user.role}
                  </span>
                </div>
              </div>
              <button
                onClick={() => goTo(ROLE_DASHBOARD[user.role] || '/')}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/70 hover:bg-white/8 hover:text-white font-inter transition-colors touch-manipulation"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-primary-light flex-shrink-0" />
                Go to Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-300 font-inter transition-colors touch-manipulation border-t border-white/8"
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                Logout
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-white/8 my-1 mx-1" />

          {/* Health dropdown */}
          <CollapsibleNav
            icon={<Heart className="w-4 h-4" />}
            iconColor="text-rose-400"
            iconBg="bg-rose-400/10"
            label="Health"
            open={healthOpen}
            onToggle={() => setHealthOpen(o => !o)}
          >
            {healthItems.map(item => (
              <SubNavButton
                key={item.path}
                icon={item.icon}
                iconColor={item.color}
                label={item.label}
                onClick={() => goTo(item.path)}
              />
            ))}
          </CollapsibleNav>

          {/* Interactive Learning dropdown */}
          <CollapsibleNav
            icon={<GraduationCap className="w-4 h-4" />}
            iconColor="text-secondary"
            iconBg="bg-secondary/10"
            label="Interactive Learning"
            open={learningOpen}
            onToggle={() => setLearningOpen(o => !o)}
          >
            {learningItems.map(item => (
              <SubNavButton
                key={item.path}
                icon={item.icon}
                iconColor={item.color}
                label={item.label}
                onClick={() => goTo(item.path)}
              />
            ))}
          </CollapsibleNav>
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-white/8 flex-shrink-0">
          <p className="text-white/20 font-inter text-[10px] text-center tracking-wide">SMARTCLASS · ERLHS</p>
        </div>
      </aside>
    </>
  )
}

/* ── Shared sub-components ─────────────────────────────────────────────────── */

function NavButton({
  icon, iconBg, iconColor, label, onClick, suffix,
}: {
  icon: React.ReactNode
  iconBg?: string
  iconColor?: string
  label: string
  onClick: () => void
  suffix?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-white/75 hover:bg-white/8 hover:text-white font-inter font-medium text-sm transition-all touch-manipulation group"
    >
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', iconBg ?? 'bg-white/8', iconColor ?? 'text-white/60')}>
        {icon}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {suffix}
    </button>
  )
}

function CollapsibleNav({
  icon, iconBg, iconColor, label, open, onToggle, children,
}: {
  icon: React.ReactNode
  iconBg?: string
  iconColor?: string
  label: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-2.5 w-full px-2.5 py-2.5 rounded-xl text-white/75 hover:bg-white/8 hover:text-white font-inter font-medium text-sm transition-all touch-manipulation group"
      >
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors', iconBg ?? 'bg-white/8', iconColor ?? 'text-white/60')}>
          {icon}
        </div>
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-white/30 transition-transform duration-200', open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="mt-0.5 ml-3 pl-3 border-l border-white/10 space-y-0.5 pb-1">
          {children}
        </div>
      )}
    </div>
  )
}

function SubNavButton({
  icon, iconColor, label, onClick,
}: {
  icon: React.ReactNode
  iconColor?: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-white/55 hover:bg-white/8 hover:text-white font-inter text-xs transition-all touch-manipulation group"
    >
      <span className={cn('flex-shrink-0 transition-colors', iconColor ?? 'text-white/40')}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
