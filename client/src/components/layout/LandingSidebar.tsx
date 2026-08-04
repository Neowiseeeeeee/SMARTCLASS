import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, LogIn, Heart, ChevronDown, GraduationCap,
  PenLine, LayoutTemplate, Columns2, Calculator,
  LayoutDashboard, LogOut, User, ChevronRight,
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
  ADMIN:   'bg-accent/20 text-accent',
  TEACHER: 'bg-blue-400/20 text-blue-300',
  STUDENT: 'bg-primary/20 text-primary-light',
}

export default function LandingSidebar({ open, onClose }: LandingSidebarProps) {
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const [learningOpen, setLearningOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  /* Close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  /* Prevent body scroll when open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const goTo = (path: string) => { onClose(); navigate(path) }
  const handleLogout = async () => { onClose(); await logout() }

  const learningItems = [
    { label: 'SMARTBOARD',              icon: <PenLine      className="w-5 h-5" />, path: '/smartboard'   },
    { label: 'Canvas Mode',             icon: <LayoutTemplate className="w-5 h-5" />, path: '/canvas'     },
    { label: 'Formula / Graph Finder',  icon: <Calculator   className="w-5 h-5" />, path: '/formula'      },
  ]

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer ── */}
      <aside
        ref={sidebarRef}
        role="dialog"
        aria-modal="true"
        aria-label="SMARTCLASS Menu"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-primary-dark shadow-2xl',
          'w-[300px] sm:w-[320px]',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10 flex-shrink-0">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-poppins font-bold text-sm leading-none">SMARTCLASS</p>
            <p className="text-white/40 font-inter text-xs mt-1">Menu</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">

          {/* ── LOGIN / USER SECTION ── */}
          {!user ? (
            /* Not logged in → Login button */
            <button
              onClick={() => goTo('/login')}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white font-poppins font-semibold transition-all touch-manipulation group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                <LogIn className="w-5 h-5" />
              </div>
              <span className="flex-1 text-left text-base">Login</span>
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          ) : (
            /* Logged in → user card + actions */
            <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10 mb-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-poppins font-semibold text-sm truncate">{user.name}</p>
                  <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-inter mt-0.5', ROLE_COLOR[user.role] || 'bg-white/20 text-white/70')}>
                    {ROLE_LABEL[user.role] || user.role}
                  </span>
                </div>
              </div>
              {/* Go to Dashboard */}
              <button
                onClick={() => goTo(ROLE_DASHBOARD[user.role] || '/')}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-white/80 hover:bg-white/10 hover:text-white font-inter transition-colors touch-manipulation"
              >
                <LayoutDashboard className="w-4 h-4 text-primary-light flex-shrink-0" />
                Go to Dashboard
              </button>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 font-inter transition-colors touch-manipulation border-t border-white/10"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Logout
              </button>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/10 my-2" />

          {/* ── HEALTH ── */}
          <button
            onClick={() => goTo('/health')}
            className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white font-poppins font-semibold transition-all touch-manipulation group"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <span className="flex-1 text-left text-base">Health</span>
            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
          </button>

          {/* ── INTERACTIVE LEARNING (collapsible) ── */}
          <div className="rounded-2xl overflow-hidden">
            <button
              onClick={() => setLearningOpen(o => !o)}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-white/80 hover:bg-white/10 hover:text-white font-poppins font-semibold transition-all touch-manipulation group"
              aria-expanded={learningOpen}
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 group-hover:bg-white/20 flex items-center justify-center flex-shrink-0 transition-colors">
                <GraduationCap className="w-5 h-5 text-secondary" />
              </div>
              <span className="flex-1 text-left text-base">Interactive Learning</span>
              <ChevronDown className={cn(
                'w-4 h-4 text-white/50 transition-transform duration-200',
                learningOpen ? 'rotate-180' : '',
              )} />
            </button>

            {/* Sub-items */}
            {learningOpen && (
              <div className="ml-4 mr-1 mb-1 space-y-0.5">
                {learningItems.map(item => (
                  <button
                    key={item.path}
                    onClick={() => goTo(item.path)}
                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white font-inter font-medium text-sm transition-all touch-manipulation group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/15 flex items-center justify-center flex-shrink-0 transition-colors text-secondary">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0">
          <p className="text-white/25 font-inter text-[11px] text-center">SMARTCLASS · ERLHS</p>
        </div>
      </aside>
    </>
  )
}
