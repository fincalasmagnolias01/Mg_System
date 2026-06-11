'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogOut, TreePine, UtensilsCrossed, CalendarDays, BarChart3, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MODULES = [
  {
    href: '/cabanas',
    icon: TreePine,
    title: 'Cabañas',
    subtitle: 'Hospedaje · Reservas · Vapepass',
    from: 'from-teal-500',
    to: 'to-emerald-600',
    shadow: 'shadow-teal-200',
    muted: 'text-teal-100',
  },
  {
    href: '/restaurante',
    icon: UtensilsCrossed,
    title: 'Restaurante',
    subtitle: 'POS · Órdenes · Cobros',
    from: 'from-amber-500',
    to: 'to-orange-600',
    shadow: 'shadow-amber-200',
    muted: 'text-amber-100',
  },
  {
    href: '/eventos',
    icon: CalendarDays,
    title: 'Eventos',
    subtitle: 'Cotizaciones · Servicios · Cobros',
    from: 'from-violet-500',
    to: 'to-purple-700',
    shadow: 'shadow-violet-200',
    muted: 'text-violet-100',
  },
]

interface CabanaStats {
  total: number
  disponibles: number
  ocupadas: number
  reservadas: number
  limpieza: number
}

export default function ModuleSelector({ nombre }: { nombre: string }) {
  const router = useRouter()
  const [stats, setStats] = useState<CabanaStats>({ total: 0, disponibles: 0, ocupadas: 0, reservadas: 0, limpieza: 0 })
  const [hora, setHora] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.from('cabanas').select('estado').then(({ data }) => {
      if (!data) return
      setStats({
        total: data.length,
        disponibles: data.filter(c => c.estado === 'disponible').length,
        ocupadas: data.filter(c => c.estado === 'ocupada').length,
        reservadas: data.filter(c => c.estado === 'reservada').length,
        limpieza: data.filter(c => c.estado === 'limpieza').length,
      })
    })
    const tick = () => setHora(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true }))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Sesión cerrada')
  }

  const STAT_CHIPS = [
    { value: stats.total,       label: 'Total',        dot: 'bg-slate-400'   },
    { value: stats.disponibles, label: 'Disponibles',  dot: 'bg-emerald-500' },
    { value: stats.ocupadas,    label: 'Ocupadas',     dot: 'bg-red-500'     },
    { value: stats.reservadas,  label: 'Reservadas',   dot: 'bg-amber-500'   },
    { value: stats.limpieza,    label: 'Limpieza',     dot: 'bg-sky-500'     },
  ]

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 pt-7 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-base leading-none">M</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">System Mg</h1>
            <p className="text-sm text-slate-500 mt-0.5">{nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/reportes')}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all active:scale-[0.95]"
            title="Reportes"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200 flex items-center justify-center text-slate-500 transition-all active:scale-[0.95]"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cabin stats bar — centered */}
      <div className="flex items-center justify-center gap-3 px-8 py-3 flex-shrink-0">
        {STAT_CHIPS.map(s => (
          <div
            key={s.label}
            className="flex flex-col items-center gap-1 bg-white border border-slate-200 rounded-2xl px-5 py-3 min-w-[90px] shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', s.dot)} />
              <span className="text-2xl font-black text-slate-900 leading-none">{s.value}</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">{s.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center gap-1 bg-slate-900 rounded-2xl px-5 py-3 min-w-[90px] shadow-sm">
          <span className="text-2xl font-black text-white leading-none font-mono">{hora.split(' ')[0]}</span>
          <span className="text-xs text-slate-400 font-medium">{hora.split(' ')[1] ?? ''}</span>
        </div>
      </div>

      {/* Module cards */}
      <div className="flex-1 px-8 pb-8 grid grid-cols-3 gap-5 content-center">
        {MODULES.map(mod => {
          const Icon = mod.icon
          return (
            <button
              key={mod.href}
              onClick={() => router.push(mod.href)}
              className={`
                group bg-gradient-to-br ${mod.from} ${mod.to}
                rounded-3xl p-8 text-left flex flex-col justify-between
                shadow-xl ${mod.shadow}
                transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]
                min-h-[200px]
              `}
            >
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <Icon className="h-7 w-7 text-white" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-tight">{mod.title}</h3>
                <p className={`text-sm mt-1 ${mod.muted}`}>{mod.subtitle}</p>
                <div className="flex items-center gap-1 mt-3 text-white/60">
                  <span className="text-xs font-semibold">Abrir</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
