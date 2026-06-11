'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import { House, TrendingUp, Receipt, BedDouble, CalendarDays, Loader2, Utensils, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResumenStats {
  ingresosDia: number
  ordenesDia: number
  cabanasOcupadas: number
  eventosActivos: number
}

type Tab = 'restaurante' | 'cabanas' | 'eventos'

export default function ReportesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('restaurante')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ResumenStats>({ ingresosDia: 0, ordenesDia: 0, cabanasOcupadas: 0, eventosActivos: 0 })
  const [ventasRestaurante, setVentasRestaurante] = useState<{ nombre: string; total: number }[]>([])
  const [hospedajesActivos, setHospedajesActivos] = useState<{ cabana: string; cliente: string; tipo: string; subtotal: number }[]>([])
  const [eventosLista, setEventosLista] = useState<{ cliente: string; fecha: string; estado: string; total: number }[]>([])

  useEffect(() => {
    const supabase = createClient()
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    Promise.all([
      supabase.from('movimientos_caja').select('monto').eq('tipo', 'ingreso').gte('created_at', inicioHoy),
      supabase.from('ordenes').select('id').eq('estado', 'pagada').gte('created_at', inicioHoy),
      supabase.from('cabanas').select('id').eq('estado', 'ocupada'),
      supabase.from('eventos').select('id').in('estado', ['confirmado', 'en_curso']),
      supabase.from('hospedajes').select('subtotal, tipo, cabanas(nombre), clientes(nombre)').eq('estado', 'activo'),
      supabase.from('detalle_orden').select('nombre_producto, subtotal').gte('created_at', inicioHoy),
      supabase.from('eventos').select('clientes(nombre), fecha_evento, estado, total').order('fecha_evento', { ascending: false }).limit(10),
    ]).then(([movimientos, ordenes, cabanas, eventos, hospedajes, detalles, eventosData]) => {
      const ingHoy = (movimientos.data ?? []).reduce((s: number, m: any) => s + m.monto, 0)
      setStats({
        ingresosDia: ingHoy,
        ordenesDia: (ordenes.data ?? []).length,
        cabanasOcupadas: (cabanas.data ?? []).length,
        eventosActivos: (eventos.data ?? []).length,
      })

      const agrupados: Record<string, number> = {}
      ;(detalles.data ?? []).forEach((d: any) => {
        agrupados[d.nombre_producto] = (agrupados[d.nombre_producto] ?? 0) + d.subtotal
      })
      setVentasRestaurante(
        Object.entries(agrupados).sort(([, a], [, b]) => b - a).slice(0, 10).map(([nombre, total]) => ({ nombre, total }))
      )

      setHospedajesActivos(
        (hospedajes.data ?? []).map((h: any) => ({
          cabana: Array.isArray(h.cabanas) ? h.cabanas[0]?.nombre ?? '' : h.cabanas?.nombre ?? '',
          cliente: Array.isArray(h.clientes) ? h.clientes[0]?.nombre ?? '' : h.clientes?.nombre ?? '',
          tipo: h.tipo,
          subtotal: h.subtotal,
        }))
      )

      setEventosLista(
        (eventosData.data ?? []).map((e: any) => ({
          cliente: Array.isArray(e.clientes) ? e.clientes[0]?.nombre ?? '' : e.clientes?.nombre ?? '',
          fecha: e.fecha_evento,
          estado: e.estado,
          total: e.total,
        }))
      )

      setLoading(false)
    })
  }, [])

  const TABS: { key: Tab; label: string; icon: typeof Utensils }[] = [
    { key: 'restaurante', label: 'Restaurante', icon: Utensils },
    { key: 'cabanas',     label: 'Cabañas',     icon: BedDouble },
    { key: 'eventos',     label: 'Eventos',      icon: CalendarDays },
  ]

  const STAT_CARDS = [
    { label: 'Ingresos Hoy',      value: formatCurrency(stats.ingresosDia),        icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
    { label: 'Órdenes Hoy',       value: String(stats.ordenesDia),                 icon: Receipt,     color: 'text-amber-400',   bg: 'bg-amber-900/30'   },
    { label: 'Cabañas Ocupadas',  value: `${stats.cabanasOcupadas}/8`,              icon: BedDouble,   color: 'text-teal-400',    bg: 'bg-teal-900/30'    },
    { label: 'Eventos Activos',   value: String(stats.eventosActivos),              icon: CalendarDays,color: 'text-violet-400',  bg: 'bg-violet-900/30'  },
  ]

  return (
    <div className="h-screen overflow-hidden bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white px-5 h-16 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-11 h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
        >
          <House className="h-5 w-5 text-slate-300" />
        </button>
        <span className="text-base font-black">Reportes</span>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {STAT_CARDS.map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', s.bg)}>
                    <Icon className={cn('h-5 w-5', s.color)} />
                  </div>
                  <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                </div>
              )
            })}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {TABS.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    tab === t.key
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {tab === 'restaurante' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Top Productos del Día
              </h3>
              {ventasRestaurante.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Sin ventas hoy</p>
              ) : (
                <div className="space-y-2">
                  {ventasRestaurante.map((p, i) => (
                    <div key={p.nombre} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-800 transition-colors">
                      <span className={cn(
                        'w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0',
                        i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-slate-600 text-white' : i === 2 ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-400'
                      )}>{i + 1}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-300 truncate">{p.nombre}</span>
                      <span className="font-black text-amber-400">{formatCurrency(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'cabanas' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-teal-400" />
                Hospedajes Activos
              </h3>
              {hospedajesActivos.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Sin hospedajes activos</p>
              ) : (
                <div className="space-y-2">
                  {hospedajesActivos.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800">
                      <span className="font-black text-teal-400 flex-shrink-0">{h.cabana}</span>
                      <span className="flex-1 text-sm text-slate-300 truncate">{h.cliente}</span>
                      <span className={cn(
                        'text-xs font-bold px-2 py-1 rounded-lg',
                        h.tipo === 'noche' ? 'bg-violet-900/50 text-violet-300' : 'bg-amber-900/50 text-amber-300'
                      )}>{h.tipo}</span>
                      <span className="font-black text-slate-200">{formatCurrency(h.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'eventos' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-400" />
                Últimos Eventos
              </h3>
              {eventosLista.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Sin eventos</p>
              ) : (
                <div className="space-y-2">
                  {eventosLista.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800">
                      <span className="flex-1 font-semibold text-slate-300 truncate">{e.cliente}</span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(e.fecha)}</span>
                      <span className={cn(
                        'text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 capitalize',
                        e.estado === 'confirmado' ? 'bg-emerald-900/50 text-emerald-300' :
                        e.estado === 'en_curso' ? 'bg-amber-900/50 text-amber-300' :
                        'bg-slate-700 text-slate-400'
                      )}>{e.estado}</span>
                      <span className="font-black text-slate-200">{formatCurrency(e.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
