import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, ChevronRight, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  exact?: boolean
}

interface PortalLayoutProps {
  navItems: NavItem[]
  children: React.ReactNode
  inactivityMinutes?: number
}

const COUNTDOWN_SECONDS = 10

export default function PortalLayout({ navItems, children, inactivityMinutes = 1 }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Inactivity state
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningShownRef = useRef(false)

  const returnToIdle = useCallback(() => {
    setShowWarning(false)
    warningShownRef.current = false
    navigate('/')
  }, [navigate])

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }, [])

  const startWarningCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS)
    setShowWarning(true)
    warningShownRef.current = true
    clearCountdown()
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearCountdown()
          returnToIdle()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [clearCountdown, returnToIdle])

  const resetTimer = useCallback(() => {
    // If warning is showing, user activity dismisses it
    if (warningShownRef.current) return

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)

    // Show warning 10s before timeout — fire after (inactivityMinutes * 60 - COUNTDOWN_SECONDS) seconds
    const warningDelay = inactivityMinutes * 60 * 1000 - COUNTDOWN_SECONDS * 1000
    inactivityTimerRef.current = setTimeout(startWarningCountdown, Math.max(warningDelay, 1000))
  }, [inactivityMinutes, startWarningCountdown])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => document.addEventListener(e, resetTimer, true))
    resetTimer()
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      clearCountdown()
      events.forEach(e => document.removeEventListener(e, resetTimer, true))
    }
  }, [resetTimer, clearCountdown])

  const handleStillHere = useCallback(() => {
    clearCountdown()
    setShowWarning(false)
    warningShownRef.current = false
    setCountdown(COUNTDOWN_SECONDS)
    resetTimer()
  }, [clearCountdown, resetTimer])

  const handleLogout = useCallback(async () => {
    clearCountdown()
    setShowWarning(false)
    await logout()
    navigate('/')
  }, [logout, navigate, clearCountdown])

  const name = user?.profile?.fullName || user?.name || 'User'
  const role = user?.role || ''
  const profilePic = user?.profile?.profile?.profilePicture || null

  const roleLabel = role === 'STUDENT' ? 'Student' : role === 'TEACHER' ? 'Teacher' : 'Administrator'
  const roleColor = role === 'STUDENT' ? 'bg-primary/20 text-primary-dark' : role === 'TEACHER' ? 'bg-info/20 text-info' : 'bg-accent/20 text-accent'

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Inactivity Warning Modal ── */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h2 className="font-poppins font-bold text-gray-900 text-xl mb-2">
              Inactivity Detected
            </h2>
            <p className="font-inter text-gray-500 text-sm mb-6">
              You'll be returned to the Announcement Board in
            </p>

            {/* Countdown ring */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                <circle
                  cx="48" cy="48" r="42"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - countdown / COUNTDOWN_SECONDS)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-poppins font-bold text-3xl text-amber-500">{countdown}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStillHere}
                className="w-full bg-primary hover:bg-primary-dark text-white font-poppins font-semibold py-3 rounded-xl transition-colors"
              >
                I'm Still Here
              </button>
              <button
                onClick={returnToIdle}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-poppins font-medium py-3 rounded-xl transition-colors text-sm"
              >
                Return to Announcement Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-64 bg-primary-dark shadow-sidebar transition-transform duration-300',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-primary font-poppins font-bold text-sm">SC</span>
          </div>
          <div>
            <p className="text-white font-poppins font-bold text-sm leading-none">SMARTCLASS</p>
            <p className="text-white/40 font-inter text-xs mt-0.5">ERLHS</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/40 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar name={name} src={profilePic} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-white font-poppins font-semibold text-sm truncate">{name}</p>
              <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-inter mt-0.5', roleColor)}>
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/')
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="sidebar-item-inactive w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface border-b border-border shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-primary-light rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-primary" />
          </button>
          <span className="font-poppins font-bold text-primary text-lg">SMARTCLASS</span>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
