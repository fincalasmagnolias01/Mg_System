'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { ChefHat, CheckCircle2, Clock, Timer, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KitchenOrder {
  id: string
  mesa: string | null
  created_at: string
  estado: string
  detalle_orden: { nombre_producto: string; cantidad: number; variante?: Record<string, string> }[]
}

function ElapsedTime({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('')
  const [mins, setMins] = useState(0)

  useEffect(() => {
    function update() {
      const diff = Math.floor((Date.now() - new Date(since).getTime()) / 1000)
      const m = Math.floor(diff / 60)
      const s = diff % 60
      setMins(m)
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [since])

  return (
    <span className={cn(
      'font-mono text-sm font-bold px-2 py-0.5 rounded-lg flex items-center gap-1',
      mins >= 15 ? 'text-red-400 bg-red-900/40' :
      mins >= 8  ? 'text-amber-400 bg-amber-900/40' :
                   'text-emerald-400 bg-emerald-900/40'
    )}>
      <Clock className="h-3 w-3" />
      {elapsed}
    </span>
  )
}

export default function KitchenView() {
  const [ordenes, setOrdenes] = useState<KitchenOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrdenes = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('ordenes')
      .select('id, mesa, created_at, estado, detalle_orden(nombre_producto, cantidad, variante)')
      .in('estado', ['enviada_cocina', 'en_preparacion'])
      .order('created_at', { ascending: true })
    if (data) setOrdenes(data as KitchenOrder[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchOrdenes()
    const supabase = createClient()
    const ch = supabase
      .channel('kitchen-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordenes' }, fetchOrdenes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'detalle_orden' }, fetchOrdenes)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchOrdenes])

  async function handleEnPrep(id: string) {
    await createClient().from('ordenes').update({ estado: 'en_preparacion' }).eq('id', id)
    fetchOrdenes()
  }

  async function handleLista(id: string) {
    await createClient().from('ordenes').update({ estado: 'lista' }).eq('id', id)
    fetchOrdenes()
  }

  if (loading) {
    return (
      <div className="flex-1 bg-slate-950 flex items-center justify-center">
        <ChefHat className="h-12 w-12 text-slate-700 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex-1 bg-slate-950 overflow-auto">
      {ordenes.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600">
          <ChefHat className="h-20 w-20 text-slate-800" strokeWidth={1} />
          <p className="text-xl font-bold text-slate-500">Sin órdenes pendientes</p>
          <p className="text-sm text-slate-700">Las órdenes enviadas desde el POS aparecerán aquí</p>
        </div>
      ) : (
        <div className="p-5 grid grid-cols-3 gap-4">
          {ordenes.map(orden => {
            const enPrep = orden.estado === 'en_preparacion'
            return (
              <div
                key={orden.id}
                className={cn(
                  'rounded-2xl flex flex-col gap-3 p-4 border-2 transition-all',
                  enPrep
                    ? 'bg-amber-950/60 border-amber-600'
                    : 'bg-slate-900 border-slate-700'
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {enPrep && <Flame className="h-4 w-4 text-amber-500" />}
                    <span className="text-white font-black text-lg">
                      {orden.mesa ? `Mesa ${orden.mesa}` : 'Sin mesa'}
                    </span>
                  </div>
                  <ElapsedTime since={orden.created_at} />
                </div>

                {/* Items */}
                <div className="flex-1 space-y-2">
                  {orden.detalle_orden.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="text-2xl font-black text-white w-7 text-center flex-shrink-0 leading-tight">
                        {item.cantidad}
                      </span>
                      <div>
                        <p className="text-white font-semibold text-sm leading-tight">{item.nombre_producto}</p>
                        {item.variante && Object.values(item.variante).length > 0 && (
                          <p className="text-slate-400 text-xs mt-0.5">{Object.values(item.variante).join(' / ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  {!enPrep && (
                    <button
                      onClick={() => handleEnPrep(orden.id)}
                      className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                    >
                      <Timer className="h-4 w-4" />
                      Preparando
                    </button>
                  )}
                  <button
                    onClick={() => handleLista(orden.id)}
                    className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Lista
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
