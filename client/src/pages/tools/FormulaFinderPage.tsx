import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import {
  Search, Calculator, ChevronRight, TrendingUp, X,
  Pencil, Minus, Trash2, Download, BarChart2,
  ZoomIn, ZoomOut, RotateCcw, Move, Undo2,
} from 'lucide-react'
import ToolLayout from '../../components/layout/ToolLayout'
import { cn } from '../../lib/utils'

// ── FORMULA DATA ─────────────────────────────────────────────────────────────

interface Formula {
  id: string
  topic: string
  name: string
  formula: string
  variables: { symbol: string; meaning: string }[]
  example: string
  fn?: string
}

const FORMULAS: Formula[] = [
  // Algebra
  { id:'quad',        topic:'Algebra',      name:'Quadratic Formula',         formula:'x = (−b ± √(b²−4ac)) / 2a',       variables:[{symbol:'a,b,c',meaning:'coefficients of ax²+bx+c=0'},{symbol:'x',meaning:'roots of the equation'}],                         example:'x²−5x+6=0 → x = (5±1)/2 = 3 or 2',                fn:'(x) => x*x - 3*x + 2' },
  { id:'slope',       topic:'Algebra',      name:'Slope Formula',             formula:'m = (y₂ − y₁) / (x₂ − x₁)',       variables:[{symbol:'m',meaning:'slope'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'two points on the line'}],                                    example:'(1,2)→(3,8): m = 6/2 = 3',                         fn:'(x) => 3*x - 1' },
  { id:'linear',      topic:'Algebra',      name:'Slope-Intercept Form',      formula:'y = mx + b',                        variables:[{symbol:'m',meaning:'slope'},{symbol:'b',meaning:'y-intercept'}],                                                             example:'y = 2x + 3',                                       fn:'(x) => 2*x + 3' },
  { id:'exponent',    topic:'Algebra',      name:'Laws of Exponents',         formula:'aⁿ × aᵐ = aⁿ⁺ᵐ',                  variables:[{symbol:'a',meaning:'base'},{symbol:'n,m',meaning:'exponents'}],                                                                example:'2³ × 2² = 2⁵ = 32',                               fn:'(x) => Math.pow(2,x)' },
  { id:'dist',        topic:'Algebra',      name:'Distance Formula',          formula:'d = √((x₂−x₁)² + (y₂−y₁)²)',       variables:[{symbol:'d',meaning:'distance'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'endpoints'}],                                             example:'(0,0)→(3,4): d = 5' },
  { id:'midpoint',    topic:'Algebra',      name:'Midpoint Formula',          formula:'M = ((x₁+x₂)/2, (y₁+y₂)/2)',       variables:[{symbol:'M',meaning:'midpoint'},{symbol:'(x₁,y₁),(x₂,y₂)',meaning:'endpoints'}],                                             example:'(2,4)&(6,8) → M = (4,6)' },
  { id:'abs',         topic:'Algebra',      name:'Absolute Value',            formula:'|x| = x if x≥0 ; −x if x<0',       variables:[{symbol:'x',meaning:'real number'},{symbol:'|x|',meaning:'non-negative distance from zero'}],                                 example:'|−7| = 7',                                         fn:'(x) => Math.abs(x)' },
  { id:'arith',       topic:'Algebra',      name:'Arithmetic Sequence',       formula:'aₙ = a₁ + (n−1)d',                  variables:[{symbol:'aₙ',meaning:'nth term'},{symbol:'a₁',meaning:'first term'},{symbol:'d',meaning:'common difference'}],               example:'a₁=2, d=3: a₅ = 14',                              fn:'(x) => 2 + (x-1)*3' },
  { id:'geo',         topic:'Algebra',      name:'Geometric Sequence',        formula:'aₙ = a₁ × rⁿ⁻¹',                   variables:[{symbol:'r',meaning:'common ratio'},{symbol:'a₁',meaning:'first term'}],                                                      example:'a₁=1, r=2: a₅ = 16',                             fn:'(x) => Math.pow(2,x-1)' },
  { id:'log',         topic:'Algebra',      name:'Logarithm',                 formula:'logₐ(b) = c  ↔  aᶜ = b',           variables:[{symbol:'a',meaning:'base (a>0,a≠1)'},{symbol:'b',meaning:'argument'},{symbol:'c',meaning:'exponent'}],                      example:'log₂(8) = 3',                                     fn:'(x) => Math.log(x)' },
  { id:'sqrt',        topic:'Algebra',      name:'Square Root',               formula:'√x = x^(1/2)',                      variables:[{symbol:'x',meaning:'radicand (x ≥ 0)'}],                                                                                      example:'√144 = 12',                                       fn:'(x) => Math.sqrt(x)' },
  { id:'poly3',       topic:'Algebra',      name:'Cubic Polynomial',          formula:'y = x³',                            variables:[{symbol:'x',meaning:'variable'},{symbol:'y',meaning:'output'}],                                                               example:'x=2 → y=8',                                       fn:'(x) => x*x*x' },
  { id:'parabola',    topic:'Algebra',      name:'Parabola (vertex form)',     formula:'y = a(x−h)² + k',                  variables:[{symbol:'a',meaning:'stretch factor'},{symbol:'(h,k)',meaning:'vertex'}],                                                      example:'y = (x−2)² + 1',                                  fn:'(x) => (x-2)*(x-2)+1' },

  // Geometry
  { id:'area-circle', topic:'Geometry',     name:'Area of Circle',            formula:'A = πr²',                          variables:[{symbol:'r',meaning:'radius'},{symbol:'π',meaning:'≈3.14159'}],                                                               example:'r=5 → A ≈ 78.54',                                 fn:'(x) => Math.PI*x*x' },
  { id:'circ',        topic:'Geometry',     name:'Circumference',             formula:'C = 2πr',                          variables:[{symbol:'C',meaning:'perimeter of circle'},{symbol:'r',meaning:'radius'}],                                                     example:'r=7 → C ≈ 43.98',                                fn:'(x) => 2*Math.PI*x' },
  { id:'pyth',        topic:'Geometry',     name:'Pythagorean Theorem',       formula:'c² = a² + b²',                     variables:[{symbol:'a,b',meaning:'legs'},{symbol:'c',meaning:'hypotenuse'}],                                                              example:'a=3,b=4 → c=5',                                   fn:'(x) => Math.sqrt(x*x+16)' },
  { id:'area-tri',    topic:'Geometry',     name:'Area of Triangle',          formula:'A = ½ × base × height',            variables:[{symbol:'base',meaning:'length of base'},{symbol:'height',meaning:'perpendicular height'}],                                    example:'b=6, h=4 → A=12' },
  { id:'area-rect',   topic:'Geometry',     name:'Area of Rectangle',         formula:'A = l × w',                        variables:[{symbol:'l',meaning:'length'},{symbol:'w',meaning:'width'}],                                                                   example:'l=8, w=5 → A=40' },
  { id:'area-trap',   topic:'Geometry',     name:'Area of Trapezoid',         formula:'A = ½(b₁+b₂) × h',                variables:[{symbol:'b₁,b₂',meaning:'parallel bases'},{symbol:'h',meaning:'height'}],                                                    example:'b₁=4,b₂=6,h=3 → A=15' },
  { id:'vol-sphere',  topic:'Geometry',     name:'Volume of Sphere',          formula:'V = (4/3)πr³',                     variables:[{symbol:'r',meaning:'radius'}],                                                                                                example:'r=3 → V ≈ 113.1',                                fn:'(x) => (4/3)*Math.PI*x*x*x' },
  { id:'vol-cyl',     topic:'Geometry',     name:'Volume of Cylinder',        formula:'V = πr²h',                         variables:[{symbol:'r',meaning:'radius'},{symbol:'h',meaning:'height'}],                                                                  example:'r=2,h=5 → V ≈ 62.8' },
  { id:'vol-cone',    topic:'Geometry',     name:'Volume of Cone',            formula:'V = (1/3)πr²h',                    variables:[{symbol:'r',meaning:'base radius'},{symbol:'h',meaning:'height'}],                                                             example:'r=3,h=4 → V ≈ 37.7' },
  { id:'sa-rect',     topic:'Geometry',     name:'Surface Area of Cuboid',    formula:'SA = 2(lw + lh + wh)',             variables:[{symbol:'l',meaning:'length'},{symbol:'w',meaning:'width'},{symbol:'h',meaning:'height'}],                                    example:'l=2,w=3,h=4 → SA=52' },

  // Trigonometry
  { id:'sin',         topic:'Trigonometry', name:'Sine',                      formula:'sin θ = opposite / hypotenuse',    variables:[{symbol:'θ',meaning:'angle in right triangle'}],                                                                               example:'θ=30° → sin 30°=0.5',                             fn:'(x) => Math.sin(x)' },
  { id:'cos',         topic:'Trigonometry', name:'Cosine',                    formula:'cos θ = adjacent / hypotenuse',    variables:[{symbol:'θ',meaning:'angle in right triangle'}],                                                                               example:'θ=60° → cos 60°=0.5',                             fn:'(x) => Math.cos(x)' },
  { id:'tan',         topic:'Trigonometry', name:'Tangent',                   formula:'tan θ = sin θ / cos θ',            variables:[{symbol:'θ',meaning:'angle'}],                                                                                                 example:'θ=45° → tan 45°=1',                               fn:'(x) => Math.tan(x)' },
  { id:'pythtrig',    topic:'Trigonometry', name:'Pythagorean Identity',      formula:'sin²θ + cos²θ = 1',               variables:[{symbol:'θ',meaning:'any angle'}],                                                                                             example:'sin²30°+cos²30°=1' },
  { id:'law-sines',   topic:'Trigonometry', name:'Law of Sines',              formula:'a/sin A = b/sin B = c/sin C',      variables:[{symbol:'a,b,c',meaning:'sides'},{symbol:'A,B,C',meaning:'opposite angles'}],                                                 example:'a=5,A=30°,B=60° → b≈8.66' },
  { id:'law-cos',     topic:'Trigonometry', name:'Law of Cosines',            formula:'c² = a²+b² − 2ab·cos C',          variables:[{symbol:'c',meaning:'unknown side'},{symbol:'C',meaning:'included angle'}],                                                    example:'a=5,b=7,C=60° → c≈6.24' },
  { id:'dbl-sin',     topic:'Trigonometry', name:'Double Angle (sin)',        formula:'sin 2θ = 2 sin θ cos θ',          variables:[{symbol:'θ',meaning:'angle'}],                                                                                                 example:'sin 60°=2 sin30° cos30°',                         fn:'(x) => Math.sin(2*x)' },
  { id:'dbl-cos',     topic:'Trigonometry', name:'Double Angle (cos)',        formula:'cos 2θ = cos²θ − sin²θ',          variables:[{symbol:'θ',meaning:'angle'}],                                                                                                 example:'cos 60°=cos²30°−sin²30°',                         fn:'(x) => Math.cos(2*x)' },

  // Physics
  { id:'newton2',     topic:'Physics',      name:"Newton's 2nd Law",          formula:'F = ma',                           variables:[{symbol:'F',meaning:'force (N)'},{symbol:'m',meaning:'mass (kg)'},{symbol:'a',meaning:'acceleration (m/s²)'}],                example:'m=10kg,a=5m/s² → F=50N',                          fn:'(x) => 10*x' },
  { id:'kinetic',     topic:'Physics',      name:'Kinetic Energy',            formula:'KE = ½mv²',                        variables:[{symbol:'KE',meaning:'kinetic energy (J)'},{symbol:'m',meaning:'mass'},{symbol:'v',meaning:'velocity'}],                      example:'m=2kg,v=3m/s → KE=9J',                           fn:'(x) => 0.5*2*x*x' },
  { id:'velocity',    topic:'Physics',      name:'Velocity',                  formula:'v = d / t',                        variables:[{symbol:'v',meaning:'m/s'},{symbol:'d',meaning:'distance'},{symbol:'t',meaning:'time'}],                                       example:'d=100m,t=10s → v=10m/s',                         fn:'(x) => 100/x' },
  { id:'gravity',     topic:'Physics',      name:'Free Fall',                 formula:'d = ½gt²',                         variables:[{symbol:'g',meaning:'9.8 m/s²'},{symbol:'t',meaning:'time (s)'}],                                                             example:'t=3s → d=44.1m',                                 fn:'(x) => 0.5*9.8*x*x' },
  { id:'ohm',         topic:'Physics',      name:"Ohm's Law",                 formula:'V = IR',                           variables:[{symbol:'V',meaning:'voltage (V)'},{symbol:'I',meaning:'current (A)'},{symbol:'R',meaning:'resistance (Ω)'}],                 example:'I=2A,R=5Ω → V=10V',                              fn:'(x) => 5*x' },
  { id:'power-e',     topic:'Physics',      name:'Electric Power',            formula:'P = IV',                           variables:[{symbol:'P',meaning:'power (W)'},{symbol:'I',meaning:'current (A)'},{symbol:'V',meaning:'voltage (V)'}],                      example:'I=3A,V=12V → P=36W',                             fn:'(x) => x*x*2' },
  { id:'momentum',    topic:'Physics',      name:'Momentum',                  formula:'p = mv',                           variables:[{symbol:'p',meaning:'kg·m/s'},{symbol:'m',meaning:'mass'},{symbol:'v',meaning:'velocity'}],                                    example:'m=5kg,v=4m/s → p=20',                            fn:'(x) => 5*x' },
  { id:'pressure',    topic:'Physics',      name:'Pressure',                  formula:'P = F / A',                        variables:[{symbol:'P',meaning:'pressure (Pa)'},{symbol:'F',meaning:'force'},{symbol:'A',meaning:'area'}],                               example:'F=100N,A=2m² → P=50Pa',                          fn:'(x) => 100/x' },
  { id:'wave',        topic:'Physics',      name:'Wave Speed',                formula:'v = fλ',                           variables:[{symbol:'v',meaning:'speed (m/s)'},{symbol:'f',meaning:'frequency'},{symbol:'λ',meaning:'wavelength'}],                       example:'f=440Hz,λ=0.77m → v≈338m/s',                    fn:'(x) => 340/x' },
  { id:'grav-f',      topic:'Physics',      name:'Gravitational Force',       formula:'F = mg',                           variables:[{symbol:'F',meaning:'weight (N)'},{symbol:'m',meaning:'mass'},{symbol:'g',meaning:'9.8 m/s²'}],                              example:'m=60kg → F=588N',                                fn:'(x) => 9.8*x' },
  { id:'work',        topic:'Physics',      name:'Work / Energy',             formula:'W = F × d × cos θ',               variables:[{symbol:'W',meaning:'work (J)'},{symbol:'F',meaning:'force'},{symbol:'d',meaning:'displacement'},{symbol:'θ',meaning:'angle'}], example:'F=10N,d=5m,θ=0° → W=50J' },
  { id:'heat',        topic:'Physics',      name:'Heat (Specific Heat)',      formula:'Q = mcΔT',                         variables:[{symbol:'Q',meaning:'heat (J)'},{symbol:'m',meaning:'mass'},{symbol:'c',meaning:'specific heat'},{symbol:'ΔT',meaning:'temp change'}], example:'m=1kg,c=4186,ΔT=1K → Q=4186J' },

  // Chemistry
  { id:'ideal-gas',   topic:'Chemistry',    name:'Ideal Gas Law',             formula:'PV = nRT',                         variables:[{symbol:'P',meaning:'pressure'},{symbol:'V',meaning:'volume'},{symbol:'n',meaning:'moles'},{symbol:'R',meaning:'8.314 J/mol·K'},{symbol:'T',meaning:'temp (K)'}], example:'n=1,T=300K,V=1L → P=nRT/V' },
  { id:'molarity',    topic:'Chemistry',    name:'Molarity',                  formula:'M = n / V',                        variables:[{symbol:'M',meaning:'molarity (mol/L)'},{symbol:'n',meaning:'moles'},{symbol:'V',meaning:'volume (L)'}],                       example:'2mol in 0.5L → M=4mol/L',                       fn:'(x) => 2/x' },
  { id:'percent',     topic:'Chemistry',    name:'Percent Composition',       formula:'% = (part mass / total) × 100',    variables:[{symbol:'part mass',meaning:'mass of element'},{symbol:'total',meaning:'molar mass'}],                                          example:'Na in NaCl: (23/58.5)×100≈39.3%' },
  { id:'boyle',       topic:'Chemistry',    name:"Boyle's Law",               formula:'P₁V₁ = P₂V₂',                    variables:[{symbol:'P₁,P₂',meaning:'pressures'},{symbol:'V₁,V₂',meaning:'volumes'}],                                                      example:'P₁=2,V₁=5,P₂=4 → V₂=2.5L' },
  { id:'charles',     topic:'Chemistry',    name:"Charles's Law",             formula:'V₁/T₁ = V₂/T₂',                  variables:[{symbol:'V',meaning:'volume'},{symbol:'T',meaning:'temperature (K)'}],                                                          example:'V₁=3L,T₁=300K,T₂=600K → V₂=6L' },
  { id:'dilution',    topic:'Chemistry',    name:'Dilution Formula',          formula:'M₁V₁ = M₂V₂',                    variables:[{symbol:'M',meaning:'molarity'},{symbol:'V',meaning:'volume'}],                                                                  example:'12M×5mL = M₂×60mL → M₂=1M' },
  { id:'ph',          topic:'Chemistry',    name:'pH Formula',                formula:'pH = −log[H⁺]',                   variables:[{symbol:'pH',meaning:'acidity 0–14'},{symbol:'[H⁺]',meaning:'H⁺ concentration (mol/L)'}],                                      example:'[H⁺]=0.001 → pH=3' },
  { id:'avogadro',    topic:'Chemistry',    name:"Avogadro's Number",         formula:'N = n × Nₐ',                       variables:[{symbol:'N',meaning:'number of particles'},{symbol:'n',meaning:'moles'},{symbol:'Nₐ',meaning:'6.022×10²³'}],                   example:'1 mol H₂O = 6.022×10²³ molecules' },

  // Statistics
  { id:'mean',        topic:'Statistics',   name:'Arithmetic Mean',           formula:'x̄ = Σxᵢ / n',                     variables:[{symbol:'x̄',meaning:'average'},{symbol:'Σxᵢ',meaning:'sum of values'},{symbol:'n',meaning:'count'}],                          example:'2,4,6,8 → x̄=5' },
  { id:'perm',        topic:'Statistics',   name:'Permutations',              formula:'P(n,r) = n! / (n−r)!',            variables:[{symbol:'n',meaning:'total items'},{symbol:'r',meaning:'items arranged'}],                                                      example:'P(5,2)=20' },
  { id:'comb',        topic:'Statistics',   name:'Combinations',              formula:'C(n,r) = n! / (r!(n−r)!)',        variables:[{symbol:'n',meaning:'total items'},{symbol:'r',meaning:'items chosen'}],                                                          example:'C(5,2)=10' },
  { id:'prob',        topic:'Statistics',   name:'Basic Probability',         formula:'P(A) = favorable / total',         variables:[{symbol:'P(A)',meaning:'probability 0–1'},{symbol:'favorable',meaning:'desired outcomes'}],                                     example:'P(heads)=1/2=0.5' },
  { id:'stdev',       topic:'Statistics',   name:'Standard Deviation',        formula:'σ = √(Σ(xᵢ−x̄)² / n)',           variables:[{symbol:'σ',meaning:'spread'},{symbol:'x̄',meaning:'mean'},{symbol:'n',meaning:'count'}],                                        example:'2,4,4,4,5,5,7,9 → σ=2' },
  { id:'variance',    topic:'Statistics',   name:'Variance',                  formula:'σ² = Σ(xᵢ−x̄)² / n',            variables:[{symbol:'σ²',meaning:'variance'},{symbol:'x̄',meaning:'mean'}],                                                                   example:'σ²=4 when σ=2' },

  // Calculus
  { id:'power-rule',  topic:'Calculus',     name:'Power Rule (Derivative)',   formula:'d/dx [xⁿ] = nxⁿ⁻¹',              variables:[{symbol:'n',meaning:'exponent'}],                                                                                               example:'d/dx[x³]=3x²',                                   fn:'(x) => 3*x*x' },
  { id:'product-rule',topic:'Calculus',     name:'Product Rule',              formula:"d/dx[fg] = f'g + fg'",            variables:[{symbol:'f,g',meaning:'functions'},{symbol:"f',g'",meaning:'their derivatives'}],                                              example:"d/dx[x²·sin x]=2x·sin x+x²·cos x" },
  { id:'chain-rule',  topic:'Calculus',     name:'Chain Rule',                formula:"d/dx[f(g(x))] = f'(g(x))·g'(x)", variables:[{symbol:'f,g',meaning:'composite functions'}],                                                                                 example:"d/dx[sin(x²)]=cos(x²)·2x" },
  { id:'integral-pw', topic:'Calculus',     name:'Power Rule (Integral)',     formula:'∫xⁿ dx = xⁿ⁺¹/(n+1) + C',       variables:[{symbol:'n',meaning:'exponent (n≠−1)'},{symbol:'C',meaning:'constant'}],                                                          example:"∫x² dx=x³/3+C",                                  fn:'(x) => x*x*x/3' },
  { id:'deriv-sin',   topic:'Calculus',     name:'Derivative of sin(x)',      formula:'d/dx[sin x] = cos x',             variables:[{symbol:'x',meaning:'radians'}],                                                                                                 example:'slope at x=0 is cos(0)=1',                       fn:'(x) => Math.cos(x)' },
  { id:'deriv-cos',   topic:'Calculus',     name:'Derivative of cos(x)',      formula:'d/dx[cos x] = −sin x',            variables:[{symbol:'x',meaning:'radians'}],                                                                                                 example:'slope at x=0 is −sin(0)=0',                      fn:'(x) => -Math.sin(x)' },
  { id:'deriv-exp',   topic:'Calculus',     name:'Derivative of eˣ',          formula:'d/dx[eˣ] = eˣ',                  variables:[{symbol:'e',meaning:'Euler\'s number ≈2.718'}],                                                                                 example:'slope of eˣ = eˣ everywhere',                   fn:'(x) => Math.exp(x)' },
  { id:'fund-thm',    topic:'Calculus',     name:'Fundamental Theorem',       formula:'∫ₐᵇ f(x)dx = F(b) − F(a)',       variables:[{symbol:'F',meaning:'antiderivative of f'},{symbol:'a,b',meaning:'limits of integration'}],                                      example:'∫₀¹ x dx = [x²/2]₀¹ = ½' },
]

const TOPICS = ['All', ...Array.from(new Set(FORMULAS.map(f => f.topic)))]

// ── GRAPH ENGINE ─────────────────────────────────────────────────────────────
// View transform: screen_x = math_x * scale + ox ; screen_y = -math_y * scale + oy

interface VT { ox: number; oy: number; scale: number }
type DrawTool = 'pen' | 'line' | 'curve'
interface DrawCmd { tool: DrawTool; color: string; size: number; pts: { mx: number; my: number }[] }

const m2s = (mx: number, my: number, v: VT) => ({ x: mx * v.scale + v.ox, y: -my * v.scale + v.oy })
const s2m = (sx: number, sy: number, v: VT) => ({ mx: (sx - v.ox) / v.scale, my: -(sy - v.oy) / v.scale })

function niceStep(scale: number) {
  const raw = 80 / scale
  const exp = Math.floor(Math.log10(raw))
  const base = 10 ** exp
  const n = raw / base
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * base
}

function renderGraph(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  vt: VT,
  formula: Formula | null,
  cmds: DrawCmd[],
) {
  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  const step = niceStep(vt.scale)
  const mxMin = s2m(0, H, vt).mx - step
  const mxMax = s2m(W, 0, vt).mx + step
  const myMin = s2m(0, H, vt).my - step
  const myMax = s2m(0, 0, vt).my + step

  // Minor grid
  ctx.strokeStyle = '#f3f4f6'
  ctx.lineWidth = 1
  for (let gx = Math.ceil(mxMin / step) * step; gx <= mxMax + step * 0.01; gx += step) {
    const sx = m2s(gx, 0, vt).x
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke()
  }
  for (let gy = Math.ceil(myMin / step) * step; gy <= myMax + step * 0.01; gy += step) {
    const sy = m2s(0, gy, vt).y
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke()
  }

  // Axes
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1.5
  if (vt.ox > 0 && vt.ox < W) { ctx.beginPath(); ctx.moveTo(vt.ox, 0); ctx.lineTo(vt.ox, H); ctx.stroke() }
  if (vt.oy > 0 && vt.oy < H) { ctx.beginPath(); ctx.moveTo(0, vt.oy); ctx.lineTo(W, vt.oy); ctx.stroke() }

  // Axis labels
  ctx.fillStyle = '#9ca3af'
  ctx.font = '10px Inter, sans-serif'
  const ly = Math.max(14, Math.min(vt.oy + 14, H - 5))
  const lx = Math.max(5, Math.min(vt.ox - 5, W - 35))

  ctx.textAlign = 'center'
  for (let gx = Math.ceil(mxMin / step) * step; gx <= mxMax; gx += step) {
    if (Math.abs(gx) < step * 0.01) continue
    const sx = m2s(gx, 0, vt).x
    if (sx > 14 && sx < W - 14) ctx.fillText(String(+gx.toPrecision(5)), sx, ly)
  }
  ctx.textAlign = 'right'
  for (let gy = Math.ceil(myMin / step) * step; gy <= myMax; gy += step) {
    if (Math.abs(gy) < step * 0.01) continue
    const sy = m2s(0, gy, vt).y
    if (sy > 14 && sy < H - 14) ctx.fillText(String(+gy.toPrecision(5)), lx, sy + 3)
  }

  // Formula curve (renders over full visible x range)
  if (formula?.fn) {
    try {
      const fn = new Function('x', `return ${formula.fn.replace(/^\(x\) => /, '')}`) as (x: number) => number
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      let started = false
      const N = 900
      for (let i = 0; i <= N; i++) {
        const mx = mxMin + (i / N) * (mxMax - mxMin)
        try {
          const my = fn(mx)
          if (!isFinite(my) || Math.abs(my) > 1e8) { started = false; continue }
          const { x, y } = m2s(mx, my, vt)
          if (!started) { ctx.moveTo(x, y); started = true } else ctx.lineTo(x, y)
        } catch { started = false }
      }
      ctx.stroke()
      ctx.font = 'bold 11px Poppins, sans-serif'
      ctx.fillStyle = '#16a34a'
      ctx.textAlign = 'left'
      ctx.fillText(formula.formula, 10, 20)
    } catch { /* bad fn */ }
  }

  // Drawing commands (math → screen on every render, so they pan/zoom with graph)
  cmds.forEach(cmd => {
    const spts = cmd.pts.map(p => m2s(p.mx, p.my, vt))
    if (spts.length < 2) return
    ctx.strokeStyle = cmd.color
    ctx.lineWidth = cmd.size
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (cmd.tool === 'pen') {
      ctx.beginPath(); ctx.moveTo(spts[0].x, spts[0].y)
      spts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    } else if (cmd.tool === 'line') {
      const [a, b] = [spts[0], spts[spts.length - 1]]
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    } else if (cmd.tool === 'curve') {
      const [a, b] = [spts[0], spts[spts.length - 1]]
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 50, b.x, b.y)
      ctx.stroke()
    }
  })
}

// ── MINI INTERACTIVE GRAPH ────────────────────────────────────────────────────
function MiniGraph({ formula, onOpenFull }: { formula: Formula; onOpenFull: () => void }) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vtRef     = useRef<VT>({ ox: 0, oy: 0, scale: 60 })
  const [, forceRender] = useState(0)
  const rerender = () => forceRender(n => n + 1)
  const dragging  = useRef(false)
  const panStart  = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const formulaRef = useRef(formula)
  formulaRef.current = formula

  // Resize + init view
  useEffect(() => {
    const wrap = wrapRef.current; const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const init = () => {
      const { width, height } = wrap.getBoundingClientRect()
      if (width === 0) return
      canvas.width = width; canvas.height = height
      vtRef.current = { ox: width / 2, oy: height / 2, scale: 55 }
      redraw()
    }
    const ro = new ResizeObserver(init)
    ro.observe(wrap)
    init()
    return () => ro.disconnect()
  }, [formula.id]) // reinit when formula changes

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    renderGraph(ctx, canvas.width, canvas.height, vtRef.current, formulaRef.current, [])
  }, [])

  // Re-draw when formula prop changes
  useEffect(() => { redraw() }, [formula, redraw])

  // Non-passive wheel for zoom
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const sx = (e.clientX - r.left) * (canvas.width / r.width)
      const sy = (e.clientY - r.top) * (canvas.height / r.height)
      const factor = e.deltaY < 0 ? 1.14 : 1 / 1.14
      const old = vtRef.current
      const ns = Math.max(5, Math.min(3000, old.scale * factor))
      const f = ns / old.scale
      vtRef.current = { ox: sx - (sx - old.ox) * f, oy: sy - (sy - old.oy) * f, scale: ns }
      redraw()
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [redraw])

  const getXY = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!; const r = canvas.getBoundingClientRect()
    const scaleX = canvas.width / r.width, scaleY = canvas.height / r.height
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0] || (e as React.TouchEvent).changedTouches[0]
      return { x: (t.clientX - r.left) * scaleX, y: (t.clientY - r.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - r.left) * scaleX, y: ((e as React.MouseEvent).clientY - r.top) * scaleY }
  }

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b border-gray-100">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-poppins font-semibold text-gray-600">Interactive Preview</span>
          <span className="text-[10px] text-gray-400 font-inter hidden sm:inline">· scroll to zoom · drag to pan</span>
        </div>
        <button
          onClick={onOpenFull}
          className="flex items-center gap-1 text-xs text-primary font-poppins font-semibold hover:underline touch-manipulation"
        >
          <BarChart2 className="w-3 h-3" /> Open Full →
        </button>
      </div>
      <div ref={wrapRef} className="relative" style={{ height: 210, cursor: 'grab' }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onMouseDown={e => {
            dragging.current = true
            const { x, y } = getXY(e)
            panStart.current = { x, y, ox: vtRef.current.ox, oy: vtRef.current.oy }
          }}
          onMouseMove={e => {
            if (!dragging.current) return
            const { x, y } = getXY(e)
            vtRef.current = { ...vtRef.current, ox: panStart.current.ox + x - panStart.current.x, oy: panStart.current.oy + y - panStart.current.y }
            redraw()
          }}
          onMouseUp={() => { dragging.current = false }}
          onMouseLeave={() => { dragging.current = false }}
          onTouchStart={e => {
            e.preventDefault(); dragging.current = true
            const { x, y } = getXY(e)
            panStart.current = { x, y, ox: vtRef.current.ox, oy: vtRef.current.oy }
          }}
          onTouchMove={e => {
            e.preventDefault()
            if (!dragging.current) return
            const { x, y } = getXY(e)
            vtRef.current = { ...vtRef.current, ox: panStart.current.ox + x - panStart.current.x, oy: panStart.current.oy + y - panStart.current.y }
            redraw()
          }}
          onTouchEnd={() => { dragging.current = false }}
        />
      </div>
    </div>
  )
}

// ── FULL GRAPH CANVAS MODAL ───────────────────────────────────────────────────
type ActiveTool = 'pan' | DrawTool

const DRAW_COLORS = ['#111827', '#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#ec4899']
const TOOL_DEFS: { id: ActiveTool; label: string; icon: React.ReactNode }[] = [
  { id: 'pan',   label: 'Pan',      icon: <Move    className="w-3.5 h-3.5" /> },
  { id: 'pen',   label: 'Freehand', icon: <Pencil  className="w-3.5 h-3.5" /> },
  { id: 'line',  label: 'Line',     icon: <Minus   className="w-3.5 h-3.5" /> },
  { id: 'curve', label: 'Curve',    icon: <TrendingUp className="w-3.5 h-3.5" /> },
]

function GraphCanvasModal({ formula, onClose }: { formula: Formula | null; onClose: () => void }) {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const vtRef      = useRef<VT>({ ox: 0, oy: 0, scale: 80 })
  const [, forceRender] = useState(0)
  const rerender   = () => forceRender(n => n + 1)

  const [tool, setTool]   = useState<ActiveTool>('pan')
  const [color, setColor] = useState(DRAW_COLORS[1])
  const [size, setSize]   = useState(2)
  const [cmds, setCmds]   = useState<DrawCmd[]>([])
  const cmdsRef    = useRef<DrawCmd[]>([])
  const formulaRef = useRef(formula)
  formulaRef.current = formula

  const dragging    = useRef(false)
  const panStart    = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const currentCmd  = useRef<DrawCmd | null>(null)

  // Escape key
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Resize canvas
  useEffect(() => {
    const wrap = wrapRef.current; const canvas = canvasRef.current
    if (!wrap || !canvas) return
    let inited = false
    const ro = new ResizeObserver(() => {
      const { width, height } = wrap.getBoundingClientRect()
      if (width === 0) return
      canvas.width = width; canvas.height = height
      if (!inited) {
        inited = true
        vtRef.current = { ox: width / 2, oy: height / 2, scale: 80 }
      }
      redraw()
    })
    ro.observe(wrap)
    return () => ro.disconnect()
  }, []) // eslint-disable-line

  const redraw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    renderGraph(ctx, canvas.width, canvas.height, vtRef.current, formulaRef.current, cmdsRef.current)
  }, [])

  // Redraw when formula changes
  useEffect(() => { redraw() }, [formula, redraw])

  // Non-passive wheel
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const sx = (e.clientX - r.left) * (canvas.width / r.width)
      const sy = (e.clientY - r.top) * (canvas.height / r.height)
      const factor = e.deltaY < 0 ? 1.13 : 1 / 1.13
      const old = vtRef.current
      const ns = Math.max(4, Math.min(4000, old.scale * factor))
      const f = ns / old.scale
      vtRef.current = { ox: sx - (sx - old.ox) * f, oy: sy - (sy - old.oy) * f, scale: ns }
      redraw()
      rerender()
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => canvas.removeEventListener('wheel', handler)
  }, [redraw])

  const getXY = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!; const r = canvas.getBoundingClientRect()
    const scaleX = canvas.width / r.width, scaleY = canvas.height / r.height
    if ('touches' in e) {
      const t = (e as React.TouchEvent).touches[0] || (e as React.TouchEvent).changedTouches[0]
      return { x: (t.clientX - r.left) * scaleX, y: (t.clientY - r.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - r.left) * scaleX, y: ((e as React.MouseEvent).clientY - r.top) * scaleY }
  }, [])

  const onDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    dragging.current = true
    const { x, y } = getXY(e)
    if (tool === 'pan') {
      panStart.current = { x, y, ox: vtRef.current.ox, oy: vtRef.current.oy }
    } else {
      const { mx, my } = s2m(x, y, vtRef.current)
      currentCmd.current = { tool, color, size, pts: [{ mx, my }] }
    }
  }, [tool, color, size, getXY])

  const onMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging.current) return
    e.preventDefault()
    const { x, y } = getXY(e)
    if (tool === 'pan') {
      vtRef.current = { ...vtRef.current, ox: panStart.current.ox + x - panStart.current.x, oy: panStart.current.oy + y - panStart.current.y }
      redraw()
    } else if (currentCmd.current) {
      const { mx, my } = s2m(x, y, vtRef.current)
      if (tool === 'pen') {
        currentCmd.current.pts.push({ mx, my })
        // Incremental stroke for pen performance
        const canvas = canvasRef.current!; const ctx = canvas.getContext('2d')!
        const pts = currentCmd.current.pts
        if (pts.length >= 2) {
          const prev = m2s(pts[pts.length - 2].mx, pts[pts.length - 2].my, vtRef.current)
          const curr = m2s(mx, my, vtRef.current)
          ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(curr.x, curr.y); ctx.stroke()
        }
      } else {
        // For line/curve: update endpoint and show live preview
        currentCmd.current = { ...currentCmd.current, pts: [currentCmd.current.pts[0], { mx, my }] }
        redraw()
        const canvas = canvasRef.current!; const ctx = canvas.getContext('2d')!
        const spts = currentCmd.current.pts.map(p => m2s(p.mx, p.my, vtRef.current))
        ctx.strokeStyle = color; ctx.lineWidth = size; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
        if (tool === 'line') {
          ctx.beginPath(); ctx.moveTo(spts[0].x, spts[0].y); ctx.lineTo(spts[1].x, spts[1].y); ctx.stroke()
        } else if (tool === 'curve') {
          const [a, b] = [spts[0], spts[1]]
          ctx.beginPath(); ctx.moveTo(a.x, a.y)
          ctx.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 50, b.x, b.y); ctx.stroke()
        }
      }
    }
  }, [tool, color, size, getXY, redraw])

  const onUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    if (currentCmd.current && currentCmd.current.pts.length >= 2) {
      cmdsRef.current = [...cmdsRef.current, { ...currentCmd.current }]
      setCmds([...cmdsRef.current])
      redraw()
    }
    currentCmd.current = null
  }, [redraw])

  const undo = () => {
    if (!cmdsRef.current.length) return
    cmdsRef.current = cmdsRef.current.slice(0, -1)
    setCmds([...cmdsRef.current])
    redraw()
  }
  const clearDrawings = () => {
    cmdsRef.current = []; setCmds([]); redraw()
  }
  const zoomBy = (factor: number) => {
    const canvas = canvasRef.current!
    const cx = canvas.width / 2, cy = canvas.height / 2
    const old = vtRef.current
    const ns = Math.max(4, Math.min(4000, old.scale * factor))
    const f = ns / old.scale
    vtRef.current = { ox: cx - (cx - old.ox) * f, oy: cy - (cy - old.oy) * f, scale: ns }
    redraw(); rerender()
  }
  const resetView = () => {
    const canvas = canvasRef.current!
    vtRef.current = { ox: canvas.width / 2, oy: canvas.height / 2, scale: 80 }
    redraw(); rerender()
  }
  const download = () => {
    const canvas = canvasRef.current!
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = formula ? `${formula.name.replace(/\s+/g,'-')}.png` : 'graph.png'
    a.click()
  }

  const cursor = tool === 'pan' ? 'grab' : 'crosshair'

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        {/* Title */}
        <div className="flex items-center gap-2 mr-1">
          <BarChart2 className="w-4 h-4 text-primary" />
          <span className="font-poppins font-bold text-gray-800 text-sm">Graph Canvas</span>
          {formula && <span className="text-gray-400 text-xs font-inter hidden md:inline">— {formula.name}</span>}
        </div>

        {/* Tool selector */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
          {TOOL_DEFS.map(t => (
            <button
              key={t.id} onClick={() => setTool(t.id)} title={t.label}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-poppins font-semibold transition-all touch-manipulation',
                tool === t.id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800',
              )}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Colors — only when drawing */}
        {tool !== 'pan' && (
          <div className="flex items-center gap-1.5">
            {DRAW_COLORS.map(c => (
              <button
                key={c} onClick={() => setColor(c)} title={c}
                className={cn('w-5 h-5 rounded-full border-2 transition-all touch-manipulation',
                  color === c ? 'border-gray-500 scale-125 shadow' : 'border-white hover:scale-110')}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        {/* Brush size — only when drawing */}
        {tool !== 'pan' && (
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-xl p-1">
            {[1, 2, 4, 7].map(s => (
              <button
                key={s} onClick={() => setSize(s)} title={`${s}px`}
                className={cn('w-7 h-7 rounded-lg flex items-center justify-center transition-all touch-manipulation',
                  size === s ? 'bg-white shadow-sm' : 'hover:bg-gray-200')}
              >
                <div className="rounded-full bg-gray-800" style={{ width: Math.min(s * 2 + 2, 14), height: Math.min(s * 2 + 2, 14) }} />
              </button>
            ))}
          </div>
        )}

        {/* Right-side controls */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => zoomBy(1.3)} title="Zoom In"    className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><ZoomIn   className="w-4 h-4" /></button>
          <button onClick={() => zoomBy(1/1.3)} title="Zoom Out" className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><ZoomOut  className="w-4 h-4" /></button>
          <button onClick={resetView}  title="Reset View"        className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><RotateCcw className="w-4 h-4" /></button>
          {cmds.length > 0 && (
            <>
              <button onClick={undo}          title="Undo"            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><Undo2   className="w-4 h-4" /></button>
              <button onClick={clearDrawings} title="Clear drawings"  className="p-2 rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-50 transition-all touch-manipulation"><Trash2  className="w-4 h-4" /></button>
            </>
          )}
          <button onClick={download} title="Download PNG"         className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><Download className="w-4 h-4" /></button>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button onClick={onClose}  title="Close (Esc)"          className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-all touch-manipulation"><X        className="w-5 h-5" /></button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div ref={wrapRef} className="flex-1 relative" style={{ cursor }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
        />
        {!formula && cmds.length === 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="bg-white/90 backdrop-blur border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
              <p className="text-xs text-gray-400 font-inter whitespace-nowrap">
                Scroll to zoom · Drag to pan · Pick a drawing tool above to annotate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function FormulaFinderPage() {
  const [query, setQuery]     = useState('')
  const [topic, setTopic]     = useState('All')
  const [selected, setSelected] = useState<Formula | null>(FORMULAS[0])
  const [graphOpen, setGraphOpen]     = useState(false)
  const [graphFormula, setGraphFormula] = useState<Formula | null>(null)

  const openGraph = (f: Formula | null) => { setGraphFormula(f); setGraphOpen(true) }

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return FORMULAS.filter(f =>
      (topic === 'All' || f.topic === topic) &&
      (!q || f.name.toLowerCase().includes(q) || f.formula.toLowerCase().includes(q) || f.topic.toLowerCase().includes(q)),
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
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-xs font-poppins font-semibold rounded-xl hover:bg-primary/90 transition-all touch-manipulation"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Graph Canvas</span>
            <span className="sm:hidden">Graph</span>
          </button>
        }
      >
        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ── Left: search + formula list ── */}
          <div className="w-full sm:w-72 lg:w-80 flex-shrink-0 flex flex-col border-b sm:border-b-0 sm:border-r border-gray-200 bg-white min-h-0">
            {/* Search */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Search formula or topic…"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-inter focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            {/* Topic chips */}
            <div className="flex gap-1.5 px-3 py-2 overflow-x-auto scrollbar-none border-b border-gray-100">
              {TOPICS.map(t => (
                <button key={t} onClick={() => setTopic(t)}
                  className={cn('px-3 py-1.5 rounded-xl text-xs font-poppins font-semibold whitespace-nowrap transition-all touch-manipulation',
                    topic === t ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}>
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
                    'flex items-center gap-3 w-full px-4 py-3.5 text-left border-b border-gray-50 transition-all touch-manipulation group',
                    selected?.id === f.id
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : 'hover:bg-gray-50 hover:border-l-4 hover:border-l-gray-200',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-poppins font-semibold text-sm truncate',
                      selected?.id === f.id ? 'text-primary' : 'text-gray-800 group-hover:text-primary/80')}>
                      {f.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-xs text-gray-400 font-inter">{f.topic}</p>
                      {f.fn && <span className="text-[9px] font-poppins font-semibold text-primary/70 bg-primary/8 px-1.5 py-0.5 rounded-full">GRAPH</span>}
                    </div>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 flex-shrink-0 transition-colors',
                    selected?.id === f.id ? 'text-primary' : 'text-gray-200 group-hover:text-gray-400')} />
                </button>
              ))}
            </div>
          </div>

          {/* ── Right: detail ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 bg-gray-50">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Calculator className="w-16 h-16 mb-3 opacity-20" />
                <p className="font-poppins text-lg">Select a formula</p>
              </div>
            ) : (
              <div className="max-w-xl">
                <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-poppins font-semibold rounded-full mb-3">
                  {selected.topic}
                </span>
                <h2 className="text-xl sm:text-2xl font-poppins font-bold text-gray-900 mb-4">{selected.name}</h2>

                {/* Formula box */}
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
                        <span className="font-poppins font-bold text-primary text-sm min-w-[72px] mt-0.5">{v.symbol}</span>
                        <span className="font-inter text-sm text-gray-600 flex-1">{v.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Example */}
                <div className="bg-secondary/10 rounded-2xl p-4 border border-secondary/20 mb-3">
                  <p className="text-xs font-poppins font-semibold text-secondary uppercase tracking-wider mb-1.5">Quick Example</p>
                  <p className="font-inter text-sm text-gray-700 leading-relaxed">{selected.example}</p>
                </div>

                {/* Interactive mini graph (only for formulas that have fn) */}
                {selected.fn && (
                  <MiniGraph formula={selected} onOpenFull={() => openGraph(selected)} />
                )}

                {/* Open in full canvas button */}
                {selected.fn && (
                  <button
                    onClick={() => openGraph(selected)}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-700 text-white font-poppins font-semibold text-sm rounded-2xl transition-all touch-manipulation"
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
