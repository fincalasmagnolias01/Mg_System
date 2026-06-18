'use client'

import { useState } from 'react'
import { ItemOrden } from '@/types'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, cn } from '@/lib/utils'
import { Trash2, Plus, Minus, ShoppingCart, Percent, Star, MessageSquare, Check } from 'lucide-react'

interface CurrentOrderProps {
  items: ItemOrden[]
  mesa: string
  descuento: number
  propina: number
  onMesaChange: (mesa: string) => void
  onQtyChange: (tempId: string, qty: number) => void
  onNotaChange: (tempId: string, nota: string) => void
  onRemove: (tempId: string) => void
  onDescuento: () => void
  onPropina: () => void
  onPagar: () => void
  onCerrar: () => void
  loading?: boolean
}

export default function CurrentOrder({
  items, mesa, descuento, propina,
  onMesaChange, onQtyChange, onNotaChange, onRemove,
  onDescuento, onPropina, onPagar, onCerrar, loading
}: CurrentOrderProps) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal - descuento + propina

  return (
    <aside className="w-80 desk:w-[480px] bg-white border-l flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="p-3 desk:p-5 border-b bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2 desk:gap-3">
          <ShoppingCart className="h-4 w-4 desk:h-5 desk:w-5 text-slate-500 flex-shrink-0" />
          <span className="text-sm desk:text-base font-black text-slate-700 flex-shrink-0">Mesa</span>
          <Input
            value={mesa}
            onChange={e => onMesaChange(e.target.value)}
            placeholder="# mesa"
            className="h-8 desk:h-11 rounded-lg text-sm desk:text-base font-bold text-center border-slate-200 bg-white flex-1"
          />
          {items.length > 0 && (
            <span className="text-xs desk:text-sm font-bold bg-slate-900 text-white px-2 py-1 rounded-lg flex-shrink-0">
              {items.reduce((n, i) => n + i.cantidad, 0)} items
            </span>
          )}
        </div>
      </div>

      {/* Items list */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 desk:h-64 text-slate-300">
            <ShoppingCart className="h-12 w-12 desk:h-16 desk:w-16 mb-2" strokeWidth={1} />
            <p className="text-sm desk:text-base">Orden vacía</p>
          </div>
        ) : (
          <div className="p-2 desk:p-3 space-y-1.5 desk:space-y-2">
            {items.map(item => (
              <ItemRow
                key={item.tempId}
                item={item}
                onQtyChange={onQtyChange}
                onRemove={onRemove}
                onNotaChange={onNotaChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Totals */}
      <div className="px-4 desk:px-6 py-3 desk:py-5 space-y-1.5 desk:space-y-2 flex-shrink-0">
        <div className="flex justify-between text-sm desk:text-base text-slate-600">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-sm desk:text-base text-emerald-600 font-medium">
            <span>Descuento</span>
            <span>− {formatCurrency(descuento)}</span>
          </div>
        )}
        {propina > 0 && (
          <div className="flex justify-between text-sm desk:text-base text-slate-600">
            <span>Propina (10%)</span>
            <span>{formatCurrency(propina)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-xl desk:text-3xl text-slate-900 pt-1">
          <span>TOTAL</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="p-3 desk:p-5 space-y-2 desk:space-y-3 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2 desk:gap-3">
          <button
            onClick={onDescuento}
            disabled={items.length === 0}
            className="h-12 desk:h-16 rounded-xl border-2 border-slate-200 flex items-center justify-center gap-1.5 text-sm desk:text-base font-semibold text-slate-600 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-30"
          >
            <Percent className="h-4 w-4 desk:h-5 desk:w-5" />
            Descuento
          </button>
          <button
            onClick={onPropina}
            disabled={items.length === 0}
            className={cn(
              'h-12 desk:h-16 rounded-xl border-2 flex items-center justify-center gap-1.5 text-sm desk:text-base font-semibold transition-all active:scale-[0.97] disabled:opacity-30',
              propina > 0
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Star className="h-4 w-4 desk:h-5 desk:w-5" />
            Propina
          </button>
        </div>

        <button
          onClick={onPagar}
          disabled={items.length === 0 || loading}
          className="w-full h-14 desk:h-20 rounded-xl text-base desk:text-2xl font-black bg-slate-900 hover:bg-slate-800 text-white active:scale-[0.98] transition-all disabled:opacity-30"
        >
          Cobrar · {formatCurrency(total)}
        </button>

        <button
          onClick={onCerrar}
          disabled={items.length === 0}
          className="w-full h-10 desk:h-12 rounded-xl text-xs desk:text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 active:scale-[0.97] transition-all disabled:opacity-30"
        >
          Cancelar / Nueva Orden
        </button>
      </div>
    </aside>
  )
}

/* ── Item row with nota editing ──────────────────────────── */

function ItemRow({ item, onQtyChange, onRemove, onNotaChange }: {
  item: ItemOrden
  onQtyChange: (tempId: string, qty: number) => void
  onRemove: (tempId: string) => void
  onNotaChange: (tempId: string, nota: string) => void
}) {
  const [editingNota, setEditingNota] = useState(false)
  const [notaDraft, setNotaDraft] = useState(item.notas ?? '')

  function commitNota() {
    onNotaChange(item.tempId, notaDraft.trim())
    setEditingNota(false)
  }

  return (
    <div className="bg-slate-50 rounded-xl p-2.5 desk:p-4 space-y-2">
      <div className="flex items-start gap-2 desk:gap-3">
        {/* Qty controls */}
        <div className="flex items-center gap-1 desk:gap-1.5 flex-shrink-0">
          <button
            onClick={() => onQtyChange(item.tempId, item.cantidad - 1)}
            className="w-10 h-10 desk:w-12 desk:h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 active:scale-[0.93] transition-all"
          >
            <Minus className="h-3.5 w-3.5 desk:h-4 desk:w-4" />
          </button>
          <span className="w-8 desk:w-10 text-center font-black text-base desk:text-xl">{item.cantidad}</span>
          <button
            onClick={() => onQtyChange(item.tempId, item.cantidad + 1)}
            className="w-10 h-10 desk:w-12 desk:h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 active:scale-[0.93] transition-all"
          >
            <Plus className="h-3.5 w-3.5 desk:h-4 desk:w-4" />
          </button>
        </div>

        {/* Name & price */}
        <div className="flex-1 min-w-0 pt-1">
          <p className="text-sm desk:text-base font-semibold text-slate-800 leading-tight truncate">{item.nombre_producto}</p>
          <p className="text-xs desk:text-sm text-slate-400">{formatCurrency(item.precio_unitario)} c/u</p>
        </div>

        {/* Subtotal & delete */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-1">
          <span className="text-sm desk:text-base font-black text-slate-900">{formatCurrency(item.subtotal)}</span>
          <button
            onClick={() => onRemove(item.tempId)}
            className="w-7 h-7 desk:w-9 desk:h-9 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 active:scale-[0.93] transition-all"
          >
            <Trash2 className="h-3.5 w-3.5 desk:h-4 desk:w-4" />
          </button>
        </div>
      </div>

      {/* Nota inline */}
      {editingNota ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={notaDraft}
            onChange={e => setNotaDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitNota() }}
            placeholder="ej: sin cebolla, bien cocido..."
            className="h-8 desk:h-10 text-xs desk:text-sm rounded-lg flex-1"
            autoFocus
          />
          <button
            onClick={commitNota}
            className="w-8 h-8 desk:w-10 desk:h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 active:scale-[0.93] transition-all"
          >
            <Check className="h-3.5 w-3.5 desk:h-4 desk:w-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setNotaDraft(item.notas ?? ''); setEditingNota(true) }}
          className="flex items-center gap-1.5 text-xs desk:text-sm text-slate-400 hover:text-slate-600 transition-colors w-full text-left"
        >
          <MessageSquare className="h-3 w-3 desk:h-4 desk:w-4 flex-shrink-0" />
          <span className={item.notas ? 'text-slate-600 font-medium italic' : ''}>
            {item.notas || 'Agregar nota...'}
          </span>
        </button>
      )}
    </div>
  )
}
