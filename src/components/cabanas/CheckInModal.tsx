'use client'

import { useState } from 'react'
import { Cabana } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Moon, Sun } from 'lucide-react'

interface CheckInModalProps {
  cabana: Cabana
  open: boolean
  onBack: () => void
  onDone: () => void
}

export default function CheckInModal({ cabana, open, onBack, onDone }: CheckInModalProps) {
  const [tipo, setTipo] = useState<'noche' | 'dia'>('noche')
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nit, setNit] = useState('CF')
  const [adultos, setAdultos] = useState(1)
  const [ninos, setNinos] = useState(0)
  const [bebes, setBebes] = useState(0)
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const precioAdulto = tipo === 'noche' ? cabana.precio_adulto_noche : cabana.precio_dia_base
  const precioNino = tipo === 'noche' ? cabana.precio_nino_noche : cabana.precio_dia_adicional

  const subtotalNoche = tipo === 'noche'
    ? adultos * cabana.precio_adulto_noche + ninos * cabana.precio_nino_noche
    : cabana.precio_dia_base + (adultos + ninos - 2 > 0 ? (adultos + ninos - 2) * cabana.precio_dia_adicional : 0)

  const ahora = new Date()
  const checkIn = tipo === 'noche'
    ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 14, 0)
    : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 8, 0)

  const checkOut = tipo === 'noche'
    ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 12, 0)
    : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 18, 0)

  async function handleCheckIn() {
    if (!nombre.trim()) { toast.error('Ingresa el nombre del huésped'); return }
    if (adultos < 1) { toast.error('Mínimo 1 adulto'); return }
    setLoading(true)

    const supabase = createClient()

    // 1. Crear o buscar cliente
    let clienteId: string
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .ilike('nombre', nombre.trim())
      .limit(1)
      .single()

    if (clienteExistente) {
      clienteId = clienteExistente.id
    } else {
      const { data: nuevoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert({ nombre: nombre.trim(), telefono, nit })
        .select('id')
        .single()

      if (errCliente || !nuevoCliente) {
        toast.error('Error al registrar cliente')
        setLoading(false)
        return
      }
      clienteId = nuevoCliente.id
    }

    // 2. Crear hospedaje
    const { error: errHosp } = await supabase.from('hospedajes').insert({
      cabana_id: cabana.id,
      cliente_id: clienteId,
      tipo,
      fecha_entrada: checkIn.toISOString(),
      fecha_salida: tipo === 'dia' ? checkOut.toISOString() : null,
      adultos,
      ninos,
      bebes,
      precio_adulto: tipo === 'noche' ? cabana.precio_adulto_noche : cabana.precio_dia_base,
      precio_nino: tipo === 'noche' ? cabana.precio_nino_noche : cabana.precio_dia_adicional,
      subtotal: subtotalNoche,
      notas,
    })

    if (errHosp) {
      toast.error('Error al registrar hospedaje')
      setLoading(false)
      return
    }

    // 3. Cambiar estado de cabaña a ocupada
    await supabase.from('cabanas').update({ estado: 'ocupada' }).eq('id', cabana.id)

    // 4. Movimiento de caja
    await supabase.from('movimientos_caja').insert({
      tipo: 'ingreso',
      concepto: `Check-in Cabaña #${cabana.numero} - ${nombre}`,
      monto: subtotalNoche,
      referencia_tipo: 'hospedaje',
    })

    toast.success(`Check-in realizado · ${formatCurrency(subtotalNoche)}`)
    setLoading(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onBack() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check In · Cabaña #{cabana.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipo de hospedaje */}
          <div>
            <Label className="mb-2 block">Tipo de hospedaje</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={tipo === 'noche' ? 'default' : 'outline'}
                size="lg"
                className="h-14 rounded-xl flex-col gap-0.5"
                onClick={() => setTipo('noche')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Noche (2PM–12PM)</span>
              </Button>
              <Button
                variant={tipo === 'dia' ? 'default' : 'outline'}
                size="lg"
                className="h-14 rounded-xl flex-col gap-0.5"
                onClick={() => setTipo('dia')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Día (8AM–6PM)</span>
              </Button>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nombre del huésped *</Label>
              <Input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input placeholder="5555-1234" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>NIT</Label>
              <Input placeholder="CF" value={nit} onChange={e => setNit(e.target.value)} />
            </div>
          </div>

          {/* Personas */}
          <div>
            <Label className="mb-2 block">Personas</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: `Adultos (${formatCurrency(tipo === 'noche' ? cabana.precio_adulto_noche : cabana.precio_dia_base)})`, val: adultos, set: setAdultos, min: 1 },
                { label: `Niños 3-8 (${formatCurrency(tipo === 'noche' ? cabana.precio_nino_noche : cabana.precio_dia_adicional)})`, val: ninos, set: setNinos, min: 0 },
                { label: 'Bebés <3 (Gratis)', val: bebes, set: setBebes, min: 0 },
              ].map(({ label, val, set, min }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs leading-tight">{label}</Label>
                  <div className="flex items-center border rounded-xl overflow-hidden h-12">
                    <button
                      className="flex-1 text-xl font-bold hover:bg-slate-100 transition-colors h-full disabled:opacity-30"
                      onClick={() => set(Math.max(min, val - 1))}
                      disabled={val <= min}
                    >−</button>
                    <span className="w-10 text-center font-bold text-lg">{val}</span>
                    <button
                      className="flex-1 text-xl font-bold hover:bg-slate-100 transition-colors h-full disabled:opacity-30"
                      onClick={() => set(Math.min(cabana.capacidad_max, val + 1))}
                      disabled={adultos + ninos + bebes >= cabana.capacidad_max}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Textarea placeholder="Observaciones del check-in..." value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[70px]" />
          </div>

          {/* Total */}
          <div className="rounded-2xl bg-slate-50 p-4 border">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>{adultos} adulto{adultos > 1 ? 's' : ''}</span>
              <span>{formatCurrency(adultos * (tipo === 'noche' ? cabana.precio_adulto_noche : cabana.precio_dia_base))}</span>
            </div>
            {ninos > 0 && (
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{ninos} niño{ninos > 1 ? 's' : ''}</span>
                <span>{formatCurrency(ninos * (tipo === 'noche' ? cabana.precio_nino_noche : cabana.precio_dia_adicional))}</span>
              </div>
            )}
            {bebes > 0 && (
              <div className="flex justify-between text-sm text-slate-600 mb-1">
                <span>{bebes} bebé{bebes > 1 ? 's' : ''} (gratis)</span>
                <span>Q0.00</span>
              </div>
            )}
            <div className="border-t mt-2 pt-2 flex justify-between font-black text-lg">
              <span>TOTAL</span>
              <span className="text-blue-600">{formatCurrency(subtotalNoche)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onBack} disabled={loading}>Cancelar</Button>
          <Button size="lg" onClick={handleCheckIn} disabled={loading} className="px-8">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
