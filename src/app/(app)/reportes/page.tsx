'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, TrendingUp, Home, Utensils, CalendarDays, Loader2 } from 'lucide-react'

interface ResumenStats {
  totalVentas: number
  totalFacturas: number
  cabanasOcupadas: number
  eventosActivos: number
  ordenesDia: number
  ingresosDia: number
}

export default function ReportesPage() {
  const router = useRouter()
  const [tab, setTab] = useState('resumen')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ResumenStats>({
    totalVentas: 0, totalFacturas: 0, cabanasOcupadas: 0,
    eventosActivos: 0, ordenesDia: 0, ingresosDia: 0,
  })
  const [ventasRestaurante, setVentasRestaurante] = useState<{ nombre: string; total: number }[]>([])
  const [hospedajesActivos, setHospedajesActivos] = useState<{ cabana: string; cliente: string; tipo: string; subtotal: number }[]>([])
  const [eventosLista, setEventosLista] = useState<{ cliente: string; fecha: string; estado: string; total: number }[]>([])

  useEffect(() => {
    const supabase = createClient()
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    Promise.all([
      supabase.from('movimientos_caja').select('monto').eq('tipo', 'ingreso').gte('created_at', inicioHoy),
      supabase.from('ordenes').select('id, total').eq('estado', 'pagada').gte('created_at', inicioHoy),
      supabase.from('cabanas').select('id').eq('estado', 'ocupada'),
      supabase.from('eventos').select('id').in('estado', ['confirmado', 'en_curso']),
      supabase.from('facturas').select('id, total').gte('created_at', inicioHoy),
      supabase.from('hospedajes').select('subtotal, tipo, estado, cabanas(nombre), clientes(nombre)').eq('estado', 'activo'),
      supabase.from('detalle_orden').select('nombre_producto, subtotal').gte('created_at', inicioHoy),
      supabase.from('eventos').select('clientes(nombre), fecha_evento, estado, total').order('fecha_evento', { ascending: false }).limit(10),
    ]).then(([movimientos, ordenes, cabanas, eventos, facturas, hospedajes, detalles, eventosData]) => {
      const ingHoy = (movimientos.data ?? []).reduce((s: number, m: { monto: number }) => s + m.monto, 0)
      setStats({
        totalVentas: ingHoy,
        totalFacturas: (facturas.data ?? []).length,
        cabanasOcupadas: (cabanas.data ?? []).length,
        eventosActivos: (eventos.data ?? []).length,
        ordenesDia: (ordenes.data ?? []).length,
        ingresosDia: ingHoy,
      })

      // Top productos
      const agrupados: Record<string, number> = {}
      ;(detalles.data ?? []).forEach((d: { nombre_producto: string; subtotal: number }) => {
        agrupados[d.nombre_producto] = (agrupados[d.nombre_producto] ?? 0) + d.subtotal
      })
      const top = Object.entries(agrupados).sort(([, a], [, b]) => b - a).slice(0, 8)
      setVentasRestaurante(top.map(([nombre, total]) => ({ nombre, total })))

      // Hospedajes activos
      setHospedajesActivos(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (hospedajes.data ?? []).map((h: any) => ({
          cabana: Array.isArray(h.cabanas) ? h.cabanas[0]?.nombre ?? '' : h.cabanas?.nombre ?? '',
          cliente: Array.isArray(h.clientes) ? h.clientes[0]?.nombre ?? '' : h.clientes?.nombre ?? '',
          tipo: h.tipo,
          subtotal: h.subtotal,
        }))
      )

      // Eventos
      setEventosLista(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (eventosData.data ?? []).map((e: any) => ({
          cliente: Array.isArray(e.clientes) ? e.clientes[0]?.nombre ?? '' : e.clientes?.nombre ?? '',
          fecha: e.fecha_evento,
          estado: e.estado,
          total: e.total,
        }))
      )

      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Reportes
          </h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Ingresos Hoy', value: formatCurrency(stats.ingresosDia), icon: '💰', color: 'text-green-600 bg-green-50' },
            { label: 'Órdenes Hoy', value: stats.ordenesDia.toString(), icon: '🧾', color: 'text-blue-600 bg-blue-50' },
            { label: 'Cabañas Ocupadas', value: `${stats.cabanasOcupadas}/8`, icon: '🏡', color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Eventos Activos', value: stats.eventosActivos.toString(), icon: '🎉', color: 'text-violet-600 bg-violet-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border p-4">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
              <p className={`text-2xl font-black ${s.color.split(' ')[0]}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="restaurante" className="gap-1.5">
              <Utensils className="h-4 w-4" />Restaurante
            </TabsTrigger>
            <TabsTrigger value="cabanas" className="gap-1.5">
              <Home className="h-4 w-4" />Cabañas
            </TabsTrigger>
            <TabsTrigger value="eventos" className="gap-1.5">
              <CalendarDays className="h-4 w-4" />Eventos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurante">
            <div className="bg-white rounded-2xl border p-4">
              <h3 className="font-bold text-slate-700 mb-4">Top Productos del Día</h3>
              <div className="space-y-2">
                {ventasRestaurante.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Sin ventas hoy</p>
                ) : ventasRestaurante.map((p, i) => (
                  <div key={p.nombre} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-slate-700">{p.nombre}</span>
                    <span className="font-bold text-blue-600">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="cabanas">
            <div className="bg-white rounded-2xl border p-4">
              <h3 className="font-bold text-slate-700 mb-4">Hospedajes Activos</h3>
              {hospedajesActivos.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Sin hospedajes activos</p>
              ) : (
                <div className="space-y-2">
                  {hospedajesActivos.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <span className="font-black text-emerald-600">{h.cabana}</span>
                      <span className="flex-1 text-sm text-slate-700">{h.cliente}</span>
                      <Badge variant={h.tipo === 'noche' ? 'info' : 'warning'}>{h.tipo}</Badge>
                      <span className="font-bold">{formatCurrency(h.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="eventos">
            <div className="bg-white rounded-2xl border p-4">
              <h3 className="font-bold text-slate-700 mb-4">Últimos Eventos</h3>
              {eventosLista.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Sin eventos</p>
              ) : (
                <div className="space-y-2">
                  {eventosLista.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                      <span className="flex-1 font-semibold text-slate-700">{e.cliente}</span>
                      <span className="text-xs text-slate-400">{formatDate(e.fecha)}</span>
                      <Badge variant="outline" className="text-xs capitalize">{e.estado}</Badge>
                      <span className="font-bold">{formatCurrency(e.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
