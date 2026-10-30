'use client'

import { useState, useMemo } from 'react'
import { Producto } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { Search, ChevronRight, Layers } from 'lucide-react'
import Image from 'next/image'

export default function ProductGrid({ productos, onSelect }: { productos: Producto[]; onSelect: (p: Producto) => void }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return productos
    const q = search.toLowerCase()
    return productos.filter(p => p.nombre.toLowerCase().includes(q))
  }, [productos, search])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Search bar */}
      <div className="px-4 desk:px-6 py-3 desk:py-4 flex-shrink-0 border-b border-slate-800/60">
        <div className="relative">
          <Search className="absolute left-3 desk:left-4 top-1/2 -translate-y-1/2 h-4 w-4 desk:h-5 desk:w-5 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full h-10 desk:h-12 bg-slate-800/80 border border-slate-700/60 rounded-xl pl-10 desk:pl-12 pr-4 text-sm desk:text-base text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 focus:bg-slate-800 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-lg leading-none"
            >×</button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4 desk:p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600">
            <Search className="h-12 w-12 desk:h-16 desk:w-16" strokeWidth={1} />
            <p className="text-sm desk:text-base font-medium">
              {search ? `Sin resultados para "${search}"` : 'Sin productos en esta categoría'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 desk:grid-cols-6 gap-3 desk:gap-4 auto-rows-min content-start">
            {filtered.map(p => (
              <ProductTile key={p.id} producto={p} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProductTile({ producto, onSelect }: { producto: Producto; onSelect: (p: Producto) => void }) {
  const initial = producto.nombre.charAt(0).toUpperCase()

  return (
    <button
      onClick={() => onSelect(producto)}
      className={cn(
        'group relative rounded-2xl overflow-hidden text-left transition-all duration-150',
        'bg-slate-800/80 border border-slate-700/50',
        'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.02]',
        'active:scale-[0.97] flex flex-col',
        'min-h-[140px] desk:min-h-[200px]'
      )}
    >
      {/* Image / Placeholder */}
      <div className="relative w-full h-24 desk:h-36 flex-shrink-0 overflow-hidden">
        {producto.imagen_url ? (
          <>
            <Image
              src={producto.imagen_url}
              alt={producto.nombre}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <span className="text-4xl desk:text-5xl font-black text-slate-600 select-none">{initial}</span>
          </div>
        )}

        {/* Variant badge */}
        {producto.tiene_variantes && (
          <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-sm border border-slate-600 rounded-lg px-2 py-0.5 flex items-center gap-1">
            <Layers className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] desk:text-xs font-bold text-amber-400">Variantes</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between p-2.5 desk:p-3.5 gap-1">
        <p className="text-xs desk:text-sm font-semibold text-slate-200 leading-tight line-clamp-2 group-hover:text-white transition-colors">
          {producto.nombre}
        </p>
        <div className="flex items-center justify-between mt-1">
          {producto.tiene_variantes ? (
            <span className="text-xs desk:text-sm font-bold text-amber-400 flex items-center gap-0.5">
              Elegir <ChevronRight className="h-3 w-3" />
            </span>
          ) : (
            <span className="text-sm desk:text-base font-black text-amber-400">
              {formatCurrency(producto.precio)}
            </span>
          )}
        </div>
      </div>

      {/* Hover indicator bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
    </button>
  )
}
