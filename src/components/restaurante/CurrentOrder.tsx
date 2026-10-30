'use client'

import { useState } from 'react'
import { ItemOrden } from '@/types'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatCurrency, cn } from '@/lib/utils'
import {
  Trash2, Plus, Minus, ShoppingCart, Percent,
  Star, MessageSquare, Check, CreditCard, Loader2,
} from 'lucide-react'

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
  onDescuento, onPropina, onPagar, onCerrar, loading,
}: CurrentOrderProps) {
  const subtotal   = items.reduce((s, i) => s + i.subtotal, 0)
  const total      = subtotal - descuento + propina
  const totalItems = items.reduce((n, i) => n + i.cantidad, 0)

  return (
    <aside className="w-80 desk:w-[460px] bg-slate-900 border-l border-slate-800 flex flex-col h-full flex-shrink-0">

      {/* ── Header ────────────────────────────────────── */}
      <div className="px-4 desk:px-6 pt-4 desk:pt-5 pb-3 desk:pb-4 flex-shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] desk:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1 block">Mesa / Mesa</label>
            <Input
              value={mesa}
              onChange={e => onMesaChange(e.target.value)}
              placeholder="Número de mesa"
              className="h-9 desk:h-11 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 text-sm desk:text-base font-bold focus:border-amber-500/50 rounded-xl"
            />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] desk:text-xs font-bold text-slate-600 uppercase tracking-widest mb-1">Items</p>
            <div className="h-9 desk:h-11 w-14 desk:w-16 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center">
              <span className={cn(
                'text-lg desk:text-xl font-black',
                totalItems > 0 ? 'text-amber-400' : 'text-slate-700'
              )}>
                {totalItems}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Items list ────────────────────────────────── */}
      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <div className="w-16 h-16 desk:w-20 desk:h-20 rounded-2xl bg-slate-800 flex items-center justify-center">
              <ShoppingCart className="h-8 w-8 desk:h-10 desk:w-10 text-slate-700" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm desk:text-base font-semibold text-slate-600">Orden vacía</p>
              <p className="text-xs desk:text-sm text-slate-700 mt-1">Toca un producto del menú</p>
            </div>
          </div>
        ) : (
          <div className="px-3 desk:px-4 py-3 desk:py-4 space-y-2 desk:space-y-2.5">
            {items.map((item, idx) => (
              <ItemRow
                key={item.tempId}
                item={item}
                index={idx + 1}
                onQtyChange={onQtyChange}
                onRemove={onRemove}
                onNotaChange={onNotaChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* ── Totals ────────────────────────────────────── */}
      <div className="border-t border-slate-800 px-4 desk:px-6 py-4 desk:py-5 space-y-2 desk:space-y-3 flex-shrink-0">
        <div className="flex justify-between items-center text-sm desk:text-base text-slate-400">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-300">{formatCurrency(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between items-center text-sm desk:text-base text-emerald-400">
            <span>Descuento aplicado</span>
            <span className="font-bold">− {formatCurrency(descuento)}</span>
          </div>
        )}
        {propina > 0 && (
          <div className="flex justify-between items-center text-sm desk:text-base text-amber-400">
            <span>Propina (10%)</span>
            <span className="font-bold">+ {formatCurrency(propina)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
          <span className="text-base desk:text-lg font-bold text-slate-300">TOTAL</span>
          <span className="text-2xl desk:text-4xl font-black text-white">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="px-4 desk:px-6 pb-4 desk:pb-6 pt-2 space-y-2 desk:space-y-3 flex-shrink-0">
        {/* Descuento + Propina */}
        <div className="grid grid-cols-2 gap-2 desk:gap-3">
          <button
            onClick={onDescuento}
            disabled={items.length === 0}
            className={cn(
              'h-11 desk:h-13 rounded-xl flex items-center justify-center gap-2 text-sm desk:text-base font-semibold transition-all active:scale-[0.97] disabled:opacity-25',
              'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white'
            )}
            style={{ height: undefined }}
          >
            <Percent className="h-4 w-4 desk:h-5 desk:w-5" />
            Descuento
          </button>
          <button
            onClick={onPropina}
            disabled={items.length === 0}
            className={cn(
              'h-11 rounded-xl flex items-center justify-center gap-2 text-sm desk:text-base font-semibold transition-all active:scale-[0.97] disabled:opacity-25',
              propina > 0
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white'
            )}
          >
            <Star className={cn('h-4 w-4 desk:h-5 desk:w-5', propina > 0 && 'fill-amber-400')} />
            Propina
          </button>
        </div>

        {/* Cobrar — main CTA */}
        <button
          onClick={onPagar}
          disabled={items.length === 0 || loading}
          className={cn(
            'w-full h-16 desk:h-20 rounded-2xl font-black text-lg desk:text-2xl',
            'transition-all active:scale-[0.98] disabled:opacity-25',
            'bg-gradient-to-br from-emerald-500 to-emerald-600',
            'hover:from-emerald-400 hover:to-emerald-500',
            'text-white shadow-xl shadow-emerald-500/25',
            'flex items-center justify-center gap-3'
          )}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-6 w-6 desk:h-7 desk:w-7" />
              <span>Cobrar {formatCurrency(total)}</span>
            </>
          )}
        </button>

        {/* Cancel */}
        <button
          onClick={onCerrar}
          disabled={items.length === 0}
          className="w-full h-9 desk:h-11 rounded-xl text-xs desk:text-sm text-slate-600 hover:text-slate-400 hover:bg-slate-800 active:scale-[0.97] transition-all disabled:opacity-0"
        >
          Cancelar orden
        </button>
      </div>
    </aside>
  )
}

/* ── Item row ────────────────────────────────────────────── */

function ItemRow({ item, index, onQtyChange, onRemove, onNotaChange }: {
  item: ItemOrden
  index: number
  onQtyChange: (tempId: string, qty: number) => void
  onRemove: (tempId: string) => void
  onNotaChange: (tempId: string, nota: string) => void
}) {
  const [editingNota, setEditingNota] = useState(false)
  const [notaDraft,   setNotaDraft]   = useState(item.notas ?? '')

  function commitNota() {
    onNotaChange(item.tempId, notaDraft.trim())
    setEditingNota(false)
  }

  return (
    <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 overflow-hidden">
      <div className="flex items-center gap-2.5 desk:gap-3 p-2.5 desk:p-3.5">

        {/* Index */}
        <span className="w-5 h-5 rounded-full bg-slate-700 text-[10px] font-black text-slate-500 flex items-center justify-center flex-shrink-0">
          {index}
        </span>

        {/* Name & unit price */}
        <div className="flex-1 min-w-0">
          <p className="text-sm desk:text-base font-semibold text-slate-100 truncate leading-tight">{item.nombre_producto}</p>
          {item.variante && Object.keys(item.variante).length > 0 && (
            <p className="text-[10px] desk:text-xs text-slate-500 truncate">
              {Object.values(item.variante).join(' · ')}
            </p>
          )}
          <p className="text-xs desk:text-sm text-slate-500 mt-0.5">{formatCurrency(item.precio_unitario)} c/u</p>
        </div>

        {/* Subtotal */}
        <span className="text-sm desk:text-base font-black text-amber-400 flex-shrink-0">{formatCurrency(item.subtotal)}</span>

        {/* Delete */}
        <button
          onClick={() => onRemove(item.tempId)}
          className="w-7 h-7 desk:w-8 desk:h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-red-400 hover:bg-red-500/10 active:scale-[0.92] transition-all flex-shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5 desk:h-4 desk:w-4" />
        </button>
      </div>

      {/* Qty + nota row */}
      <div className="flex items-center gap-2 px-2.5 desk:px-3.5 pb-2.5 desk:pb-3">
        {/* Qty controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/60 rounded-xl p-1">
          <button
            onClick={() => onQtyChange(item.tempId, item.cantidad - 1)}
            className="w-8 h-8 desk:w-10 desk:h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-[0.92] transition-all"
          >
            <Minus className="h-3 w-3 desk:h-3.5 desk:w-3.5 text-slate-300" />
          </button>
          <span className="w-7 desk:w-9 text-center font-black text-base desk:text-lg text-white">{item.cantidad}</span>
          <button
            onClick={() => onQtyChange(item.tempId, item.cantidad + 1)}
            className="w-8 h-8 desk:w-10 desk:h-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center active:scale-[0.92] transition-all"
          >
            <Plus className="h-3 w-3 desk:h-3.5 desk:w-3.5 text-slate-300" />
          </button>
        </div>

        {/* Nota */}
        <div className="flex-1 min-w-0">
          {editingNota ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={notaDraft}
                onChange={e => setNotaDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitNota() }}
                placeholder="ej: sin cebolla..."
                autoFocus
                className="flex-1 h-8 desk:h-9 bg-slate-700 border border-slate-600 rounded-lg px-2.5 text-xs desk:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 min-w-0"
              />
              <button
                onClick={commitNota}
                className="w-8 h-8 desk:w-9 desk:h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center flex-shrink-0 active:scale-[0.92] transition-all"
              >
                <Check className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNotaDraft(item.notas ?? ''); setEditingNota(true) }}
              className="flex items-center gap-1.5 text-xs desk:text-sm text-slate-600 hover:text-slate-400 transition-colors w-full text-left truncate"
            >
              <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
              <span className={cn('truncate', item.notas && 'text-amber-500/80 italic')}>
                {item.notas || 'Nota...'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
