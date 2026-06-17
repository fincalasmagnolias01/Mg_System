'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, cn } from '@/lib/utils'
import { Loader2, Banknote, CreditCard, ArrowRightLeft, Layers, Delete } from 'lucide-react'

type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'

interface PaymentModalProps {
  open: boolean
  total: number
  mesa?: string
  onClose: () => void
  onPagar: (forma: FormaPago, detalle: Record<string, number>, cambio: number, nit: string, nombreFactura: string) => Promise<void>
}

const FORMAS = [
  { key: 'efectivo'      as FormaPago, label: 'Efectivo',      icon: Banknote,       color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'tarjeta'       as FormaPago, label: 'Tarjeta',        icon: CreditCard,     color: 'border-blue-400 bg-blue-50 text-blue-700'          },
  { key: 'transferencia' as FormaPago, label: 'Transferencia',  icon: ArrowRightLeft, color: 'border-violet-400 bg-violet-50 text-violet-700'    },
  { key: 'mixto'         as FormaPago, label: 'Mixto',          icon: Layers,         color: 'border-orange-400 bg-orange-50 text-orange-700'    },
]

const NUMPAD = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['.','0','⌫'],
]

const QUICK_AMOUNTS = [50, 100, 150, 200]

export default function PaymentModal({ open, total, mesa, onClose, onPagar }: PaymentModalProps) {
  const [forma, setForma] = useState<FormaPago>('efectivo')
  const [efectivoStr, setEfectivoStr] = useState('')
  const [tarjeta, setTarjeta]         = useState('')
  const [transferencia, setTransferencia] = useState('')
  const [nit, setNit]                 = useState('CF')
  const [nombre, setNombre]           = useState('Consumidor Final')
  const [loading, setLoading]         = useState(false)

  const efectivoNum = parseFloat(efectivoStr) || 0
  const tarjetaNum  = parseFloat(tarjeta)    || 0
  const transNum    = parseFloat(transferencia) || 0
  const cambio      = forma === 'efectivo' ? Math.max(0, efectivoNum - total) : 0
  const mixtoTotal  = efectivoNum + tarjetaNum + transNum

  // ── Numpad handler ────────────────────────────────────────────────
  function handleNumpad(key: string) {
    if (key === '⌫') {
      setEfectivoStr(prev => prev.slice(0, -1))
    } else if (key === '.') {
      if (!efectivoStr.includes('.')) setEfectivoStr(prev => prev + '.')
    } else {
      // Prevent more than 2 decimal places
      const parts = efectivoStr.split('.')
      if (parts[1] && parts[1].length >= 2) return
      setEfectivoStr(prev => (prev === '0' ? key : prev + key))
    }
  }

  async function handlePagar() {
    let detalle: Record<string, number> = {}
    if (forma === 'efectivo') {
      if (efectivoNum < total) return
      detalle = { efectivo: efectivoNum }
    } else if (forma === 'tarjeta') {
      detalle = { tarjeta: total }
    } else if (forma === 'transferencia') {
      detalle = { transferencia: total }
    } else {
      if (mixtoTotal < total) return
      detalle = { efectivo: efectivoNum, tarjeta: tarjetaNum, transferencia: transNum }
    }
    setLoading(true)
    await onPagar(forma, detalle, cambio, nit || 'CF', nombre || 'Consumidor Final')
    setLoading(false)
    resetForm()
  }

  function resetForm() {
    setEfectivoStr(''); setTarjeta(''); setTransferencia('')
    setNit('CF'); setNombre('Consumidor Final')
  }

  const canPay =
    (forma === 'efectivo' && efectivoNum >= total) ||
    (forma === 'tarjeta') ||
    (forma === 'transferencia') ||
    (forma === 'mixto' && mixtoTotal >= total)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="bg-slate-900 text-white px-5 py-4">
          <DialogTitle className="text-white font-black text-lg">
            Cobrar · {formatCurrency(total)}
            {mesa && <span className="ml-2 text-sm font-normal text-slate-400">Mesa {mesa}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="p-5 space-y-4">
          {/* Forma de pago — touch buttons */}
          <div className="grid grid-cols-4 gap-2">
            {FORMAS.map(f => {
              const Icon = f.icon
              return (
                <button
                  key={f.key}
                  onClick={() => { setForma(f.key); setEfectivoStr('') }}
                  className={cn(
                    'flex flex-col items-center gap-1 h-16 rounded-xl border-2 transition-all active:scale-[0.96] font-semibold text-xs',
                    forma === f.key ? f.color : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Efectivo — numpad */}
          {forma === 'efectivo' && (
            <div className="space-y-3">
              {/* Display */}
              <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3 text-right">
                <p className="text-xs text-slate-400 mb-0.5">Monto recibido</p>
                <p className={cn('text-4xl font-black tracking-tight', efectivoNum >= total ? 'text-slate-900' : 'text-slate-400')}>
                  Q {efectivoStr || '0'}
                </p>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => setEfectivoStr(total.toFixed(2))}
                  className="h-10 rounded-xl border-2 border-slate-900 bg-slate-900 text-white text-xs font-bold active:scale-[0.96] transition-all"
                >
                  Exacto
                </button>
                {QUICK_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => setEfectivoStr(String(a))}
                    className="h-10 rounded-xl border-2 border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 active:scale-[0.96] transition-all"
                  >
                    {a}
                  </button>
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {NUMPAD.flat().map((key, i) => (
                  <button
                    key={i}
                    onClick={() => handleNumpad(key)}
                    className={cn(
                      'h-14 rounded-xl text-xl font-black transition-all active:scale-[0.93]',
                      key === '⌫'
                        ? 'bg-red-50 border-2 border-red-200 text-red-500 hover:bg-red-100'
                        : 'bg-slate-50 border-2 border-slate-200 text-slate-800 hover:bg-slate-100'
                    )}
                  >
                    {key === '⌫' ? <Delete className="h-5 w-5 mx-auto" /> : key}
                  </button>
                ))}
              </div>

              {/* Cambio */}
              {efectivoNum >= total && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-emerald-700">Cambio</span>
                  <span className="text-2xl font-black text-emerald-700">{formatCurrency(cambio)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tarjeta / Transferencia */}
          {(forma === 'tarjeta' || forma === 'transferencia') && (
            <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-5 text-center">
              <p className="text-4xl font-black text-blue-700">{formatCurrency(total)}</p>
              <p className="text-sm text-slate-500 mt-1">Cobrar por {forma}</p>
            </div>
          )}

          {/* Mixto */}
          {forma === 'mixto' && (
            <div className="space-y-2">
              {[
                { label: 'Efectivo',      set: setEfectivoStr,   current: efectivoStr   },
                { label: 'Tarjeta',       set: setTarjeta,       current: tarjeta       },
                { label: 'Transferencia', set: setTransferencia, current: transferencia },
              ].map(({ label, set, current }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-600 w-28 flex-shrink-0">{label}</span>
                  <Input type="number" placeholder="0.00" value={current} onChange={e => set(e.target.value)} className="h-11" />
                </div>
              ))}
              <div className={cn(
                'rounded-xl px-4 py-2.5 flex justify-between font-bold text-sm',
                mixtoTotal >= total ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
              )}>
                <span>Total ingresado</span>
                <span>{formatCurrency(mixtoTotal)} / {formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* NIT / Nombre factura */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">NIT</Label>
              <Input value={nit} onChange={e => setNit(e.target.value)} placeholder="CF" className="h-10" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Nombre factura</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Consumidor Final" className="h-10" />
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 pb-5 pt-0">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="h-12">
            Cancelar
          </Button>
          <Button
            size="lg"
            onClick={handlePagar}
            disabled={loading || !canPay}
            className="bg-emerald-600 hover:bg-emerald-700 px-8 h-12 font-black text-base flex-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
