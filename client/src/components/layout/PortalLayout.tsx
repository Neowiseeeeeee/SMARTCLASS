import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { Avatar } from '../ui/Avatar'
import { cn } from '../../lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface PortalLayoutProps {
  navItems: NavItem[]
  children: React.ReactNode
  inactivityMinutes?: number
}

export default function PortalLayout({ navItems, children, inactivityMinutes = 15 }: PortalLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])

  // Inactivity timer
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(handleLogout, inactivityMinutes * 60 * 1000)
  }, [handleLogout, inactivityMinutes])

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => document.addEventListener(e, resetTimer, true))
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach(e => document.removeEventListener(e, resetTimer, true))
    }
  }, [resetTimer])

  const name = user?.profile?.fullName || user?.name || 'User'
  const role = user?.role || ''
  const profilePic = user?.profile?.profile?.profilePicture || null

  const roleLabel = role === 'STUDENT' ? 'Student' : role === 'TEACHER' ? 'Teacher' : 'Administrator'
  const roleColor = role === 'STUDENT' ? 'bg-primary/20 text-primary-dark' : role === 'TEACHER' ? 'bg-info/20 text-info' : 'bg-accent/20 text-accent'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
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
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
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
