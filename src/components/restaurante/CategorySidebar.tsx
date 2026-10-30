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
  if (n.includes('cubeta') || n.includes('bucket') || n.includes('cerveza') || n.includes('beer')) return Beer
  if (n.includes('agua') && (n.includes('deport') || n.includes('mineral') || n.includes('pura'))) return Droplets
  if (n.includes('agua') || n.includes('refresco') || n.includes('soda') || n.includes('jugo') || n.includes('bebida')) return GlassWater
  if (n.includes('cafe') || n.includes('café') || n.includes('capuchino') || n.includes('latte') || n.includes('expreso')) return Coffee
  if (n.includes('entrada') || n.includes('aperit') || n.includes('botana') || n.includes('nacho')) return Salad
  if (n.includes('postre') || n.includes('dulce') || n.includes('pastel') || n.includes('cake')) return Cookie
  if (n.includes('helado') || n.includes('nieve')) return IceCream
  if (n.includes('sopa') || n.includes('caldo') || n.includes('crema')) return Soup
  if (n.includes('sandwich') || n.includes('wrap') || n.includes('torta')) return Sandwich
  if (n.includes('pizza')) return Pizza
  if (n.includes('carne') || n.includes('beef') || n.includes('churrasco') || n.includes('costilla')) return Beef
  if (n.includes('combo') || n.includes('paquete') || n.includes('promo')) return Package
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
    <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800">
      <div className="flex items-center gap-2 px-4 desk:px-6 py-3 desk:py-4 overflow-x-auto scrollbar-none">
        {categorias.map(cat => {
          const Icon = getCatIcon(cat.nombre)
          const isSelected = selected === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'flex items-center gap-2 desk:gap-2.5 px-4 desk:px-5 h-10 desk:h-12 rounded-full flex-shrink-0',
                'text-sm desk:text-base font-bold transition-all active:scale-[0.95]',
                isSelected
                  ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              )}
            >
              <Icon className={cn('flex-shrink-0', isSelected ? 'h-4 w-4 desk:h-5 desk:w-5' : 'h-4 w-4 desk:h-5 desk:w-5')} strokeWidth={isSelected ? 2.5 : 1.75} />
              <span className="whitespace-nowrap">{cat.nombre}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
