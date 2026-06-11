'use client'

import { useState } from 'react'
import { Producto, ItemOrden, VarianteOpcion } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default function ProductGrid({ productos, onSelect }: { productos: Producto[]; onSelect: (p: Producto) => void }) {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-4 grid grid-cols-3 xl:grid-cols-4 gap-3">
        {productos.map(p => (
          <ProductTile key={p.id} producto={p} onSelect={onSelect} />
        ))}
        {productos.length === 0 && (
          <div className="col-span-4 flex items-center justify-center h-48 text-slate-400">
            <p>Sin productos en esta categoría</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

function ProductTile({ producto, onSelect }: { producto: Producto; onSelect: (p: Producto) => void }) {
  return (
    <button
      onClick={() => onSelect(producto)}
      className={cn(
        'group relative rounded-2xl border-2 border-border bg-white p-3',
        'text-left transition-all active:scale-[0.96]',
        'hover:border-blue-400 hover:shadow-md',
        'flex flex-col gap-2 min-h-[110px]'
      )}
    >
      {producto.imagen_url ? (
        <div className="w-full h-16 rounded-xl overflow-hidden bg-slate-100">
          <Image src={producto.imagen_url} alt={producto.nombre} width={120} height={64} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <span className="text-xs text-slate-400 font-medium text-center leading-tight px-1">
            {producto.nombre.slice(0, 20)}
          </span>
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">{producto.nombre}</p>
      </div>
      <p className="text-sm font-black text-blue-600">
        {producto.tiene_variantes ? 'Elegir →' : formatCurrency(producto.precio)}
      </p>
    </button>
  )
}

/* ── Variant selection modal ─────────────────────────────── */

interface VariantModalProps {
  producto: Producto | null
  open: boolean
  onClose: () => void
  onAdd: (item: ItemOrden) => void
}

export function VariantModal({ producto, open, onClose, onAdd }: VariantModalProps) {
  const [selections, setSelections] = useState<Record<string, string | VarianteOpcion>>({})

  if (!producto) return null

  function handleSelect(grupo: string, opcion: string | VarianteOpcion) {
    setSelections(prev => ({ ...prev, [grupo]: opcion }))
  }

  function calcPrecio(): number {
    let total = producto!.precio
    for (const val of Object.values(selections)) {
      if (typeof val === 'object' && 'precio' in val) {
        total += (val as VarianteOpcion).precio
      }
    }
    return total
  }

  function handleAdd() {
    const precio = calcPrecio()
    const varianteParsed: Record<string, string> = {}
    for (const [k, v] of Object.entries(selections)) {
      varianteParsed[k] = typeof v === 'string' ? v : (v as VarianteOpcion).nombre
    }
    onAdd({
      tempId: generateId(),
      producto_id: producto!.id,
      nombre_producto: `${producto!.nombre}${Object.values(varianteParsed).length ? ' - ' + Object.values(varianteParsed).join(' / ') : ''}`,
      cantidad: 1,
      precio_unitario: precio,
      subtotal: precio,
      variante: varianteParsed,
    })
    setSelections({})
    onClose()
  }

  const allSelected = producto.variantes.every(v => selections[v.grupo] !== undefined)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelections({}); onClose() } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{producto.nombre}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {producto.variantes.map(grupo => (
            <div key={grupo.grupo}>
              <p className="text-sm font-bold text-slate-600 mb-2 capitalize">{grupo.grupo}</p>
              <div className="flex flex-wrap gap-2">
                {(grupo.opciones as (string | VarianteOpcion)[]).map((op, i) => {
                  const label = typeof op === 'string' ? op : (op as VarianteOpcion).nombre
                  const isSelected = typeof selections[grupo.grupo] === 'string'
                    ? selections[grupo.grupo] === op
                    : (selections[grupo.grupo] as VarianteOpcion)?.nombre === label
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(grupo.grupo, op)}
                      className={cn(
                        'px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all',
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-border hover:border-blue-400'
                      )}
                    >
                      {label}
                      {typeof op !== 'string' && (op as VarianteOpcion).precio > 0 && (
                        <span className="ml-1 opacity-75">+{formatCurrency((op as VarianteOpcion).precio)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button size="lg" onClick={handleAdd} disabled={!allSelected} className="px-8">
            Agregar · {formatCurrency(calcPrecio())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
