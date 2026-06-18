'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Evento, ServicioCatalogo } from '@/types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  House, ArrowLeft, Plus, Users, Calendar, MapPin, Loader2, Trash2,
  ChevronRight, CalendarDays, DollarSign, Edit2, Settings, Check, X,
  Clock, AlertCircle, PackageSearch,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* ── Types ──────────────────────────────────────────────────── */
const ESTADO_CONFIG = {
  cotizacion: { label: 'Cotización', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200'    },
  en_curso:   { label: 'En Curso',   color: 'bg-amber-100 text-amber-700 border-amber-200' },
  completado: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-600 border-red-200'       },
} as const

type EstadoEvento = keyof typeof ESTADO_CONFIG
type View = 'list' | 'nuevo' | 'editar' | 'catalogo'

interface ServicioForm {
  catalogo_id: string
  nombre: string
  precio: number
  cantidad: number
}

/* ── Main page ──────────────────────────────────────────────── */
export default function EventosPage() {
  const router = useRouter()
  const [eventos,  setEventos]  = useState<Evento[]>([])
  const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([])
  const [view,     setView]     = useState<View>('list')
  const [selected, setSelected] = useState<Evento | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  // ── Form state ──────────────────────────────────────────────
  const [fNombre,       setFNombre]       = useState('')
  const [fTelefono,     setFTelefono]     = useState('')
  const [fFecha,        setFFecha]        = useState('')
  const [fHoraInicio,   setFHoraInicio]   = useState('')
  const [fHoraFin,      setFHoraFin]      = useState('')
  const [fInvitados,    setFInvitados]    = useState(0)
  const [fLugar,        setFLugar]        = useState('')
  const [fObservaciones,setFObservaciones]= useState('')
  const [fServicios,    setFServicios]    = useState<ServicioForm[]>([])
  const [fDescuento,    setFDescuento]    = useState(0)

  // ── Payment modal ───────────────────────────────────────────
  const [showPago, setShowPago] = useState(false)
  const [pagoEvento, setPagoEvento] = useState<Evento | null>(null)
  const [montoAnticipo, setMontoAnticipo] = useState('')

  const fetchEventos = useCallback(async () => {
    const { data } = await createClient()
      .from('eventos')
      .select('*, clientes(*), servicios_eventos(*)')
      .order('fecha_evento', { ascending: false })
      .limit(60)
    if (data) setEventos(data)
    setLoading(false)
  }, [])

  const fetchCatalogo = useCallback(async () => {
    const { data } = await createClient().from('servicios_catalogo').select('*').order('orden')
    if (data) setCatalogo(data)
  }, [])

  useEffect(() => { fetchEventos(); fetchCatalogo() }, [fetchEventos, fetchCatalogo])

  /* ── Form helpers ──────────────────────────────────────────── */
  function resetForm() {
    setFNombre(''); setFTelefono(''); setFFecha(''); setFHoraInicio(''); setFHoraFin('')
    setFInvitados(0); setFLugar(''); setFObservaciones(''); setFServicios([]); setFDescuento(0)
  }

  function openNuevo() { resetForm(); setView('nuevo') }

  function openEditar(evento: Evento) {
    setSelected(evento)
    setFNombre(evento.clientes?.nombre ?? '')
    setFTelefono((evento.clientes as any)?.telefono ?? '')
    setFFecha(evento.fecha_evento)
    setFHoraInicio(evento.hora_inicio ?? '')
    setFHoraFin(evento.hora_fin ?? '')
    setFInvitados(evento.invitados)
    setFLugar(evento.lugar ?? '')
    setFObservaciones(evento.observaciones ?? '')
    setFDescuento(evento.descuento ?? 0)
    setFServicios((evento.servicios_eventos ?? []).map(s => ({
      catalogo_id: s.catalogo_id ?? '',
      nombre: s.nombre,
      precio: s.precio_unitario,
      cantidad: s.cantidad,
    })))
    setView('editar')
  }

  function addServicio(s: ServicioCatalogo) {
    const existing = fServicios.find(x => x.catalogo_id === s.id)
    if (existing) {
      setFServicios(prev => prev.map(x => x.catalogo_id === s.id ? { ...x, cantidad: x.cantidad + 1 } : x))
    } else {
      setFServicios(prev => [...prev, { catalogo_id: s.id, nombre: s.nombre, precio: s.precio_base, cantidad: 1 }])
    }
  }

  function removeServicio(cid: string) { setFServicios(prev => prev.filter(s => s.catalogo_id !== cid)) }
  function updateServicioPrecio(cid: string, precio: number) {
    setFServicios(prev => prev.map(s => s.catalogo_id === cid ? { ...s, precio } : s))
  }
  function updateServicioCantidad(cid: string, cantidad: number) {
    if (cantidad <= 0) { removeServicio(cid); return }
    setFServicios(prev => prev.map(s => s.catalogo_id === cid ? { ...s, cantidad } : s))
  }

  const subtotal = fServicios.reduce((s, x) => s + x.precio * x.cantidad, 0)
  const total    = Math.max(0, subtotal - fDescuento)

  /* ── Create event ──────────────────────────────────────────── */
  async function handleCrear() {
    if (!fNombre.trim() || !fFecha) { toast.error('Nombre y fecha son obligatorios'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: cliente } = await supabase.from('clientes').insert({ nombre: fNombre.trim(), telefono: fTelefono, nit: 'CF' }).select('id').single()
    if (!cliente) { toast.error('Error al crear cliente'); setSaving(false); return }

    const { data: evento, error } = await supabase.from('eventos').insert({
      cliente_id: cliente.id, nombre_evento: `Evento de ${fNombre.trim()}`,
      fecha_evento: fFecha, hora_inicio: fHoraInicio || null, hora_fin: fHoraFin || null,
      invitados: fInvitados, lugar: fLugar, observaciones: fObservaciones,
      subtotal, descuento: fDescuento, total, saldo_pendiente: total,
    }).select('id').single()

    if (error || !evento) { toast.error('Error al crear evento'); setSaving(false); return }

    if (fServicios.length > 0) {
      await supabase.from('servicios_eventos').insert(
        fServicios.map(s => ({
          evento_id: evento.id, catalogo_id: s.catalogo_id || null,
          nombre: s.nombre, precio_unitario: s.precio, cantidad: s.cantidad, subtotal: s.precio * s.cantidad,
        }))
      )
    }

    toast.success('Evento creado')
    resetForm(); setView('list'); fetchEventos()
    setSaving(false)
  }

  /* ── Update event ──────────────────────────────────────────── */
  async function handleGuardar() {
    if (!selected || !fFecha) { toast.error('Fecha es obligatoria'); return }
    setSaving(true)
    const supabase = createClient()

    // Update client
    if (selected.cliente_id) {
      await supabase.from('clientes').update({ nombre: fNombre.trim(), telefono: fTelefono }).eq('id', selected.cliente_id)
    }

    // Update event
    await supabase.from('eventos').update({
      fecha_evento: fFecha, hora_inicio: fHoraInicio || null, hora_fin: fHoraFin || null,
      invitados: fInvitados, lugar: fLugar, observaciones: fObservaciones,
      subtotal, descuento: fDescuento, total,
      saldo_pendiente: Math.max(0, total - (selected.anticipo ?? 0)),
    }).eq('id', selected.id)

    // Replace services
    await supabase.from('servicios_eventos').delete().eq('evento_id', selected.id)
    if (fServicios.length > 0) {
      await supabase.from('servicios_eventos').insert(
        fServicios.map(s => ({
          evento_id: selected.id, catalogo_id: s.catalogo_id || null,
          nombre: s.nombre, precio_unitario: s.precio, cantidad: s.cantidad, subtotal: s.precio * s.cantidad,
        }))
      )
    }

    toast.success('Evento actualizado')
    resetForm(); setSelected(null); setView('list'); fetchEventos()
    setSaving(false)
  }

  /* ── Cobrar anticipo ───────────────────────────────────────── */
  async function handleCobrarAnticipo() {
    if (!pagoEvento) return
    const monto = parseFloat(montoAnticipo)
    if (!monto || monto <= 0) { toast.error('Monto inválido'); return }
    const supabase = createClient()
    const nuevo_anticipo = (pagoEvento.anticipo ?? 0) + monto
    const nuevo_saldo    = Math.max(0, pagoEvento.saldo_pendiente - monto)

    await supabase.from('eventos').update({ anticipo: nuevo_anticipo, saldo_pendiente: nuevo_saldo }).eq('id', pagoEvento.id)
    await supabase.from('movimientos_caja').insert({
      tipo: 'ingreso', concepto: `Anticipo Evento #${pagoEvento.numero_evento}`,
      monto, referencia_id: pagoEvento.id, referencia_tipo: 'evento',
    })

    toast.success(`Pago registrado: ${formatCurrency(monto)}`)
    setShowPago(false); setPagoEvento(null); setMontoAnticipo(''); fetchEventos()
  }

  /* ── Cambiar estado ────────────────────────────────────────── */
  async function handleEstado(evento: Evento, estado: EstadoEvento) {
    await createClient().from('eventos').update({ estado }).eq('id', evento.id)
    toast.success('Estado actualizado')
    fetchEventos()
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  )

  /* ── Shared form content ─────────────────────────────────────── */
  const FormContent = (
    <div className="space-y-5">
      {/* Client & dates */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4">Datos del Evento</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">Nombre del cliente *</Label>
            <Input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Nombre completo" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Teléfono</Label>
            <Input value={fTelefono} onChange={e => setFTelefono(e.target.value)} placeholder="5555-1234" className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Invitados</Label>
            <Input type="number" value={fInvitados || ''} onChange={e => setFInvitados(parseInt(e.target.value) || 0)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Fecha del evento *</Label>
            <Input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Lugar</Label>
            <Input value={fLugar} onChange={e => setFLugar(e.target.value)} placeholder="Salón, área..." className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Hora inicio</Label>
            <Input type="time" value={fHoraInicio} onChange={e => setFHoraInicio(e.target.value)} className="h-11" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Hora fin</Label>
            <Input type="time" value={fHoraFin} onChange={e => setFHoraFin(e.target.value)} className="h-11" />
          </div>
          <div className="col-span-2 space-y-1">
            <Label className="text-xs text-slate-500">Observaciones</Label>
            <Textarea value={fObservaciones} onChange={e => setFObservaciones(e.target.value)} className="min-h-[80px] resize-none" />
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4">Servicios</h3>

        {/* Catalog picker */}
        {catalogo.filter(s => s.activo).length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {catalogo.filter(s => s.activo).map(s => (
              <button
                key={s.id}
                onClick={() => addServicio(s)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-400 transition-all text-left active:scale-[0.97]"
              >
                <span className="text-sm font-semibold text-slate-700 truncate">{s.nombre}</span>
                <span className="text-sm font-black text-slate-600 flex-shrink-0 ml-2">{formatCurrency(s.precio_base)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected services */}
        {fServicios.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_100px_32px] gap-2 px-1 mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Servicio</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase text-center">Cant.</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase text-right">Precio unit.</p>
              <div />
            </div>
            {fServicios.map(s => (
              <div key={s.catalogo_id} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-center bg-slate-50 rounded-xl p-2.5">
                <p className="text-sm font-semibold text-slate-700 truncate">{s.nombre}</p>
                <Input
                  type="number" min="1" value={s.cantidad}
                  onChange={e => updateServicioCantidad(s.catalogo_id, parseInt(e.target.value) || 1)}
                  className="h-8 text-center text-sm font-bold"
                />
                <Input
                  type="number" step="0.01" min="0" value={s.precio}
                  onChange={e => updateServicioPrecio(s.catalogo_id, parseFloat(e.target.value) || 0)}
                  className="h-8 text-right text-sm font-bold"
                />
                <button onClick={() => removeServicio(s.catalogo_id)} className="h-8 w-8 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <Separator className="my-2" />
            <div className="space-y-1.5 px-1">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 flex-1">Descuento</span>
                <Input
                  type="number" step="0.01" min="0" value={fDescuento || ''}
                  onChange={e => setFDescuento(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-8 w-28 text-right text-sm"
                />
              </div>
              <div className="flex justify-between font-black text-lg pt-1">
                <span>Total</span>
                <span className="text-slate-800">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">Selecciona servicios del catálogo</p>
        )}
      </div>
    </div>
  )

  /* ── CATALOG VIEW ─────────────────────────────────────────── */
  if (view === 'catalogo') {
    return <CatalogoView catalogo={catalogo} onBack={() => { fetchCatalogo(); setView('list') }} />
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="bg-slate-800 text-white px-5 h-14 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => {
            if (view !== 'list') { resetForm(); setSelected(null); setView('list') }
            else router.push('/')
          }}
          className="w-11 h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96]"
        >
          {view === 'list' ? <House className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </button>
        <h1 className="text-base font-black flex-1">
          {view === 'list'   ? 'Eventos'
           : view === 'nuevo'  ? 'Nuevo Evento'
           : view === 'editar' ? `Editar Evento #${selected?.numero_evento}`
           : 'Catálogo de Servicios'}
        </h1>
        {view === 'list' && (
          <button
            onClick={() => setView('catalogo')}
            className="w-11 h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96]"
            title="Gestionar catálogo"
          >
            <Settings className="h-5 w-5 text-slate-300" />
          </button>
        )}
        {view === 'list' && (
          <button
            onClick={openNuevo}
            className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all active:scale-[0.96]"
            title="Nuevo evento"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </header>

      {/* ── LIST ────────────────────────────────────────────── */}
      {view === 'list' && (
        <main className="flex-1 overflow-auto p-4">
          {eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
              <CalendarDays className="h-16 w-16 text-slate-300" strokeWidth={1} />
              <p className="text-base font-semibold">Sin eventos registrados</p>
              <button onClick={openNuevo} className="h-12 px-6 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center gap-2 active:scale-[0.97] transition-all">
                <Plus className="h-4 w-4" /> Crear primer evento
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {eventos.map(evento => {
                const cfg = ESTADO_CONFIG[evento.estado as EstadoEvento] ?? ESTADO_CONFIG.cotizacion
                return (
                  <div
                    key={evento.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 flex items-start gap-4 hover:shadow-sm transition-all"
                  >
                    {/* Info */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="h-6 w-6 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-800">{evento.clientes?.nombre}</span>
                        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border', cfg.color)}>{cfg.label}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{formatDate(evento.fecha_evento)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />{evento.invitados} invitados
                        </span>
                        {evento.lugar && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{evento.lugar}
                          </span>
                        )}
                      </div>
                      {/* Estado quick-change */}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {(Object.keys(ESTADO_CONFIG) as EstadoEvento[]).map(e => (
                          <button
                            key={e}
                            onClick={() => handleEstado(evento, e)}
                            className={cn(
                              'text-[10px] font-bold px-2 py-1 rounded-lg border transition-all active:scale-[0.95]',
                              evento.estado === e
                                ? ESTADO_CONFIG[e].color
                                : 'border-slate-200 text-slate-400 hover:border-slate-300'
                            )}
                          >
                            {ESTADO_CONFIG[e].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="font-black text-slate-800 text-base">{formatCurrency(evento.total)}</p>
                      {evento.anticipo > 0 && (
                        <p className="text-xs text-emerald-600 font-semibold">+ {formatCurrency(evento.anticipo)} anticipo</p>
                      )}
                      {evento.saldo_pendiente > 0 && (
                        <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {formatCurrency(evento.saldo_pendiente)} saldo
                        </p>
                      )}
                      <div className="flex gap-1 mt-1">
                        {evento.saldo_pendiente > 0 && (
                          <button
                            onClick={() => { setPagoEvento(evento); setMontoAnticipo(''); setShowPago(true) }}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-[0.97]"
                          >
                            <DollarSign className="h-3 w-3" /> Cobrar
                          </button>
                        )}
                        <button
                          onClick={() => openEditar(evento)}
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-[0.97]"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* ── NUEVO / EDITAR ──────────────────────────────────── */}
      {(view === 'nuevo' || view === 'editar') && (
        <main className="flex-1 overflow-auto p-4">
          <div className="max-w-2xl mx-auto pb-6">
            {FormContent}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { resetForm(); setSelected(null); setView('list') }}
                className="flex-1 h-12 rounded-xl border border-slate-300 text-slate-600 font-semibold text-sm transition-all hover:bg-slate-50 active:scale-[0.97]"
              >
                Cancelar
              </button>
              <button
                onClick={view === 'nuevo' ? handleCrear : handleGuardar}
                disabled={saving}
                className="flex-1 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {view === 'nuevo' ? 'Crear Evento' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ── Payment modal ────────────────────────────────────── */}
      <Dialog open={showPago} onOpenChange={o => { if (!o) { setShowPago(false); setPagoEvento(null) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          {pagoEvento && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">{pagoEvento.clientes?.nombre}</p>
                <p className="text-xs">Evento #{pagoEvento.numero_evento} · {formatDate(pagoEvento.fecha_evento)}</p>
                <div className="mt-2 flex justify-between">
                  <span>Saldo pendiente:</span>
                  <span className="font-black text-red-600">{formatCurrency(pagoEvento.saldo_pendiente)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Monto a cobrar</Label>
                <Input
                  type="number" step="0.01" autoFocus
                  value={montoAnticipo}
                  onChange={e => setMontoAnticipo(e.target.value)}
                  placeholder={formatCurrency(pagoEvento.saldo_pendiente)}
                  className="h-14 text-2xl font-black text-center"
                />
                <button
                  onClick={() => setMontoAnticipo(String(pagoEvento.saldo_pendiente))}
                  className="w-full text-xs text-slate-400 hover:text-slate-600 py-1"
                >
                  Cobrar total: {formatCurrency(pagoEvento.saldo_pendiente)}
                </button>
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => { setShowPago(false); setPagoEvento(null) }}
              className="h-11 px-5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button onClick={handleCobrarAnticipo}
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all active:scale-[0.97] flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Registrar Pago
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Catalog management view ────────────────────────────────── */
function CatalogoView({ catalogo, onBack }: { catalogo: ServicioCatalogo[]; onBack: () => void }) {
  const [items, setItems] = useState<ServicioCatalogo[]>(catalogo)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [addingSaving, setAddingSaving] = useState(false)

  function startEdit(s: ServicioCatalogo) {
    setEditingId(s.id)
    setEditNombre(s.nombre)
    setEditPrecio(String(s.precio_base))
  }

  async function saveEdit(s: ServicioCatalogo) {
    const precio = parseFloat(editPrecio)
    if (!editNombre.trim() || isNaN(precio)) { toast.error('Datos inválidos'); return }
    setSaving(s.id)
    const { error } = await createClient().from('servicios_catalogo')
      .update({ nombre: editNombre.trim(), precio_base: precio }).eq('id', s.id)
    if (error) { toast.error('Error al guardar'); setSaving(null); return }
    setItems(prev => prev.map(x => x.id === s.id ? { ...x, nombre: editNombre.trim(), precio_base: precio } : x))
    setEditingId(null)
    setSaving(null)
    toast.success('Servicio actualizado')
  }

  async function toggleActivo(s: ServicioCatalogo) {
    await createClient().from('servicios_catalogo').update({ activo: !s.activo }).eq('id', s.id)
    setItems(prev => prev.map(x => x.id === s.id ? { ...x, activo: !x.activo } : x))
    toast.success(s.activo ? 'Servicio desactivado' : 'Servicio activado')
  }

  async function handleAgregar() {
    const precio = parseFloat(nuevoPrecio)
    if (!nuevoNombre.trim() || isNaN(precio)) { toast.error('Nombre y precio requeridos'); return }
    setAddingSaving(true)
    const { data, error } = await createClient().from('servicios_catalogo').insert({
      nombre: nuevoNombre.trim(), precio_base: precio, activo: true, orden: items.length,
    }).select().single()
    if (error || !data) { toast.error('Error al agregar'); setAddingSaving(false); return }
    setItems(prev => [...prev, data])
    setNuevoNombre(''); setNuevoPrecio(''); setShowNuevo(false)
    toast.success('Servicio agregado')
    setAddingSaving(false)
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      <header className="bg-slate-800 text-white px-5 h-14 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <PackageSearch className="h-5 w-5 text-slate-300" />
        <h1 className="text-base font-black flex-1">Catálogo de Servicios</h1>
        <button
          onClick={() => setShowNuevo(true)}
          className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all active:scale-[0.96]"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Add new */}
          {showNuevo && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-4 space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase">Nuevo servicio</p>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Input placeholder="Nombre del servicio" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="h-11" />
                <Input type="number" step="0.01" placeholder="Precio Q" value={nuevoPrecio} onChange={e => setNuevoPrecio(e.target.value)} className="h-11" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAgregar} disabled={addingSaving}
                  className="h-10 px-5 rounded-xl bg-slate-800 text-white text-sm font-black flex items-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-all">
                  {addingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Agregar
                </button>
                <button onClick={() => { setShowNuevo(false); setNuevoNombre(''); setNuevoPrecio('') }}
                  className="h-10 px-4 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 active:scale-[0.97] transition-all">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {items.length === 0 && !showNuevo && (
            <div className="bg-white rounded-2xl border p-12 text-center text-slate-400">
              <PackageSearch className="h-12 w-12 mx-auto mb-3 text-slate-300" strokeWidth={1} />
              <p className="font-semibold">Sin servicios en el catálogo</p>
              <button onClick={() => setShowNuevo(true)} className="mt-3 text-sm text-slate-600 underline">Agregar primero</button>
            </div>
          )}

          {items.map(s => (
            <div key={s.id} className={cn(
              'bg-white rounded-2xl border p-4 flex items-center gap-3 transition-all',
              !s.activo && 'opacity-50'
            )}>
              {editingId === s.id ? (
                <>
                  <div className="flex-1 grid grid-cols-[1fr_120px] gap-2">
                    <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="h-10" />
                    <Input type="number" step="0.01" value={editPrecio} onChange={e => setEditPrecio(e.target.value)} className="h-10" />
                  </div>
                  <button onClick={() => saveEdit(s)} disabled={saving === s.id}
                    className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center flex-shrink-0 active:scale-[0.97] transition-all disabled:opacity-50">
                    {saving === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setEditingId(null)}
                    className="h-10 w-10 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0 active:scale-[0.97] transition-all">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-bold text-slate-800', !s.activo && 'line-through text-slate-400')}>{s.nombre}</p>
                    {s.descripcion && <p className="text-xs text-slate-400 truncate">{s.descripcion}</p>}
                  </div>
                  <p className="font-black text-slate-700 flex-shrink-0">{formatCurrency(s.precio_base)}</p>
                  <button onClick={() => startEdit(s)}
                    className="h-9 w-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 active:scale-[0.97] transition-all">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => toggleActivo(s)}
                    className={cn(
                      'h-9 px-3 rounded-lg text-xs font-bold flex-shrink-0 active:scale-[0.97] transition-all',
                      s.activo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
