'use client'

import { useState } from 'react'
import { Cabana, EstadoCabana } from '@/types'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import CheckInModal from './CheckInModal'
import CheckOutModal from './CheckOutModal'
import ReservaModal from './ReservaModal'
import VapepassModal from './VapepassModal'
import FacturaCabanaModal from './FacturaCabanaModal'
import { LogIn, LogOut, Calendar, DollarSign, Zap, Receipt, Settings, ArrowLeft } from 'lucide-react'

const ESTADO_CONFIG: Record<EstadoCabana, { label: string; color: string }> = {
  disponible:    { label: 'Disponible',    color: 'success' },
  ocupada:       { label: 'Ocupada',       color: 'destructive' },
  reservada:     { label: 'Reservada',     color: 'warning' },
  limpieza:      { label: 'Limpieza',      color: 'info' },
  mantenimiento: { label: 'Mantenimiento', color: 'muted' },
}

interface CabanaModalProps {
  cabana: Cabana | null
  open: boolean
  onClose: () => void
  onRefresh: () => void
}

type ModalView = 'menu' | 'checkin' | 'checkout' | 'reserva' | 'vapepass' | 'factura' | 'estado' | 'precio'

const ESTADOS: EstadoCabana[] = ['disponible', 'reservada', 'ocupada', 'limpieza', 'mantenimiento']

export default function CabanaModal({ cabana, open, onClose, onRefresh }: CabanaModalProps) {
  const [view, setView] = useState<ModalView>('menu')
  const [loadingEstado, setLoadingEstado] = useState(false)

  if (!cabana) return null

  const estadoCfg = ESTADO_CONFIG[cabana.estado]
  const hospedaje = cabana.hospedaje_activo

  async function cambiarEstado(nuevo: EstadoCabana) {
    setLoadingEstado(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('cabanas')
      .update({ estado: nuevo })
      .eq('id', cabana!.id)

    if (error) { toast.error('Error al cambiar estado'); }
    else { toast.success(`Estado cambiado a ${ESTADO_CONFIG[nuevo].label}`); onRefresh(); onClose(); }
    setLoadingEstado(false)
  }

  function handleBack() { setView('menu') }
  function handleDone() { onRefresh(); onClose(); setView('menu') }

  if (view === 'checkin') return (
    <CheckInModal cabana={cabana} open={open} onBack={handleBack} onDone={handleDone} />
  )
  if (view === 'checkout') return (
    <CheckOutModal cabana={cabana} hospedaje={hospedaje!} open={open} onBack={handleBack} onDone={handleDone} />
  )
  if (view === 'reserva') return (
    <ReservaModal cabana={cabana} open={open} onBack={handleBack} onDone={handleDone} />
  )
  if (view === 'vapepass') return (
    <VapepassModal cabana={cabana} hospedaje={hospedaje ?? undefined} open={open} onBack={handleBack} onDone={handleDone} />
  )
  if (view === 'factura') return (
    <FacturaCabanaModal cabana={cabana} hospedaje={hospedaje!} open={open} onBack={handleBack} onDone={handleDone} />
  )

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setView('menu') } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Cabaña #{cabana.numero}</DialogTitle>
            <Badge variant={estadoCfg.color as 'success' | 'destructive' | 'warning' | 'info' | 'muted'}>
              {estadoCfg.label}
            </Badge>
          </div>
          {hospedaje && (
            <p className="text-sm text-slate-500 mt-1">
              Huésped: <span className="font-semibold">{hospedaje.clientes?.nombre}</span>
            </p>
          )}
        </DialogHeader>

        {view === 'menu' && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button
              size="lg"
              variant={hospedaje ? 'outline' : 'default'}
              className="h-20 flex-col gap-1 text-base rounded-2xl"
              onClick={() => setView('checkin')}
              disabled={cabana.estado === 'ocupada'}
            >
              <LogIn className="h-6 w-6" />
              Check In
            </Button>

            <Button
              size="lg"
              variant={hospedaje ? 'default' : 'outline'}
              className="h-20 flex-col gap-1 text-base rounded-2xl"
              onClick={() => setView('checkout')}
              disabled={!hospedaje}
            >
              <LogOut className="h-6 w-6" />
              Check Out
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-1 text-base rounded-2xl"
              onClick={() => setView('reserva')}
            >
              <Calendar className="h-6 w-6" />
              Reservar
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-1 text-base rounded-2xl text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={() => setView('vapepass')}
            >
              <Zap className="h-6 w-6" />
              Vapepass
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-1 text-base rounded-2xl text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={() => setView('factura')}
              disabled={!hospedaje}
            >
              <Receipt className="h-6 w-6" />
              Facturar
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-20 flex-col gap-1 text-base rounded-2xl text-slate-600"
              onClick={() => setView('estado')}
            >
              <Settings className="h-6 w-6" />
              Estado
            </Button>
          </div>
        )}

        {view === 'estado' && (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-slate-500 font-medium">Cambiar estado de la cabaña:</p>
            <div className="grid grid-cols-1 gap-2">
              {ESTADOS.map((e) => (
                <Button
                  key={e}
                  variant={cabana.estado === e ? 'default' : 'outline'}
                  size="lg"
                  className="h-14 text-base justify-start px-5 rounded-xl"
                  onClick={() => cambiarEstado(e)}
                  disabled={loadingEstado}
                >
                  <span className={`h-3 w-3 rounded-full mr-3 ${
                    e === 'disponible' ? 'bg-emerald-500' :
                    e === 'ocupada' ? 'bg-red-500' :
                    e === 'reservada' ? 'bg-yellow-500' :
                    e === 'limpieza' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                  {ESTADO_CONFIG[e].label}
                </Button>
              ))}
            </div>
            <Button variant="ghost" className="w-full gap-2" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
