'use client'

import { useState } from 'react'
import { Producto, ItemOrden, VarianteOpcion } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, generateId, cn } from '@/lib/utils'

interface VariantModalProps {
  producto: Producto | null
  open: boolean
  onClose: () => void
  onAdd: (item: ItemOrden) => void
}

export default function VariantModal({ producto, open, onClose, onAdd }: VariantModalProps) {
  const [selections, setSelections] = useState<Record<string, string | VarianteOpcion>>({})

  if (!producto) return null

  function handleSelect(grupo: string, opcion: string | VarianteOpcion) {
    setSelections(prev => ({ ...prev, [grupo]: opcion }))
  }

  function calcPrecio(): number {
    let total = producto!.precio
    for (const val of Object.values(selections)) {
      if (val && typeof val === 'object' && 'precio' in val) {
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
    <Dialog open={open} onOpenChange={o => { if (!o) { setSelections({}); onClose() } }}>
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
                        'px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.97]',
                        isSelected ? 'border-slate-800 bg-slate-800 text-white' : 'border-border hover:border-slate-500'
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
