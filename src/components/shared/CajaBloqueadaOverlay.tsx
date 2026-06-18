'use client'

import { useState, useEffect } from 'react'
import { Lock, UnlockKeyhole } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export const CIERRE_KEY = 'mgSystem_cierreCaja'

export interface CierreInfo {
  fecha: string
  totalGeneral: number
  hora: string
}

export function setCierreStorage(totalGeneral: number) {
  const info: CierreInfo = {
    fecha: new Date().toISOString().split('T')[0],
    totalGeneral,
    hora: new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' }),
  }
  localStorage.setItem(CIERRE_KEY, JSON.stringify(info))
  window.dispatchEvent(new Event('cajaCerrada'))
}

function getActiveCierre(): CierreInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CIERRE_KEY)
    if (!raw) return null
    const info: CierreInfo = JSON.parse(raw)
    const hoy = new Date().toISOString().split('T')[0]
    if (info.fecha !== hoy) { localStorage.removeItem(CIERRE_KEY); return null }
    return info
  } catch {
    return null
  }
}

export default function CajaBloqueadaOverlay({ children }: { children: React.ReactNode }) {
  const [cierre, setCierre] = useState<CierreInfo | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    const sync = () => setCierre(getActiveCierre())
    sync()
    window.addEventListener('cajaCerrada', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('cajaCerrada', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  if (!cierre) return <>{children}</>

  return (
    <>
      {/* Blocked content underneath */}
      <div className="pointer-events-none select-none opacity-20" aria-hidden>
        {children}
      </div>

      {/* Full-screen blocking overlay */}
      <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden">
            {/* Icon header */}
            <div className="bg-gradient-to-b from-amber-500/10 to-transparent px-6 py-8 flex flex-col items-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-4">
                <Lock className="h-9 w-9 text-amber-400" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-black text-white tracking-wide">CAJA CERRADA</h1>
              <p className="text-slate-500 text-sm mt-1">Cerrada a las {cierre.hora}</p>
            </div>

            {/* Total */}
            <div className="border-t border-slate-800 px-6 py-5 text-center">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.15em] mb-2">Total del día</p>
              <p className="text-4xl font-black text-emerald-400">{formatCurrency(cierre.totalGeneral)}</p>
            </div>

            {/* Reopen */}
            <div className="px-6 pb-6 pt-1">
              {!confirmando ? (
                <button
                  onClick={() => setConfirmando(true)}
                  className="w-full h-12 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                >
                  <UnlockKeyhole className="h-4 w-4" />
                  Reabrir Caja
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-center text-amber-400 font-semibold pb-1">¿Confirmar reapertura?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmando(false)}
                      className="flex-1 h-11 rounded-xl border border-slate-700 text-slate-400 text-sm font-semibold hover:border-slate-500 transition-all active:scale-[0.97]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem(CIERRE_KEY)
                        setCierre(null)
                        setConfirmando(false)
                      }}
                      className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm transition-all active:scale-[0.97]"
                    >
                      Sí, Reabrir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
