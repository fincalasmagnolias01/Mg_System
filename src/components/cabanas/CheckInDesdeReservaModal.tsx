'use client'

import { useState } from 'react'
import { Reserva } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Loader2, Calendar, Users, BedDouble } from 'lucide-react'

interface CheckInDesdeReservaModalProps {
  reserva: Reserva
  open: boolean
  onClose: () => void
  onDone: () => void
}

export default function CheckInDesdeReservaModal({ reserva, open, onClose, onDone }: CheckInDesdeReservaModalProps) {
  const [nit, setNit] = useState('CF')
  const [notas, setNotas] = useState(reserva.notas ?? '')
  const [loading, setLoading] = useState(false)

  const cabana = reserva.cabanas!
  const cliente = reserva.clientes!

  const precioAdulto = cabana.precio_adulto_noche
  const precioNino = cabana.precio_nino_noche
  const subtotal = reserva.adultos * precioAdulto + reserva.ninos * precioNino
  const saldoPendiente = subtotal - (reserva.anticipo ?? 0)

  async function handleCheckIn() {
    setLoading(true)
    const supabase = createClient()

    // Actualizar NIT del cliente si se ingresó
    if (nit !== 'CF') {
      await supabase.from('clientes').update({ nit }).eq('id', cliente.id)
    }

    // Crear hospedaje vinculado a la reserva
    const { error: errHosp } = await supabase.from('hospedajes').insert({
      cabana_id: cabana.id,
      reserva_id: reserva.id,
      cliente_id: cliente.id,
      tipo: 'noche',
      fecha_entrada: new Date().toISOString(),
      fecha_salida: reserva.fecha_salida,
      adultos: reserva.adultos,
      ninos: reserva.ninos,
      bebes: reserva.bebes,
      precio_adulto: precioAdulto,
      precio_nino: precioNino,
      subtotal,
      notas,
    })

    if (errHosp) { toast.error('Error al registrar el hospedaje'); setLoading(false); return }

    // Marcar reserva como completada
    await supabase.from('reservas').update({ estado: 'completada' }).eq('id', reserva.id)

    // Cambiar cabaña a ocupada
    await supabase.from('cabanas').update({ estado: 'ocupada' }).eq('id', cabana.id)

    // Movimiento de caja por el anticipo ya cobrado (si hay)
    if (reserva.anticipo > 0) {
      await supabase.from('movimientos_caja').insert({
        tipo: 'ingreso',
        concepto: `Anticipo reserva #${reserva.numero_reserva} - Check-in Cabaña #${cabana.numero}`,
        monto: reserva.anticipo,
        referencia_tipo: 'hospedaje',
      })
    }

    toast.success(`Check-in realizado · ${cliente.nombre}`)
    setLoading(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check In desde Reserva #{reserva.numero_reserva}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info de la reserva */}
          <div className="rounded-2xl bg-slate-50 border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-slate-400" />
              <span className="font-bold text-slate-900">
                Cabaña #{cabana.numero} — {cabana.nombre}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDate(reserva.fecha_entrada)} → {formatDate(reserva.fecha_salida)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>
                  {reserva.adultos} adulto{reserva.adultos !== 1 ? 's' : ''}
                  {reserva.ninos > 0 && `, ${reserva.ninos} niño${reserva.ninos !== 1 ? 's' : ''}`}
                  {reserva.bebes > 0 && `, ${reserva.bebes} bebé${reserva.bebes !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Datos del cliente (solo lectura) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Huésped</Label>
              <Input value={cliente.nombre} readOnly className="bg-slate-50 text-slate-700 font-semibold" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={cliente.telefono ?? '—'} readOnly className="bg-slate-50 text-slate-500" />
            </div>
            <div className="space-y-1">
              <Label>NIT</Label>
              <Input placeholder="CF" value={nit} onChange={e => setNit(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas adicionales</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[60px]" placeholder="Observaciones del check-in..." />
          </div>

          {/* Resumen financiero */}
          <div className="rounded-2xl border p-4 space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{reserva.adultos} adulto{reserva.adultos !== 1 ? 's' : ''} × {formatCurrency(precioAdulto)}</span>
              <span>{formatCurrency(reserva.adultos * precioAdulto)}</span>
            </div>
            {reserva.ninos > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>{reserva.ninos} niño{reserva.ninos !== 1 ? 's' : ''} × {formatCurrency(precioNino)}</span>
                <span>{formatCurrency(reserva.ninos * precioNino)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-bold text-slate-800">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {reserva.anticipo > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Anticipo pagado</span>
                <span>− {formatCurrency(reserva.anticipo)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-black text-lg">
              <span>SALDO PENDIENTE</span>
              <span className={saldoPendiente > 0 ? 'text-blue-600' : 'text-emerald-600'}>
                {formatCurrency(saldoPendiente)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button size="lg" onClick={handleCheckIn} disabled={loading} className="px-8">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmar Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
