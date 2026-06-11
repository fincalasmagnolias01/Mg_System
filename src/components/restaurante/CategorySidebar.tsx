'use client'

import { Categoria } from '@/types'
import { cn } from '@/lib/utils'
import {
  Wine, Beer, Coffee, GlassWater, Droplets, Utensils,
  Salad, Cookie, Sandwich, Flame, Package, Soup,
  Pizza, Star, ShoppingBag, Beef, IceCream,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

function getCatIcon(nombre: string): LucideIcon {
  const n = nombre.toLowerCase()
  if (n.includes('coctel') || n.includes('cocktail') || n.includes('trago') || n.includes('ron') || n.includes('whisky') || n.includes('vodka')) return Wine
  if (n.includes('cubeta') || n.includes('bucket')) return Beer
  if (n.includes('cerveza') || n.includes('beer')) return Beer
  if (n.includes('agua') && (n.includes('deport') || n.includes('mineral') || n.includes('pura'))) return Droplets
  if (n.includes('agua') || n.includes('refresco') || n.includes('soda') || n.includes('jugo') || n.includes('bebida')) return GlassWater
  if (n.includes('cafe') || n.includes('café') || n.includes('capuchino') || n.includes('latte') || n.includes('expreso')) return Coffee
  if (n.includes('entrada') || n.includes('aperit') || n.includes('botana') || n.includes('nacho')) return Salad
  if (n.includes('postre') || n.includes('dulce') || n.includes('pastel') || n.includes('cake')) return Cookie
  if (n.includes('helado') || n.includes('nieve')) return IceCream
  if (n.includes('sopa') || n.includes('caldo') || n.includes('crema')) return Soup
  if (n.includes('sandwich') || n.includes('sandwich') || n.includes('wrap') || n.includes('torta')) return Sandwich
  if (n.includes('pizza')) return Pizza
  if (n.includes('carne') || n.includes('beef') || n.includes('churrasco') || n.includes('costilla')) return Beef
  if (n.includes('combo') || n.includes('paquete') || n.includes('promo') || n.includes('especial')) return Package
  if (n.includes('fuente') || n.includes('parrilla') || n.includes('grill') || n.includes('asado')) return Flame
  if (n.includes('variado') || n.includes('misc') || n.includes('otros')) return ShoppingBag
  if (n.includes('especial') || n.includes('premium') || n.includes('firma')) return Star
  return Utensils
}

interface CategorySidebarProps {
  categorias: Categoria[]
  selected: string | null
  onSelect: (id: string) => void
}

export default function CategorySidebar({ categorias, selected, onSelect }: CategorySidebarProps) {
  return (
    <aside className="w-40 bg-slate-900 flex flex-col h-full flex-shrink-0 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-slate-800">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Menú</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {categorias.map(cat => {
          const Icon = getCatIcon(cat.nombre)
          const isSelected = selected === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'w-full rounded-xl px-2.5 py-2.5 flex flex-col items-center gap-1.5 transition-all active:scale-[0.97]',
                isSelected
                  ? 'bg-white/15 text-white'
                  : 'text-slate-500 hover:bg-white/8 hover:text-slate-300'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" strokeWidth={isSelected ? 2 : 1.5} />
              <span className="text-[10px] font-semibold leading-tight text-center line-clamp-2">
                {cat.nombre}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
