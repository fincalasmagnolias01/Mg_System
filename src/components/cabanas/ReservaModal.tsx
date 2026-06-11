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
import { Loader2 } from 'lucide-react'

interface ReservaModalProps {
  cabana: Cabana
  open: boolean
  onBack: () => void
  onDone: () => void
}

export default function ReservaModal({ cabana, open, onBack, onDone }: ReservaModalProps) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fechaEntrada, setFechaEntrada] = useState('')
  const [fechaSalida, setFechaSalida] = useState('')
  const [adultos, setAdultos] = useState(1)
  const [ninos, setNinos] = useState(0)
  const [bebes, setBebes] = useState(0)
  const [anticipo, setAnticipo] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const subtotal = adultos * cabana.precio_adulto_noche + ninos * cabana.precio_nino_noche

  async function handleReservar() {
    if (!nombre || !fechaEntrada || !fechaSalida) {
      toast.error('Completa los campos obligatorios')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data: cliente } = await supabase
      .from('clientes')
      .insert({ nombre, telefono, nit: 'CF' })
      .select('id')
      .single()

    if (!cliente) { toast.error('Error al registrar cliente'); setLoading(false); return }

    const entrada = new Date(`${fechaEntrada}T14:00:00`)
    const salida = new Date(`${fechaSalida}T12:00:00`)

    const { error } = await supabase.from('reservas').insert({
      cabana_id: cabana.id,
      cliente_id: cliente.id,
      tipo: 'noche',
      fecha_entrada: entrada.toISOString(),
      fecha_salida: salida.toISOString(),
      adultos,
      ninos,
      bebes,
      precio_acordado: subtotal,
      anticipo: parseFloat(anticipo) || 0,
      estado: 'confirmada',
      notas,
    })

    if (error) { toast.error('Error al crear reserva'); setLoading(false); return }

    await supabase.from('cabanas').update({ estado: 'reservada' }).eq('id', cabana.id)

    toast.success('Reserva creada correctamente')
    setLoading(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onBack() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Reserva · Cabaña #{cabana.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label>Nombre del cliente *</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="5555-1234" />
            </div>
            <div className="space-y-1">
              <Label>Anticipo (Q)</Label>
              <Input type="number" value={anticipo} onChange={e => setAnticipo(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label>Fecha de entrada *</Label>
              <Input type="date" value={fechaEntrada} onChange={e => setFechaEntrada(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de salida *</Label>
              <Input type="date" value={fechaSalida} onChange={e => setFechaSalida(e.target.value)} />
            </div>
          </div>

          {/* Personas */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Adultos', val: adultos, set: setAdultos, min: 1 },
              { label: 'Niños 3-8', val: ninos, set: setNinos, min: 0 },
              { label: 'Bebés <3', val: bebes, set: setBebes, min: 0 },
            ].map(({ label, val, set, min }) => (
              <div key={label} className="space-y-1">
                <Label className="text-xs">{label}</Label>
                <div className="flex items-center border rounded-xl overflow-hidden h-12">
                  <button className="flex-1 text-xl font-bold hover:bg-slate-100 h-full" onClick={() => set(Math.max(min, val - 1))}>−</button>
                  <span className="w-8 text-center font-bold">{val}</span>
                  <button className="flex-1 text-xl font-bold hover:bg-slate-100 h-full" onClick={() => set(val + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Observaciones</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} className="min-h-[70px]" />
          </div>

          <div className="rounded-xl bg-slate-50 p-3 flex justify-between items-center border">
            <span className="text-slate-600 text-sm">Total estimado</span>
            <span className="font-black text-lg text-blue-600">{formatCurrency(subtotal)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onBack} disabled={loading}>Cancelar</Button>
          <Button size="lg" onClick={handleReservar} disabled={loading} className="px-8">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Crear Reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
