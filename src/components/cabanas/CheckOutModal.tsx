'use client'

import { useState } from 'react'
import { Cabana, Hospedaje } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Loader2, Users, Calendar, CheckCircle2 } from 'lucide-react'

interface CheckOutModalProps {
  cabana: Cabana
  hospedaje: Hospedaje
  open: boolean
  onBack: () => void
  onDone: () => void
}

export default function CheckOutModal({ cabana, hospedaje, open, onBack, onDone }: CheckOutModalProps) {
  const [loading, setLoading] = useState(false)

  if (!hospedaje) return null

  const total = hospedaje.subtotal

  async function handleCheckOut() {
    setLoading(true)
    const supabase = createClient()
    const ahora = new Date().toISOString()

    // 1. Cerrar hospedaje
    const { error } = await supabase
      .from('hospedajes')
      .update({ estado: 'checkout', fecha_salida: ahora })
      .eq('id', hospedaje.id)

    if (error) { toast.error('Error al procesar checkout'); setLoading(false); return }

    // 2. Cambiar cabaña a limpieza
    await supabase.from('cabanas').update({ estado: 'limpieza' }).eq('id', cabana.id)

    // 3. Crear factura
    const { data: factura } = await supabase.from('facturas').insert({
      tipo: 'hospedaje',
      referencia_id: hospedaje.id,
      cliente_id: hospedaje.cliente_id,
      nit: hospedaje.clientes?.nit ?? 'CF',
      nombre_factura: hospedaje.clientes?.nombre ?? 'Consumidor Final',
      subtotal: total,
      total,
    }).select('id').single()

    // 4. Registrar pago
    if (factura) {
      await supabase.from('pagos').insert({
        factura_id: factura.id,
        forma_pago: 'efectivo',
        detalle_pago: { efectivo: total },
        monto: total,
      })

      await supabase.from('movimientos_caja').insert({
        tipo: 'ingreso',
        concepto: `Check-out Cabaña #${cabana.numero} - ${hospedaje.clientes?.nombre}`,
        monto: total,
        referencia_id: factura.id,
        referencia_tipo: 'factura',
      })
    }

    toast.success('Check-out completado · Cabaña en limpieza')
    setLoading(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onBack() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out · Cabaña #{cabana.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Guest info */}
          <div className="rounded-2xl bg-slate-50 p-4 border space-y-3">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-bold text-lg">{hospedaje.clientes?.nombre}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Entrada: {formatDateTime(hospedaje.fecha_entrada)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{hospedaje.adultos} adultos, {hospedaje.ninos} niños, {hospedaje.bebes} bebés</span>
              </div>
            </div>
          </div>

          {/* Factura resumen */}
          <div className="rounded-2xl border p-4 space-y-2">
            <h4 className="font-bold text-slate-700">Resumen de Factura</h4>
            <div className="flex justify-between text-sm">
              <span>{hospedaje.adultos} adulto{hospedaje.adultos > 1 ? 's' : ''} × {formatCurrency(hospedaje.precio_adulto)}</span>
              <span>{formatCurrency(hospedaje.adultos * hospedaje.precio_adulto)}</span>
            </div>
            {hospedaje.ninos > 0 && (
              <div className="flex justify-between text-sm">
                <span>{hospedaje.ninos} niño{hospedaje.ninos > 1 ? 's' : ''} × {formatCurrency(hospedaje.precio_nino)}</span>
                <span>{formatCurrency(hospedaje.ninos * hospedaje.precio_nino)}</span>
              </div>
            )}
            {hospedaje.bebes > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>{hospedaje.bebes} bebé{hospedaje.bebes > 1 ? 's' : ''} (gratis)</span>
                <span>Q0.00</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-black text-xl">
              <span>TOTAL</span>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center">
            La cabaña pasará a estado <strong>Limpieza</strong> automáticamente.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onBack} disabled={loading}>Volver</Button>
          <Button size="lg" onClick={handleCheckOut} disabled={loading} className="bg-red-600 hover:bg-red-700 px-8">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
