import React, { useState } from 'react'
import {
  Heart, Droplets, Moon, ChevronRight, ChevronLeft,
  Activity, RefreshCw, Info,
} from 'lucide-react'
import ToolLayout from '../../components/layout/ToolLayout'
import { cn } from '../../lib/utils'

type SubTab = 'home' | 'tips' | 'bmi' | 'water' | 'sleep'

const HEALTH_TIPS = [
  { title: 'Stay Hydrated',         body: 'Drink at least 8 glasses of water daily. Staying hydrated improves focus, energy, and overall health.',         emoji: '💧', color: '#BAE6FD' },
  { title: 'Move Every Hour',       body: 'Stand up and stretch every hour. Even a 5-minute walk boosts circulation and reduces fatigue.',                  emoji: '🚶', color: '#BBF7D0' },
  { title: 'Get 8–10 Hours Sleep',  body: 'Teens need 8–10 hours of sleep. Sleep improves memory, mood, and academic performance.',                        emoji: '😴', color: '#E9D5FF' },
  { title: 'Eat a Balanced Meal',   body: 'Include fruits, vegetables, proteins, and grains in every meal. Good nutrition fuels your brain.',              emoji: '🥗', color: '#FEF08A' },
  { title: 'Limit Screen Time',     body: 'Take a 20-second eye break every 20 minutes. Look at something 20 feet away to reduce eye strain.',            emoji: '👁️', color: '#FED7AA' },
  { title: 'Practice Deep Breathing', body: 'Breathe deeply for 5 minutes when stressed. This activates the relaxation response and calms the mind.',     emoji: '🌬️', color: '#FECACA' },
  { title: 'Wash Your Hands Often', body: 'Regular handwashing prevents the spread of germs and reduces the risk of illness in school settings.',         emoji: '🧼', color: '#BAE6FD' },
  { title: 'Stay Socially Connected', body: 'Talk to friends and family daily. Positive social connections boost mental health and resilience.',           emoji: '🤝', color: '#BBF7D0' },
]

function BMICalculator() {
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [result, setResult] = useState<{ bmi: number; category: string; color: string } | null>(null)

  const calculate = () => {
    const h = parseFloat(height) / 100  // cm → m
    const w = parseFloat(weight)
    if (!h || !w || h <= 0 || w <= 0) return
    const bmi = w / (h * h)
    let category = '', color = ''
    if (bmi < 18.5) { category = 'Underweight'; color = '#3B82F6' }
    else if (bmi < 25) { category = 'Normal Weight'; color = '#22C55E' }
    else if (bmi < 30) { category = 'Overweight'; color = '#F59E0B' }
    else { category = 'Obese'; color = '#EF4444' }
    setResult({ bmi, category, color })
  }

  const reset = () => { setHeight(''); setWeight(''); setResult(null) }

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-1.5">Height (cm)</label>
          <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 165" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-1.5">Weight (kg)</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 60" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-inter text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
        </div>
        <div className="flex gap-2">
          <button onClick={calculate} className="flex-1 py-3 bg-primary text-white font-poppins font-semibold text-sm rounded-xl hover:bg-primary-dark transition-all touch-manipulation">Calculate BMI</button>
          <button onClick={reset} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all touch-manipulation"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {result && (
        <div className="mt-4 bg-white rounded-2xl p-5 border-2 shadow-sm text-center" style={{ borderColor: result.color + '66' }}>
          <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-1">Your BMI</p>
          <p className="text-4xl font-poppins font-bold mb-1" style={{ color: result.color }}>{result.bmi.toFixed(1)}</p>
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-poppins font-semibold text-white" style={{ backgroundColor: result.color }}>{result.category}</span>
          <div className="mt-4 bg-gray-50 rounded-xl p-3">
            <div className="flex justify-between text-xs text-gray-500 font-inter mb-1.5">
              <span>Under 18.5</span><span>18.5–24.9</span><span>25–29.9</span><span>30+</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-blue-300" />
              <div className="flex-1 bg-green-400" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-red-400" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 font-inter mt-1">
              <span>Under</span><span>Normal</span><span>Over</span><span>Obese</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WaterCalculator() {
  const [weight, setWeight]     = useState('')
  const [activity, setActivity] = useState('moderate')
  const [result, setResult]     = useState<number | null>(null)

  const ACTIVITY_LEVELS = [
    { id: 'low',      label: 'Low',      desc: 'Mostly sitting',   multiplier: 30 },
    { id: 'moderate', label: 'Moderate', desc: 'Some walking',     multiplier: 35 },
    { id: 'high',     label: 'High',     desc: 'Active / sports',  multiplier: 40 },
  ]

  const calculate = () => {
    const w = parseFloat(weight)
    if (!w || w <= 0) return
    const mult = ACTIVITY_LEVELS.find(a => a.id === activity)?.multiplier ?? 35
    setResult((w * mult) / 1000)
  }

  const reset = () => { setWeight(''); setResult(null) }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-1.5">Body Weight (kg)</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 55" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-inter text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-2">Activity Level</label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_LEVELS.map(a => (
              <button key={a.id} onClick={() => setActivity(a.id)} className={cn('py-2.5 px-2 rounded-xl text-center transition-all touch-manipulation border-2', activity === a.id ? 'bg-blue-50 border-blue-400' : 'border-gray-200 hover:border-gray-300')}>
                <p className={cn('font-poppins font-semibold text-sm', activity === a.id ? 'text-blue-700' : 'text-gray-700')}>{a.label}</p>
                <p className="text-[10px] text-gray-400 font-inter">{a.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={calculate} className="flex-1 py-3 bg-blue-500 text-white font-poppins font-semibold text-sm rounded-xl hover:bg-blue-600 transition-all touch-manipulation">Calculate</button>
          <button onClick={reset} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all touch-manipulation"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {result !== null && (
        <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Droplets className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-1">Daily Water Intake</p>
          <p className="text-4xl font-poppins font-bold text-blue-500 mb-1">{result.toFixed(1)}<span className="text-xl text-blue-300"> L</span></p>
          <p className="text-sm text-gray-500 font-inter">≈ {Math.round(result * 4)} glasses (250mL each)</p>
          <div className="mt-3 flex gap-2 justify-center">
            {Array.from({ length: Math.min(Math.round(result * 4), 12) }).map((_, i) => (
              <div key={i} className="w-4 h-6 bg-blue-200 rounded-sm flex flex-col-reverse overflow-hidden">
                <div className="bg-blue-400 w-full" style={{ height: '70%' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SleepCalculator() {
  const [age, setAge]           = useState('')
  const [wakeTime, setWakeTime] = useState('06:00')
  const [result, setResult]     = useState<{ hours: string; bedtimes: string[] } | null>(null)

  const calculate = () => {
    const a = parseInt(age)
    if (!a || a < 5) return
    let hours = ''
    if (a <= 12) hours = '9–12 hours'
    else if (a <= 18) hours = '8–10 hours'
    else if (a <= 25) hours = '7–9 hours'
    else hours = '7–8 hours'

    const [wakeH, wakeM] = wakeTime.split(':').map(Number)
    const wakeTotal = wakeH * 60 + wakeM
    const minH = parseInt(hours.split('–')[0])
    const maxH = parseInt(hours.split('–')[1])
    const midH = Math.round((minH + maxH) / 2)

    const bedtimes = [minH, midH, maxH].map(h => {
      let bed = wakeTotal - h * 60
      if (bed < 0) bed += 24 * 60
      const bh = Math.floor(bed / 60), bm = bed % 60
      const period = bh >= 12 ? 'PM' : 'AM'
      const displayH = bh > 12 ? bh - 12 : bh === 0 ? 12 : bh
      return `${displayH}:${bm.toString().padStart(2, '0')} ${period}`
    })

    setResult({ hours, bedtimes })
  }

  const reset = () => { setAge(''); setResult(null) }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-1.5">Age (years)</label>
          <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 16" min="5" max="30" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-inter text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
        </div>
        <div>
          <label className="block text-xs font-poppins font-semibold text-gray-500 mb-1.5">Wake-up Time</label>
          <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-inter text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
        </div>
        <div className="flex gap-2">
          <button onClick={calculate} className="flex-1 py-3 bg-purple-500 text-white font-poppins font-semibold text-sm rounded-xl hover:bg-purple-600 transition-all touch-manipulation">Calculate</button>
          <button onClick={reset} className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all touch-manipulation"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {result && (
        <div className="bg-white rounded-2xl p-5 border-2 border-purple-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Moon className="w-5 h-5 text-purple-400" />
            <div>
              <p className="text-xs text-gray-400 font-inter">Recommended Sleep</p>
              <p className="font-poppins font-bold text-purple-600 text-lg">{result.hours}</p>
            </div>
          </div>
          <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-2">Suggested Bedtimes</p>
          <div className="flex gap-2">
            {result.bedtimes.map((t, i) => (
              <div key={i} className={cn('flex-1 py-2.5 rounded-xl text-center border-2', i === 1 ? 'bg-purple-500 border-purple-500' : 'bg-purple-50 border-purple-200')}>
                <p className={cn('font-poppins font-bold text-sm', i === 1 ? 'text-white' : 'text-purple-700')}>{t}</p>
                {i === 1 && <p className="text-[10px] text-white/70 font-inter">Ideal</p>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 font-inter mt-3 text-center">Wake-up time: {wakeTime}</p>
        </div>
      )}
    </div>
  )
}

function HealthTipsCarousel() {
  const [index, setIndex] = useState(0)

  const prev = () => setIndex(i => (i - 1 + HEALTH_TIPS.length) % HEALTH_TIPS.length)
  const next = () => setIndex(i => (i + 1) % HEALTH_TIPS.length)

  const tip = HEALTH_TIPS[index]

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl p-6 text-center border border-gray-200 shadow-sm transition-all" style={{ backgroundColor: tip.color + '55' }}>
        <div className="text-5xl mb-4">{tip.emoji}</div>
        <h3 className="font-poppins font-bold text-gray-900 text-xl mb-3">{tip.title}</h3>
        <p className="font-inter text-gray-700 text-sm leading-relaxed">{tip.body}</p>
      </div>
      <div className="flex items-center justify-center gap-4 mt-4">
        <button onClick={prev} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-primary hover:border-primary transition-all touch-manipulation shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
        <div className="flex gap-2">
          {HEALTH_TIPS.map((_, i) => (
            <button key={i} onClick={() => setIndex(i)} className={cn('h-2 rounded-full transition-all', i === index ? 'bg-primary w-6' : 'bg-gray-300 w-2')} />
          ))}
        </div>
        <button onClick={next} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-primary hover:border-primary transition-all touch-manipulation shadow-sm"><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  )
}

const SUB_TABS = [
  { id: 'tips'  as SubTab, label: 'Health Tips', icon: <Heart className="w-4 h-4" />,     color: 'rose'   },
  { id: 'bmi'   as SubTab, label: 'BMI',         icon: <Activity className="w-4 h-4" />,  color: 'green'  },
  { id: 'water' as SubTab, label: 'Water',        icon: <Droplets className="w-4 h-4" />, color: 'blue'   },
  { id: 'sleep' as SubTab, label: 'Sleep',        icon: <Moon className="w-4 h-4" />,     color: 'purple' },
]

export default function HealthPage() {
  const [tab, setTab] = useState<SubTab>('tips')

  return (
    <ToolLayout
      title="Student Wellness Tools"
      subtitle="Health Tips · BMI · Water · Sleep"
      icon={<Heart className="w-4 h-4" />}
    >
      {/* Sub-tab bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-poppins font-semibold whitespace-nowrap transition-all touch-manipulation min-h-[44px]',
              tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* No-login notice */}
      <div className="flex items-center gap-2 mx-4 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
        <Info className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        <p className="text-xs text-green-700 font-inter">No login required · Inputs are cleared when you leave · Nothing is stored</p>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6">
        {tab === 'tips'  && <HealthTipsCarousel />}
        {tab === 'bmi'   && <BMICalculator />}
        {tab === 'water' && <WaterCalculator />}
        {tab === 'sleep' && <SleepCalculator />}
      </div>
    </ToolLayout>
  )
}
