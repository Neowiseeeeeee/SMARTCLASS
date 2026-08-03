import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, Calculator, ChevronRight, RefreshCw, TrendingUp } from 'lucide-react'
import ToolLayout from '../../components/layout/ToolLayout'
import { cn } from '../../lib/utils'

interface Formula {
  id: string
  topic: string
  name: string
  formula: string
  variables: { symbol: string; meaning: string }[]
  example: string
  fn?: string   // evaluable JS function string: (x) => ...
  xRange?: [number, number]
}

const FORMULAS: Formula[] = [
  // Algebra
  { id:'quad', topic:'Algebra', name:'Quadratic Formula', formula:'x = (-b ± √(b²-4ac)) / 2a', variables:[{symbol:'a,b,c',meaning:'coefficients of ax²+bx+c=0'},{symbol:'x',meaning:'roots of the equation'}], example:'For x²-5x+6=0: x = (5±√(25-24))/2 = 3 or 2', fn:'(x) => x*x - 3*x + 2', xRange:[-1,4] },
  { id:'slope', topic:'Algebra', name:'Slope Formula', formula:'m = (y₂-y₁) / (x₂-x₁)', variables:[{symbol:'m',meaning:'slope of the line'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'two points on the line'}], example:'Points (1,2) and (3,8): m = (8-2)/(3-1) = 3', fn:'(x) => 3*x - 1', xRange:[-2,4] },
  { id:'linear', topic:'Algebra', name:'Slope-Intercept Form', formula:'y = mx + b', variables:[{symbol:'m',meaning:'slope'},{symbol:'b',meaning:'y-intercept'},{symbol:'x,y',meaning:'coordinates of a point'}], example:'y = 2x + 3: slope=2, y-intercept=3', fn:'(x) => 2*x + 3', xRange:[-4,4] },
  { id:'exponent', topic:'Algebra', name:'Laws of Exponents', formula:'aⁿ × aᵐ = aⁿ⁺ᵐ ; (aⁿ)ᵐ = aⁿᵐ', variables:[{symbol:'a',meaning:'base'},{symbol:'n,m',meaning:'exponents'}], example:'2³ × 2² = 2⁵ = 32', fn:'(x) => Math.pow(2,x)', xRange:[0,5] },
  // Geometry
  { id:'area-circle', topic:'Geometry', name:'Area of Circle', formula:'A = πr²', variables:[{symbol:'A',meaning:'area'},{symbol:'r',meaning:'radius'},{symbol:'π',meaning:'≈ 3.14159'}], example:'r=5: A = π×25 ≈ 78.54 sq units', fn:'(x) => Math.PI * x * x', xRange:[0,6] },
  { id:'pyth', topic:'Geometry', name:'Pythagorean Theorem', formula:'c² = a² + b²', variables:[{symbol:'a,b',meaning:'legs of right triangle'},{symbol:'c',meaning:'hypotenuse'}], example:'a=3, b=4: c = √(9+16) = 5', fn:'(x) => Math.sqrt(x*x + 16)', xRange:[0,8] },
  { id:'area-tri', topic:'Geometry', name:'Area of Triangle', formula:'A = ½ × base × height', variables:[{symbol:'A',meaning:'area'},{symbol:'base',meaning:'length of base'},{symbol:'height',meaning:'perpendicular height'}], example:'base=6, height=4: A = ½×6×4 = 12 sq units' },
  { id:'circle-circ', topic:'Geometry', name:'Circumference of Circle', formula:'C = 2πr', variables:[{symbol:'C',meaning:'circumference'},{symbol:'r',meaning:'radius'}], example:'r=7: C = 2π×7 ≈ 43.98 units', fn:'(x) => 2 * Math.PI * x', xRange:[0,8] },
  // Trigonometry
  { id:'sin', topic:'Trigonometry', name:'Sine Function', formula:'sin θ = opposite / hypotenuse', variables:[{symbol:'θ',meaning:'angle'},{symbol:'opp',meaning:'opposite side'},{symbol:'hyp',meaning:'hypotenuse'}], example:'θ=30°: sin(30°)=0.5', fn:'(x) => Math.sin(x)', xRange:[-7,7] },
  { id:'cos', topic:'Trigonometry', name:'Cosine Function', formula:'cos θ = adjacent / hypotenuse', variables:[{symbol:'θ',meaning:'angle'},{symbol:'adj',meaning:'adjacent side'},{symbol:'hyp',meaning:'hypotenuse'}], example:'θ=60°: cos(60°)=0.5', fn:'(x) => Math.cos(x)', xRange:[-7,7] },
  { id:'tan', topic:'Trigonometry', name:'Tangent Function', formula:'tan θ = sin θ / cos θ', variables:[{symbol:'θ',meaning:'angle'}], example:'θ=45°: tan(45°)=1', fn:'(x) => Math.tan(x)', xRange:[-1.4,1.4] },
  { id:'pythtrig', topic:'Trigonometry', name:'Pythagorean Identity', formula:'sin²θ + cos²θ = 1', variables:[{symbol:'θ',meaning:'any angle'}], example:'sin²(30°)+cos²(30°) = 0.25+0.75 = 1' },
  // Physics
  { id:'newton2', topic:'Physics', name:"Newton's 2nd Law", formula:'F = ma', variables:[{symbol:'F',meaning:'force (Newtons)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'a',meaning:'acceleration (m/s²)'}], example:'m=10kg, a=5m/s²: F=50N', fn:'(x) => 10*x', xRange:[0,10] },
  { id:'kinetic', topic:'Physics', name:'Kinetic Energy', formula:'KE = ½mv²', variables:[{symbol:'KE',meaning:'kinetic energy (J)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'v',meaning:'velocity (m/s)'}], example:'m=2kg, v=3m/s: KE=½×2×9=9J', fn:'(x) => 0.5*2*x*x', xRange:[0,6] },
  { id:'velocity', topic:'Physics', name:'Velocity Formula', formula:'v = d / t', variables:[{symbol:'v',meaning:'velocity (m/s)'},{symbol:'d',meaning:'distance (m)'},{symbol:'t',meaning:'time (s)'}], example:'d=100m, t=10s: v=10m/s', fn:'(x) => 100/x', xRange:[1,20] },
  { id:'gravity', topic:'Physics', name:'Free Fall', formula:'d = ½gt²', variables:[{symbol:'d',meaning:'distance fallen (m)'},{symbol:'g',meaning:'9.8 m/s²'},{symbol:'t',meaning:'time (s)'}], example:'t=3s: d=½×9.8×9=44.1m', fn:'(x) => 0.5*9.8*x*x', xRange:[0,5] },
  // Chemistry
  { id:'ideal-gas', topic:'Chemistry', name:'Ideal Gas Law', formula:'PV = nRT', variables:[{symbol:'P',meaning:'pressure (Pa)'},{symbol:'V',meaning:'volume (L)'},{symbol:'n',meaning:'moles'},{symbol:'R',meaning:'8.314 J/mol·K'},{symbol:'T',meaning:'temperature (K)'}], example:'n=1 mol, T=300K, V=1L: P = nRT/V' },
  { id:'molarity', topic:'Chemistry', name:'Molarity', formula:'M = moles / liters', variables:[{symbol:'M',meaning:'molarity (mol/L)'},{symbol:'moles',meaning:'amount of solute'},{symbol:'liters',meaning:'volume of solution'}], example:'2 mol in 0.5 L: M = 4 mol/L', fn:'(x) => 2/x', xRange:[0.2,5] },
  { id:'percent', topic:'Chemistry', name:'Percent Composition', formula:'% = (part mass / total mass) × 100', variables:[{symbol:'part mass',meaning:'mass of element'},{symbol:'total mass',meaning:'molar mass of compound'}], example:'NaCl molar mass=58.5: Na%=(23/58.5)×100=39.3%' },
]

const TOPICS = ['All', ...Array.from(new Set(FORMULAS.map(f => f.topic)))]

function GraphCanvas({ formula }: { formula: Formula }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!formula.fn || !formula.xRange) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const [xMin, xMax] = formula.xRange
    // Compute y range
    const fn = new Function('x', `return ${formula.fn.replace(/^\(x\) => /, '')}`) as (x: number) => number
    const xs = Array.from({ length: 300 }, (_, i) => xMin + (i / 299) * (xMax - xMin))
    const ys = xs.map(x => { try { const v = fn(x); return isFinite(v) ? v : null } catch { return null } }).filter(v => v !== null) as number[]
    if (!ys.length) return
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const pad = 32
    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const toY = (y: number) => H - pad - ((y - yMin) / (Math.max(yMax - yMin, 0.001))) * (H - 2 * pad)

    ctx.clearRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const gx = pad + (i / 5) * (W - 2 * pad)
      const gy = pad + (i / 5) * (H - 2 * pad)
      ctx.beginPath(); ctx.moveTo(gx, pad); ctx.lineTo(gx, H - pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5
    const zeroY = toY(0)
    const zeroX = toX(0)
    if (zeroY >= pad && zeroY <= H - pad) { ctx.beginPath(); ctx.moveTo(pad, zeroY); ctx.lineTo(W - pad, zeroY); ctx.stroke() }
    if (zeroX >= pad && zeroX <= W - pad) { ctx.beginPath(); ctx.moveTo(zeroX, pad); ctx.lineTo(zeroX, H - pad); ctx.stroke() }

    // Axis labels
    ctx.fillStyle = '#9ca3af'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText(xMin.toFixed(1), pad, H - 8)
    ctx.fillText(xMax.toFixed(1), W - pad, H - 8)
    ctx.textAlign = 'right'
    ctx.fillText(yMin.toFixed(1), pad - 4, H - pad)
    ctx.fillText(yMax.toFixed(1), pad - 4, pad + 4)

    // Curve
    ctx.strokeStyle = '#4E7D4B'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.beginPath()
    let started = false
    xs.forEach(x => {
      try {
        const y = fn(x)
        if (!isFinite(y) || Math.abs(y) > Math.abs(yMax - yMin) * 20 + 100) { started = false; return }
        const px = toX(x), py = toY(y)
        if (!started) { ctx.moveTo(px, py); started = true }
        else ctx.lineTo(px, py)
      } catch { started = false }
    })
    ctx.stroke()
  }, [formula])

  if (!formula.fn || !formula.xRange) return null

  return (
    <div className="mt-3 bg-gray-50 rounded-2xl p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-poppins font-semibold text-gray-600">Graph Preview</span>
      </div>
      <canvas ref={canvasRef} width={320} height={180} className="w-full rounded-xl bg-white border border-gray-200" />
    </div>
  )
}

export default function FormulaFinderPage() {
  const [query, setQuery]     = useState('')
  const [topic, setTopic]     = useState('All')
  const [selected, setSelected] = useState<Formula | null>(FORMULAS[0])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return FORMULAS.filter(f =>
      (topic === 'All' || f.topic === topic) &&
      (!q || f.name.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q) || f.topic.toLowerCase().includes(q))
    )
  }, [query, topic])

  return (
    <ToolLayout
      title="Formula / Graph Finder"
      subtitle="STEM Quick Reference"
      icon={<Calculator className="w-4 h-4" />}
      fullHeight
    >
      <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
        {/* Left: search + list */}
        <div className="w-full sm:w-72 lg:w-80 flex-shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 bg-white min-h-0">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search formula or topic…"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-inter focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          {/* Topic filter */}
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none border-b border-gray-100">
            {TOPICS.map(t => (
              <button key={t} onClick={() => setTopic(t)} className={cn('px-3 py-1.5 rounded-xl text-xs font-poppins font-semibold whitespace-nowrap transition-all touch-manipulation', topic === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                {t}
              </button>
            ))}
          </div>
          {/* Formula list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Calculator className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm font-inter">No formulas found</p>
              </div>
            )}
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3.5 text-left border-b border-gray-50 transition-all touch-manipulation',
                  selected?.id === f.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-gray-50',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className={cn('font-poppins font-semibold text-sm truncate', selected?.id === f.id ? 'text-primary' : 'text-gray-800')}>{f.name}</p>
                  <p className="text-xs text-gray-400 font-inter mt-0.5">{f.topic}</p>
                </div>
                <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-colors', selected?.id === f.id ? 'text-primary' : 'text-gray-300')} />
              </button>
            ))}
          </div>
        </div>

        {/* Right: detail */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 bg-gray-50">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Calculator className="w-16 h-16 mb-3 opacity-20" />
              <p className="font-poppins text-lg">Select a formula</p>
            </div>
          ) : (
            <div className="max-w-xl">
              {/* Topic badge */}
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-poppins font-semibold rounded-full mb-3">{selected.topic}</span>
              <h2 className="text-xl sm:text-2xl font-poppins font-bold text-gray-900 mb-4">{selected.name}</h2>

              {/* Formula display */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-4">
                <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-2">Formula</p>
                <p className="font-poppins font-bold text-primary text-lg sm:text-2xl leading-snug break-all">{selected.formula}</p>
              </div>

              {/* Variables */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
                <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-3">Variables</p>
                <div className="space-y-2">
                  {selected.variables.map((v, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="font-poppins font-bold text-primary text-sm min-w-[56px] mt-0.5">{v.symbol}</span>
                      <span className="font-inter text-sm text-gray-600 flex-1">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example */}
              <div className="bg-secondary/10 rounded-2xl p-4 border border-secondary/20 mb-2">
                <p className="text-xs font-poppins font-semibold text-secondary uppercase tracking-wider mb-1.5">Quick Example</p>
                <p className="font-inter text-sm text-gray-700 leading-relaxed">{selected.example}</p>
              </div>

              {/* Graph */}
              <GraphCanvas formula={selected} />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
