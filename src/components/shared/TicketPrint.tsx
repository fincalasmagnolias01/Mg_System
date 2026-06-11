'use client'

import { useRef } from 'react'
import { Printer } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export interface TicketItem {
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  variante?: string
}

export interface TicketData {
  tipo: 'restaurante' | 'cabana' | 'evento'
  numero?: string | number
  fecha: string
  hora: string
  mesa?: string
  cabanaNombre?: string
  eventoNombre?: string
  nit?: string
  nombreFactura?: string
  items: TicketItem[]
  subtotal: number
  descuento?: number
  propina?: number
  total: number
  formaPago?: string
  cambio?: number
  notas?: string
}

const TIPO_LABEL: Record<TicketData['tipo'], string> = {
  restaurante: 'RESTAURANTE',
  cabana: 'CABAÑAS',
  evento: 'EVENTO',
}

export default function TicketPrint({ data }: { data: TicketData }) {
  const ref = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = ref.current?.innerHTML
    if (!content) return
    const win = window.open('', '_blank', 'width=300,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Ticket</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            width: 58mm;
            max-width: 58mm;
            padding: 4mm 3mm;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .right  { text-align: right; }
          .bold   { font-weight: bold; }
          .large  { font-size: 14px; }
          .xlarge { font-size: 16px; }
          .line   { border-top: 1px dashed #000; margin: 4px 0; }
          .row    { display: flex; justify-content: space-between; }
          .muted  { color: #555; }
          .mt2    { margin-top: 4px; }
          .mt4    { margin-top: 8px; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <div>
      {/* Hidden ticket content for printing */}
      <div ref={ref} style={{ display: 'none' }}>
        <div className="center bold large">Finca Las Magnolias</div>
        <div className="center muted">System Mg</div>
        <div className="center muted">{TIPO_LABEL[data.tipo]}</div>
        <div className="line" />

        <div className="row"><span>Fecha:</span><span>{data.fecha}</span></div>
        <div className="row"><span>Hora:</span><span>{data.hora}</span></div>
        {data.numero && <div className="row"><span>No.:</span><span>{data.numero}</span></div>}
        {data.mesa && <div className="row"><span>Mesa:</span><span>{data.mesa}</span></div>}
        {data.cabanaNombre && <div className="row"><span>Cabaña:</span><span>{data.cabanaNombre}</span></div>}
        {data.eventoNombre && <div className="row"><span>Evento:</span><span>{data.eventoNombre}</span></div>}

        <div className="line" />
        <div className="bold">DETALLE</div>
        <div className="line" />

        {data.items.map((item, i) => (
          <div key={i} className="mt2">
            <div>{item.cantidad}x {item.nombre}</div>
            {item.variante && <div className="muted">  {item.variante}</div>}
            <div className="row">
              <span className="muted">  Q{item.precio_unitario.toFixed(2)} c/u</span>
              <span className="bold">Q{item.subtotal.toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div className="line" />
        <div className="row"><span>Subtotal:</span><span>Q{data.subtotal.toFixed(2)}</span></div>
        {data.descuento && data.descuento > 0
          ? <div className="row"><span>Descuento:</span><span>-Q{data.descuento.toFixed(2)}</span></div>
          : null}
        {data.propina && data.propina > 0
          ? <div className="row"><span>Propina:</span><span>Q{data.propina.toFixed(2)}</span></div>
          : null}
        <div className="row bold large mt2">
          <span>TOTAL:</span>
          <span>Q{data.total.toFixed(2)}</span>
        </div>

        <div className="line" />
        {data.formaPago && <div className="row"><span>Forma de pago:</span><span>{data.formaPago}</span></div>}
        {data.cambio && data.cambio > 0
          ? <div className="row"><span>Cambio:</span><span>Q{data.cambio.toFixed(2)}</span></div>
          : null}

        <div className="line" />
        <div className="row"><span>NIT:</span><span>{data.nit ?? 'CF'}</span></div>
        <div className="row"><span>Nombre:</span><span>{data.nombreFactura ?? 'Consumidor Final'}</span></div>

        {data.notas && (
          <>
            <div className="line" />
            <div className="muted">{data.notas}</div>
          </>
        )}

        <div className="line" />
        <div className="center mt4 bold">¡Gracias por su visita!</div>
        <div className="center muted">Finca Las Magnolias</div>
        <div className="center muted" style={{ fontSize: '9px', marginTop: '4px' }}>Impreso por System Mg</div>
      </div>

      {/* Print button */}
      <button
        onClick={handlePrint}
        className="flex items-center gap-2 h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-all active:scale-[0.97]"
      >
        <Printer className="h-4 w-4" />
        Imprimir ticket
      </button>
    </div>
  )
}
