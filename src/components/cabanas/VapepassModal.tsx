'use client'

import { useState, useEffect } from 'react'
import { Cabana, Hospedaje, VapepassTarifa } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Zap } from 'lucide-react'

interface VapepassModalProps {
  cabana: Cabana
  hospedaje?: Hospedaje
  open: boolean
  onBack: () => void
  onDone: () => void
}

export default function VapepassModal({ cabana, hospedaje, open, onBack, onDone }: VapepassModalProps) {
  const [tarifas, setTarifas] = useState<VapepassTarifa[]>([])
  const [tarifaId, setTarifaId] = useState<string>('')
  const [adultos, setAdultos] = useState(1)
  const [ninos, setNinos] = useState(0)
  const [loading, setLoading] = useState(false)
  const [nombre, setNombreCliente] = useState(hospedaje?.clientes?.nombre ?? '')

  const tarifa = tarifas.find(t => t.id === tarifaId)
  const total = tarifa ? adultos * tarifa.precio_adulto + ninos * tarifa.precio_nino : 0

  useEffect(() => {
    createClient()
      .from('vapepass_tarifas')
      .select('*')
      .eq('activo', true)
      .order('hora_inicio')
      .then(({ data }) => {
        if (data) {
          setTarifas(data)
          // Seleccionar tarifa vigente por hora actual
          const hora = new Date().getHours() * 100 + new Date().getMinutes()
          const vigente = data.find(t => {
            const [h1, m1] = t.hora_inicio.split(':').map(Number)
            const [h2, m2] = t.hora_fin.split(':').map(Number)
            const inicio = h1 * 100 + m1
            const fin = h2 * 100 + m2
            return hora >= inicio && hora <= fin
          })
          if (vigente) setTarifaId(vigente.id)
          else if (data.length > 0) setTarifaId(data[0].id)
        }
      })
  }, [])

  async function handleVender() {
    if (!tarifaId) { toast.error('Selecciona un horario'); return }
    if (adultos + ninos < 1) { toast.error('Mínimo 1 persona'); return }
    setLoading(true)

    const supabase = createClient()

    // Buscar o crear cliente si no hay hospedaje
    let clienteId = hospedaje?.cliente_id
    if (!clienteId && nombre) {
      const { data } = await supabase.from('clientes').insert({ nombre, nit: 'CF' }).select('id').single()
      clienteId = data?.id
    }

    const { error } = await supabase.from('vapepass').insert({
      tarifa_id: tarifaId,
      hospedaje_id: hospedaje?.id ?? null,
      cabana_id: cabana.id,
      cliente_id: clienteId ?? null,
      adultos,
      ninos,
      precio_adulto: tarifa!.precio_adulto,
      precio_nino: tarifa!.precio_nino,
      total,
    })

    if (error) { toast.error('Error al registrar Daypass'); setLoading(false); return }

    await supabase.from('movimientos_caja').insert({
      tipo: 'ingreso',
      concepto: `Daypass - ${tarifa!.etiqueta}`,
      monto: total,
      referencia_tipo: 'vapepass',
    })

    toast.success(`Daypass vendido · ${formatCurrency(total)}`)
    setLoading(false)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onBack() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Daypass · Cabaña #{cabana.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Horario */}
          <div>
            <Label className="mb-2 block">Selecciona el horario</Label>
            <div className="space-y-2">
              {tarifas.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTarifaId(t.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    tarifaId === t.id
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-border hover:border-amber-200'
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold">{t.etiqueta}</p>
                    <p className="text-xs text-slate-500">Adultos y Niños: {formatCurrency(t.precio_adulto)}</p>
                  </div>
                  <p className="text-xl font-black text-amber-600">{formatCurrency(t.precio_adulto)}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Personas */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Adultos', val: adultos, set: setAdultos },
              { label: 'Niños', val: ninos, set: setNinos },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-1">
                <Label>{label}</Label>
                <div className="flex items-center border rounded-xl overflow-hidden h-14">
                  <button className="flex-1 text-2xl font-bold hover:bg-slate-100 h-full" onClick={() => set(Math.max(0, val - 1))}>−</button>
                  <span className="w-10 text-center font-bold text-xl">{val}</span>
                  <button className="flex-1 text-2xl font-bold hover:bg-slate-100 h-full" onClick={() => set(val + 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          {tarifa && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex justify-between items-center">
              <div className="text-sm text-amber-700">
                <p>{adultos} adulto{adultos !== 1 ? 's' : ''} × {formatCurrency(tarifa.precio_adulto)}</p>
                {ninos > 0 && <p>{ninos} niño{ninos !== 1 ? 's' : ''} × {formatCurrency(tarifa.precio_nino)}</p>}
              </div>
              <span className="text-2xl font-black text-amber-700">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onBack} disabled={loading}>Cancelar</Button>
          <Button size="lg" onClick={handleVender} disabled={loading || !tarifa || total === 0}
            className="bg-amber-500 hover:bg-amber-600 text-white px-8">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Vender Daypass
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
