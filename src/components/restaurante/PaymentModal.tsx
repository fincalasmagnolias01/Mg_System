'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { Loader2, Banknote, CreditCard, ArrowRightLeft, Layers } from 'lucide-react'

type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'

interface PaymentModalProps {
  open: boolean
  total: number
  onClose: () => void
  onPagar: (forma: FormaPago, detalle: Record<string, number>, cambio: number) => Promise<void>
}

const FORMAS = [
  { key: 'efectivo' as FormaPago, label: 'Efectivo', icon: Banknote, color: 'bg-green-100 text-green-700 border-green-300' },
  { key: 'tarjeta' as FormaPago, label: 'Tarjeta', icon: CreditCard, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'transferencia' as FormaPago, label: 'Transferencia', icon: ArrowRightLeft, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'mixto' as FormaPago, label: 'Pago Mixto', icon: Layers, color: 'bg-orange-100 text-orange-700 border-orange-300' },
]

export default function PaymentModal({ open, total, onClose, onPagar }: PaymentModalProps) {
  const [forma, setForma] = useState<FormaPago>('efectivo')
  const [efectivo, setEfectivo] = useState('')
  const [tarjeta, setTarjeta] = useState('')
  const [transferencia, setTransferencia] = useState('')
  const [loading, setLoading] = useState(false)

  const efectivoNum = parseFloat(efectivo) || 0
  const tarjetaNum = parseFloat(tarjeta) || 0
  const transferenciaNum = parseFloat(transferencia) || 0
  const cambio = forma === 'efectivo' ? Math.max(0, efectivoNum - total) : 0
  const mixtoTotal = efectivoNum + tarjetaNum + transferenciaNum

  async function handlePagar() {
    let detalle: Record<string, number> = {}
    if (forma === 'efectivo') {
      if (efectivoNum < total) { return }
      detalle = { efectivo: efectivoNum }
    } else if (forma === 'tarjeta') {
      detalle = { tarjeta: total }
    } else if (forma === 'transferencia') {
      detalle = { transferencia: total }
    } else {
      if (mixtoTotal < total) { return }
      detalle = { efectivo: efectivoNum, tarjeta: tarjetaNum, transferencia: transferenciaNum }
    }

    setLoading(true)
    await onPagar(forma, detalle, cambio)
    setLoading(false)
    resetForm()
    onClose()
  }

  function resetForm() {
    setEfectivo(''); setTarjeta(''); setTransferencia('')
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar · {formatCurrency(total)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Forma de pago */}
          <div className="grid grid-cols-2 gap-2">
            {FORMAS.map(f => {
              const Icon = f.icon
              return (
                <button
                  key={f.key}
                  onClick={() => { setForma(f.key); resetForm() }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                    forma === f.key ? f.color + ' border-current' : 'border-border text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Input fields */}
          {forma === 'efectivo' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Monto recibido</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={efectivo}
                  onChange={e => setEfectivo(e.target.value)}
                  className="text-2xl font-bold h-16 text-center"
                  autoFocus
                />
              </div>
              {efectivoNum >= total && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex justify-between font-bold text-green-700">
                  <span>Cambio</span>
                  <span className="text-xl">{formatCurrency(cambio)}</span>
                </div>
              )}
            </div>
          )}

          {(forma === 'tarjeta' || forma === 'transferencia') && (
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-3xl font-black text-blue-700">{formatCurrency(total)}</p>
              <p className="text-xs text-slate-500 mt-1">Monto a cobrar por {forma}</p>
            </div>
          )}

          {forma === 'mixto' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Efectivo</Label>
                <Input type="number" placeholder="0.00" value={efectivo} onChange={e => setEfectivo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tarjeta</Label>
                <Input type="number" placeholder="0.00" value={tarjeta} onChange={e => setTarjeta(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Transferencia</Label>
                <Input type="number" placeholder="0.00" value={transferencia} onChange={e => setTransferencia(e.target.value)} />
              </div>
              <div className={`rounded-xl p-3 flex justify-between font-bold text-sm ${mixtoTotal >= total ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span>Total ingresado:</span>
                <span>{formatCurrency(mixtoTotal)} / {formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            size="lg"
            onClick={handlePagar}
            disabled={loading ||
              (forma === 'efectivo' && efectivoNum < total) ||
              (forma === 'mixto' && mixtoTotal < total)
            }
            className="bg-green-600 hover:bg-green-700 px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar Pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
