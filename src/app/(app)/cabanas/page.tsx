'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Cabana } from '@/types'
import CabanaCard from '@/components/cabanas/CabanaCard'
import CabanaModal from '@/components/cabanas/CabanaModal'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw, Clock } from 'lucide-react'

export default function CabanasPage() {
  const router = useRouter()
  const [cabanas, setCabanas] = useState<Cabana[]>([])
  const [selected, setSelected] = useState<Cabana | null>(null)
  const [loading, setLoading] = useState(true)
  const [hora, setHora] = useState('')

  const fetchCabanas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cabanas')
      .select(`
        *,
        hospedaje_activo:hospedajes(
          *,
          clientes(*)
        )
      `)
      .eq('hospedajes.estado', 'activo')
      .order('numero')

    if (data) {
      const cabanasMapped = data.map(c => ({
        ...c,
        hospedaje_activo: c.hospedaje_activo?.[0] ?? null,
      }))
      setCabanas(cabanasMapped)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCabanas()

    // Realtime subscription
    const supabase = createClient()
    const channel = supabase
      .channel('cabanas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabanas' }, fetchCabanas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospedajes' }, fetchCabanas)
      .subscribe()

    // Reloj
    const timer = setInterval(() => {
      setHora(new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)

    return () => { supabase.removeChannel(channel); clearInterval(timer) }
  }, [fetchCabanas])

  const stats = {
    disponibles: cabanas.filter(c => c.estado === 'disponible').length,
    ocupadas: cabanas.filter(c => c.estado === 'ocupada').length,
    reservadas: cabanas.filter(c => c.estado === 'reservada').length,
    limpieza: cabanas.filter(c => c.estado === 'limpieza').length,
    mantenimiento: cabanas.filter(c => c.estado === 'mantenimiento').length,
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-800">🏡 Cabañas</h1>
              <p className="text-xs text-slate-400">8 cabañas disponibles</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="font-mono text-sm font-bold text-slate-700">{hora}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchCabanas} title="Actualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-6 pb-3 flex gap-4 text-xs">
          {[
            { label: 'Disponibles', value: stats.disponibles, color: 'text-emerald-600' },
            { label: 'Ocupadas', value: stats.ocupadas, color: 'text-red-600' },
            { label: 'Reservadas', value: stats.reservadas, color: 'text-yellow-600' },
            { label: 'Limpieza', value: stats.limpieza, color: 'text-blue-600' },
            { label: 'Mantenimiento', value: stats.mantenimiento, color: 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <span className={`font-black text-base ${s.color}`}>{s.value}</span>
              <span className="text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      {/* Cabins grid */}
      <main className="flex-1 p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-200 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cabanas.map(cabana => (
              <CabanaCard
                key={cabana.id}
                cabana={cabana}
                onClick={() => setSelected(cabana)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Legend */}
      <footer className="bg-white border-t px-6 py-3 flex gap-5 flex-wrap">
        {[
          { color: 'bg-emerald-500', label: 'Disponible' },
          { color: 'bg-red-500', label: 'Ocupada' },
          { color: 'bg-yellow-500', label: 'Reservada' },
          { color: 'bg-blue-500', label: 'Limpieza' },
          { color: 'bg-gray-400', label: 'Mantenimiento' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-2 text-xs text-slate-600">
            <span className={`h-3 w-3 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
      </footer>

      <CabanaModal
        cabana={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onRefresh={fetchCabanas}
      />
    </div>
  )
}
