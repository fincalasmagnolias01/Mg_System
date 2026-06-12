'use client'

import { useState } from 'react'
import { Printer, Bluetooth, BluetoothOff, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { printer } from '@/lib/bluetooth-print'
import type { TicketData, TicketItem } from '@/lib/bluetooth-print'

// Re-export for consumers that import types from this file
export type { TicketData, TicketItem }

const TIPO_LABEL: Record<TicketData['tipo'], string> = {
  restaurante: 'RESTAURANTE',
  cabana:      'CABAÑAS',
  evento:      'EVENTO',
}

export default function TicketPrint({ data }: { data: TicketData }) {
  const [btConnected, setBtConnected] = useState(printer.isConnected)
  const [connecting, setConnecting] = useState(false)
  const [printing, setPrinting] = useState(false)

  async function handleConnect() {
    setConnecting(true)
    try {
      await printer.connect()
      setBtConnected(true)
      toast.success(`Impresora conectada: ${printer.deviceName}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      // User cancelled the picker → no toast needed
      if (!msg.includes('cancelled') && !msg.includes('cancel')) {
        toast.error(msg)
      }
    } finally {
      setConnecting(false)
    }
  }

  function handleDisconnect() {
    printer.disconnect()
    setBtConnected(false)
    toast.success('Impresora desconectada')
  }

  async function handlePrint() {
    if (btConnected) {
      // Bluetooth path — direct ESC/POS to the NT212
      setPrinting(true)
      try {
        await printer.printTicket(data)
        toast.success('Ticket enviado a la impresora')
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Error al imprimir'
        toast.error(msg)
        // Mark as disconnected if GATT error
        if (msg.toLowerCase().includes('gatt') || msg.toLowerCase().includes('connect')) {
          setBtConnected(false)
        }
      } finally {
        setPrinting(false)
      }
    } else {
      // Browser fallback (desktop / no BT)
      browserPrint(data)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Bluetooth connection toggle */}
      {btConnected ? (
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-900/40 border border-emerald-700/50 text-emerald-400 text-xs font-semibold hover:bg-red-900/40 hover:border-red-700/50 hover:text-red-400 transition-all group"
          title="Desconectar impresora"
        >
          <Bluetooth className="h-3.5 w-3.5" />
          <span className="group-hover:hidden">{printer.deviceName}</span>
          <X className="h-3.5 w-3.5 hidden group-hover:block" />
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all disabled:opacity-50"
          title="Conectar impresora Bluetooth"
        >
          {connecting
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <BluetoothOff className="h-3.5 w-3.5" />
          }
          {connecting ? 'Buscando...' : 'Conectar BT'}
        </button>
      )}

      {/* Print button */}
      <button
        onClick={handlePrint}
        disabled={printing}
        className="flex items-center gap-2 h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
      >
        {printing
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Printer className="h-4 w-4" />
        }
        Imprimir
      </button>
    </div>
  )
}

// ── Browser print fallback (opens new window with 58mm CSS) ────────────────

function browserPrint(data: TicketData) {
  const win = window.open('', '_blank', 'width=300,height=700')
  if (!win) { toast.error('El navegador bloqueó la ventana de impresión'); return }

  const items = data.items.map(item => `
    <div class="mt2">
      <div>${item.cantidad}x ${item.nombre}</div>
      ${item.variante ? `<div class="muted">  ${item.variante}</div>` : ''}
      <div class="row">
        <span class="muted">  Q${item.precio_unitario.toFixed(2)} c/u</span>
        <span class="bold">Q${item.subtotal.toFixed(2)}</span>
      </div>
    </div>`).join('')

  win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8"/>
<title>Ticket</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:11px;width:58mm;max-width:58mm;padding:4mm 3mm;color:#000;background:#fff}
  .center{text-align:center}.right{text-align:right}
  .bold{font-weight:bold}.large{font-size:14px}.xlarge{font-size:16px}
  .line{border-top:1px dashed #000;margin:4px 0}
  .row{display:flex;justify-content:space-between}
  .muted{color:#555}.mt2{margin-top:4px}.mt4{margin-top:8px}
</style>
</head><body>
<div class="center bold large">Finca Las Magnolias</div>
<div class="center muted">System Mg</div>
<div class="center muted">${TIPO_LABEL[data.tipo]}</div>
<div class="line"/>
<div class="row"><span>Fecha:</span><span>${data.fecha}</span></div>
<div class="row"><span>Hora:</span><span>${data.hora}</span></div>
${data.numero ? `<div class="row"><span>No.:</span><span>${data.numero}</span></div>` : ''}
${data.mesa ? `<div class="row"><span>Mesa:</span><span>${data.mesa}</span></div>` : ''}
${data.cabanaNombre ? `<div class="row"><span>Cabaña:</span><span>${data.cabanaNombre}</span></div>` : ''}
${data.eventoNombre ? `<div class="row"><span>Evento:</span><span>${data.eventoNombre}</span></div>` : ''}
<div class="line"/><div class="bold">DETALLE</div><div class="line"/>
${items}
<div class="line"/>
<div class="row"><span>Subtotal:</span><span>Q${data.subtotal.toFixed(2)}</span></div>
${data.descuento && data.descuento > 0 ? `<div class="row"><span>Descuento:</span><span>-Q${data.descuento.toFixed(2)}</span></div>` : ''}
${data.propina && data.propina > 0 ? `<div class="row"><span>Propina:</span><span>Q${data.propina.toFixed(2)}</span></div>` : ''}
<div class="row bold large mt2"><span>TOTAL:</span><span>Q${data.total.toFixed(2)}</span></div>
<div class="line"/>
${data.formaPago ? `<div class="row"><span>Forma de pago:</span><span>${data.formaPago}</span></div>` : ''}
${data.cambio && data.cambio > 0 ? `<div class="row"><span>Cambio:</span><span>Q${data.cambio.toFixed(2)}</span></div>` : ''}
<div class="line"/>
<div class="row"><span>NIT:</span><span>${data.nit ?? 'CF'}</span></div>
<div class="row"><span>Nombre:</span><span>${data.nombreFactura ?? 'Consumidor Final'}</span></div>
${data.notas ? `<div class="line"/><div class="muted">${data.notas}</div>` : ''}
<div class="line"/>
<div class="center mt4 bold">¡Gracias por su visita!</div>
<div class="center muted">Finca Las Magnolias</div>
<div class="center muted" style="font-size:9px;margin-top:4px">Impreso por System Mg</div>
</body></html>`)

  win.document.close()
  win.focus()
  setTimeout(() => { win.print(); win.close() }, 300)
}
