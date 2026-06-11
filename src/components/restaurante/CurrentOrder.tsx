'use client'

import { ItemOrden } from '@/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingCart, ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CurrentOrderProps {
  items: ItemOrden[]
  mesa: string
  descuento: number
  propina: number
  onQtyChange: (tempId: string, qty: number) => void
  onRemove: (tempId: string) => void
  onDescuento: () => void
  onPropina: () => void
  onEnviarCocina: () => void
  onPagar: () => void
  onCerrar: () => void
  loading?: boolean
}

export default function CurrentOrder({
  items, mesa, descuento, propina,
  onQtyChange, onRemove, onDescuento, onPropina,
  onEnviarCocina, onPagar, onCerrar, loading
}: CurrentOrderProps) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal - descuento + propina

  return (
    <aside className="w-80 bg-white border-l flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <h3 className="font-black text-slate-800">Cuenta Actual</h3>
          </div>
          {mesa && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">Mesa {mesa}</span>}
        </div>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-300">
            <ShoppingCart className="h-12 w-12 mb-2" />
            <p className="text-sm">Orden vacía</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {items.map(item => (
              <div key={item.tempId} className="flex items-start gap-2 p-2 rounded-xl hover:bg-slate-50 group">
                {/* Qty controls */}
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => onQtyChange(item.tempId, item.cantidad - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.cantidad}</span>
                  <button
                    onClick={() => onQtyChange(item.tempId, item.cantidad + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-600 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Name & price */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{item.nombre_producto}</p>
                  {item.notas && <p className="text-xs text-slate-400 italic">{item.notas}</p>}
                  <p className="text-xs text-slate-500">{formatCurrency(item.precio_unitario)} c/u</p>
                </div>

                {/* Subtotal & delete */}
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-slate-800">{formatCurrency(item.subtotal)}</span>
                  <button
                    onClick={() => onRemove(item.tempId)}
                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Totals */}
      <div className="p-4 space-y-1.5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Descuento</span>
            <span>-{formatCurrency(descuento)}</span>
          </div>
        )}
        {propina > 0 && (
          <div className="flex justify-between text-sm text-slate-600">
            <span>Propina (10%)</span>
            <span>{formatCurrency(propina)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-xl text-blue-700 pt-1">
          <span>TOTAL</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="default"
            className="rounded-xl text-xs"
            onClick={onDescuento}
            disabled={items.length === 0}
          >
            % Descuento
          </Button>
          <Button
            variant="outline"
            size="default"
            className="rounded-xl text-xs"
            onClick={onPropina}
            disabled={items.length === 0}
          >
            ✦ Propina
          </Button>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-xl gap-2 text-amber-700 border-amber-200 hover:bg-amber-50"
          onClick={onEnviarCocina}
          disabled={items.length === 0 || loading}
        >
          <ChefHat className="h-4 w-4" />
          Enviar a Cocina
        </Button>

        <Button
          size="xl"
          className="w-full rounded-xl text-base font-black bg-green-600 hover:bg-green-700"
          onClick={onPagar}
          disabled={items.length === 0 || loading}
        >
          Cobrar · {formatCurrency(total)}
        </Button>

        <Button
          variant="ghost"
          size="default"
          className="w-full rounded-xl text-xs text-slate-400"
          onClick={onCerrar}
          disabled={items.length === 0}
        >
          Cerrar / Nueva Orden
        </Button>
      </div>
    </aside>
  )
}
