'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Cabana, EstadoCabana, Reserva } from '@/types'
import { formatDate } from '@/lib/utils'
import CheckInModal from '@/components/cabanas/CheckInModal'
import CheckOutModal from '@/components/cabanas/CheckOutModal'
import ReservaModal from '@/components/cabanas/ReservaModal'
import VapepassModal from '@/components/cabanas/VapepassModal'
import CabanaAdminModal from '@/components/cabanas/CabanaAdminModal'
import FacturaCabanaModal from '@/components/cabanas/FacturaCabanaModal'
import ReservasPanel from '@/components/cabanas/ReservasPanel'
import { Badge } from '@/components/ui/badge'
import {
  House, LogIn, LogOut, Calendar,
  Zap, Receipt, Settings, BedDouble, Users, BookOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const STATUS: Record<EstadoCabana, {
  label: string; dot: string; leftBorder: string; textColor: string
  badge: 'success' | 'destructive' | 'warning' | 'info' | 'muted'
}> = {
  disponible:    { label: 'Disponible',    dot: 'bg-emerald-500', leftBorder: 'border-l-emerald-500', textColor: 'text-emerald-400', badge: 'success'     },
  ocupada:       { label: 'Ocupada',       dot: 'bg-red-500',     leftBorder: 'border-l-red-500',     textColor: 'text-red-400',     badge: 'destructive' },
  reservada:     { label: 'Reservada',     dot: 'bg-amber-500',   leftBorder: 'border-l-amber-500',   textColor: 'text-amber-400',   badge: 'warning'     },
  limpieza:      { label: 'Limpieza',      dot: 'bg-sky-500',     leftBorder: 'border-l-sky-500',     textColor: 'text-sky-400',     badge: 'info'        },
  mantenimiento: { label: 'Mantenimiento', dot: 'bg-slate-400',   leftBorder: 'border-l-slate-300',   textColor: 'text-slate-400',   badge: 'muted'       },
}

const ESTADOS: EstadoCabana[] = ['disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento']

type SubView = 'checkin' | 'checkout' | 'reserva' | 'vapepass' | 'factura' | 'estado' | null

const ACTIONS = [
  { key: 'checkin'  as SubView, icon: LogIn,    label: 'Check In',  colors: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'      },
  { key: 'checkout' as SubView, icon: LogOut,   label: 'Check Out', colors: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'          },
  { key: 'reserva'  as SubView, icon: Calendar, label: 'Reservar',  colors: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'          },
  { key: 'vapepass' as SubView, icon: Zap,      label: 'Daypass',   colors: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'  },
  { key: 'factura'  as SubView, icon: Receipt,  label: 'Facturar',  colors: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
  { key: 'estado'   as SubView, icon: Settings, label: 'Estado',    colors: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'   },
]

export default function CabanasPage() {
  const router = useRouter()
  const [cabanas, setCabanas] = useState<Cabana[]>([])
  const [selected, setSelected] = useState<Cabana | null>(null)
  const [subView, setSubView] = useState<SubView>(null)
  const [loading, setLoading] = useState(true)
  const [changingEstado, setChangingEstado] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showReservas, setShowReservas] = useState(false)
  const [reservasProximas, setReservasProximas] = useState<Reserva[]>([])

  const fetchReservasProximas = useCallback(async () => {
    const supabase = createClient()
    const hoy = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('reservas')
      .select('*, clientes(nombre, telefono)')
      .in('estado', ['confirmada', 'pendiente'])
      .gte('fecha_entrada', hoy)
      .order('fecha_entrada', { ascending: true })
    if (data) setReservasProximas(data as Reserva[])
  }, [])

  const fetchCabanas = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('cabanas')
      .select(`*, hospedaje_activo:hospedajes(*, clientes(*))`)
      .eq('hospedajes.estado', 'activo')
      .order('numero')
    if (data) {
      setCabanas(data.map(c => ({ ...c, hospedaje_activo: c.hospedaje_activo?.[0] ?? null })))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCabanas()
    fetchReservasProximas()
    const supabase = createClient()
    const ch = supabase.channel('cab-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabanas' }, fetchCabanas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospedajes' }, fetchCabanas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas' }, fetchReservasProximas)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCabanas, fetchReservasProximas])

  useEffect(() => {
    if (selected) {
      const fresh = cabanas.find(c => c.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [cabanas]) // eslint-disable-line

  function handleDone() { fetchCabanas(); fetchReservasProximas(); setSubView(null) }

  const hoy = new Date().toISOString().split('T')[0]
  const llegasHoy = reservasProximas.filter(r => r.fecha_entrada.startsWith(hoy)).length

  async function handleCambiarEstado(estado: EstadoCabana) {
    if (!selected) return
    setChangingEstado(true)
    await createClient().from('cabanas').update({ estado }).eq('id', selected.id)
    toast.success(`Estado: ${STATUS[estado].label}`)
    fetchCabanas(); setSubView(null); setChangingEstado(false)
  }

  const stats = [
    { dot: 'bg-emerald-500', label: 'Disponibles', value: cabanas.filter(c => c.estado === 'disponible').length },
    { dot: 'bg-red-500',     label: 'Ocupadas',    value: cabanas.filter(c => c.estado === 'ocupada').length    },
    { dot: 'bg-amber-500',   label: 'Reservadas',  value: cabanas.filter(c => c.estado === 'reservada').length  },
    { dot: 'bg-sky-500',     label: 'Limpieza',    value: cabanas.filter(c => c.estado === 'limpieza').length   },
  ]

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 text-white px-5 desk:px-8 h-16 desk:h-[72px] flex items-center gap-4 desk:gap-6 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-11 h-11 desk:w-14 desk:h-14 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
        >
          <House className="h-5 w-5 desk:h-6 desk:w-6 text-slate-300" />
        </button>
        <span className="text-base desk:text-xl font-black flex-shrink-0">Cabañas</span>

        {/* Stats centrados */}
        <div className="flex-1 flex items-center justify-center gap-3 desk:gap-6">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-2 desk:gap-3 bg-slate-800 rounded-xl px-4 desk:px-6 py-2 desk:py-3">
              <span className={cn('h-2 w-2 desk:h-3 desk:w-3 rounded-full flex-shrink-0', s.dot)} />
              <span className="text-lg desk:text-2xl font-black text-white leading-none">{s.value}</span>
              <span className="text-xs desk:text-sm text-slate-400">{s.label}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowReservas(true)}
          className="relative w-11 h-11 desk:w-14 desk:h-14 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
          title="Ver reservaciones"
        >
          <BookOpen className="h-4 w-4 desk:h-5 desk:w-5 text-slate-300" />
          {llegasHoy > 0 && (
            <span className="absolute -top-1 -right-1 h-5 desk:h-6 min-w-5 px-1 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center leading-none">
              {llegasHoy}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowAdmin(true)}
          className="w-9 h-9 desk:w-12 desk:h-12 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all flex-shrink-0"
          title="Configuración"
        >
          <Settings className="h-4 w-4 desk:h-5 desk:w-5 text-slate-300" />
        </button>
      </header>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — cabin list */}
        <aside className="w-64 desk:w-96 bg-slate-900 flex-shrink-0 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-800 animate-pulse" />)}
            </div>
          ) : (
            cabanas.map(c => {
              const s = STATUS[c.estado]
              const isSelected = selected?.id === c.id
              const proximaReserva = c.estado === 'reservada'
                ? reservasProximas.find(r => r.cabana_id === c.id)
                : null
              const llegaHoyEsta = proximaReserva?.fecha_entrada.startsWith(hoy)
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setSubView(null) }}
                  className={cn(
                    'w-full text-left px-3 py-3 flex items-center gap-3 border-b border-b-slate-800 transition-all',
                    isSelected ? 'bg-slate-700 border-l-2 border-l-slate-400' : 'border-l-2 border-l-transparent hover:bg-slate-800'
                  )}
                >
                  {/* Thumbnail or number */}
                  <div className="w-14 h-14 desk:w-20 desk:h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-700 flex items-center justify-center">
                    {c.imagen_url ? (
                      <Image src={c.imagen_url} alt={c.nombre} width={56} height={56} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-slate-400">#{c.numero}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={cn('h-2 w-2 rounded-full flex-shrink-0', s.dot)} />
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide leading-none">{s.label}</p>
                      {llegaHoyEsta && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm desk:text-base font-bold text-slate-200 truncate">
                      {c.hospedaje_activo?.clientes?.nombre
                        ?? proximaReserva?.clientes?.nombre
                        ?? c.nombre}
                    </p>
                    {proximaReserva && !c.hospedaje_activo && (
                      <p className="text-xs text-amber-400 truncate mt-0.5">
                        {llegaHoyEsta ? 'Llega hoy' : formatDate(proximaReserva.fecha_entrada)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </aside>

        {/* Right — detail panel */}
        <main className="flex-1 overflow-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300">
              <BedDouble className="h-20 w-20" strokeWidth={1} />
              <p className="text-sm text-slate-400">Selecciona una cabaña</p>
            </div>

          ) : subView === 'estado' ? (
            <div className="p-8">
              <button onClick={() => setSubView(null)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 font-semibold transition-colors text-sm">
                ← Volver
              </button>
              <h2 className="font-black text-xl text-slate-900 mb-1">Cabaña #{selected.numero}</h2>
              <p className="text-slate-500 mb-6 text-sm">Cambiar estado</p>
              <div className="flex flex-col gap-2 max-w-xs">
                {ESTADOS.map(estado => {
                  const s = STATUS[estado]; const isCurrent = selected.estado === estado
                  return (
                    <button key={estado} onClick={() => handleCambiarEstado(estado)}
                      disabled={changingEstado || isCurrent}
                      className={cn('h-13 rounded-2xl border-2 flex items-center gap-4 px-5 font-semibold text-sm transition-all active:scale-[0.97]',
                        isCurrent ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:border-slate-400 text-slate-700 disabled:opacity-40'
                      )}
                      style={{ height: '52px' }}
                    >
                      <span className={cn('h-3 w-3 rounded-full flex-shrink-0', s.dot)} />
                      {s.label}
                      {isCurrent && <span className="ml-auto text-xs text-slate-400 font-normal">actual</span>}
                    </button>
                  )
                })}
              </div>
            </div>

          ) : (
            <div className="h-full p-5 desk:p-8 flex flex-col gap-4 desk:gap-6 overflow-auto">
              {/* Cabin info + image en la misma tarjeta */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-shrink-0">
                {/* Info */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cabaña #{selected.numero}</p>
                      <h2 className="text-xl desk:text-3xl font-black text-slate-900 mt-0.5">{selected.nombre}</h2>
                    </div>
                    <Badge variant={STATUS[selected.estado].badge} className="text-xs px-2.5 py-1 flex-shrink-0">
                      {STATUS[selected.estado].label}
                    </Badge>
                  </div>
                  <div className="border-t border-slate-100 mt-3 pt-3">
                    {selected.hospedaje_activo ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{selected.hospedaje_activo.clientes?.nombre}</p>
                          <p className="text-xs text-slate-500">
                            {selected.hospedaje_activo.adultos + selected.hospedaje_activo.ninos + selected.hospedaje_activo.bebes} personas ·{' '}
                            {selected.hospedaje_activo.tipo === 'noche' ? 'Noche' : 'Día'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Cap. {selected.capacidad_max} · Q{selected.precio_adulto_noche.toFixed(0)}/adulto noche
                      </p>
                    )}
                  </div>
                </div>

                {/* Imagen — esquina derecha, tamaño fijo */}
                <div className="relative w-40 desk:w-72 flex-shrink-0 bg-slate-100">
                  {selected.imagen_url ? (
                    <Image src={selected.imagen_url} alt={selected.nombre} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <BedDouble className="h-8 w-8" strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-2 desk:gap-4 flex-shrink-0">
                {ACTIONS.map(({ key, icon: Icon, label, colors }) => {
                  const disabled =
                    (key === 'checkin'  && selected.estado === 'ocupada') ||
                    (key === 'checkout' && !selected.hospedaje_activo) ||
                    (key === 'factura'  && !selected.hospedaje_activo)
                  return (
                    <button key={key} onClick={() => setSubView(key)} disabled={disabled}
                      className={cn('h-20 desk:h-32 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 desk:gap-3 font-semibold text-sm desk:text-lg transition-all active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed', colors)}
                    >
                      <Icon className="h-5 w-5 desk:h-8 desk:w-8" />
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Sub-modals */}
      {selected && subView === 'checkin' && (
        <CheckInModal cabana={selected} open onBack={() => setSubView(null)} onDone={handleDone} />
      )}
      {selected && subView === 'checkout' && selected.hospedaje_activo && (
        <CheckOutModal cabana={selected} hospedaje={selected.hospedaje_activo} open onBack={() => setSubView(null)} onDone={handleDone} />
      )}
      {selected && subView === 'reserva' && (
        <ReservaModal cabana={selected} open onBack={() => setSubView(null)} onDone={handleDone} />
      )}
      {selected && subView === 'vapepass' && (
        <VapepassModal cabana={selected} hospedaje={selected.hospedaje_activo ?? undefined} open onBack={() => setSubView(null)} onDone={handleDone} />
      )}
      {selected && subView === 'factura' && selected.hospedaje_activo && (
        <FacturaCabanaModal cabana={selected} hospedaje={selected.hospedaje_activo} open onBack={() => setSubView(null)} onDone={handleDone} />
      )}
      <CabanaAdminModal open={showAdmin} onClose={() => setShowAdmin(false)} onSaved={fetchCabanas} />
      {showReservas && (
        <ReservasPanel
          onClose={() => setShowReservas(false)}
          onRefreshCabanas={() => { fetchCabanas(); fetchReservasProximas() }}
        />
      )}
    </div>
  )
}
