'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { uploadImage } from '@/lib/storage'
import { Cabana } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Camera, Save, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CabanaAdminModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

interface CabanaEdit {
  id: string
  numero: number
  nombre: string
  precio_adulto_noche: string
  precio_nino_noche: string
  precio_dia_base: string
  imagen_url?: string
}

export default function CabanaAdminModal({ open, onClose, onSaved }: CabanaAdminModalProps) {
  const [cabanas, setCabanas] = useState<CabanaEdit[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!open) return
    createClient().from('cabanas').select('id,numero,nombre,precio_adulto_noche,precio_nino_noche,precio_dia_base,imagen_url').order('numero')
      .then(({ data }) => {
        if (data) setCabanas(data.map(c => ({
          ...c,
          precio_adulto_noche: String(c.precio_adulto_noche),
          precio_nino_noche: String(c.precio_nino_noche),
          precio_dia_base: String(c.precio_dia_base),
        })))
      })
  }, [open])

  function update(id: string, field: keyof CabanaEdit, value: string) {
    setCabanas(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  async function handleSave(c: CabanaEdit) {
    const adulto = parseFloat(c.precio_adulto_noche)
    const nino = parseFloat(c.precio_nino_noche)
    const dia = parseFloat(c.precio_dia_base)
    if (isNaN(adulto) || isNaN(nino) || isNaN(dia)) { toast.error('Precio inválido'); return }
    setSaving(c.id)
    await createClient().from('cabanas').update({
      precio_adulto_noche: adulto,
      precio_nino_noche: nino,
      precio_dia_base: dia,
    }).eq('id', c.id)
    toast.success(`Cabaña #${c.numero} actualizada`)
    setSaving(null)
    onSaved()
  }

  async function handlePhoto(id: string, numero: number, file: File) {
    setUploading(id)
    try {
      const url = await uploadImage('cabanas', file, `cabana-${id}`)
      await createClient().from('cabanas').update({ imagen_url: url }).eq('id', id)
      setCabanas(prev => prev.map(c => c.id === id ? { ...c, imagen_url: url } : c))
      toast.success(`Foto de Cabaña #${numero} actualizada`)
      onSaved()
    } catch { toast.error('Error al subir foto') }
    finally { setUploading(null) }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>Configuración de Cabañas</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cabanas.map(c => (
            <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4">
              {/* Photo */}
              <div className="flex-shrink-0">
                <div
                  className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer relative group"
                  onClick={() => fileRefs.current[c.id]?.click()}
                >
                  {c.imagen_url
                    ? <Image src={c.imagen_url} alt={c.nombre} fill className="object-cover" />
                    : <Camera className="h-6 w-6 text-slate-300" />
                  }
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploading === c.id
                      ? <Loader2 className="h-5 w-5 text-white animate-spin" />
                      : <Camera className="h-5 w-5 text-white" />
                    }
                  </div>
                </div>
                <input
                  ref={el => { fileRefs.current[c.id] = el }}
                  type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhoto(c.id, c.numero, f) }}
                />
              </div>

              {/* Fields */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 mb-3">Cabaña #{c.numero} — {c.nombre}</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-400">Adulto/noche (Q)</label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={c.precio_adulto_noche}
                      onChange={e => update(c.id, 'precio_adulto_noche', e.target.value)}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Niño/noche (Q)</label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={c.precio_nino_noche}
                      onChange={e => update(c.id, 'precio_nino_noche', e.target.value)}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Día base (Q)</label>
                    <Input
                      type="number" min="0" step="0.01"
                      value={c.precio_dia_base}
                      onChange={e => update(c.id, 'precio_dia_base', e.target.value)}
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-end flex-shrink-0">
                <button
                  onClick={() => handleSave(c)}
                  disabled={saving === c.id}
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                    'bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-50'
                  )}
                >
                  {saving === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
