import React, { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { announcementsApi } from '../lib/api'
import {
  GraduationCap, Calendar, Clock, Cloud, ChevronLeft, ChevronRight,
  AlertCircle, BookOpen, Users, Phone, Megaphone
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'School Announcements': <Megaphone className="w-5 h-5" />,
  'Upcoming Events': <Calendar className="w-5 h-5" />,
  'Class Schedule': <BookOpen className="w-5 h-5" />,
  'Emergency Hotlines': <Phone className="w-5 h-5" />,
}

export default function IdleScreen() {
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [activeTab, setActiveTab] = useState(0)
  const [slideIndex, setSlideIndex] = useState(0)
  const [autoRotateTab, setAutoRotateTab] = useState(true)

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

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary/90 flex flex-col select-none"
      onClick={() => navigate('/login')}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 bg-black/20 backdrop-blur-sm border-b border-white/10">
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

        {/* Date + Time + Weather */}
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
          <div className="flex items-center gap-2 text-white/80">
            <Cloud className="w-5 h-5" />
            <span className="font-inter text-sm">--°C</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center gap-2 px-8 py-4 bg-black/10 border-b border-white/10 overflow-x-auto">
        {categories.length === 0 ? (
          ['School Announcements', 'Upcoming Events', 'Class Schedule', 'Emergency Hotlines'].map((name, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); handleTabClick(i) }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-poppins font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === i
                  ? 'bg-white text-primary shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS[name] || <BookOpen className="w-4 h-4" />}
              {name}
            </button>
          ))
        ) : (
          categories.map((cat: any, i: number) => (
            <button
              key={cat.id}
              onClick={(e) => { e.stopPropagation(); handleTabClick(i) }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-poppins font-medium text-sm whitespace-nowrap transition-all ${
                activeTab === i
                  ? 'bg-white text-primary shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {CATEGORY_ICONS[cat.name] || <BookOpen className="w-4 h-4" />}
              {cat.name}
            </button>
          ))
        )}
      </nav>

      {/* Content */}
      <main className="flex-1 flex flex-col p-8 overflow-hidden">
        {!currentSlide ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6">
              <GraduationCap className="w-12 h-12 text-white/60" />
            </div>
            <h2 className="text-white/80 font-poppins font-semibold text-2xl mb-2">
              {activeCategory?.name || 'Announcements'}
            </h2>
            <p className="text-white/50 font-inter">No announcements at this time.</p>
            <div className="mt-12 animate-bounce">
              <p className="text-white/40 font-poppins text-sm">Touch anywhere to log in</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
            {/* Slide */}
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl overflow-hidden border border-white/20 flex">
              {currentSlide.image && (
                <div className="w-1/2 relative">
                  <img
                    src={currentSlide.image}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>
              )}
              <div className={`flex flex-col justify-center p-10 ${currentSlide.image ? 'w-1/2' : 'w-full'}`}>
                <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full mb-4 w-fit">
                  {CATEGORY_ICONS[activeCategory?.name] || <BookOpen className="w-3.5 h-3.5 text-white" />}
                  <span className="text-white/90 text-xs font-poppins font-medium">{activeCategory?.name}</span>
                </div>
                <h2 className="text-white font-poppins font-bold text-4xl mb-4 leading-tight">
                  {currentSlide.title}
                </h2>
                {currentSlide.description && (
                  <p className="text-white/80 font-inter text-lg leading-relaxed line-clamp-4">
                    {currentSlide.description}
                  </p>
                )}
                {currentSlide.publishedAt && (
                  <p className="text-white/50 font-inter text-sm mt-4">
                    {format(new Date(currentSlide.publishedAt), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>

            {/* Controls */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={(e) => { e.stopPropagation(); prevSlide() }}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-2">
                  {slides.map((_: any, i: number) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setSlideIndex(i) }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${i === slideIndex ? 'bg-white w-8' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); nextSlide() }}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer CTA */}
      <footer className="px-8 py-5 bg-black/20 border-t border-white/10 flex items-center justify-between">
        <p className="text-white/40 font-inter text-xs">
          SMARTCLASS v1.0 · Exequiel R. Lina High School
        </p>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <p className="text-white/60 font-poppins text-sm font-medium">
            Touch anywhere to log in
          </p>
        </div>
      </footer>
    </div>
  )
}
