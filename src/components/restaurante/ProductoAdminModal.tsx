'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { uploadImage } from '@/lib/storage'
import { Categoria, Producto } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Save, Trash2, PackageSearch, X, Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ProductoAdminModalProps {
  open: boolean
  onClose: () => void
}

export default function ProductoAdminModal({ open, onClose }: ProductoAdminModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [catSelected, setCatSelected] = useState<string | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [editando, setEditando] = useState<Record<string, { precio: string; stock: string; imagen_url?: string }>>({})
  const [nuevo, setNuevo] = useState({ nombre: '', precio: '', stock: '' })
  const [nuevoFoto, setNuevoFoto] = useState<File | null>(null)
  const [nuevoFotoPreview, setNuevoFotoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | boolean>(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showNuevo, setShowNuevo] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const nuevoFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('categorias').select('*').eq('modulo', 'restaurante').eq('activo', true).order('orden')
      .then(({ data }) => {
        if (data) {
          setCategorias(data)
          if (!catSelected && data.length > 0) setCatSelected(data[0].id)
        }
      })
  }, [open])

  useEffect(() => {
    if (!catSelected) return
    const supabase = createClient()
    supabase.from('productos').select('*').eq('categoria_id', catSelected).order('orden')
      .then(({ data }) => {
        if (data) {
          setProductos(data)
          const map: Record<string, { precio: string; stock: string; imagen_url?: string }> = {}
          data.forEach(p => {
            map[p.id] = { precio: String(p.precio), stock: String((p as any).stock ?? ''), imagen_url: p.imagen_url }
          })
          setEditando(map)
        }
      })
  }, [catSelected])

  async function handleSaveProducto(p: Producto) {
    const vals = editando[p.id]
    if (!vals) return
    const precio = parseFloat(vals.precio)
    const stock = vals.stock !== '' ? parseInt(vals.stock) : null
    if (isNaN(precio)) { toast.error('Precio inválido'); return }
    setSaving(p.id)
    await createClient().from('productos').update({ precio, ...(stock !== null ? { stock } : {}) }).eq('id', p.id)
    toast.success(`${p.nombre} actualizado`)
    setSaving(false)
  }

  async function handlePhotoUpload(p: Producto, file: File) {
    setUploading(p.id)
    try {
      const url = await uploadImage('productos', file, `prod-${p.id}`)
      await createClient().from('productos').update({ imagen_url: url }).eq('id', p.id)
      setEditando(prev => ({ ...prev, [p.id]: { ...prev[p.id], imagen_url: url } }))
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, imagen_url: url } : x))
      toast.success('Foto actualizada')
    } catch { toast.error('Error al subir foto') }
    finally { setUploading(null) }
  }

  async function handleEliminar(p: Producto) {
    if (!confirm(`¿Desactivar "${p.nombre}"?`)) return
    await createClient().from('productos').update({ disponible: false }).eq('id', p.id)
    setProductos(prev => prev.filter(x => x.id !== p.id))
    toast.success('Producto desactivado')
  }

  function handleNuevoFotoSelect(file: File) {
    setNuevoFoto(file)
    setNuevoFotoPreview(URL.createObjectURL(file))
  }

  async function handleAgregar() {
    if (!catSelected || !nuevo.nombre.trim() || !nuevo.precio) { toast.error('Completa nombre y precio'); return }
    const precio = parseFloat(nuevo.precio)
    if (isNaN(precio)) { toast.error('Precio inválido'); return }
    setSaving(true)
    const { data, error } = await createClient().from('productos').insert({
      categoria_id: catSelected,
      nombre: nuevo.nombre.trim(),
      precio,
      stock: nuevo.stock !== '' ? parseInt(nuevo.stock) : null,
      disponible: true,
      tiene_variantes: false,
      variantes: [],
      orden: productos.length,
    }).select().single()
    if (error || !data) { toast.error('Error al agregar'); setSaving(false); return }

    let imagen_url: string | undefined
    if (nuevoFoto) {
      try {
        imagen_url = await uploadImage('productos', nuevoFoto, `prod-${data.id}`)
        await createClient().from('productos').update({ imagen_url }).eq('id', data.id)
      } catch { /* silent */ }
    }

    setProductos(prev => [...prev, { ...data, imagen_url }])
    setEditando(prev => ({ ...prev, [data.id]: { precio: String(data.precio), stock: '', imagen_url } }))
    setNuevo({ nombre: '', precio: '', stock: '' })
    setNuevoFoto(null)
    setNuevoFotoPreview(null)
    setShowNuevo(false)
    toast.success(`${data.nombre} agregado`)
    setSaving(false)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5" />
            Gestión de Productos
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Category sidebar */}
          <div className="w-44 border-r flex-shrink-0 overflow-y-auto bg-slate-50">
            {categorias.map(c => (
              <button
                key={c.id}
                onClick={() => setCatSelected(c.id)}
                className={cn(
                  'w-full text-left px-4 py-3 text-sm font-semibold border-b border-slate-100 transition-colors',
                  catSelected === c.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                )}
              >
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Products list */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {/* Add new */}
              {showNuevo ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 space-y-2 bg-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase">Nuevo producto</p>
                  <div className="flex gap-3">
                    {/* Photo picker */}
                    <div
                      onClick={() => nuevoFileRef.current?.click()}
                      className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center cursor-pointer overflow-hidden relative group flex-shrink-0 border-2 border-dashed border-slate-300 hover:border-slate-500 transition-colors"
                    >
                      {nuevoFotoPreview
                        ? <Image src={nuevoFotoPreview} alt="preview" fill className="object-cover" />
                        : <Camera className="h-5 w-5 text-slate-400" />
                      }
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <input ref={nuevoFileRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleNuevoFotoSelect(f) }} />
                    <div className="flex-1">
                      <Input
                        placeholder="Nombre del producto"
                        value={nuevo.nombre}
                        onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
                        className="h-9 rounded-lg mb-2"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400">Precio (Q)</label>
                          <Input type="number" step="0.01" min="0" placeholder="0.00"
                            value={nuevo.precio} onChange={e => setNuevo(p => ({ ...p, precio: e.target.value }))}
                            className="h-8 rounded-lg" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Stock (opcional)</label>
                          <Input type="number" min="0" placeholder="—"
                            value={nuevo.stock} onChange={e => setNuevo(p => ({ ...p, stock: e.target.value }))}
                            className="h-8 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAgregar} disabled={!!saving} className="bg-slate-800 hover:bg-slate-700 rounded-lg">
                      {saving === true ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNuevo(false); setNuevo({ nombre: '', precio: '', stock: '' }); setNuevoFoto(null); setNuevoFotoPreview(null) }} className="rounded-lg">
                      <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNuevo(true)}
                  className="w-full flex items-center gap-2 border-2 border-dashed border-slate-200 rounded-xl p-3 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Agregar producto
                </button>
              )}

              {/* Existing products */}
              {productos.map(p => {
                const vals = editando[p.id] ?? { precio: String(p.precio), stock: '', imagen_url: p.imagen_url }
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                    {/* Photo */}
                    <div
                      className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer relative group flex-shrink-0"
                      onClick={() => fileRefs.current[p.id]?.click()}
                    >
                      {vals.imagen_url
                        ? <Image src={vals.imagen_url} alt={p.nombre} fill className="object-cover" />
                        : <Camera className="h-5 w-5 text-slate-300" />
                      }
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploading === p.id
                          ? <Loader2 className="h-4 w-4 text-white animate-spin" />
                          : <Camera className="h-4 w-4 text-white" />
                        }
                      </div>
                    </div>
                    <input
                      ref={el => { fileRefs.current[p.id] = el }}
                      type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(p, f) }}
                    />

                    {/* Fields */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate mb-1.5">{p.nombre}</p>
                      <div className="flex items-center gap-2">
                        <div>
                          <label className="text-xs text-slate-400">Precio Q</label>
                          <Input type="number" step="0.01" min="0"
                            value={vals.precio}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...vals, precio: e.target.value } }))}
                            className="h-8 w-24 rounded-lg text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Stock</label>
                          <Input type="number" min="0" placeholder="—"
                            value={vals.stock}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...vals, stock: e.target.value } }))}
                            className="h-8 w-20 rounded-lg text-sm" />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleSaveProducto(p)}
                        disabled={saving === p.id}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                        title="Guardar"
                      >
                        {saving === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => handleEliminar(p)}
                        className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                        title="Desactivar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {productos.length === 0 && !showNuevo && (
                <p className="text-center text-slate-400 text-sm py-8">Sin productos en esta categoría</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
