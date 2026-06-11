'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { LogOut, TentTree, Utensils, PartyPopper, BarChart3, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const MODULES = [
  {
    href: '/cabanas',
    icon: TentTree,
    title: 'Cabañas',
    subtitle: 'Hospedaje · Reservas · Daypass',
  },
  {
    href: '/restaurante',
    icon: Utensils,
    title: 'Restaurante',
    subtitle: 'POS · Órdenes · Cobros',
  },
  {
    href: '/eventos',
    icon: PartyPopper,
    title: 'Eventos',
    subtitle: 'Cotizaciones · Servicios · Cobros',
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
              className="group bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-3xl p-8 text-left flex flex-col justify-between shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.97] min-h-[220px]"
            >
              <div className="w-14 h-14 rounded-2xl bg-slate-700 group-hover:bg-slate-600 flex items-center justify-center transition-colors">
                <Icon className="h-7 w-7 text-slate-200" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white leading-tight">{mod.title}</h3>
                <p className="text-sm mt-1 text-slate-400">{mod.subtitle}</p>
                <div className="flex items-center gap-1 mt-3 text-slate-500">
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
