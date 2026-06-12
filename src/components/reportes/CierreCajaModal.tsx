'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Utensils, BedDouble, CalendarDays, Lock, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ModuleTotal {
  total: number
  count: number
}

interface CierreData {
  restaurante: ModuleTotal
  cabanas: ModuleTotal
  daypass: ModuleTotal
  eventos: ModuleTotal
  totalGeneral: number
}

interface CierreCajaModalProps {
  open: boolean
  onClose: () => void
  onClosed: () => void
}

export default function CierreCajaModal({ open, onClose, onClosed }: CierreCajaModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<CierreData | null>(null)
  const [notas, setNotas] = useState('')

  useEffect(() => {
    if (!open) return
    setNotas('')
    fetchData()
  }, [open])

  async function fetchData() {
    setLoading(true)
    const supabase = createClient()
    const hoy = new Date()
    const startOfDay = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const [ordenes, hospedajes, vapepass, eventos] = await Promise.all([
      supabase.from('ordenes').select('total').eq('estado', 'pagada').gte('created_at', startOfDay),
      supabase.from('hospedajes').select('subtotal').gte('created_at', startOfDay),
      supabase.from('vapepass').select('total').gte('created_at', startOfDay),
      supabase.from('eventos').select('total').in('estado', ['completado', 'confirmado', 'en_curso']).gte('created_at', startOfDay),
    ])

    const rest = { total: sum(ordenes.data, 'total'), count: ordenes.data?.length ?? 0 }
    const cab  = { total: sum(hospedajes.data, 'subtotal'), count: hospedajes.data?.length ?? 0 }
    const dp   = { total: sum(vapepass.data, 'total'), count: vapepass.data?.length ?? 0 }
    const ev   = { total: sum(eventos.data, 'total'), count: eventos.data?.length ?? 0 }

    setData({
      restaurante: rest,
      cabanas: cab,
      daypass: dp,
      eventos: ev,
      totalGeneral: rest.total + cab.total + dp.total + ev.total,
    })
    setLoading(false)
  }

  async function handleConfirmar() {
    if (!data) return
    setSaving(true)
    const fecha = new Date().toISOString().split('T')[0]

    const { error } = await createClient().from('cierres_caja').insert({
      fecha,
      total_restaurante: data.restaurante.total,
      ordenes_restaurante: data.restaurante.count,
      total_cabanas: data.cabanas.total + data.daypass.total,
      hospedajes_count: data.cabanas.count + data.daypass.count,
      total_eventos: data.eventos.total,
      eventos_count: data.eventos.count,
      total_general: data.totalGeneral,
      notas: notas.trim() || null,
    })

    if (error) {
      toast.error('Error al cerrar caja: ' + error.message)
      setSaving(false)
      return
    }

    toast.success('Caja cerrada correctamente')
    setSaving(false)
    onClosed()
    onClose()
  }

  const fechaLabel = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const ROWS = data ? [
    { icon: Utensils,     label: 'Restaurante', sublabel: `${data.restaurante.count} órdenes`,      color: 'text-amber-400',  bg: 'bg-amber-900/30',  total: data.restaurante.total },
    { icon: BedDouble,    label: 'Cabañas',      sublabel: `${data.cabanas.count} hospedajes`,       color: 'text-teal-400',   bg: 'bg-teal-900/30',   total: data.cabanas.total     },
    { icon: Zap,          label: 'Daypass',      sublabel: `${data.daypass.count} pases`,            color: 'text-amber-300',  bg: 'bg-amber-900/20',  total: data.daypass.total     },
    { icon: CalendarDays, label: 'Eventos',      sublabel: `${data.eventos.count} eventos`,          color: 'text-violet-400', bg: 'bg-violet-900/30', total: data.eventos.total     },
  ] : []

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            <Lock className="h-5 w-5 text-amber-400" />
            Cierre de Caja
          </DialogTitle>
          <p className="text-xs text-slate-400 capitalize mt-0.5">{fechaLabel}</p>
        </DialogHeader>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
            </div>
          ) : data ? (
            <div className="space-y-3">
              {/* Module rows */}
              {ROWS.map(row => {
                const Icon = row.icon
                return (
                  <div key={row.label} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', row.bg)}>
                      <Icon className={cn('h-4 w-4', row.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-200">{row.label}</p>
                      <p className="text-xs text-slate-500">{row.sublabel}</p>
                    </div>
                    <p className={cn('font-black text-base flex-shrink-0', row.total > 0 ? row.color : 'text-slate-600')}>
                      {formatCurrency(row.total)}
                    </p>
                  </div>
                )
              })}

              {/* Total general */}
              <div className="flex items-center justify-between bg-slate-700 rounded-xl p-4 border border-slate-600 mt-2">
                <p className="font-bold text-slate-200 text-sm">Total del Día</p>
                <p className="text-2xl font-black text-emerald-400">{formatCurrency(data.totalGeneral)}</p>
              </div>

              {/* Notes */}
              <textarea
                value={notas}
                onChange={e => setNotas(e.target.value)}
                placeholder="Notas del cierre (opcional)"
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 resize-none focus:outline-none focus:border-slate-500 transition-colors"
              />

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 h-11 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 text-sm font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmar}
                  disabled={saving}
                  className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm transition-all active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Confirmar Cierre
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sum(arr: any[] | null | undefined, key: string): number {
  return (arr ?? []).reduce((s, row) => s + (Number(row[key]) || 0), 0)
}
