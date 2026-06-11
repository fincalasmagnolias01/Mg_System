'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogOut, BedDouble, ChefHat, CalendarDays, BarChart3, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const MODULES = [
  {
    href: '/cabanas',
    icon: BedDouble,
    title: 'Cabañas',
    subtitle: 'Hospedaje · Reservas · Daypass',
    from: 'from-teal-500',
    to: 'to-emerald-600',
    shadow: 'shadow-teal-900',
    muted: 'text-teal-100',
  },
  {
    href: '/restaurante',
    icon: ChefHat,
    title: 'Restaurante',
    subtitle: 'POS · Órdenes · Cobros',
    from: 'from-amber-500',
    to: 'to-orange-600',
    shadow: 'shadow-amber-900',
    muted: 'text-amber-100',
  },
  {
    href: '/eventos',
    icon: CalendarDays,
    title: 'Eventos',
    subtitle: 'Cotizaciones · Servicios · Cobros',
    from: 'from-violet-500',
    to: 'to-purple-700',
    shadow: 'shadow-violet-900',
    muted: 'text-violet-100',
  },
]

export default function ModuleSelector({ nombre }: { nombre: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Sesión cerrada')
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none relative">

      {/* Reportes — esquina superior izquierda */}
      <button
        onClick={() => router.push('/reportes')}
        className="absolute top-6 left-6 w-11 h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-[0.95]"
        title="Reportes"
      >
        <BarChart3 className="h-5 w-5" />
      </button>

      {/* Cerrar sesión — esquina superior derecha */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6 w-11 h-11 rounded-2xl bg-slate-800 hover:bg-red-900 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all active:scale-[0.95]"
        title="Cerrar sesión"
      >
        <LogOut className="h-5 w-5" />
      </button>

      {/* Module cards — centradas */}
      <div className="grid grid-cols-3 gap-5 px-8 w-full max-w-4xl">
        {MODULES.map(mod => {
          const Icon = mod.icon
          return (
            <button
              key={mod.href}
              onClick={() => router.push(mod.href)}
              className={`
                group bg-gradient-to-br ${mod.from} ${mod.to}
                rounded-3xl p-8 text-left flex flex-col justify-between
                shadow-2xl ${mod.shadow}
                transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]
                min-h-[220px]
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
