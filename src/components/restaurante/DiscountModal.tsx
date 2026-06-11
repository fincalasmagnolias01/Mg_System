'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'

interface DiscountModalProps {
  open: boolean
  subtotal: number
  currentDescuento: number
  currentPropina: number
  onClose: () => void
  onApply: (descuento: number, propina: number) => void
}

export default function DiscountModal({ open, subtotal, currentDescuento, currentPropina, onClose, onApply }: DiscountModalProps) {
  const [descuento, setDescuento] = useState(currentDescuento.toString())
  const [propina, setPropina] = useState(currentPropina.toString())

  const descNum = parseFloat(descuento) || 0
  const propNum = parseFloat(propina) || 0
  const propina10 = Math.round(subtotal * 0.1 * 100) / 100

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Descuento y Propina</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Descuento (Q)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={descuento}
              onChange={e => setDescuento(e.target.value)}
              className="text-xl font-bold h-14"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Propina</Label>
              <button
                onClick={() => setPropina(propina10.toString())}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                10% = {formatCurrency(propina10)}
              </button>
            </div>
            <Input
              type="number"
              placeholder="0.00"
              value={propina}
              onChange={e => setPropina(e.target.value)}
              className="text-xl font-bold h-14"
            />
          </div>

          <div className="rounded-xl bg-slate-50 p-4 border space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {descNum > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento</span>
                <span>-{formatCurrency(descNum)}</span>
              </div>
            )}
            {propNum > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Propina</span>
                <span>+{formatCurrency(propNum)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-black text-lg">
              <span>Total</span>
              <span className="text-blue-600">{formatCurrency(Math.max(0, subtotal - descNum + propNum))}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button size="lg" onClick={() => { onApply(descNum, propNum); onClose() }} className="px-8">
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
