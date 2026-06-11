'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Categoria, Producto } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Save, Trash2, PackageSearch, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductoAdminModalProps {
  open: boolean
  onClose: () => void
}

export default function ProductoAdminModal({ open, onClose }: ProductoAdminModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [catSelected, setCatSelected] = useState<string | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [editando, setEditando] = useState<Record<string, { precio: string; stock: string }>>({})
  const [nuevo, setNuevo] = useState({ nombre: '', precio: '', stock: '' })
  const [saving, setSaving] = useState(false)
  const [showNuevo, setShowNuevo] = useState(false)

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
          const map: Record<string, { precio: string; stock: string }> = {}
          data.forEach(p => { map[p.id] = { precio: String(p.precio), stock: String((p as any).stock ?? '') } })
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
    setSaving(true)
    await createClient().from('productos').update({ precio, ...(stock !== null ? { stock } : {}) }).eq('id', p.id)
    toast.success(`${p.nombre} actualizado`)
    setSaving(false)
  }

  async function handleEliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return
    await createClient().from('productos').update({ disponible: false }).eq('id', p.id)
    setProductos(prev => prev.filter(x => x.id !== p.id))
    toast.success('Producto desactivado')
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
    setProductos(prev => [...prev, data])
    setEditando(prev => ({ ...prev, [data.id]: { precio: String(data.precio), stock: String((data as any).stock ?? '') } }))
    setNuevo({ nombre: '', precio: '', stock: '' })
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
              {/* Add new product */}
              {showNuevo ? (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-3 space-y-2 bg-slate-50">
                  <p className="text-xs font-bold text-slate-500 uppercase">Nuevo producto</p>
                  <Input
                    placeholder="Nombre del producto"
                    value={nuevo.nombre}
                    onChange={e => setNuevo(p => ({ ...p, nombre: e.target.value }))}
                    className="h-9 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Precio (Q)</label>
                      <Input
                        type="number" step="0.01" min="0"
                        placeholder="0.00"
                        value={nuevo.precio}
                        onChange={e => setNuevo(p => ({ ...p, precio: e.target.value }))}
                        className="h-9 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Stock (opcional)</label>
                      <Input
                        type="number" min="0"
                        placeholder="—"
                        value={nuevo.stock}
                        onChange={e => setNuevo(p => ({ ...p, stock: e.target.value }))}
                        className="h-9 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAgregar} disabled={saving} className="bg-slate-800 hover:bg-slate-700 rounded-lg">
                      <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowNuevo(false); setNuevo({ nombre: '', precio: '', stock: '' }) }} className="rounded-lg">
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
                const vals = editando[p.id] ?? { precio: String(p.precio), stock: '' }
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{p.nombre}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div>
                          <label className="text-xs text-slate-400">Precio Q</label>
                          <Input
                            type="number" step="0.01" min="0"
                            value={vals.precio}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...vals, precio: e.target.value } }))}
                            className="h-8 w-24 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Stock</label>
                          <Input
                            type="number" min="0"
                            placeholder="—"
                            value={vals.stock}
                            onChange={e => setEditando(prev => ({ ...prev, [p.id]: { ...vals, stock: e.target.value } }))}
                            className="h-8 w-20 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleSaveProducto(p)}
                        disabled={saving}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors"
                        title="Guardar"
                      >
                        <Save className="h-3.5 w-3.5" />
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
