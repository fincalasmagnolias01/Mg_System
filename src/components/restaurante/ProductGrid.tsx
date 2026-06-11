'use client'

import { useState } from 'react'
import { Producto, ItemOrden, VarianteOpcion } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, generateId } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Camera } from 'lucide-react'
import Image from 'next/image'

export default function ProductGrid({ productos, onSelect }: { productos: Producto[]; onSelect: (p: Producto) => void }) {
  return (
    <div className="flex-1 h-full overflow-hidden">
      <div className="h-full overflow-auto p-3 grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 auto-rows-min content-start">
        {productos.map(p => (
          <ProductTile key={p.id} producto={p} onSelect={onSelect} />
        ))}
        {productos.length === 0 && (
          <div className="col-span-4 flex items-center justify-center h-40 text-slate-400">
            <p className="text-sm">Sin productos en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ProductTile({ producto, onSelect }: { producto: Producto; onSelect: (p: Producto) => void }) {
  return (
    <button
      onClick={() => onSelect(producto)}
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-2.5',
        'text-left transition-all active:scale-[0.96]',
        'hover:border-slate-400 hover:shadow-sm',
        'flex flex-col gap-1.5 min-h-[100px]'
      )}
    >
      {producto.imagen_url ? (
        <div className="w-full h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          <Image src={producto.imagen_url} alt={producto.nombre} width={120} height={56} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-14 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Camera className="h-5 w-5 text-slate-300" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">{producto.nombre}</p>
      </div>
      <p className="text-xs font-black text-slate-800">
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
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-border hover:border-slate-500'
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
          <Button size="lg" onClick={handleAdd} disabled={!allSelected} className="px-8 bg-slate-800 hover:bg-slate-700">
            Agregar · {formatCurrency(calcPrecio())}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
