'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Evento, ServicioCatalogo } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Users, Calendar, MapPin, Loader2, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const ESTADO_CONFIG = {
  cotizacion:  { label: 'Cotización',  variant: 'muted' as const,       color: 'text-gray-600' },
  confirmado:  { label: 'Confirmado',  variant: 'info' as const,        color: 'text-blue-600' },
  en_curso:    { label: 'En Curso',    variant: 'warning' as const,     color: 'text-yellow-600' },
  completado:  { label: 'Completado',  variant: 'success' as const,     color: 'text-green-600' },
  cancelado:   { label: 'Cancelado',   variant: 'destructive' as const, color: 'text-red-600' },
}

type ModalView = 'list' | 'nuevo' | 'detalle'

export default function EventosPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<Evento[]>([])
  const [catalogo, setCatalogo] = useState<ServicioCatalogo[]>([])
  const [view, setView] = useState<ModalView>('list')
  const [selected, setSelected] = useState<Evento | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Nuevo evento
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [invitados, setInvitados] = useState(0)
  const [lugar, setLugar] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [servicios, setServicios] = useState<{ catalogo_id: string; nombre: string; precio: number; cantidad: number }[]>([])

  const fetchEventos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('eventos')
      .select('*, clientes(*), servicios_eventos(*)')
      .order('fecha_evento', { ascending: false })
      .limit(50)
    if (data) setEventos(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEventos()
    createClient().from('servicios_catalogo').select('*').eq('activo', true).order('orden')
      .then(({ data }) => { if (data) setCatalogo(data) })
  }, [fetchEventos])

  function resetForm() {
    setNombre(''); setTelefono(''); setFecha(''); setHoraInicio(''); setHoraFin('')
    setInvitados(0); setLugar(''); setObservaciones(''); setServicios([])
  }

  function addServicio(s: ServicioCatalogo) {
    const existing = servicios.find(x => x.catalogo_id === s.id)
    if (existing) {
      setServicios(prev => prev.map(x => x.catalogo_id === s.id ? { ...x, cantidad: x.cantidad + 1 } : x))
    } else {
      setServicios(prev => [...prev, { catalogo_id: s.id, nombre: s.nombre, precio: s.precio_base, cantidad: 1 }])
    }
  }

  function removeServicio(id: string) {
    setServicios(prev => prev.filter(s => s.catalogo_id !== id))
  }

  const subtotalEventos = servicios.reduce((s, x) => s + x.precio * x.cantidad, 0)

  async function handleCrearEvento() {
    if (!nombre || !fecha) { toast.error('Nombre del cliente y fecha son obligatorios'); return }
    setSaving(true)

    const supabase = createClient()
    const { data: cliente } = await supabase
      .from('clientes')
      .insert({ nombre, telefono, nit: 'CF' })
      .select('id').single()

    if (!cliente) { toast.error('Error al crear cliente'); setSaving(false); return }

    const { data: evento, error } = await supabase.from('eventos').insert({
      cliente_id: cliente.id,
      nombre_evento: `Evento de ${nombre}`,
      fecha_evento: fecha,
      hora_inicio: horaInicio || null,
      hora_fin: horaFin || null,
      invitados,
      lugar,
      observaciones,
      subtotal: subtotalEventos,
      total: subtotalEventos,
      saldo_pendiente: subtotalEventos,
    }).select('id').single()

    if (error || !evento) { toast.error('Error al crear evento'); setSaving(false); return }

    if (servicios.length > 0) {
      await supabase.from('servicios_eventos').insert(
        servicios.map(s => ({
          evento_id: evento.id,
          catalogo_id: s.catalogo_id,
          nombre: s.nombre,
          precio_unitario: s.precio,
          cantidad: s.cantidad,
          subtotal: s.precio * s.cantidad,
        }))
      )
    }

    toast.success('Evento creado correctamente')
    resetForm()
    setView('list')
    fetchEventos()
    setSaving(false)
  }

  async function handleCambiarEstado(eventoId: string, nuevoEstado: string) {
    await createClient().from('eventos').update({ estado: nuevoEstado }).eq('id', eventoId)
    toast.success('Estado actualizado')
    fetchEventos()
    setSelected(null)
    setView('list')
  }

  async function handleCobrarAnticipo(eventoId: string, monto: number) {
    const supabase = createClient()
    const evento = eventos.find(e => e.id === eventoId)
    if (!evento) return

    await supabase.from('eventos').update({
      anticipo: evento.anticipo + monto,
      saldo_pendiente: Math.max(0, evento.saldo_pendiente - monto),
    }).eq('id', eventoId)

    await supabase.from('movimientos_caja').insert({
      tipo: 'ingreso',
      concepto: `Anticipo Evento #${evento.numero_evento}`,
      monto,
      referencia_id: eventoId,
      referencia_tipo: 'evento',
    })

    toast.success(`Anticipo registrado: ${formatCurrency(monto)}`)
    fetchEventos()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { if (view !== 'list') setView('list'); else router.push('/') }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-black text-slate-800">
              {view === 'list' ? '🎉 Eventos' : view === 'nuevo' ? 'Nuevo Evento' : `Evento #${selected?.numero_evento}`}
            </h1>
          </div>
          {view === 'list' && (
            <Button onClick={() => setView('nuevo')} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Nuevo Evento
            </Button>
          )}
        </div>
      </header>

      {/* LIST VIEW */}
      {view === 'list' && (
        <main className="flex-1 p-6">
          {eventos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <span className="text-6xl mb-4">🎉</span>
              <p className="text-lg font-semibold">Sin eventos registrados</p>
              <Button className="mt-4" onClick={() => setView('nuevo')}>Crear primer evento</Button>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {eventos.map(evento => {
                const cfg = ESTADO_CONFIG[evento.estado]
                return (
                  <button
                    key={evento.id}
                    onClick={() => { setSelected(evento); setView('detalle') }}
                    className="w-full bg-white rounded-2xl border p-4 text-left hover:shadow-md transition-all active:scale-[0.99] flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-xl bg-violet-50 flex items-center justify-center text-2xl flex-shrink-0">
                      🎉
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-slate-800">{evento.clientes?.nombre}</span>
                        <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(evento.fecha_evento)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {evento.invitados} invitados
                        </span>
                        {evento.lugar && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {evento.lugar}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-slate-800">{formatCurrency(evento.total)}</p>
                      {evento.saldo_pendiente > 0 && (
                        <p className="text-xs text-red-500">Saldo: {formatCurrency(evento.saldo_pendiente)}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                )
              })}
            </div>
          )}
        </main>
      )}

      {/* NUEVO EVENTO */}
      {view === 'nuevo' && (
        <main className="flex-1 p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <h3 className="font-bold text-slate-700">Datos del cliente</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Nombre del cliente *</Label>
                  <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="5555-1234" />
                </div>
                <div className="space-y-1">
                  <Label>Invitados</Label>
                  <Input type="number" value={invitados} onChange={e => setInvitados(parseInt(e.target.value) || 0)} />
                </div>
                <div className="space-y-1">
                  <Label>Fecha del evento *</Label>
                  <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Lugar</Label>
                  <Input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Salón principal..." />
                </div>
                <div className="space-y-1">
                  <Label>Hora inicio</Label>
                  <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Hora fin</Label>
                  <Input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label>Observaciones</Label>
                  <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} className="min-h-[80px]" />
                </div>
              </div>
            </div>

            {/* Servicios */}
            <div className="bg-white rounded-2xl border p-6 space-y-4">
              <h3 className="font-bold text-slate-700">Servicios</h3>
              <div className="grid grid-cols-2 gap-2">
                {catalogo.map(s => (
                  <button
                    key={s.id}
                    onClick={() => addServicio(s)}
                    className="flex items-center justify-between p-3 rounded-xl border hover:bg-violet-50 hover:border-violet-300 transition-all text-left"
                  >
                    <span className="text-sm font-semibold">{s.nombre}</span>
                    <span className="text-sm font-black text-violet-600">{formatCurrency(s.precio_base)}</span>
                  </button>
                ))}
              </div>

              {servicios.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  {servicios.map(s => (
                    <div key={s.catalogo_id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{s.nombre}</p>
                        <p className="text-xs text-slate-500">{s.cantidad} × {formatCurrency(s.precio)}</p>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(s.precio * s.cantidad)}</span>
                      <button onClick={() => removeServicio(s.catalogo_id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-black text-lg">
                    <span>Total</span>
                    <span className="text-violet-600">{formatCurrency(subtotalEventos)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1" onClick={() => { resetForm(); setView('list') }}>
                Cancelar
              </Button>
              <Button size="lg" className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={handleCrearEvento} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Crear Evento
              </Button>
            </div>
          </div>
        </main>
      )}

      {/* DETALLE EVENTO */}
      {view === 'detalle' && selected && (
        <EventoDetalle
          evento={selected}
          onBack={() => { setSelected(null); setView('list') }}
          onCambiarEstado={handleCambiarEstado}
          onCobrarAnticipo={handleCobrarAnticipo}
          onRefresh={fetchEventos}
        />
      )}
    </div>
  )
}

function EventoDetalle({ evento, onBack, onCambiarEstado, onCobrarAnticipo, onRefresh }: {
  evento: Evento
  onBack: () => void
  onCambiarEstado: (id: string, estado: string) => void
  onCobrarAnticipo: (id: string, monto: number) => void
  onRefresh: () => void
}) {
  const [anticipo, setAnticipo] = useState('')
  const [showAnticipo, setShowAnticipo] = useState(false)
  const cfg = ESTADO_CONFIG[evento.estado]

  return (
    <main className="flex-1 p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Info */}
        <div className="bg-white rounded-2xl border p-6 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-800">{evento.clientes?.nombre}</h2>
              <p className="text-slate-500 text-sm">{evento.nombre_evento}</p>
            </div>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-400">Fecha:</span> <span className="font-semibold">{formatDate(evento.fecha_evento)}</span></div>
            <div><span className="text-slate-400">Invitados:</span> <span className="font-semibold">{evento.invitados}</span></div>
            {evento.hora_inicio && <div><span className="text-slate-400">Hora:</span> <span className="font-semibold">{evento.hora_inicio} – {evento.hora_fin}</span></div>}
            {evento.lugar && <div><span className="text-slate-400">Lugar:</span> <span className="font-semibold">{evento.lugar}</span></div>}
          </div>
        </div>

        {/* Servicios */}
        {evento.servicios_eventos && evento.servicios_eventos.length > 0 && (
          <div className="bg-white rounded-2xl border p-6 space-y-2">
            <h3 className="font-bold text-slate-700 mb-3">Servicios</h3>
            {evento.servicios_eventos.map(s => (
              <div key={s.id} className="flex justify-between text-sm">
                <span>{s.cantidad}× {s.nombre}</span>
                <span className="font-semibold">{formatCurrency(s.subtotal)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-black text-base">
              <span>Total</span>
              <span>{formatCurrency(evento.total)}</span>
            </div>
            {evento.anticipo > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Anticipo pagado</span>
                <span>-{formatCurrency(evento.anticipo)}</span>
              </div>
            )}
            {evento.saldo_pendiente > 0 && (
              <div className="flex justify-between font-bold text-red-600">
                <span>Saldo pendiente</span>
                <span>{formatCurrency(evento.saldo_pendiente)}</span>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3">
          {evento.saldo_pendiente > 0 && (
            <Button
              size="lg"
              className="h-16 col-span-2 bg-green-600 hover:bg-green-700 rounded-2xl text-base font-bold"
              onClick={() => setShowAnticipo(true)}
            >
              💰 Cobrar Anticipo / Saldo
            </Button>
          )}
          {(['cotizacion', 'confirmado', 'en_curso', 'completado', 'cancelado'] as const).map(estado => (
            <Button
              key={estado}
              variant={evento.estado === estado ? 'default' : 'outline'}
              className="h-14 rounded-xl text-sm"
              onClick={() => onCambiarEstado(evento.id, estado)}
            >
              {ESTADO_CONFIG[estado].label}
            </Button>
          ))}
        </div>

        <Dialog open={showAnticipo} onOpenChange={setShowAnticipo}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Cobrar Anticipo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Monto a cobrar</Label>
              <Input
                type="number"
                value={anticipo}
                onChange={e => setAnticipo(e.target.value)}
                placeholder={formatCurrency(evento.saldo_pendiente)}
                className="text-2xl font-bold h-16 text-center"
                autoFocus
              />
              <p className="text-xs text-slate-400 text-center">Saldo pendiente: {formatCurrency(evento.saldo_pendiente)}</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowAnticipo(false)}>Cancelar</Button>
              <Button size="lg" onClick={() => {
                onCobrarAnticipo(evento.id, parseFloat(anticipo) || 0)
                setAnticipo('')
                setShowAnticipo(false)
              }} className="bg-green-600 hover:bg-green-700 px-8">
                Registrar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
