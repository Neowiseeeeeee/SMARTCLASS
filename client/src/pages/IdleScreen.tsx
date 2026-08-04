import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { announcementsApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import LandingSidebar from '../components/layout/LandingSidebar'
import {
  GraduationCap, Calendar, ChevronLeft, ChevronRight,
  BookOpen, Phone, Megaphone, Menu,
  User, ChevronDown,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'School Announcements': <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />,
  'Upcoming Events':      <Calendar  className="w-4 h-4 sm:w-5 sm:h-5" />,
  'Class Schedule':       <BookOpen  className="w-4 h-4 sm:w-5 sm:h-5" />,
  'Emergency Hotlines':   <Phone     className="w-4 h-4 sm:w-5 sm:h-5" />,
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

// WMO weather code → label + emoji
function decodeWeather(code: number): { label: string; emoji: string } {
  if (code === 0)                           return { label: 'Clear Sky',    emoji: '☀️' }
  if (code <= 2)                            return { label: 'Partly Cloudy', emoji: '⛅' }
  if (code === 3)                           return { label: 'Overcast',      emoji: '☁️' }
  if (code <= 48)                           return { label: 'Foggy',         emoji: '🌫️' }
  if (code <= 55)                           return { label: 'Drizzle',       emoji: '🌦️' }
  if (code <= 65)                           return { label: 'Rain',          emoji: '🌧️' }
  if (code <= 77)                           return { label: 'Snow',          emoji: '❄️' }
  if (code <= 82)                           return { label: 'Showers',       emoji: '🌦️' }
  if (code <= 99)                           return { label: 'Thunderstorm',  emoji: '⛈️' }
  return { label: 'Unknown', emoji: '🌡️' }
}

export default function IdleScreen() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [autoRotateTab, setAutoRotateTab] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [weather, setWeather] = useState<{ temp: number; label: string; emoji: string } | null>(null)

  // Fetch weather via Open-Meteo (free, no key). Try geolocation, fall back to Manila.
  useEffect(() => {
    const fetchWeather = (lat: number, lon: number) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
      )
        .then(r => r.json())
        .then(d => {
          const temp = Math.round(d.current.temperature_2m)
          const { label, emoji } = decodeWeather(d.current.weather_code)
          setWeather({ temp, label, emoji })
        })
        .catch(() => {})
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        ()  => fetchWeather(14.5995, 120.9842), // fallback: Manila
      )
    } else {
      fetchWeather(14.5995, 120.9842)
    }

    // Refresh weather every 10 min
    const t = setInterval(() => fetchWeather(14.5995, 120.9842), 600_000)
    return () => clearInterval(t)
  }, [])

  // Touch-swipe state
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

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


  const activeCategory = categories[activeTab]
  const slides = activeCategory?.announcements || []

  // Auto-rotate slides every 6 s
  useEffect(() => {
    if (!slides.length) return
    const t = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length, activeTab])

  // Reset image-error flag whenever the visible slide changes
  useEffect(() => { setImgError(false) }, [slideIndex, activeTab])

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

  // Touch-swipe handlers (horizontal swipe → prev/next, vertical → scroll)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    // Only treat as a horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) nextSlide()   // swipe left → next
      else prevSlide()           // swipe right → prev
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const currentSlide = slides[slideIndex]

  const dayNames   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col select-none">

      {/* ── Landing Sidebar ── */}
      <LandingSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 bg-primary-dark border-b border-white/10 gap-3 shadow-sm">

        {/* Left: hamburger + logo + SMARTCLASS label (same row height as logo) */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors touch-manipulation flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center shadow flex-shrink-0">
            <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>

          {/* SMARTCLASS — vertically centered to match logo height */}
          <p className="text-white font-poppins font-bold text-sm sm:text-base leading-none hidden sm:block">
            SMARTCLASS
          </p>
        </div>

        {/* Right: date+time stack · weather · user chip */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">

          {/* Date + time stacked */}
          <div className="flex flex-col items-end leading-none">
            <p className="text-white/70 font-inter text-[10px] sm:text-[11px] leading-snug">
              {dayNames[now.getDay()]}, {monthNames[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
            </p>
            <p className="text-white font-poppins font-semibold text-[11px] sm:text-xs tabular-nums leading-snug">
              {format(now, 'hh:mm')}
              <span className="text-white/60 text-[10px] sm:text-[11px]">{format(now, ':ss')}</span>
              <span className="text-white/50 font-inter font-normal ml-1 text-[10px] sm:text-[11px]">{format(now, 'a')}</span>
            </p>
          </div>

          {/* Divider */}
          <div className="w-px h-7 bg-white/20 hidden sm:block flex-shrink-0" />

          {/* Weather */}
          {weather && (
            <div className="flex flex-col items-center leading-none hidden sm:flex">
              <p className="text-white font-poppins font-semibold text-[11px] sm:text-xs leading-snug">
                <span className="mr-1">{weather.emoji}</span>{weather.temp}°C
              </p>
              <p className="text-white/55 font-inter text-[10px] leading-snug">{weather.label}</p>
            </div>
          )}

          {/* Divider before user chip */}
          {user && <div className="w-px h-7 bg-white/20 hidden sm:block flex-shrink-0" />}

          {/* User chip */}
          {user && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-white/15 hover:bg-white/25 text-white font-poppins font-medium text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all border border-white/20 touch-manipulation"
            >
              <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-white text-[11px] font-semibold leading-none">{user.name}</p>
                <p className="text-white/60 text-[10px] leading-none mt-0.5">{ROLE_LABEL[user.role]}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/60" />
            </button>
          )}
        </div>
      </header>

      {/* ── Category tabs ── */}
      <nav className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-primary border-b border-primary-dark/20 overflow-x-auto scrollbar-none">
        {(categories.length === 0
          ? ['School Announcements', 'Upcoming Events', 'Class Schedule', 'Emergency Hotlines'].map((name, i) => ({ id: String(i), name }))
          : categories
        ).map((cat: any, i: number) => (
          <button
            key={cat.id}
            onClick={() => handleTabClick(i)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 rounded-xl font-poppins font-medium text-xs sm:text-sm whitespace-nowrap transition-all touch-manipulation min-h-[40px] sm:min-h-[44px] ${
              activeTab === i
                ? 'bg-white text-primary shadow-md'
                : 'text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            {CATEGORY_ICONS[cat.name] || <BookOpen className="w-4 h-4" />}
            <span className="hidden sm:inline">{cat.name}</span>
            {/* Mobile: short label */}
            <span className="sm:hidden">{cat.name.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col p-3 sm:p-5 lg:p-8 overflow-hidden bg-gray-50 min-h-0">
        {!currentSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4 sm:mb-6">
              <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary/50" />
            </div>
            <h2 className="text-gray-700 font-poppins font-semibold text-lg sm:text-xl lg:text-2xl mb-2">
              {activeCategory?.name || 'Announcements'}
            </h2>
            <p className="text-gray-400 font-inter text-sm">No announcements at this time.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 sm:gap-5 lg:gap-6 min-h-0">
            {/* Slide card — touch-swipeable */}
            <div
              className="flex-1 bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 shadow-sm flex min-h-0 touch-pan-y"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >

              {/* ── PDF: full-height embed ── */}
              {currentSlide.pdf ? (
                <div className="relative flex-1 flex flex-col min-h-0">
                  <iframe
                    src={currentSlide.pdf}
                    title={currentSlide.title}
                    className="flex-1 w-full border-0"
                    style={{ minHeight: 0 }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 sm:px-8 py-4 sm:py-5 pointer-events-none">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-2 w-fit">
                      <span className="text-white/90">{CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5" />}</span>
                      <span className="text-white/90 text-xs font-poppins font-semibold">{activeCategory?.name}</span>
                    </div>
                    <h2 className="text-white font-poppins font-bold text-lg sm:text-xl lg:text-2xl leading-tight drop-shadow">
                      {currentSlide.title}
                    </h2>
                    {currentSlide.publishedAt && (
                      <p className="text-white/60 font-inter text-xs sm:text-sm mt-1">
                        {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

              /* ── Image only: fill the card ── */
              ) : currentSlide.image && !currentSlide.description && !imgError ? (
                <div className="relative flex-1 min-h-0">
                  <img
                    src={currentSlide.image}
                    alt={currentSlide.title}
                    className="w-full h-full object-contain bg-gray-900"
                    onError={() => setImgError(true)}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 sm:px-8 py-4 sm:py-6 pointer-events-none">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full mb-2 w-fit">
                      <span className="text-white/90">{CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5" />}</span>
                      <span className="text-white/90 text-xs font-poppins font-semibold">{activeCategory?.name}</span>
                    </div>
                    <h2 className="text-white font-poppins font-bold text-xl sm:text-2xl lg:text-3xl leading-tight drop-shadow">
                      {currentSlide.title}
                    </h2>
                    {currentSlide.publishedAt && (
                      <p className="text-white/60 font-inter text-xs sm:text-sm mt-1">
                        {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

              /* ── Image + text: stack on mobile, side-by-side on md+ ── */
              ) : currentSlide.image && currentSlide.description && !imgError ? (
                <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-auto md:overflow-hidden">
                  <div className="w-full md:w-1/2 flex-shrink-0 min-h-[200px] sm:min-h-[260px] md:min-h-0">
                    <img
                      src={currentSlide.image}
                      alt={currentSlide.title}
                      className="w-full h-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  </div>
                  <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-10 md:w-1/2 overflow-y-auto">
                    <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-3 sm:mb-4 w-fit">
                      <span className="text-primary">{CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5" />}</span>
                      <span className="text-primary text-xs font-poppins font-semibold">{activeCategory?.name}</span>
                    </div>
                    <h2 className="text-gray-900 font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 leading-tight">
                      {currentSlide.title}
                    </h2>
                    <p className="text-gray-600 font-inter text-base sm:text-lg leading-relaxed line-clamp-5 sm:line-clamp-6">
                      {currentSlide.description}
                    </p>
                    {currentSlide.publishedAt && (
                      <p className="text-gray-400 font-inter text-xs sm:text-sm mt-3 sm:mt-4">
                        {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>

              /* ── Text only ── */
              ) : (
                <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-10 w-full overflow-y-auto">
                  <div className="inline-flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full mb-3 sm:mb-4 w-fit">
                    <span className="text-primary">{CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5" />}</span>
                    <span className="text-primary text-xs font-poppins font-semibold">{activeCategory?.name}</span>
                  </div>
                  <h2 className="text-gray-900 font-poppins font-bold text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 leading-tight">
                    {currentSlide.title}
                  </h2>
                  {currentSlide.description && (
                    <p className="text-gray-600 font-inter text-base sm:text-lg leading-relaxed line-clamp-4 sm:line-clamp-6">
                      {currentSlide.description}
                    </p>
                  )}
                  {currentSlide.publishedAt && (
                    <p className="text-gray-400 font-inter text-xs sm:text-sm mt-3 sm:mt-4">
                      {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Slide controls */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-3 sm:gap-4 flex-shrink-0">
                <button
                  onClick={prevSlide}
                  className="p-2.5 sm:p-3 bg-white hover:bg-primary/5 border border-gray-200 rounded-xl text-gray-600 hover:text-primary transition-all shadow-sm touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2 items-center">
                  {slides.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`h-2.5 rounded-full transition-all touch-manipulation ${i === slideIndex ? 'bg-primary w-6 sm:w-8' : 'bg-gray-300 w-2.5'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={nextSlide}
                  className="p-2.5 sm:p-3 bg-white hover:bg-primary/5 border border-gray-200 rounded-xl text-gray-600 hover:text-primary transition-all shadow-sm touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 lg:py-4 bg-primary-dark border-t border-white/10 flex items-center justify-between gap-4">
        <p className="text-white/40 font-inter text-[10px] sm:text-xs">
          SMARTCLASS v1.0 · Exequiel R. Lina High School
        </p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-white/50 font-inter text-[10px] sm:text-xs">System Online</p>
        </div>
      </footer>
    </div>
  )
}
