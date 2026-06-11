'use client'

import { Cabana, Hospedaje } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Printer, Receipt } from 'lucide-react'

interface FacturaCabanaModalProps {
  cabana: Cabana
  hospedaje: Hospedaje
  open: boolean
  onBack: () => void
  onDone: () => void
}

export default function FacturaCabanaModal({ cabana, hospedaje, open, onBack, onDone }: FacturaCabanaModalProps) {
  if (!hospedaje) return null

  const total = hospedaje.subtotal

  function handleImprimir() {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onBack() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Factura de Hospedaje
          </DialogTitle>
        </DialogHeader>

        {/* Ticket de factura */}
        <div className="border-2 border-dashed rounded-2xl p-5 space-y-3 font-mono text-sm bg-slate-50">
          <div className="text-center space-y-1">
            <p className="font-black text-lg">SYSTEM MG</p>
            <p className="text-xs text-slate-500">Comprobante de Hospedaje</p>
          </div>

          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Cabaña:</span>
              <span className="font-bold">#{cabana.numero}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tipo:</span>
              <span className="font-bold capitalize">{hospedaje.tipo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Entrada:</span>
              <span>{formatDateTime(hospedaje.fecha_entrada)}</span>
            </div>
            {hospedaje.fecha_salida && (
              <div className="flex justify-between">
                <span className="text-slate-500">Salida:</span>
                <span>{formatDateTime(hospedaje.fecha_salida)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-3 space-y-1">
            <div className="flex justify-between">
              <span>{hospedaje.adultos} Adulto{hospedaje.adultos > 1 ? 's' : ''}</span>
              <span>{formatCurrency(hospedaje.adultos * hospedaje.precio_adulto)}</span>
            </div>
            {hospedaje.ninos > 0 && (
              <div className="flex justify-between">
                <span>{hospedaje.ninos} Niño{hospedaje.ninos > 1 ? 's' : ''}</span>
                <span>{formatCurrency(hospedaje.ninos * hospedaje.precio_nino)}</span>
              </div>
            )}
            {hospedaje.bebes > 0 && (
              <div className="flex justify-between text-slate-400">
                <span>{hospedaje.bebes} Bebé{hospedaje.bebes > 1 ? 's' : ''} (gratis)</span>
                <span>Q0.00</span>
              </div>
            )}
          </div>

          <div className="border-t-2 border-dashed pt-3">
            <div className="flex justify-between font-black text-lg">
              <span>TOTAL</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              NIT: {hospedaje.clientes?.nit ?? 'CF'} · {hospedaje.clientes?.nombre}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onBack}>Volver</Button>
          <Button size="lg" onClick={handleImprimir} className="gap-2 px-8">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
