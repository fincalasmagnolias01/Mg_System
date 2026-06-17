'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Reserva, Cabana, EstadoReserva } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  X, Search, Calendar, Users, BedDouble,
  Loader2, SlidersHorizontal, LogIn, XCircle, Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import CheckInDesdeReservaModal from '@/components/cabanas/CheckInDesdeReservaModal'

const ESTADO_CONFIG: Record<EstadoReserva, { label: string; badge: 'success' | 'destructive' | 'warning' | 'info' | 'muted' }> = {
  pendiente:  { label: 'Pendiente',  badge: 'warning'     },
  confirmada: { label: 'Confirmada', badge: 'success'     },
  cancelada:  { label: 'Cancelada',  badge: 'destructive' },
  completada: { label: 'Completada', badge: 'muted'       },
}

const ESTADOS: EstadoReserva[] = ['pendiente', 'confirmada', 'cancelada', 'completada']

interface ReservasPanelProps {
  onClose: () => void
  onRefreshCabanas?: () => void
}

export default function ReservasPanel({ onClose, onRefreshCabanas }: ReservasPanelProps) {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cabanas, setCabanas] = useState<Cabana[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [reservaCheckIn, setReservaCheckIn] = useState<Reserva | null>(null)

  // Filtros
  const [busqueda, setBusqueda] = useState('')
  const [filtroCabana, setFiltroCabana] = useState<string>('todas')
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [filtroDesde, setFiltroDesde] = useState('')
  const [filtroHasta, setFiltroHasta] = useState('')
  const [showFiltros, setShowFiltros] = useState(false)

  const fetchReservas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('reservas')
      .select('*, cabanas(id, numero, nombre, precio_adulto_noche, precio_nino_noche, capacidad_max, precio_dia_base, precio_dia_adicional, estado), clientes(id, nombre, telefono, nit)')
      .order('fecha_entrada', { ascending: true })
    if (data) setReservas(data as Reserva[])
    setLoading(false)
  }, [])

  const fetchCabanas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('cabanas').select('id, numero, nombre').order('numero')
    if (data) setCabanas(data as Cabana[])
  }, [])

  useEffect(() => {
    fetchReservas()
    fetchCabanas()
  }, [fetchReservas, fetchCabanas])

  const hoy = new Date().toISOString().split('T')[0]

  const reservasFiltradas = reservas.filter(r => {
    const nombre = r.clientes?.nombre?.toLowerCase() ?? ''
    if (busqueda && !nombre.includes(busqueda.toLowerCase())) return false
    if (filtroCabana !== 'todas' && r.cabana_id !== filtroCabana) return false
    if (filtroEstado !== 'todas' && r.estado !== filtroEstado) return false
    if (filtroDesde && r.fecha_entrada < filtroDesde) return false
    if (filtroHasta && r.fecha_entrada > filtroHasta + 'T23:59:59') return false
    return true
  })

  const hayFiltros = busqueda || filtroCabana !== 'todas' || filtroEstado !== 'todas' || filtroDesde || filtroHasta

  function limpiarFiltros() {
    setBusqueda('')
    setFiltroCabana('todas')
    setFiltroEstado('todas')
    setFiltroDesde('')
    setFiltroHasta('')
  }

  async function handleCancelar(reserva: Reserva) {
    setCancelandoId(reserva.id)
    const supabase = createClient()

    await supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', reserva.id)

    // Si la cabaña sigue en estado "reservada", liberarla
    if (reserva.cabanas?.estado === 'reservada') {
      // Verificar si hay otras reservas confirmadas para esa cabaña
      const { data: otrasReservas } = await supabase
        .from('reservas')
        .select('id')
        .eq('cabana_id', reserva.cabana_id)
        .in('estado', ['pendiente', 'confirmada'])
        .neq('id', reserva.id)

      if (!otrasReservas || otrasReservas.length === 0) {
        await supabase.from('cabanas').update({ estado: 'disponible' }).eq('id', reserva.cabana_id)
      }
    }

    toast.success('Reserva cancelada')
    setCancelandoId(null)
    fetchReservas()
    onRefreshCabanas?.()
  }

  function handleCheckInDone() {
    setReservaCheckIn(null)
    fetchReservas()
    onRefreshCabanas?.()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />

        {/* Panel */}
        <div className="relative ml-auto w-full max-w-2xl h-full bg-white flex flex-col shadow-2xl">
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 h-16 flex items-center gap-3 flex-shrink-0">
            <Calendar className="h-5 w-5 text-slate-400" />
            <span className="font-black text-base flex-1">Reservaciones</span>
            <button
              onClick={() => setShowFiltros(v => !v)}
              className={cn(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
                showFiltros || hayFiltros ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              )}
              title="Filtros"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all"
            >
              <X className="h-4 w-4 text-slate-300" />
            </button>
          </div>

          {/* Buscador */}
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre del cliente..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9 h-12 text-base"
              />
            </div>
          </div>

          {/* Filtros expandibles */}
          {showFiltros && (
            <div className="px-4 pb-3 flex-shrink-0 border-b border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Cabaña</label>
                  <select
                    value={filtroCabana}
                    onChange={e => setFiltroCabana(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="todas">Todas las cabañas</option>
                    {cabanas.map(c => (
                      <option key={c.id} value={c.id}>#{c.numero} {c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Estado</label>
                  <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="todas">Todos los estados</option>
                    {ESTADOS.map(e => (
                      <option key={e} value={e}>{ESTADO_CONFIG[e].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Entrada desde</label>
                  <Input type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="h-12" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Entrada hasta</label>
                  <Input type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="h-12" />
                </div>
              </div>
              {hayFiltros && (
                <button onClick={limpiarFiltros} className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors">
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {/* Tabs de estado rápidos */}
          <div className="px-4 py-2 flex-shrink-0 border-b border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400 flex-shrink-0">
              {reservasFiltradas.length} resultado{reservasFiltradas.length !== 1 ? 's' : ''}
            </span>
            <div className="flex gap-1 overflow-x-auto">
              {(['todas', 'confirmada', 'pendiente', 'completada', 'cancelada'] as const).map(e => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={cn(
                    'text-xs px-3 py-2 rounded-lg font-medium transition-all flex-shrink-0 active:scale-[0.96]',
                    filtroEstado === e ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                  )}
                >
                  {e === 'todas' ? 'Todas' : ESTADO_CONFIG[e].label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : reservasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                <Calendar className="h-12 w-12" strokeWidth={1} />
                <p className="text-sm">No hay reservaciones{hayFiltros ? ' con esos filtros' : ''}</p>
                {hayFiltros && (
                  <button onClick={limpiarFiltros} className="text-xs underline underline-offset-2 text-slate-500 hover:text-slate-800">
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="px-4 pb-6 pt-2 space-y-2">
                {reservasFiltradas.map(r => {
                  const cfg = ESTADO_CONFIG[r.estado]
                  const personas = (r.adultos ?? 0) + (r.ninos ?? 0) + (r.bebes ?? 0)
                  const noches = r.fecha_entrada && r.fecha_salida
                    ? Math.max(1, Math.round((new Date(r.fecha_salida).getTime() - new Date(r.fecha_entrada).getTime()) / 86400000))
                    : null
                  const saldoPendiente = (r.precio_acordado ?? 0) - (r.anticipo ?? 0)
                  const llegaHoy = r.fecha_entrada.startsWith(hoy)
                  const llegaMañana = r.fecha_entrada.startsWith(
                    new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  )
                  const puedeCheckIn = (r.estado === 'confirmada' || r.estado === 'pendiente') && r.cabanas
                  const puedeCancelar = r.estado === 'confirmada' || r.estado === 'pendiente'

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        'bg-white border rounded-2xl p-4 transition-all',
                        llegaHoy ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      {/* Alerta de llegada */}
                      {llegaHoy && (
                        <div className="flex items-center gap-2 mb-3 bg-amber-100 rounded-xl px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                          <span className="text-xs font-bold text-amber-800">Llega hoy</span>
                        </div>
                      )}
                      {llegaMañana && !llegaHoy && (
                        <div className="flex items-center gap-2 mb-3 bg-sky-50 rounded-xl px-3 py-2">
                          <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-sky-700">Llega mañana</span>
                        </div>
                      )}

                      {/* Encabezado */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{r.clientes?.nombre ?? '—'}</p>
                            <span className="text-xs text-slate-400">#{r.numero_reserva}</span>
                          </div>
                          {r.clientes?.telefono && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-slate-400" />
                              <p className="text-xs text-slate-400">{r.clientes.telefono}</p>
                            </div>
                          )}
                        </div>
                        <Badge variant={cfg.badge} className="text-xs flex-shrink-0 px-2.5 py-1">{cfg.label}</Badge>
                      </div>

                      {/* Detalles */}
                      <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <BedDouble className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-medium truncate">
                            {r.cabanas ? `#${r.cabanas.numero} ${r.cabanas.nombre}` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span>{personas} persona{personas !== 1 ? 's' : ''}</span>
                        </div>
                        {noches && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span>{noches} noche{noches !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Fechas y financiero */}
                      <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700">{formatDate(r.fecha_entrada)}</span>
                          {' → '}
                          <span className="font-semibold text-slate-700">{formatDate(r.fecha_salida)}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-slate-400">Total acordado</p>
                          <p className="font-black text-slate-900 text-sm">{formatCurrency(r.precio_acordado ?? 0)}</p>
                          {r.anticipo > 0 && (
                            <p className="text-xs text-emerald-600">Anticipo: {formatCurrency(r.anticipo)}</p>
                          )}
                          {saldoPendiente > 0 && (
                            <p className="text-xs text-amber-600 font-semibold">Saldo: {formatCurrency(saldoPendiente)}</p>
                          )}
                        </div>
                      </div>

                      {r.notas && (
                        <p className="mt-2 text-xs text-slate-400 italic truncate">{r.notas}</p>
                      )}

                      {/* Acciones */}
                      {(puedeCheckIn || puedeCancelar) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                          {puedeCheckIn && (
                            <button
                              onClick={() => setReservaCheckIn(r)}
                              className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.97] text-white text-sm font-bold flex items-center justify-center gap-2 transition-all"
                            >
                              <LogIn className="h-4 w-4" />
                              Check In
                            </button>
                          )}
                          {puedeCancelar && (
                            <button
                              onClick={() => handleCancelar(r)}
                              disabled={cancelandoId === r.id}
                              className="flex-1 h-11 rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 active:scale-[0.97] text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              {cancelandoId === r.id
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <XCircle className="h-4 w-4" />
                              }
                              Cancelar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Modal de check-in desde reserva */}
      {reservaCheckIn && (
        <CheckInDesdeReservaModal
          reserva={reservaCheckIn}
          open
          onClose={() => setReservaCheckIn(null)}
          onDone={handleCheckInDone}
        />
      )}
    </>
  )
}
