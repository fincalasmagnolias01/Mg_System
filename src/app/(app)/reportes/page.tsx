'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  House, Lock, Utensils, BedDouble, CalendarDays,
  Loader2, FileText, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import CierreCajaModal from '@/components/reportes/CierreCajaModal'

type Period  = 'hoy' | 'semana' | 'mes'
type ModTab  = 'todos' | 'restaurante' | 'cabanas' | 'eventos' | 'cierres'

interface OrdenRow     { id: string; hora: string; numero: number; mesa: string; total: number }
interface HospedajeRow { id: string; fecha: string; cabana: string; cliente: string; tipo: string; total: number }
interface EventoRow    { id: string; fecha: string; cliente: string; estado: string; total: number; anticipo: number; saldo: number }
interface CierreRow    { id: string; fecha: string; hora: string; restaurante: number; cabanas: number; eventos: number; total: number; notas?: string | null }

function getPeriodStart(p: Period): string {
  const now = new Date()
  const hoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (p === 'hoy')    return hoy.toISOString()
  if (p === 'semana') { const d = new Date(hoy); d.setDate(d.getDate() - 7); return d.toISOString() }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoy',    label: 'Hoy'    },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mes'    },
]

const MODTABS: { key: ModTab; label: string; icon: typeof Utensils }[] = [
  { key: 'todos',       label: 'Todos',        icon: FileText    },
  { key: 'restaurante', label: 'Restaurante',  icon: Utensils    },
  { key: 'cabanas',     label: 'Cabañas',      icon: BedDouble   },
  { key: 'eventos',     label: 'Eventos',      icon: CalendarDays },
  { key: 'cierres',     label: 'Cierres',      icon: Lock        },
]

const ESTADO_LABELS: Record<string, string> = {
  cotizacion: 'Cotización', confirmado: 'Confirmado', en_curso: 'En Curso',
  completado: 'Completado', cancelado: 'Cancelado',
}
const ESTADO_COLORS: Record<string, string> = {
  cotizacion: 'bg-slate-100 text-slate-600',
  confirmado: 'bg-blue-100 text-blue-700',
  en_curso:   'bg-amber-100 text-amber-700',
  completado: 'bg-emerald-100 text-emerald-700',
  cancelado:  'bg-red-100 text-red-600',
}

export default function ReportesPage() {
  const router = useRouter()
  const [period,  setPeriod]  = useState<Period>('hoy')
  const [modTab,  setModTab]  = useState<ModTab>('todos')
  const [showCierre, setShowCierre] = useState(false)
  const [loading, setLoading] = useState(true)

  const [ordenes,    setOrdenes]    = useState<OrdenRow[]>([])
  const [hospedajes, setHospedajes] = useState<HospedajeRow[]>([])
  const [eventos,    setEventos]    = useState<EventoRow[]>([])
  const [cierres,    setCierres]    = useState<CierreRow[]>([])
  const [expandedC,  setExpandedC]  = useState<string | null>(null)

  const fetchCierres = useCallback(async () => {
    const { data } = await createClient()
      .from('cierres_caja').select('*').order('fecha', { ascending: false }).limit(90)
    if (data) setCierres(data.map((c: any) => ({
      id: c.id, fecha: c.fecha,
      hora: new Date(c.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      restaurante: c.total_restaurante, cabanas: c.total_cabanas,
      eventos: c.total_eventos, total: c.total_general, notas: c.notas,
    })))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const desde = getPeriodStart(period)
    const supabase = createClient()
    const [ord, hosp, ev] = await Promise.all([
      supabase.from('ordenes').select('id, numero_orden, mesa, total, created_at')
        .eq('estado', 'pagada').gte('created_at', desde).order('created_at', { ascending: false }),
      supabase.from('hospedajes').select('id, subtotal, tipo, created_at, cabanas(nombre), clientes(nombre)')
        .gte('created_at', desde).order('created_at', { ascending: false }),
      supabase.from('eventos').select('id, fecha_evento, estado, total, anticipo, saldo_pendiente, created_at, clientes(nombre)')
        .gte('created_at', desde).order('created_at', { ascending: false }),
    ])

    setOrdenes((ord.data ?? []).map((o: any) => ({
      id: o.id,
      hora: new Date(o.created_at).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
      numero: o.numero_orden, mesa: o.mesa ?? '—', total: o.total,
    })))
    setHospedajes((hosp.data ?? []).map((h: any) => ({
      id: h.id,
      fecha: new Date(h.created_at).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' }),
      cabana:  Array.isArray(h.cabanas)  ? h.cabanas[0]?.nombre  ?? '—' : h.cabanas?.nombre  ?? '—',
      cliente: Array.isArray(h.clientes) ? h.clientes[0]?.nombre ?? '—' : h.clientes?.nombre ?? '—',
      tipo: h.tipo, total: h.subtotal,
    })))
    setEventos((ev.data ?? []).map((e: any) => ({
      id: e.id,
      fecha: new Date(e.fecha_evento + 'T12:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit' }),
      cliente: Array.isArray(e.clientes) ? e.clientes[0]?.nombre ?? '—' : e.clientes?.nombre ?? '—',
      estado: e.estado, total: e.total, anticipo: e.anticipo, saldo: e.saldo_pendiente,
    })))
    setLoading(false)
  }, [period])

  useEffect(() => { fetchData(); fetchCierres() }, [fetchData, fetchCierres])

  const totalRest = ordenes.reduce((s, o) => s + o.total, 0)
  const totalCab  = hospedajes.reduce((s, h) => s + h.total, 0)
  const totalEv   = eventos.reduce((s, e) => s + e.total, 0)
  const totalGen  = totalRest + totalCab + totalEv

  const periodLabel = period === 'hoy' ? 'Hoy' : period === 'semana' ? 'Esta semana' : 'Este mes'

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col">
      {/* ── Header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-5 h-14 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-11 h-11 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-all active:scale-[0.96]"
        >
          <House className="h-5 w-5 text-slate-500" />
        </button>
        <h1 className="text-base font-black text-slate-800">Reportes</h1>
        <div className="flex-1" />

        {/* Period selector */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-4 h-8 rounded-lg text-sm font-bold transition-all',
                period === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCierre(true)}
          className="flex items-center gap-2 h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-black text-sm transition-all active:scale-[0.97]"
        >
          <Lock className="h-4 w-4" />
          Cerrar Caja
        </button>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">

          {/* ── Summary bar ─────────────────────────────────────── */}
          <div className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-stretch gap-0">
              <SummaryCell icon={Utensils} label="Restaurante" count={ordenes.length} unit="órdenes"
                total={totalRest} color="text-amber-600" iconBg="bg-amber-50" border="border-amber-200" />
              <div className="w-px bg-slate-200 mx-6" />
              <SummaryCell icon={BedDouble} label="Cabañas" count={hospedajes.length} unit="hospedajes"
                total={totalCab} color="text-teal-600" iconBg="bg-teal-50" border="border-teal-200" />
              <div className="w-px bg-slate-200 mx-6" />
              <SummaryCell icon={CalendarDays} label="Eventos" count={eventos.length} unit="eventos"
                total={totalEv} color="text-violet-600" iconBg="bg-violet-50" border="border-violet-200" />
              <div className="flex-1" />
              <div className="text-right pl-6 border-l border-slate-200 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{periodLabel}</p>
                <p className="text-3xl font-black text-slate-900 mt-0.5">{formatCurrency(totalGen)}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ordenes.length + hospedajes.length + eventos.length} transacciones</p>
              </div>
            </div>
          </div>

          {/* ── Module tabs ─────────────────────────────────────── */}
          <div className="bg-white border-b border-slate-200 px-5">
            <div className="flex">
              {MODTABS.map(t => {
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    onClick={() => setModTab(t.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all',
                      modTab === t.key
                        ? 'border-slate-800 text-slate-900'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                    {t.key === 'cierres' && cierres.length > 0 && (
                      <span className="ml-0.5 text-[10px] font-black bg-slate-200 text-slate-500 rounded-md px-1.5 py-0.5">
                        {cierres.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Table content ───────────────────────────────────── */}
          <div className="p-5">
            {modTab === 'todos'       && <TableTodos ordenes={ordenes} hospedajes={hospedajes} eventos={eventos} />}
            {modTab === 'restaurante' && <TableRestaurante ordenes={ordenes} />}
            {modTab === 'cabanas'     && <TableCabanas hospedajes={hospedajes} />}
            {modTab === 'eventos'     && <TableEventos eventos={eventos} />}
            {modTab === 'cierres'     && <TableCierres cierres={cierres} expanded={expandedC} onExpand={setExpandedC} />}
          </div>
        </div>
      )}

      <CierreCajaModal open={showCierre} onClose={() => setShowCierre(false)} onClosed={fetchCierres} />
    </div>
  )
}

/* ── Summary cell ──────────────────────────────────────────── */
function SummaryCell({ icon: Icon, label, count, unit, total, color, iconBg, border }: {
  icon: React.ElementType; label: string; count: number; unit: string
  total: number; color: string; iconBg: string; border: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', iconBg, border)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={cn('text-xl font-black', color)}>{formatCurrency(total)}</p>
        <p className="text-[11px] text-slate-400">{count} {unit}</p>
      </div>
    </div>
  )
}

/* ── Excel Table wrapper ───────────────────────────────────── */
function ExcelTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  )
}

function TH({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn(
      'px-4 py-3 text-[11px] font-black tracking-widest bg-slate-800 text-slate-300 border-r border-slate-700 last:border-r-0 whitespace-nowrap',
      right ? 'text-right' : 'text-left'
    )}>
      {children}
    </th>
  )
}

function TD({ children, right, mono, bold, className }: {
  children: React.ReactNode; right?: boolean; mono?: boolean; bold?: boolean; className?: string
}) {
  return (
    <td className={cn(
      'px-4 py-2.5 border-r border-slate-100 last:border-r-0',
      right ? 'text-right' : 'text-left',
      mono  ? 'font-mono text-xs' : '',
      bold  ? 'font-black' : 'font-normal',
      className
    )}>
      {children}
    </td>
  )
}

function TotalsRow({ label, total, cols }: { label: string; total: number; cols: number }) {
  return (
    <tr className="border-t-2 border-slate-300 bg-slate-50">
      <td colSpan={cols - 1} className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
        {label}
      </td>
      <td className="px-4 py-3 text-right font-black text-slate-800 text-base">
        {formatCurrency(total)}
      </td>
    </tr>
  )
}

function EmptyRow({ cols, label }: { cols: number; label: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-slate-400 text-sm">
        {label}
      </td>
    </tr>
  )
}

/* ── Restaurante table ─────────────────────────────────────── */
function TableRestaurante({ ordenes }: { ordenes: OrdenRow[] }) {
  const total = ordenes.reduce((s, o) => s + o.total, 0)
  return (
    <ExcelTable>
      <thead>
        <tr>
          <TH>HORA</TH>
          <TH># ORDEN</TH>
          <TH>MESA</TH>
          <TH right>TOTAL</TH>
        </tr>
      </thead>
      <tbody>
        {ordenes.length === 0
          ? <EmptyRow cols={4} label="Sin órdenes en este período" />
          : ordenes.map((o, i) => (
            <tr key={o.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/60')}>
              <TD mono className="text-slate-400">{o.hora}</TD>
              <TD bold className="text-slate-700">#{o.numero}</TD>
              <TD className="text-slate-600">{o.mesa !== '—' ? `Mesa ${o.mesa}` : 'Sin mesa'}</TD>
              <TD right bold className="text-amber-600">{formatCurrency(o.total)}</TD>
            </tr>
          ))
        }
      </tbody>
      {ordenes.length > 0 && (
        <tfoot>
          <TotalsRow label={`${ordenes.length} órdenes`} total={total} cols={4} />
        </tfoot>
      )}
    </ExcelTable>
  )
}

/* ── Cabañas table ─────────────────────────────────────────── */
function TableCabanas({ hospedajes }: { hospedajes: HospedajeRow[] }) {
  const total = hospedajes.reduce((s, h) => s + h.total, 0)
  return (
    <ExcelTable>
      <thead>
        <tr>
          <TH>FECHA</TH>
          <TH>CABAÑA</TH>
          <TH>CLIENTE</TH>
          <TH>TIPO</TH>
          <TH right>TOTAL</TH>
        </tr>
      </thead>
      <tbody>
        {hospedajes.length === 0
          ? <EmptyRow cols={5} label="Sin hospedajes en este período" />
          : hospedajes.map((h, i) => (
            <tr key={h.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/60')}>
              <TD mono className="text-slate-400">{h.fecha}</TD>
              <TD bold className="text-teal-700">{h.cabana}</TD>
              <TD className="text-slate-700">{h.cliente}</TD>
              <TD>
                <span className={cn(
                  'text-[11px] font-bold px-2.5 py-1 rounded-full',
                  h.tipo === 'noche' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {h.tipo}
                </span>
              </TD>
              <TD right bold className="text-teal-600">{formatCurrency(h.total)}</TD>
            </tr>
          ))
        }
      </tbody>
      {hospedajes.length > 0 && (
        <tfoot>
          <TotalsRow label={`${hospedajes.length} hospedajes`} total={total} cols={5} />
        </tfoot>
      )}
    </ExcelTable>
  )
}

/* ── Eventos table ─────────────────────────────────────────── */
function TableEventos({ eventos }: { eventos: EventoRow[] }) {
  const totalTotal = eventos.reduce((s, e) => s + e.total, 0)
  const totalAnticipo = eventos.reduce((s, e) => s + e.anticipo, 0)
  const totalSaldo = eventos.reduce((s, e) => s + e.saldo, 0)

  return (
    <ExcelTable>
      <thead>
        <tr>
          <TH>FECHA</TH>
          <TH>CLIENTE</TH>
          <TH>ESTADO</TH>
          <TH right>TOTAL</TH>
          <TH right>ANTICIPO</TH>
          <TH right>SALDO</TH>
        </tr>
      </thead>
      <tbody>
        {eventos.length === 0
          ? <EmptyRow cols={6} label="Sin eventos en este período" />
          : eventos.map((e, i) => (
            <tr key={e.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/60')}>
              <TD mono className="text-slate-400">{e.fecha}</TD>
              <TD bold className="text-slate-700">{e.cliente}</TD>
              <TD>
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', ESTADO_COLORS[e.estado] ?? 'bg-slate-100 text-slate-600')}>
                  {ESTADO_LABELS[e.estado] ?? e.estado}
                </span>
              </TD>
              <TD right bold className="text-violet-700">{formatCurrency(e.total)}</TD>
              <TD right className="text-emerald-600 font-semibold">{formatCurrency(e.anticipo)}</TD>
              <TD right className={cn('font-semibold', e.saldo > 0 ? 'text-red-600' : 'text-slate-400')}>
                {formatCurrency(e.saldo)}
              </TD>
            </tr>
          ))
        }
      </tbody>
      {eventos.length > 0 && (
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50">
            <td colSpan={3} className="px-4 py-3 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
              {eventos.length} eventos
            </td>
            <td className="px-4 py-3 text-right font-black text-violet-700 text-base">{formatCurrency(totalTotal)}</td>
            <td className="px-4 py-3 text-right font-black text-emerald-600">{formatCurrency(totalAnticipo)}</td>
            <td className="px-4 py-3 text-right font-black text-red-500">{formatCurrency(totalSaldo)}</td>
          </tr>
        </tfoot>
      )}
    </ExcelTable>
  )
}

/* ── Todos (combined) table ────────────────────────────────── */
type UnifiedRow = { id: string; fecha: string; modulo: string; moduloColor: string; concepto: string; total: number }

function TableTodos({ ordenes, hospedajes, eventos }: {
  ordenes: OrdenRow[]; hospedajes: HospedajeRow[]; eventos: EventoRow[]
}) {
  const rows: UnifiedRow[] = [
    ...ordenes.map(o => ({
      id: `r-${o.id}`, fecha: o.hora, modulo: 'Restaurante', moduloColor: 'bg-amber-100 text-amber-700',
      concepto: o.mesa !== '—' ? `Mesa ${o.mesa} — Ord. #${o.numero}` : `Orden #${o.numero}`, total: o.total,
    })),
    ...hospedajes.map(h => ({
      id: `c-${h.id}`, fecha: h.fecha, modulo: 'Cabañas', moduloColor: 'bg-teal-100 text-teal-700',
      concepto: `${h.cabana} — ${h.cliente}`, total: h.total,
    })),
    ...eventos.map(e => ({
      id: `e-${e.id}`, fecha: e.fecha, modulo: 'Eventos', moduloColor: 'bg-violet-100 text-violet-700',
      concepto: e.cliente, total: e.total,
    })),
  ]

  const total = rows.reduce((s, r) => s + r.total, 0)

  return (
    <ExcelTable>
      <thead>
        <tr>
          <TH>FECHA / HORA</TH>
          <TH>MÓDULO</TH>
          <TH>CONCEPTO</TH>
          <TH right>TOTAL</TH>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0
          ? <EmptyRow cols={4} label="Sin transacciones en este período" />
          : rows.map((r, i) => (
            <tr key={r.id} className={cn('border-t border-slate-100', i % 2 === 1 && 'bg-slate-50/60')}>
              <TD mono className="text-slate-400">{r.fecha}</TD>
              <TD>
                <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full', r.moduloColor)}>
                  {r.modulo}
                </span>
              </TD>
              <TD className="text-slate-700">{r.concepto}</TD>
              <TD right bold className="text-slate-800">{formatCurrency(r.total)}</TD>
            </tr>
          ))
        }
      </tbody>
      {rows.length > 0 && (
        <tfoot>
          <TotalsRow label={`${rows.length} transacciones`} total={total} cols={4} />
        </tfoot>
      )}
    </ExcelTable>
  )
}

/* ── Cierres table ─────────────────────────────────────────── */
function TableCierres({ cierres, expanded, onExpand }: {
  cierres: CierreRow[]; expanded: string | null; onExpand: (id: string | null) => void
}) {
  if (cierres.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" strokeWidth={1} />
      <p className="text-slate-500 text-sm font-semibold">No hay cierres de caja registrados</p>
      <p className="text-slate-400 text-xs mt-1">Los cierres aparecerán aquí después de ejecutar el cierre del día</p>
    </div>
  )

  return (
    <ExcelTable>
      <thead>
        <tr>
          <TH>FECHA</TH>
          <TH>HORA CIERRE</TH>
          <TH right>RESTAURANTE</TH>
          <TH right>CABAÑAS</TH>
          <TH right>EVENTOS</TH>
          <TH right>TOTAL GENERAL</TH>
          <TH>{' '}</TH>
        </tr>
      </thead>
      <tbody>
        {cierres.map((c, i) => {
          const isOpen = expanded === c.id
          const fechaLabel = new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-GT', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
          })
          return (
            <>
              <tr
                key={c.id}
                className={cn(
                  'border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors',
                  i % 2 === 1 && !isOpen && 'bg-slate-50/60',
                  isOpen && 'bg-amber-50/40'
                )}
                onClick={() => onExpand(isOpen ? null : c.id)}
              >
                <TD bold className="text-slate-700 capitalize">{fechaLabel}</TD>
                <TD mono className="text-slate-400">{c.hora}</TD>
                <TD right className={cn(c.restaurante > 0 ? 'text-amber-600 font-semibold' : 'text-slate-300')}>
                  {formatCurrency(c.restaurante)}
                </TD>
                <TD right className={cn(c.cabanas > 0 ? 'text-teal-600 font-semibold' : 'text-slate-300')}>
                  {formatCurrency(c.cabanas)}
                </TD>
                <TD right className={cn(c.eventos > 0 ? 'text-violet-600 font-semibold' : 'text-slate-300')}>
                  {formatCurrency(c.eventos)}
                </TD>
                <TD right bold className="text-emerald-700 text-base">{formatCurrency(c.total)}</TD>
                <TD>
                  <div className="flex justify-center">
                    {isOpen
                      ? <ChevronUp className="h-4 w-4 text-slate-400" />
                      : <ChevronDown className="h-4 w-4 text-slate-400" />
                    }
                  </div>
                </TD>
              </tr>
              {isOpen && c.notas && (
                <tr key={`${c.id}-notas`} className="bg-amber-50/40 border-t border-amber-100">
                  <td colSpan={7} className="px-4 py-2 text-xs text-slate-500 italic">
                    Nota: {c.notas}
                  </td>
                </tr>
              )}
            </>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-300 bg-slate-50">
          <td colSpan={2} className="px-4 py-3 text-xs font-black text-slate-500 uppercase tracking-widest">
            {cierres.length} cierres registrados
          </td>
          <td className="px-4 py-3 text-right font-black text-amber-600">
            {formatCurrency(cierres.reduce((s, c) => s + c.restaurante, 0))}
          </td>
          <td className="px-4 py-3 text-right font-black text-teal-600">
            {formatCurrency(cierres.reduce((s, c) => s + c.cabanas, 0))}
          </td>
          <td className="px-4 py-3 text-right font-black text-violet-600">
            {formatCurrency(cierres.reduce((s, c) => s + c.eventos, 0))}
          </td>
          <td className="px-4 py-3 text-right font-black text-emerald-700 text-base">
            {formatCurrency(cierres.reduce((s, c) => s + c.total, 0))}
          </td>
          <td />
        </tr>
      </tfoot>
    </ExcelTable>
  )
}
