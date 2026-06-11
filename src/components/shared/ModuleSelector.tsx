'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { LogOut, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'

const MODULES = [
  {
    href: '/cabanas',
    emoji: '🏡',
    title: 'CABAÑAS',
    subtitle: 'Hospedaje · Reservas · Vapepass',
    gradient: 'from-emerald-500 to-teal-600',
    shadow: 'shadow-emerald-200',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
  },
  {
    href: '/restaurante',
    emoji: '🍽️',
    title: 'RESTAURANTE',
    subtitle: 'POS · Órdenes · Facturación',
    gradient: 'from-blue-500 to-indigo-600',
    shadow: 'shadow-blue-200',
    bg: 'bg-blue-50',
    ring: 'ring-blue-200',
  },
  {
    href: '/eventos',
    emoji: '🎉',
    title: 'EVENTOS',
    subtitle: 'Cotizaciones · Servicios · Cobros',
    gradient: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-200',
    bg: 'bg-violet-50',
    ring: 'ring-violet-200',
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

  const hora = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
  const fecha = new Date().toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg">
            M
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-800 leading-none">System Mg</h1>
            <p className="text-xs text-slate-400 capitalize">{fecha}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">{nombre}</p>
            <p className="text-xs text-slate-400">{hora}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/reportes')} title="Reportes">
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Cerrar sesión">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Module cards */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-800">¿Qué deseas administrar?</h2>
            <p className="text-slate-500 mt-2">Selecciona un módulo para comenzar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MODULES.map((mod) => (
              <button
                key={mod.href}
                onClick={() => router.push(mod.href)}
                className={`
                  group relative overflow-hidden rounded-3xl p-8 text-left
                  bg-white border-2 border-transparent
                  hover:border-current hover:${mod.ring}
                  shadow-lg hover:shadow-2xl hover:${mod.shadow}
                  transition-all duration-200 active:scale-[0.98]
                  min-h-[280px] flex flex-col justify-between
                `}
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mod.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />

                <div>
                  {/* Emoji icon */}
                  <div className={`w-20 h-20 rounded-2xl ${mod.bg} flex items-center justify-center text-5xl mb-6 group-hover:scale-110 transition-transform duration-200`}>
                    {mod.emoji}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-black text-slate-800 tracking-wide">{mod.title}</h3>
                  <p className="text-slate-500 mt-1 text-sm">{mod.subtitle}</p>
                </div>

                {/* Arrow indicator */}
                <div className={`flex items-center gap-2 mt-6`}>
                  <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${mod.gradient} group-hover:w-20 transition-all duration-200`} />
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-600 transition-colors">Abrir</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
