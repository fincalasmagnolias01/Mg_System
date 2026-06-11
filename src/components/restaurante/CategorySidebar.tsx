'use client'

import { Categoria } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface CategorySidebarProps {
  categorias: Categoria[]
  selected: string | null
  onSelect: (id: string) => void
}

export default function CategorySidebar({ categorias, selected, onSelect }: CategorySidebarProps) {
  return (
    <aside className="w-44 bg-slate-900 flex flex-col h-full flex-shrink-0">
      <div className="p-3 border-b border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Categorías</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={cn(
                'w-full text-left px-3 py-3 rounded-xl transition-all text-sm font-semibold',
                'flex items-center gap-2 active:scale-[0.97]',
                selected === cat.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <span className="text-base leading-none">{cat.icono}</span>
              <span className="leading-tight">{cat.nombre}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </aside>
  )
}
