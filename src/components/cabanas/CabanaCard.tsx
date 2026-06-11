'use client'

import { Cabana, EstadoCabana } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Users, Clock } from 'lucide-react'

const ESTADO_CONFIG: Record<EstadoCabana, {
  label: string
  bg: string
  border: string
  badge: 'success' | 'destructive' | 'warning' | 'info' | 'muted'
  dot: string
}> = {
  disponible:    { label: 'Disponible',   bg: 'bg-emerald-50', border: 'border-emerald-400', badge: 'success',     dot: 'bg-emerald-500' },
  ocupada:       { label: 'Ocupada',      bg: 'bg-red-50',     border: 'border-red-400',     badge: 'destructive', dot: 'bg-red-500'     },
  reservada:     { label: 'Reservada',    bg: 'bg-yellow-50',  border: 'border-yellow-400',  badge: 'warning',     dot: 'bg-yellow-500'  },
  limpieza:      { label: 'Limpieza',     bg: 'bg-blue-50',    border: 'border-blue-400',    badge: 'info',        dot: 'bg-blue-500'    },
  mantenimiento: { label: 'Mantenimiento',bg: 'bg-gray-100',   border: 'border-gray-400',    badge: 'muted',       dot: 'bg-gray-500'    },
}

interface CabanaCardProps {
  cabana: Cabana
  onClick: () => void
}

export default function CabanaCard({ cabana, onClick }: CabanaCardProps) {
  const cfg = ESTADO_CONFIG[cabana.estado]
  const hospedaje = cabana.hospedaje_activo

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border-2 p-5 text-left transition-all duration-150',
        'active:scale-[0.97] hover:shadow-lg select-none',
        cfg.bg, cfg.border
      )}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cabaña</p>
          <h3 className="text-3xl font-black text-slate-800">#{cabana.numero}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-full animate-pulse', cfg.dot)} />
          <Badge variant={cfg.badge} className="font-semibold text-xs">
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Guest info */}
      {hospedaje ? (
        <div className="mt-2 space-y-1">
          <p className="font-semibold text-slate-700 text-sm truncate">
            {hospedaje.clientes?.nombre ?? 'Huésped'}
          </p>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {hospedaje.adultos + hospedaje.ninos + hospedaje.bebes} personas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {hospedaje.tipo === 'noche' ? 'Noche' : 'Día'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <Users className="h-3 w-3" />
            Hasta {cabana.capacidad_max} personas
          </p>
          {cabana.estado === 'disponible' && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">
              Toque para check-in
            </p>
          )}
        </div>
      )}

      {/* Bottom: price hint */}
      <div className="mt-3 pt-3 border-t border-current border-opacity-10">
        <p className="text-xs text-slate-400">
          Q{cabana.precio_adulto_noche.toFixed(0)} / adulto · noche
        </p>
      </div>
    </button>
  )
}
