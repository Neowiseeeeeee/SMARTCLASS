import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, Calculator, ChevronRight, TrendingUp, X, Pencil, Minus, Trash2, Download, BarChart2 } from 'lucide-react'
import ToolLayout from '../../components/layout/ToolLayout'
import { cn } from '../../lib/utils'

interface Formula {
  id: string
  topic: string
  name: string
  formula: string
  variables: { symbol: string; meaning: string }[]
  example: string
  fn?: string
  xRange?: [number, number]
}

const FORMULAS: Formula[] = [
  // ── Algebra ────────────────────────────────────────────────────────────────
  { id:'quad',     topic:'Algebra', name:'Quadratic Formula',       formula:'x = (-b ± √(b²-4ac)) / 2a',          variables:[{symbol:'a,b,c',meaning:'coefficients of ax²+bx+c=0'},{symbol:'x',meaning:'roots of the equation'}],                   example:'x²-5x+6=0 → x = (5±1)/2 = 3 or 2',           fn:'(x) => x*x - 3*x + 2',                xRange:[-1,4]   },
  { id:'slope',    topic:'Algebra', name:'Slope Formula',           formula:'m = (y₂ − y₁) / (x₂ − x₁)',          variables:[{symbol:'m',meaning:'slope'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'two points on the line'}],                              example:'(1,2)→(3,8): m = 6/2 = 3',                    fn:'(x) => 3*x - 1',                      xRange:[-2,4]   },
  { id:'linear',   topic:'Algebra', name:'Slope-Intercept Form',    formula:'y = mx + b',                          variables:[{symbol:'m',meaning:'slope'},{symbol:'b',meaning:'y-intercept'}],                                                        example:'y = 2x + 3 → slope 2, y-int 3',               fn:'(x) => 2*x + 3',                      xRange:[-4,4]   },
  { id:'exponent', topic:'Algebra', name:'Laws of Exponents',       formula:'aⁿ × aᵐ = aⁿ⁺ᵐ',                     variables:[{symbol:'a',meaning:'base'},{symbol:'n,m',meaning:'exponents'}],                                                         example:'2³ × 2² = 2⁵ = 32',                           fn:'(x) => Math.pow(2,x)',                xRange:[0,5]    },
  { id:'dist',     topic:'Algebra', name:'Distance Formula',        formula:'d = √((x₂-x₁)² + (y₂-y₁)²)',         variables:[{symbol:'d',meaning:'distance between two points'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'endpoints'}],                      example:'(0,0)→(3,4): d = √(9+16) = 5' },
  { id:'midpoint', topic:'Algebra', name:'Midpoint Formula',        formula:'M = ((x₁+x₂)/2 , (y₁+y₂)/2)',        variables:[{symbol:'M',meaning:'midpoint coordinates'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'endpoints'}],                            example:'(2,4)&(6,8) → M = (4,6)' },
  { id:'abs',      topic:'Algebra', name:'Absolute Value',          formula:'|x| = x if x≥0; -x if x<0',          variables:[{symbol:'x',meaning:'real number'},{symbol:'|x|',meaning:'non-negative distance from zero'}],                           example:'|-7| = 7, |5| = 5',                           fn:'(x) => Math.abs(x)',                  xRange:[-5,5]   },
  { id:'arith',    topic:'Algebra', name:'Arithmetic Sequence',     formula:'aₙ = a₁ + (n-1)d',                   variables:[{symbol:'aₙ',meaning:'nth term'},{symbol:'a₁',meaning:'first term'},{symbol:'d',meaning:'common difference'}],          example:'a₁=2, d=3: a₅ = 2+12 = 14',                  fn:'(x) => 2 + (x-1)*3',                  xRange:[1,10]   },
  { id:'geo',      topic:'Algebra', name:'Geometric Sequence',      formula:'aₙ = a₁ × rⁿ⁻¹',                     variables:[{symbol:'r',meaning:'common ratio'},{symbol:'a₁',meaning:'first term'}],                                                example:'a₁=1, r=2: a₅ = 1×2⁴ = 16',                  fn:'(x) => Math.pow(2,x-1)',               xRange:[1,6]    },
  { id:'log',      topic:'Algebra', name:'Logarithm',               formula:'logₐ(b) = c  ↔  aᶜ = b',            variables:[{symbol:'a',meaning:'base (a>0, a≠1)'},{symbol:'b',meaning:'argument'},{symbol:'c',meaning:'exponent'}],                 example:'log₂(8) = 3 because 2³ = 8',                  fn:'(x) => Math.log(x)',                  xRange:[0.1,10] },
  { id:'sqrt',     topic:'Algebra', name:'Square Root',             formula:'√x = x^(1/2)',                        variables:[{symbol:'x',meaning:'radicand (x ≥ 0)'},{symbol:'√x',meaning:'principal square root'}],                                 example:'√144 = 12, √2 ≈ 1.414',                      fn:'(x) => Math.sqrt(x)',                 xRange:[0,16]   },

  // ── Geometry ───────────────────────────────────────────────────────────────
  { id:'area-circle',   topic:'Geometry', name:'Area of Circle',         formula:'A = πr²',                      variables:[{symbol:'r',meaning:'radius'},{symbol:'π',meaning:'≈ 3.14159'}],                                                         example:'r=5 → A ≈ 78.54 sq units',                    fn:'(x) => Math.PI*x*x',                  xRange:[0,6]    },
  { id:'circ',          topic:'Geometry', name:'Circumference of Circle',formula:'C = 2πr',                      variables:[{symbol:'C',meaning:'perimeter of circle'},{symbol:'r',meaning:'radius'}],                                               example:'r=7 → C ≈ 43.98 units',                       fn:'(x) => 2*Math.PI*x',                  xRange:[0,8]    },
  { id:'pyth',          topic:'Geometry', name:'Pythagorean Theorem',     formula:'c² = a² + b²',                 variables:[{symbol:'a,b',meaning:'legs of right triangle'},{symbol:'c',meaning:'hypotenuse'}],                                      example:'a=3,b=4 → c = 5',                             fn:'(x) => Math.sqrt(x*x+16)',             xRange:[0,8]    },
  { id:'area-tri',      topic:'Geometry', name:'Area of Triangle',        formula:'A = ½ × base × height',        variables:[{symbol:'base',meaning:'length of base'},{symbol:'height',meaning:'perpendicular height'}],                              example:'b=6, h=4 → A = 12 sq units' },
  { id:'area-rect',     topic:'Geometry', name:'Area of Rectangle',       formula:'A = length × width',           variables:[{symbol:'l',meaning:'length'},{symbol:'w',meaning:'width'}],                                                             example:'l=8, w=5 → A = 40 sq units' },
  { id:'area-trap',     topic:'Geometry', name:'Area of Trapezoid',       formula:'A = ½(b₁+b₂) × h',            variables:[{symbol:'b₁,b₂',meaning:'parallel bases'},{symbol:'h',meaning:'height'}],                                              example:'b₁=4,b₂=6,h=3 → A = 15 sq units' },
  { id:'vol-sphere',    topic:'Geometry', name:'Volume of Sphere',        formula:'V = (4/3)πr³',                 variables:[{symbol:'V',meaning:'volume'},{symbol:'r',meaning:'radius'}],                                                            example:'r=3 → V = 4/3×π×27 ≈ 113.1 cu units',        fn:'(x) => (4/3)*Math.PI*x*x*x',          xRange:[0,5]    },
  { id:'vol-cyl',       topic:'Geometry', name:'Volume of Cylinder',      formula:'V = πr²h',                     variables:[{symbol:'r',meaning:'radius'},{symbol:'h',meaning:'height'}],                                                            example:'r=2,h=5 → V = 4π×5 ≈ 62.8 cu units' },
  { id:'vol-cone',      topic:'Geometry', name:'Volume of Cone',          formula:'V = (1/3)πr²h',                variables:[{symbol:'r',meaning:'base radius'},{symbol:'h',meaning:'height'}],                                                       example:'r=3,h=4 → V = (1/3)π×9×4 ≈ 37.7 cu units' },
  { id:'sa-rect',       topic:'Geometry', name:'Surface Area of Cuboid',  formula:'SA = 2(lw + lh + wh)',         variables:[{symbol:'l',meaning:'length'},{symbol:'w',meaning:'width'},{symbol:'h',meaning:'height'}],                              example:'l=2,w=3,h=4 → SA = 52 sq units' },

  // ── Trigonometry ───────────────────────────────────────────────────────────
  { id:'sin',       topic:'Trigonometry', name:'Sine',                 formula:'sin θ = opposite / hypotenuse',  variables:[{symbol:'θ',meaning:'angle in right triangle'}],                                                                          example:'θ=30° → sin 30° = 0.5',                       fn:'(x) => Math.sin(x)',                  xRange:[-7,7]   },
  { id:'cos',       topic:'Trigonometry', name:'Cosine',               formula:'cos θ = adjacent / hypotenuse',  variables:[{symbol:'θ',meaning:'angle in right triangle'}],                                                                          example:'θ=60° → cos 60° = 0.5',                       fn:'(x) => Math.cos(x)',                  xRange:[-7,7]   },
  { id:'tan',       topic:'Trigonometry', name:'Tangent',              formula:'tan θ = sin θ / cos θ',          variables:[{symbol:'θ',meaning:'angle in right triangle'}],                                                                          example:'θ=45° → tan 45° = 1',                         fn:'(x) => Math.tan(x)',                  xRange:[-1.4,1.4] },
  { id:'pythtrig',  topic:'Trigonometry', name:'Pythagorean Identity', formula:'sin²θ + cos²θ = 1',              variables:[{symbol:'θ',meaning:'any angle'}],                                                                                        example:'sin²30°+cos²30° = 0.25+0.75 = 1' },
  { id:'law-sines', topic:'Trigonometry', name:'Law of Sines',         formula:'a/sin A = b/sin B = c/sin C',    variables:[{symbol:'a,b,c',meaning:'side lengths'},{symbol:'A,B,C',meaning:'opposite angles'}],                                     example:'a=5,A=30°,B=60° → b = 5×sin60°/sin30° ≈ 8.66' },
  { id:'law-cos',   topic:'Trigonometry', name:'Law of Cosines',       formula:'c² = a²+b² - 2ab·cos C',        variables:[{symbol:'c',meaning:'unknown side'},{symbol:'a,b',meaning:'known sides'},{symbol:'C',meaning:'included angle'}],         example:'a=5,b=7,C=60° → c² = 25+49-35 = 39' },
  { id:'dbl-sin',   topic:'Trigonometry', name:'Double Angle (sin)',   formula:'sin 2θ = 2 sin θ cos θ',        variables:[{symbol:'θ',meaning:'angle'}],                                                                                             example:'sin 60° = 2 sin30° cos30° = 2×0.5×0.866 ≈ 0.866', fn:'(x) => Math.sin(2*x)', xRange:[-7,7] },

  // ── Physics ────────────────────────────────────────────────────────────────
  { id:'newton2',  topic:'Physics', name:"Newton's 2nd Law",    formula:'F = ma',            variables:[{symbol:'F',meaning:'force (N)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'a',meaning:'acceleration (m/s²)'}],       example:'m=10kg,a=5m/s² → F=50N',            fn:'(x) => 10*x',                xRange:[0,10]  },
  { id:'kinetic',  topic:'Physics', name:'Kinetic Energy',      formula:'KE = ½mv²',         variables:[{symbol:'KE',meaning:'kinetic energy (J)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'v',meaning:'velocity (m/s)'}], example:'m=2kg,v=3m/s → KE=9J',              fn:'(x) => 0.5*2*x*x',           xRange:[0,6]   },
  { id:'velocity', topic:'Physics', name:'Velocity',            formula:'v = d / t',          variables:[{symbol:'v',meaning:'m/s'},{symbol:'d',meaning:'distance (m)'},{symbol:'t',meaning:'time (s)'}],                   example:'d=100m,t=10s → v=10m/s',            fn:'(x) => 100/x',               xRange:[1,20]  },
  { id:'gravity',  topic:'Physics', name:'Free Fall',           formula:'d = ½gt²',           variables:[{symbol:'g',meaning:'9.8 m/s²'},{symbol:'t',meaning:'time (s)'}],                                                  example:'t=3s → d=44.1m',                    fn:'(x) => 0.5*9.8*x*x',         xRange:[0,5]   },
  { id:'ohm',      topic:'Physics', name:"Ohm's Law",           formula:'V = IR',             variables:[{symbol:'V',meaning:'voltage (V)'},{symbol:'I',meaning:'current (A)'},{symbol:'R',meaning:'resistance (Ω)'}],      example:'I=2A,R=5Ω → V=10V',                fn:'(x) => 5*x',                 xRange:[0,5]   },
  { id:'power',    topic:'Physics', name:'Electric Power',      formula:'P = IV = I²R = V²/R',variables:[{symbol:'P',meaning:'power (W)'},{symbol:'I',meaning:'current (A)'},{symbol:'V',meaning:'voltage (V)'}],          example:'I=3A,V=12V → P=36W',               fn:'(x) => x*x*2',               xRange:[0,6]   },
  { id:'momentum', topic:'Physics', name:'Momentum',            formula:'p = mv',             variables:[{symbol:'p',meaning:'momentum (kg·m/s)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'v',meaning:'velocity (m/s)'}], example:'m=5kg,v=4m/s → p=20 kg·m/s',       fn:'(x) => 5*x',                 xRange:[0,10]  },
  { id:'pressure', topic:'Physics', name:'Pressure',            formula:'P = F / A',          variables:[{symbol:'P',meaning:'pressure (Pa)'},{symbol:'F',meaning:'force (N)'},{symbol:'A',meaning:'area (m²)'}],          example:'F=100N,A=2m² → P=50Pa',            fn:'(x) => 100/x',               xRange:[0.5,10] },
  { id:'wave',     topic:'Physics', name:'Wave Speed',          formula:'v = fλ',             variables:[{symbol:'v',meaning:'wave speed (m/s)'},{symbol:'f',meaning:'frequency (Hz)'},{symbol:'λ',meaning:'wavelength (m)'}], example:'f=440Hz,λ=0.77m → v≈338m/s',    fn:'(x) => 340/x',               xRange:[0.1,5]  },
  { id:'grav-f',   topic:'Physics', name:'Gravitational Force', formula:'F = mg',             variables:[{symbol:'F',meaning:'weight (N)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'g',meaning:'9.8 m/s²'}],             example:'m=60kg → F=588N',                  fn:'(x) => 9.8*x',               xRange:[0,20]  },

  // ── Chemistry ──────────────────────────────────────────────────────────────
  { id:'ideal-gas',topic:'Chemistry', name:'Ideal Gas Law',         formula:'PV = nRT',                       variables:[{symbol:'P',meaning:'pressure (Pa)'},{symbol:'V',meaning:'volume (L)'},{symbol:'n',meaning:'moles'},{symbol:'R',meaning:'8.314 J/mol·K'},{symbol:'T',meaning:'temperature (K)'}], example:'n=1,T=300K,V=1L → P = nRT/V' },
  { id:'molarity', topic:'Chemistry', name:'Molarity',              formula:'M = n / V',                      variables:[{symbol:'M',meaning:'molarity (mol/L)'},{symbol:'n',meaning:'moles of solute'},{symbol:'V',meaning:'volume of solution (L)'}],                                                     example:'2 mol in 0.5L → M=4 mol/L',   fn:'(x) => 2/x', xRange:[0.2,5] },
  { id:'percent',  topic:'Chemistry', name:'Percent Composition',   formula:'% = (part mass / total) × 100', variables:[{symbol:'part mass',meaning:'mass of the element'},{symbol:'total',meaning:'molar mass of compound'}],                                                                             example:'Na in NaCl: (23/58.5)×100 ≈ 39.3%' },
  { id:'boyle',    topic:'Chemistry', name:"Boyle's Law",           formula:'P₁V₁ = P₂V₂',                   variables:[{symbol:'P₁,P₂',meaning:'initial/final pressures'},{symbol:'V₁,V₂',meaning:'initial/final volumes'}],                                                                             example:'P₁=2,V₁=5,P₂=4 → V₂=2.5L' },
  { id:'charles',  topic:'Chemistry', name:"Charles's Law",         formula:'V₁/T₁ = V₂/T₂',                 variables:[{symbol:'V₁,V₂',meaning:'initial/final volumes'},{symbol:'T₁,T₂',meaning:'temperatures in Kelvin'}],                                                                             example:'V₁=3L,T₁=300K,T₂=600K → V₂=6L' },
  { id:'dilution', topic:'Chemistry', name:'Dilution Formula',      formula:'M₁V₁ = M₂V₂',                   variables:[{symbol:'M₁,M₂',meaning:'initial/final molarity'},{symbol:'V₁,V₂',meaning:'initial/final volume'}],                                                                               example:'12M×5mL = M₂×60mL → M₂=1M' },
  { id:'ph',       topic:'Chemistry', name:'pH Formula',            formula:'pH = -log[H⁺]',                  variables:[{symbol:'pH',meaning:'measure of acidity (0–14)'},{symbol:'[H⁺]',meaning:'hydrogen ion concentration (mol/L)'}],                                                                  example:'[H⁺]=0.001 → pH = -log(0.001) = 3' },

  // ── Statistics ─────────────────────────────────────────────────────────────
  { id:'mean',   topic:'Statistics', name:'Arithmetic Mean',    formula:'x̄ = (Σxᵢ) / n',         variables:[{symbol:'x̄',meaning:'mean (average)'},{symbol:'Σxᵢ',meaning:'sum of all values'},{symbol:'n',meaning:'number of values'}],   example:'2,4,6,8 → x̄ = 20/4 = 5' },
  { id:'perm',   topic:'Statistics', name:'Permutations',       formula:'P(n,r) = n! / (n-r)!',   variables:[{symbol:'n',meaning:'total items'},{symbol:'r',meaning:'items arranged'}],                                                   example:'P(5,2) = 5!/3! = 20' },
  { id:'comb',   topic:'Statistics', name:'Combinations',       formula:'C(n,r) = n! / (r!(n-r)!)',variables:[{symbol:'n',meaning:'total items'},{symbol:'r',meaning:'items chosen (order ignored)'}],                                    example:'C(5,2) = 10' },
  { id:'prob',   topic:'Statistics', name:'Basic Probability',  formula:'P(A) = favorable / total', variables:[{symbol:'P(A)',meaning:'probability of event A'},{symbol:'favorable',meaning:'desired outcomes'},{symbol:'total',meaning:'all outcomes'}], example:'P(heads) = 1/2 = 0.5' },
  { id:'stdev',  topic:'Statistics', name:'Standard Deviation', formula:'σ = √(Σ(xᵢ-x̄)² / n)',   variables:[{symbol:'σ',meaning:'standard deviation'},{symbol:'x̄',meaning:'mean'},{symbol:'n',meaning:'count'}],                        example:'Data 2,4,4,4,5,5,7,9 → σ = 2' },

  // ── Calculus ───────────────────────────────────────────────────────────────
  { id:'power-rule',  topic:'Calculus', name:'Power Rule (Derivative)', formula:"d/dx [xⁿ] = nxⁿ⁻¹",              variables:[{symbol:'n',meaning:'exponent'},{symbol:'x',meaning:'variable'}],                                       example:"d/dx[x³] = 3x²",  fn:'(x) => 3*x*x', xRange:[-3,3] },
  { id:'product-rule',topic:'Calculus', name:'Product Rule',            formula:'d/dx[fg] = f\'g + fg\'',          variables:[{symbol:'f,g',meaning:'two differentiable functions'},{symbol:"f',g'",meaning:'their derivatives'}],       example:"d/dx[x²·sin x] = 2x·sin x + x²·cos x" },
  { id:'chain-rule',  topic:'Calculus', name:'Chain Rule',              formula:"d/dx[f(g(x))] = f'(g(x))·g'(x)", variables:[{symbol:'f,g',meaning:'composite functions'}],                                                              example:"d/dx[sin(x²)] = cos(x²)·2x" },
  { id:'integral-pw', topic:'Calculus', name:'Power Rule (Integral)',   formula:'∫xⁿ dx = xⁿ⁺¹/(n+1) + C',       variables:[{symbol:'n',meaning:'exponent (n ≠ -1)'},{symbol:'C',meaning:'constant of integration'}],                  example:"∫x² dx = x³/3 + C", fn:'(x) => x*x*x/3', xRange:[-3,3] },
  { id:'deriv-sin',   topic:'Calculus', name:'Derivative of sin(x)',    formula:'d/dx[sin x] = cos x',             variables:[{symbol:'x',meaning:'angle in radians'}],                                                                  example:'d/dx[sin x] at x=0 → slope = cos 0 = 1', fn:'(x) => Math.cos(x)', xRange:[-7,7] },
]

const TOPICS = ['All', ...Array.from(new Set(FORMULAS.map(f => f.topic)))]

// ── MINI GRAPH PREVIEW (in detail panel) ─────────────────────────────────────
function MiniGraph({ formula, onClick }: { formula: Formula; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!formula.fn || !formula.xRange) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const [xMin, xMax] = formula.xRange
    const fn = new Function('x', `return ${formula.fn.replace(/^\(x\) => /, '')}`) as (x: number) => number
    const xs = Array.from({ length: 300 }, (_, i) => xMin + (i / 299) * (xMax - xMin))
    const ys = xs.map(x => { try { const v = fn(x); return isFinite(v) ? v : null } catch { return null } }).filter((v): v is number => v !== null)
    if (!ys.length) return
    const yMin = Math.min(...ys), yMax = Math.max(...ys)
    const pad = 28
    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const toY = (y: number) => H - pad - ((y - yMin) / Math.max(yMax - yMin, 0.001)) * (H - 2 * pad)

    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(pad + i*(W-2*pad)/4, pad); ctx.lineTo(pad + i*(W-2*pad)/4, H-pad); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(pad, pad + i*(H-2*pad)/4); ctx.lineTo(W-pad, pad + i*(H-2*pad)/4); ctx.stroke()
    }
    ctx.strokeStyle = '#d1d5db'; ctx.lineWidth = 1.5
    const zy = toY(0), zx = toX(0)
    if (zy >= pad && zy <= H-pad) { ctx.beginPath(); ctx.moveTo(pad, zy); ctx.lineTo(W-pad, zy); ctx.stroke() }
    if (zx >= pad && zx <= W-pad) { ctx.beginPath(); ctx.moveTo(zx, pad); ctx.lineTo(zx, H-pad); ctx.stroke() }

    ctx.fillStyle = '#9ca3af'; ctx.font = '9px Inter,sans-serif'
    ctx.textAlign = 'center'; ctx.fillText(xMin.toFixed(1), pad, H-6); ctx.fillText(xMax.toFixed(1), W-pad, H-6)
    ctx.textAlign = 'right';  ctx.fillText(yMin.toFixed(1), pad-3, H-pad); ctx.fillText(yMax.toFixed(1), pad-3, pad+4)

    ctx.strokeStyle = '#4E7D4B'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.beginPath()
    let started = false
    xs.forEach(x => {
      try {
        const y = fn(x)
        if (!isFinite(y) || Math.abs(y) > Math.abs(yMax - yMin) * 20 + 100) { started = false; return }
        if (!started) { ctx.moveTo(toX(x), toY(y)); started = true } else ctx.lineTo(toX(x), toY(y))
      } catch { started = false }
    })
    ctx.stroke()
  }, [formula])

  if (!formula.fn || !formula.xRange) return null

  return (
    <div className="mt-3 bg-gray-50 rounded-2xl p-3">
      <button
        onClick={onClick}
        className="w-full group"
        title="Click to open in Graph Canvas"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-poppins font-semibold text-gray-600">Graph Preview</span>
          </div>
          <span className="text-xs text-primary font-poppins font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <BarChart2 className="w-3 h-3" /> Open in Graph Canvas →
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={320} height={180}
          className="w-full rounded-xl bg-white border border-gray-200 group-hover:border-primary/40 transition-colors"
        />
      </button>
    </div>
  )
}

// ── GRAPH CANVAS MODAL ────────────────────────────────────────────────────────
type GDrawTool = 'pen' | 'line' | 'curve'
const G_COLORS = ['#ffffff','#22d3ee','#4ade80','#fbbf24','#f87171','#c084fc','#fb923c']

interface GCmd { type: GDrawTool; color: string; size: number; pts: {x:number;y:number}[] }

function GraphCanvasModal({ formula, onClose }: { formula: Formula | null; onClose: () => void }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const [tool, setTool]   = useState<GDrawTool>('pen')
  const [color, setColor] = useState(G_COLORS[1])
  const [size, setSize]   = useState(2)
  const [cmds, setCmds]   = useState<GCmd[]>([])
  const drawing = useRef(false)
  const current = useRef<GCmd | null>(null)

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Draw formula on black canvas
  const drawFormula = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, W, H)

    if (!formula?.fn || !formula.xRange) return
    const [xMin, xMax] = formula.xRange
    const fn = new Function('x', `return ${formula.fn.replace(/^\(x\) => /, '')}`) as (x: number) => number
    const xs = Array.from({ length: 500 }, (_, i) => xMin + (i / 499) * (xMax - xMin))
    const ys = xs.map(x => { try { const v = fn(x); return isFinite(v) ? v : null } catch { return null } }).filter((v): v is number => v !== null)
    if (!ys.length) return
    const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.1
    const yMin = Math.min(...ys) - yPad, yMax = Math.max(...ys) + yPad
    const pad = 40
    const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad)
    const toY = (y: number) => H - pad - ((y - yMin) / Math.max(yMax - yMin, 0.001)) * (H - 2 * pad)

    // Grid
    ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1
    const xStep = (xMax - xMin) / 8, yStep = (yMax - yMin) / 6
    for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
      ctx.beginPath(); ctx.moveTo(toX(gx), pad); ctx.lineTo(toX(gx), H-pad); ctx.stroke()
    }
    for (let gy = Math.ceil(yMin / yStep) * yStep; gy <= yMax; gy += yStep) {
      ctx.beginPath(); ctx.moveTo(pad, toY(gy)); ctx.lineTo(W-pad, toY(gy)); ctx.stroke()
    }
    // Axes
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5
    const zy = toY(0), zx = toX(0)
    if (zy >= pad && zy <= H-pad) { ctx.beginPath(); ctx.moveTo(pad, zy); ctx.lineTo(W-pad, zy); ctx.stroke() }
    if (zx >= pad && zx <= W-pad) { ctx.beginPath(); ctx.moveTo(zx, pad); ctx.lineTo(zx, H-pad); ctx.stroke() }
    // Labels
    ctx.fillStyle = '#475569'; ctx.font = '10px Inter,sans-serif'
    for (let gx = Math.ceil(xMin / xStep) * xStep; gx <= xMax; gx += xStep) {
      ctx.textAlign = 'center'; ctx.fillText(gx.toFixed(1), toX(gx), H - 8)
    }
    // Curve
    ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'
    ctx.beginPath()
    let started = false
    xs.forEach(x => {
      try {
        const y = fn(x)
        if (!isFinite(y) || Math.abs(y) > Math.abs(yMax - yMin) * 25 + 100) { started = false; return }
        if (!started) { ctx.moveTo(toX(x), toY(y)); started = true } else ctx.lineTo(toX(x), toY(y))
      } catch { started = false }
    })
    ctx.stroke()
    // Formula label
    ctx.fillStyle = '#94a3b8'; ctx.font = '11px Poppins,sans-serif'; ctx.textAlign = 'left'
    if (formula) ctx.fillText(formula.formula, pad, pad - 8)
  }, [formula])

  const redrawOverlay = useCallback((extraCmd?: GCmd) => {
    const oc = overlayRef.current!
    const ctx = oc.getContext('2d')!
    ctx.clearRect(0, 0, oc.width, oc.height)
    const allCmds = extraCmd ? [...cmds, extraCmd] : cmds
    allCmds.forEach(c => {
      ctx.strokeStyle = c.color; ctx.fillStyle = c.color
      ctx.lineWidth = c.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      if (c.type === 'pen') {
        if (c.pts.length < 2) return
        ctx.beginPath(); ctx.moveTo(c.pts[0].x, c.pts[0].y)
        c.pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke()
      } else if (c.type === 'line') {
        if (c.pts.length < 2) return
        const [a, b] = [c.pts[0], c.pts[c.pts.length-1]]
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
      } else if (c.type === 'curve') {
        if (c.pts.length < 2) return
        const [a, b] = [c.pts[0], c.pts[c.pts.length-1]]
        const mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 60
        ctx.beginPath(); ctx.moveTo(a.x, a.y)
        ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke()
      }
    })
  }, [cmds])

  // Resize canvases to fill the container
  useEffect(() => {
    const resize = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const { width, height } = wrap.getBoundingClientRect()
      ;[canvasRef.current, overlayRef.current].forEach(c => { if (c) { c.width = width; c.height = height } })
      drawFormula()
      redrawOverlay()
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [drawFormula, redrawOverlay])

  // Re-draw formula when it changes
  useEffect(() => { drawFormula() }, [drawFormula])

  const pt = (e: React.MouseEvent | React.TouchEvent) => {
    const c = overlayRef.current!
    const r = c.getBoundingClientRect()
    const sx = c.width/r.width, sy = c.height/r.height
    if ('touches' in e) {
      const t = e.touches[0] || e.changedTouches[0]
      return { x: (t.clientX-r.left)*sx, y: (t.clientY-r.top)*sy }
    }
    return { x: (e.clientX-r.left)*sx, y: (e.clientY-r.top)*sy }
  }

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); drawing.current = true
    current.current = { type: tool, color, size, pts: [pt(e)] }
  }
  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !current.current) return
    e.preventDefault()
    const p = pt(e)
    if (tool === 'pen') {
      current.current.pts.push(p)
      const ctx = overlayRef.current!.getContext('2d')!
      const pts = current.current.pts
      if (pts.length >= 2) {
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(pts[pts.length-2].x, pts[pts.length-2].y)
        ctx.lineTo(p.x, p.y); ctx.stroke()
      }
    } else {
      current.current = { ...current.current, pts: [current.current.pts[0], p] }
      redrawOverlay(current.current)
    }
  }
  const onUp = () => {
    if (!drawing.current || !current.current) return
    drawing.current = false
    const cmd = { ...current.current }
    setCmds(prev => { const next = [...prev, cmd]; return next })
    current.current = null
  }

  const clearDrawing = () => { setCmds([]); const ctx = overlayRef.current?.getContext('2d'); ctx?.clearRect(0, 0, overlayRef.current!.width, overlayRef.current!.height) }

  const downloadGraph = () => {
    const merged = document.createElement('canvas')
    merged.width  = canvasRef.current!.width
    merged.height = canvasRef.current!.height
    const ctx = merged.getContext('2d')!
    ctx.drawImage(canvasRef.current!, 0, 0)
    ctx.drawImage(overlayRef.current!, 0, 0)
    const a = document.createElement('a'); a.href = merged.toDataURL('image/png'); a.download = 'graph.png'; a.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-900 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4 text-green-400" />
          <span className="font-poppins font-semibold text-white text-sm">Graph Canvas</span>
          {formula && <span className="text-slate-400 text-xs font-inter hidden sm:inline">— {formula.name}</span>}
        </div>

        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 ml-2">
          {([
            { id:'pen'  as GDrawTool, icon:<Pencil className="w-3.5 h-3.5" />,  label:'Pen'   },
            { id:'line' as GDrawTool, icon:<Minus  className="w-3.5 h-3.5" />,  label:'Line'  },
            { id:'curve'as GDrawTool, icon:<TrendingUp className="w-3.5 h-3.5" />, label:'Curve' },
          ]).map(t => (
            <button key={t.id} onClick={() => setTool(t.id)} title={t.label}
              className={cn('p-2 rounded-lg transition-all touch-manipulation', tool===t.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white')}>
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {G_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className={cn('w-5 h-5 rounded-full border-2 transition-all', color===c ? 'border-white scale-125 shadow' : 'border-transparent hover:scale-110')}
              style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
          {[1,2,4,7].map(s => (
            <button key={s} onClick={() => setSize(s)}
              className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all', size===s ? 'bg-green-600' : 'hover:bg-slate-700')}>
              <div className="rounded-full bg-white" style={{ width: Math.min(s*2+2,16), height: Math.min(s*2+2,16) }} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={clearDrawing} title="Clear drawings" className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all touch-manipulation">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={downloadGraph} title="Download" className="p-2 rounded-xl text-slate-400 hover:text-green-400 hover:bg-slate-800 transition-all touch-manipulation">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onClose} title="Close (Esc)" className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all touch-manipulation ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Canvas stack */}
      <div ref={wrapRef} className="flex-1 relative" style={{ cursor: 'crosshair' }}>
        <canvas ref={canvasRef} className="absolute inset-0" />
        <canvas
          ref={overlayRef}
          className="absolute inset-0"
          style={{ background: 'transparent' }}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
        {!formula && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-500">
            <BarChart2 className="w-16 h-16 mb-3 opacity-20" />
            <p className="font-poppins text-lg">Draw on the graph canvas</p>
            <p className="font-inter text-sm mt-1 opacity-60">Select a formula with a graph to plot it here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FormulaFinderPage() {
  const [query, setQuery]       = useState('')
  const [topic, setTopic]       = useState('All')
  const [selected, setSelected] = useState<Formula | null>(FORMULAS[0])
  const [graphOpen, setGraphOpen] = useState(false)
  const [graphFormula, setGraphFormula] = useState<Formula | null>(null)

  const openGraph = (f: Formula | null) => { setGraphFormula(f); setGraphOpen(true) }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return FORMULAS.filter(f =>
      (topic === 'All' || f.topic === topic) &&
      (!q || f.name.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q) || f.topic.toLowerCase().includes(q))
    )
  }, [query, topic])

  return (
    <>
      {graphOpen && <GraphCanvasModal formula={graphFormula} onClose={() => setGraphOpen(false)} />}

      <ToolLayout
        title="Formula / Graph Finder"
        subtitle="STEM Quick Reference"
        icon={<Calculator className="w-4 h-4" />}
        fullHeight
        actions={
          <button
            onClick={() => openGraph(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-xs font-poppins font-semibold rounded-xl hover:bg-slate-600 transition-all touch-manipulation"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Graph Canvas</span>
            <span className="sm:hidden">Graph</span>
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left: search + list */}
          <div className="w-full sm:w-72 lg:w-80 flex-shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 bg-white min-h-0">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search formula or topic…"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-inter focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>
            </div>
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none border-b border-gray-100">
              {TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)} className={cn('px-3 py-1.5 rounded-xl text-xs font-poppins font-semibold whitespace-nowrap transition-all touch-manipulation', topic === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
                  {t}
                </button>
              ))}
            </div>
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
                    'flex items-center gap-3 w-full px-4 py-3.5 text-left border-b border-gray-50 transition-all touch-manipulation group',
                    selected?.id === f.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-gray-50 hover:border-l-4 hover:border-l-gray-200',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-poppins font-semibold text-sm truncate', selected?.id === f.id ? 'text-primary' : 'text-gray-800 group-hover:text-primary/80')}>{f.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 font-inter">{f.topic}</p>
                      {f.fn && <span className="text-[9px] font-poppins font-semibold text-primary/60 bg-primary/8 px-1.5 py-0.5 rounded-full">GRAPH</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-colors', selected?.id === f.id ? 'text-primary' : 'text-gray-200 group-hover:text-gray-400')} />
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
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-poppins font-semibold rounded-full mb-3">{selected.topic}</span>
                <h2 className="text-xl sm:text-2xl font-poppins font-bold text-gray-900 mb-4">{selected.name}</h2>
                <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm mb-4">
                  <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-2">Formula</p>
                  <p className="font-poppins font-bold text-primary text-lg sm:text-2xl leading-snug break-all">{selected.formula}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
                  <p className="text-xs font-poppins font-semibold text-gray-400 uppercase tracking-wider mb-3">Variables</p>
                  <div className="space-y-2">
                    {selected.variables.map((v, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="font-poppins font-bold text-primary text-sm min-w-[64px] mt-0.5">{v.symbol}</span>
                        <span className="font-inter text-sm text-gray-600 flex-1">{v.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-secondary/10 rounded-2xl p-4 border border-secondary/20 mb-2">
                  <p className="text-xs font-poppins font-semibold text-secondary uppercase tracking-wider mb-1.5">Quick Example</p>
                  <p className="font-inter text-sm text-gray-700 leading-relaxed">{selected.example}</p>
                </div>
                <MiniGraph formula={selected} onClick={() => openGraph(selected)} />
                {selected.fn && (
                  <button
                    onClick={() => openGraph(selected)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white font-poppins font-semibold text-sm rounded-2xl transition-all touch-manipulation"
                  >
                    <BarChart2 className="w-4 h-4 text-green-400" />
                    Open in Graph Canvas
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </ToolLayout>
    </>
  )
}
