'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { uploadImage } from '@/lib/storage'
import { Cabana, EstadoCabana } from '@/types'
import CheckInModal from '@/components/cabanas/CheckInModal'
import CheckOutModal from '@/components/cabanas/CheckOutModal'
import ReservaModal from '@/components/cabanas/ReservaModal'
import VapepassModal from '@/components/cabanas/VapepassModal'
import FacturaCabanaModal from '@/components/cabanas/FacturaCabanaModal'
import { Badge } from '@/components/ui/badge'
import {
  House, LogIn, LogOut, Calendar,
  Zap, Receipt, Settings, BedDouble, Camera, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const STATUS: Record<EstadoCabana, {
  label: string; dot: string; leftBorder: string
  badge: 'success' | 'destructive' | 'warning' | 'info' | 'muted'
}> = {
  disponible:    { label: 'Disponible',    dot: 'bg-emerald-500', leftBorder: 'border-l-emerald-500', badge: 'success'     },
  ocupada:       { label: 'Ocupada',       dot: 'bg-red-500',     leftBorder: 'border-l-red-500',     badge: 'destructive' },
  reservada:     { label: 'Reservada',     dot: 'bg-amber-500',   leftBorder: 'border-l-amber-500',   badge: 'warning'     },
  limpieza:      { label: 'Limpieza',      dot: 'bg-sky-500',     leftBorder: 'border-l-sky-500',     badge: 'info'        },
  mantenimiento: { label: 'Mantenimiento', dot: 'bg-slate-400',   leftBorder: 'border-l-slate-300',   badge: 'muted'       },
}

const ESTADOS: EstadoCabana[] = ['disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento']

type SubView = 'checkin' | 'checkout' | 'reserva' | 'vapepass' | 'factura' | 'estado' | null

const ACTIONS = [
  { key: 'checkin'  as SubView, icon: LogIn,    label: 'Check In',  colors: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'      },
  { key: 'checkout' as SubView, icon: LogOut,   label: 'Check Out', colors: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'          },
  { key: 'reserva'  as SubView, icon: Calendar, label: 'Reservar',  colors: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'          },
  { key: 'vapepass' as SubView, icon: Zap,      label: 'Vapepass',  colors: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'  },
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

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
    const supabase = createClient()
    const ch = supabase.channel('cab-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cabanas' }, fetchCabanas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospedajes' }, fetchCabanas)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCabanas])

  useEffect(() => {
    if (selected) {
      const fresh = cabanas.find(c => c.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [cabanas]) // eslint-disable-line

  function handleDone() { fetchCabanas(); setSubView(null) }

  async function handleCambiarEstado(estado: EstadoCabana) {
    if (!selected) return
    setChangingEstado(true)
    await createClient().from('cabanas').update({ estado }).eq('id', selected.id)
    toast.success(`Estado: ${STATUS[estado].label}`)
    fetchCabanas(); setSubView(null); setChangingEstado(false)
  }

  async function handlePhotoUpload(file: File) {
    if (!selected) return
    setUploadingPhoto(true)
    try {
      const url = await uploadImage('cabanas', file, `cabana-${selected.id}`)
      await createClient().from('cabanas').update({ imagen_url: url }).eq('id', selected.id)
      fetchCabanas()
      toast.success('Foto actualizada')
    } catch { toast.error('Error al subir foto') }
    finally { setUploadingPhoto(false) }
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
      <header className="bg-white border-b border-slate-200 px-5 h-16 flex items-center gap-4 flex-shrink-0 shadow-sm">
        <button
          onClick={() => router.push('/')}
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
          title="Volver al menú"
        >
          <House className="h-5 w-5 text-slate-600" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Stats chips */}
        <div className="flex items-center gap-2 flex-1">
          {stats.map(s => (
            <div key={s.label} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', s.dot)} />
              <span className="text-lg font-black text-slate-800 leading-none">{s.value}</span>
              <span className="text-xs text-slate-400 hidden sm:block">{s.label}</span>
            </div>
          ))}
        </div>

      </header>

      {/* Two-panel body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — cabin list */}
        <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2 border-b bg-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">8 Cabañas</p>
          </div>
          {loading ? (
            <div className="p-3 space-y-1.5">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : (
            cabanas.map(c => {
              const s = STATUS[c.estado]
              const isSelected = selected?.id === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => { setSelected(c); setSubView(null) }}
                  className={cn(
                    'w-full text-left px-3 py-3 flex items-center gap-3 border-l-4 border-b border-b-slate-100 transition-all',
                    s.leftBorder,
                    isSelected ? 'bg-teal-50' : 'hover:bg-slate-50'
                  )}
                >
                  {/* Thumbnail or number */}
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                    {c.imagen_url ? (
                      <Image src={c.imagen_url} alt={c.nombre} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-black text-slate-500">#{c.numero}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide leading-none">{s.label}</p>
                    <p className="text-sm font-bold text-slate-700 truncate mt-0.5">
                      {c.hospedaje_activo?.clientes?.nombre ?? c.nombre}
                    </p>
                  </div>
                  <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', s.dot)} />
                </button>
              )
            })
          )}
        </aside>

        {/* Right — detail panel */}
        <main className="flex-1 overflow-auto">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300">
              <BedDouble className="h-24 w-24" strokeWidth={1} />
              <p className="text-lg font-semibold text-slate-400">Selecciona una cabaña</p>
              <p className="text-sm text-slate-300">para gestionar reservaciones y estado</p>
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
            <div className="p-5 flex flex-col gap-4">
              {/* Cabin image */}
              <div className="group relative w-full h-44 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                {selected.imagen_url ? (
                  <Image src={selected.imagen_url} alt={selected.nombre} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
                    <BedDouble className="h-12 w-12" strokeWidth={1} />
                    <p className="text-xs font-semibold">Sin foto</p>
                  </div>
                )}
                {/* Upload overlay */}
                <button
                  onClick={() => photoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  {uploadingPhoto
                    ? <Loader2 className="h-8 w-8 text-white animate-spin" />
                    : <div className="flex flex-col items-center gap-1 text-white">
                        <Camera className="h-8 w-8" />
                        <span className="text-xs font-semibold">Cambiar foto</span>
                      </div>
                  }
                </button>
                <input ref={photoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />
              </div>

              {/* Cabin info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cabaña #{selected.numero}</p>
                    <h2 className="text-2xl font-black text-slate-900 mt-0.5">{selected.nombre}</h2>
                  </div>
                  <Badge variant={STATUS[selected.estado].badge} className="text-xs px-2.5 py-1">
                    {STATUS[selected.estado].label}
                  </Badge>
                </div>
                <div className="border-t border-slate-100 mt-3 pt-3">
                  {selected.hospedaje_activo ? (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
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
                      Cap. {selected.capacidad_max} personas · Q{selected.precio_adulto_noche.toFixed(0)}/adulto noche
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3">
                {ACTIONS.map(({ key, icon: Icon, label, colors }) => {
                  const disabled =
                    (key === 'checkin'  && selected.estado === 'ocupada') ||
                    (key === 'checkout' && !selected.hospedaje_activo) ||
                    (key === 'factura'  && !selected.hospedaje_activo)
                  return (
                    <button key={key} onClick={() => setSubView(key)} disabled={disabled}
                      className={cn('h-20 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 font-semibold text-sm transition-all active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed', colors)}
                    >
                      <Icon className="h-5 w-5" />
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
    </div>
  )
}
