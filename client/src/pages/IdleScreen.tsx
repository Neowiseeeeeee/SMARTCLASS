import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { announcementsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  GraduationCap, Calendar, Clock, ChevronLeft, ChevronRight,
  BookOpen, Phone, Megaphone, LogIn, Menu, X, LayoutDashboard,
  LogOut, User, ChevronDown,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'School Announcements': <Megaphone className="w-5 h-5" />,
  'Upcoming Events': <Calendar className="w-5 h-5" />,
  'Class Schedule': <BookOpen className="w-5 h-5" />,
  'Emergency Hotlines': <Phone className="w-5 h-5" />,
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

export default function IdleScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [autoRotateTab, setAutoRotateTab] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['public-announcements'],
    queryFn: () => announcementsApi.getPublic().then(r => r.data),
    refetchInterval: 60_000,
  })

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const activeCategory = categories[activeTab]
  const slides = activeCategory?.announcements || []

  // Auto-rotate slides
  useEffect(() => {
    if (!slides.length) return
    const t = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 8000)
    return () => clearInterval(t)
  }, [slides.length, activeTab])

  // Auto-rotate tabs
  useEffect(() => {
    if (!autoRotateTab || !categories.length) return
    const t = setInterval(() => {
      setActiveTab(i => (i + 1) % categories.length)
      setSlideIndex(0)
    }, 30_000)
    return () => clearInterval(t)
  }, [autoRotateTab, categories.length])

  const handleTabClick = (i: number) => {
    setActiveTab(i)
    setSlideIndex(0)
    setAutoRotateTab(false)
    setTimeout(() => setAutoRotateTab(true), 120_000)
  }

  const prevSlide = () => setSlideIndex(i => (i - 1 + slides.length) % slides.length)
  const nextSlide = () => setSlideIndex(i => (i + 1) % slides.length)

  const currentSlide = slides[slideIndex]

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
  }

  const handleGoToDashboard = () => {
    setMenuOpen(false)
    if (user) navigate(ROLE_DASHBOARD[user.role] || '/')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col select-none">
      {/* Header — dark green */}
      <header className="flex items-center justify-between px-8 py-5 bg-primary-dark border-b border-white/10">
        {/* Logo + School */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-inter uppercase tracking-widest">SMARTCLASS</p>
            <h1 className="text-white font-poppins font-bold text-xl leading-tight">
              Exequiel R. Lina High School
            </h1>
          </div>
        </div>

        {/* Date + Time + Auth button */}
        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-white/70 text-sm font-inter">{dayNames[now.getDay()]}</p>
            <p className="text-white font-poppins font-semibold text-lg">
              {monthNames[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
            </p>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-white/70" />
            <span className="text-white font-poppins font-bold text-3xl tabular-nums">
              {format(now, 'hh:mm')}
            </span>
            <div className="flex flex-col">
              <span className="text-white/70 text-xs font-inter">{format(now, 'ss')}</span>
              <span className="text-white font-poppins text-xs font-semibold">{format(now, 'a')}</span>
            </div>
          </div>
          <div className="w-px h-10 bg-white/20" />

          {/* Auth control */}
          {!user ? (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white text-primary font-poppins font-semibold text-sm px-5 py-2.5 rounded-xl shadow hover:bg-primary-light transition-all"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2.5 bg-white/15 hover:bg-white/25 text-white font-poppins font-medium text-sm px-4 py-2.5 rounded-xl transition-all border border-white/20"
              >
                <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-white text-xs font-semibold leading-none">{user.name}</p>
                  <p className="text-white/60 text-xs leading-none mt-0.5">{ROLE_LABEL[user.role]}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="px-4 py-3 bg-primary/5 border-b border-gray-100">
                    <p className="font-poppins font-semibold text-gray-800 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-500 font-inter">{ROLE_LABEL[user.role]}</p>
                  </div>
                  <button
                    onClick={handleGoToDashboard}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-primary/5 font-inter transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-primary" />
                    Go to Dashboard
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 font-inter transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Tabs — slightly lighter green */}
      <nav className="flex items-center gap-2 px-8 py-4 bg-primary border-b border-primary-dark/20 overflow-x-auto">
        {(categories.length === 0
          ? ['School Announcements', 'Upcoming Events', 'Class Schedule', 'Emergency Hotlines'].map((name, i) => ({ id: String(i), name }))
          : categories
        ).map((cat: any, i: number) => (
          <button
            key={cat.id}
            onClick={() => handleTabClick(i)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-poppins font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === i
                ? 'bg-white text-primary shadow-md'
                : 'text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            {CATEGORY_ICONS[cat.name] || <BookOpen className="w-4 h-4" />}
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Content — white background */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden bg-gray-50">
        {!currentSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <GraduationCap className="w-12 h-12 text-primary/50" />
            </div>
            <h2 className="text-gray-700 font-poppins font-semibold text-2xl mb-2">
              {activeCategory?.name || 'Announcements'}
            </h2>
            <p className="text-gray-400 font-inter">No announcements at this time.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            {/* Slide card */}
            <div className="flex-1 bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm flex">
              {currentSlide.image && (
                <div className="w-1/2 relative">
                  <img
                    src={currentSlide.image}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className={`flex flex-col justify-center p-10 ${currentSlide.image ? 'w-1/2' : 'w-full'}`}>
                <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-4 w-fit">
                  <span className="text-primary">{CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5" />}</span>
                  <span className="text-primary text-xs font-poppins font-semibold">{activeCategory?.name}</span>
                </div>
                <h2 className="text-gray-900 font-poppins font-bold text-4xl mb-4 leading-tight">
                  {currentSlide.title}
                </h2>
                {currentSlide.description && (
                  <p className="text-gray-600 font-inter text-lg leading-relaxed line-clamp-4">
                    {currentSlide.description}
                  </p>
                )}
                {currentSlide.publishedAt && (
                  <p className="text-gray-400 font-inter text-sm mt-4">
                    {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Slide controls */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={prevSlide}
                  className="p-3 bg-white hover:bg-primary/5 border border-gray-200 rounded-xl text-gray-600 hover:text-primary transition-all shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {slides.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`h-2.5 rounded-full transition-all ${i === slideIndex ? 'bg-primary w-8' : 'bg-gray-300 w-2.5'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextSlide}
                  className="p-3 bg-white hover:bg-primary/5 border border-gray-200 rounded-xl text-gray-600 hover:text-primary transition-all shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-8 py-4 bg-primary-dark border-t border-white/10 flex items-center justify-between">
        <p className="text-white/40 font-inter text-xs">
          SMARTCLASS v1.0 · Exequiel R. Lina High School
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-white/50 font-inter text-xs">System Online</p>
        </div>
      </footer>
    </div>
  )
}
