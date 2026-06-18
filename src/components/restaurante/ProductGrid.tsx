'use client'

import { Producto } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { Camera } from 'lucide-react'
import Image from 'next/image'

export default function ProductGrid({ productos, onSelect }: { productos: Producto[]; onSelect: (p: Producto) => void }) {
  return (
    <div className="flex-1 h-full overflow-auto p-3 desk:p-5">
      <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 desk:grid-cols-6 gap-2.5 desk:gap-4 auto-rows-min content-start">
        {productos.map(p => (
          <ProductTile key={p.id} producto={p} onSelect={onSelect} />
        ))}
        {productos.length === 0 && (
          <div className="col-span-6 flex items-center justify-center h-40 text-slate-400">
            <p className="text-sm desk:text-base">Sin productos en esta categoría</p>
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
        'rounded-xl border border-slate-200 bg-white p-2.5 desk:p-4',
        'text-left transition-all active:scale-[0.96]',
        'hover:border-slate-400 hover:shadow-sm',
        'flex flex-col gap-1.5 desk:gap-3 min-h-[100px] desk:min-h-[180px]'
      )}
    >
      {producto.imagen_url ? (
        <div className="w-full h-16 desk:h-28 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
          <Image
            src={producto.imagen_url}
            alt={producto.nombre}
            width={200}
            height={112}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-16 desk:h-28 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
          <Camera className="h-5 w-5 desk:h-8 desk:w-8 text-slate-300" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs desk:text-sm font-bold text-slate-700 leading-tight line-clamp-2">{producto.nombre}</p>
      </div>
      <p className="text-xs desk:text-sm font-black text-slate-800">
        {producto.tiene_variantes ? 'Elegir →' : formatCurrency(producto.precio)}
      </p>
    </button>
  )
}
