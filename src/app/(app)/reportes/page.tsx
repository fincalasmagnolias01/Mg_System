'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  House, TrendingUp, Receipt, BedDouble, CalendarDays,
  Loader2, Utensils, Lock, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CierreCajaModal from '@/components/reportes/CierreCajaModal'

interface ResumenStats {
  ingresosDia: number
  ordenesDia: number
  cabanasOcupadas: number
  eventosActivos: number
}

interface CierreCaja {
  id: string
  fecha: string
  total_restaurante: number
  ordenes_restaurante: number
  total_cabanas: number
  hospedajes_count: number
  total_eventos: number
  eventos_count: number
  total_general: number
  notas?: string | null
  created_at: string
}

type Tab = 'restaurante' | 'cabanas' | 'eventos' | 'cierres'

export default function ReportesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('restaurante')
  const [loading, setLoading] = useState(true)
  const [showCierre, setShowCierre] = useState(false)
  const [expandedCierre, setExpandedCierre] = useState<string | null>(null)

  const [stats, setStats]                     = useState<ResumenStats>({ ingresosDia: 0, ordenesDia: 0, cabanasOcupadas: 0, eventosActivos: 0 })
  const [ordenesHoy, setOrdenesHoy]           = useState<{ numero: number; mesa: string; total: number; hora: string }[]>([])
  const [hospedajesActivos, setHospedajes]    = useState<{ cabana: string; cliente: string; tipo: string; subtotal: number }[]>([])
  const [eventosLista, setEventos]            = useState<{ cliente: string; fecha: string; estado: string; total: number }[]>([])
  const [cierres, setCierres]                 = useState<CierreCaja[]>([])

  const fetchCierres = useCallback(async () => {
    const { data } = await createClient()
      .from('cierres_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(60)
    if (data) setCierres(data as CierreCaja[])
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    Promise.all([
      supabase.from('movimientos_caja').select('monto').eq('tipo', 'ingreso').gte('created_at', inicioHoy),
      supabase.from('ordenes').select('numero_orden, mesa, total, created_at').eq('estado', 'pagada').gte('created_at', inicioHoy).order('created_at', { ascending: false }),
      supabase.from('cabanas').select('id').eq('estado', 'ocupada'),
      supabase.from('eventos').select('id').in('estado', ['confirmado', 'en_curso']),
      supabase.from('hospedajes').select('subtotal, tipo, cabanas(nombre), clientes(nombre)').eq('estado', 'activo'),
      supabase.from('eventos').select('clientes(nombre), fecha_evento, estado, total').order('fecha_evento', { ascending: false }).limit(10),
    ]).then(([movimientos, ordenes, cabanas, eventos, hospedajes, eventosData]) => {
      const ingHoy = (movimientos.data ?? []).reduce((s: number, m: any) => s + m.monto, 0)
      setStats({
        ingresosDia: ingHoy,
        ordenesDia: (ordenes.data ?? []).length,
        cabanasOcupadas: (cabanas.data ?? []).length,
        eventosActivos: (eventos.data ?? []).length,
      })

      setOrdenesHoy(
        (ordenes.data ?? []).map((o: any) => ({
          numero: o.numero_orden,
          mesa:   o.mesa ?? '—',
          total:  o.total,
          hora:   new Date(o.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
        }))
      )

      setHospedajes(
        (hospedajes.data ?? []).map((h: any) => ({
          cabana:   Array.isArray(h.cabanas)  ? h.cabanas[0]?.nombre  ?? '' : h.cabanas?.nombre  ?? '',
          cliente:  Array.isArray(h.clientes) ? h.clientes[0]?.nombre ?? '' : h.clientes?.nombre ?? '',
          tipo:     h.tipo,
          subtotal: h.subtotal,
        }))
      )

      setEventos(
        (eventosData.data ?? []).map((e: any) => ({
          cliente: Array.isArray(e.clientes) ? e.clientes[0]?.nombre ?? '' : e.clientes?.nombre ?? '',
          fecha:   e.fecha_evento,
          estado:  e.estado,
          total:   e.total,
        }))
      )

      setLoading(false)
    })

    fetchCierres()
  }, [fetchCierres])

  const TABS: { key: Tab; label: string; icon: typeof Utensils }[] = [
    { key: 'restaurante', label: 'Restaurante', icon: Utensils     },
    { key: 'cabanas',     label: 'Cabañas',     icon: BedDouble    },
    { key: 'eventos',     label: 'Eventos',     icon: CalendarDays },
    { key: 'cierres',     label: 'Cierres',     icon: Lock         },
  ]

  const STAT_CARDS = [
    { label: 'Ingresos Hoy',     value: formatCurrency(stats.ingresosDia),       icon: TrendingUp,   color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
    { label: 'Órdenes Hoy',      value: String(stats.ordenesDia),                icon: Receipt,      color: 'text-amber-400',   bg: 'bg-amber-900/30'   },
    { label: 'Cabañas Ocupadas', value: `${stats.cabanasOcupadas}/8`,             icon: BedDouble,    color: 'text-teal-400',    bg: 'bg-teal-900/30'    },
    { label: 'Eventos Activos',  value: String(stats.eventosActivos),             icon: CalendarDays, color: 'text-violet-400',  bg: 'bg-violet-900/30'  },
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
        <span className="text-base font-black flex-1">Reportes</span>

        {/* Cerrar Caja */}
        <button
          onClick={() => setShowCierre(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm transition-all active:scale-[0.97]"
        >
          <Lock className="h-4 w-4" />
          Cerrar Caja
        </button>
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
                  {t.key === 'cierres' && cierres.length > 0 && (
                    <span className="ml-0.5 text-xs bg-slate-600 text-slate-300 rounded-lg px-1.5 py-0.5 font-bold">{cierres.length}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* ── Restaurante ─────────────────────────────────────────────────── */}
          {tab === 'restaurante' && (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-300 flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-400" />
                  Órdenes del Día
                </h3>
                {ordenesHoy.length > 0 && (
                  <span className="text-xs text-slate-500 font-semibold">
                    Total: <span className="text-amber-400 font-black">
                      {formatCurrency(ordenesHoy.reduce((s, o) => s + o.total, 0))}
                    </span>
                  </span>
                )}
              </div>
              {ordenesHoy.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-sm">Sin órdenes hoy</p>
              ) : (
                <div className="space-y-1.5">
                  {ordenesHoy.map(o => (
                    <div key={o.numero} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800">
                      <span className="text-xs font-black text-slate-500 w-8 flex-shrink-0">#{o.numero}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-300">
                        {o.mesa !== '—' ? `Mesa ${o.mesa}` : 'Sin mesa'}
                      </span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{o.hora}</span>
                      <span className="font-black text-amber-400 flex-shrink-0">{formatCurrency(o.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Cabañas ──────────────────────────────────────────────────────── */}
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
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-lg',
                        h.tipo === 'noche' ? 'bg-violet-900/50 text-violet-300' : 'bg-amber-900/50 text-amber-300'
                      )}>{h.tipo}</span>
                      <span className="font-black text-slate-200">{formatCurrency(h.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Eventos ──────────────────────────────────────────────────────── */}
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
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0 capitalize',
                        e.estado === 'confirmado' ? 'bg-emerald-900/50 text-emerald-300' :
                        e.estado === 'en_curso'   ? 'bg-amber-900/50 text-amber-300'    :
                                                    'bg-slate-700 text-slate-400'
                      )}>{e.estado}</span>
                      <span className="font-black text-slate-200">{formatCurrency(e.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Cierres de Caja ──────────────────────────────────────────────── */}
          {tab === 'cierres' && (
            <div className="space-y-3">
              {cierres.length === 0 ? (
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-10 text-center">
                  <Lock className="h-10 w-10 text-slate-700 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-slate-500 text-sm">No hay cierres de caja registrados</p>
                  <p className="text-slate-600 text-xs mt-1">Usa el botón "Cerrar Caja" para registrar el primero</p>
                </div>
              ) : (
                cierres.map(c => {
                  const isOpen = expandedCierre === c.id
                  const fecha = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  const hora  = new Date(c.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={c.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                      {/* Row header */}
                      <button
                        onClick={() => setExpandedCierre(isOpen ? null : c.id)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/60 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <Lock className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-bold text-slate-200 capitalize">{fecha}</p>
                          <p className="text-xs text-slate-500">Cerrado a las {hora}</p>
                        </div>
                        <p className="text-xl font-black text-emerald-400 flex-shrink-0">{formatCurrency(c.total_general)}</p>
                        {isOpen
                          ? <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        }
                      </button>

                      {/* Expanded detail */}
                      {isOpen && (
                        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <DetailCard
                              icon={Utensils}
                              label="Restaurante"
                              sublabel={`${c.ordenes_restaurante} órdenes`}
                              total={c.total_restaurante}
                              color="text-amber-400"
                              bg="bg-amber-900/20"
                            />
                            <DetailCard
                              icon={BedDouble}
                              label="Cabañas"
                              sublabel={`${c.hospedajes_count} hospedajes`}
                              total={c.total_cabanas}
                              color="text-teal-400"
                              bg="bg-teal-900/20"
                            />
                            <DetailCard
                              icon={CalendarDays}
                              label="Eventos"
                              sublabel={`${c.eventos_count} eventos`}
                              total={c.total_eventos}
                              color="text-violet-400"
                              bg="bg-violet-900/20"
                            />
                          </div>
                          {c.notas && (
                            <p className="text-xs text-slate-500 italic px-1 pt-1">{c.notas}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      <CierreCajaModal
        open={showCierre}
        onClose={() => setShowCierre(false)}
        onClosed={fetchCierres}
      />
    </div>
  )
}

function DetailCard({
  icon: Icon, label, sublabel, total, color, bg,
}: {
  icon: React.ElementType; label: string; sublabel: string; total: number; color: string; bg: string
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 flex flex-col gap-1">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-1', bg)}>
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <p className="text-xs font-bold text-slate-300">{label}</p>
      <p className="text-xs text-slate-600">{sublabel}</p>
      <p className={cn('text-sm font-black mt-0.5', total > 0 ? color : 'text-slate-600')}>{formatCurrency(total)}</p>
    </div>
  )
}
