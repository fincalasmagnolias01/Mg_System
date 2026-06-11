'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Categoria, Producto, ItemOrden } from '@/types'
import CategorySidebar from '@/components/restaurante/CategorySidebar'
import ProductGrid, { VariantModal } from '@/components/restaurante/ProductGrid'
import CurrentOrder from '@/components/restaurante/CurrentOrder'
import PaymentModal from '@/components/restaurante/PaymentModal'
import DiscountModal from '@/components/restaurante/DiscountModal'
import { Input } from '@/components/ui/input'
import { House, Settings } from 'lucide-react'
import { generateId } from '@/lib/utils'
import { toast } from 'sonner'
import ProductoAdminModal from '@/components/restaurante/ProductoAdminModal'

const CATEGORIAS_PERMITIDAS = ['bebidas', 'alcohol', 'desayuno', 'plato', 'postre']

export default function RestaurantePage() {
  const router = useRouter()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [catSelected, setCatSelected] = useState<string | null>(null)
  const [items, setItems] = useState<ItemOrden[]>([])
  const [mesa, setMesa] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [propina, setPropina] = useState(0)
  const [variantProd, setVariantProd] = useState<Producto | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [ordenId, setOrdenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal - descuento + propina

  useEffect(() => {
    const supabase = createClient()
    supabase.from('categorias').select('*').eq('modulo', 'restaurante').eq('activo', true).order('orden')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const filtradas = data.filter(c =>
            CATEGORIAS_PERMITIDAS.some(k => c.nombre.toLowerCase().includes(k))
          )
          const lista = filtradas.length > 0 ? filtradas : data
          setCategorias(lista)
          setCatSelected(lista[0].id)
        }
      })
  }, [])

  useEffect(() => {
    if (!catSelected) return
    const supabase = createClient()
    supabase.from('productos').select('*, categorias(*)').eq('categoria_id', catSelected).eq('disponible', true).order('orden')
      .then(({ data }) => { if (data) setProductos(data) })
  }, [catSelected])

  function handleSelectProduct(p: Producto) {
    if (p.tiene_variantes) {
      setVariantProd(p)
    } else {
      addItem({
        tempId: generateId(),
        producto_id: p.id,
        nombre_producto: p.nombre,
        cantidad: 1,
        precio_unitario: p.precio,
        subtotal: p.precio,
      })
    }
  }

  function addItem(item: ItemOrden) {
    setItems(prev => {
      const existing = prev.find(i =>
        i.producto_id === item.producto_id &&
        JSON.stringify(i.variante) === JSON.stringify(item.variante)
      )
      if (existing && !item.variante) {
        return prev.map(i =>
          i.tempId === existing.tempId
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i
        )
      }
      return [...prev, item]
    })
  }

  function handleQtyChange(tempId: string, qty: number) {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.tempId !== tempId))
    } else {
      setItems(prev => prev.map(i =>
        i.tempId === tempId ? { ...i, cantidad: qty, subtotal: qty * i.precio_unitario } : i
      ))
    }
  }

  function handlePropina() {
    setPropina(prev => prev > 0 ? 0 : Math.round(subtotal * 0.1 * 100) / 100)
  }

  async function handlePagar(forma: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto', detalle: Record<string, number>, cambio: number) {
    setLoading(true)
    const supabase = createClient()

    let oid = ordenId
    if (!oid) {
      const { data: orden } = await supabase
        .from('ordenes')
        .insert({ mesa, subtotal, descuento, propina, total, estado: 'pagada' })
        .select('id').single()

      if (!orden) { toast.error('Error al crear orden'); setLoading(false); return }
      oid = orden.id

      await supabase.from('detalle_orden').insert(
        items.map(i => ({
          orden_id: oid,
          producto_id: i.producto_id,
          nombre_producto: i.nombre_producto,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          variante: i.variante ?? {},
          enviado_cocina: false,
        }))
      )
    } else {
      await supabase.from('ordenes').update({ estado: 'pagada', subtotal, descuento, propina, total }).eq('id', oid)
    }

    const { data: factura } = await supabase.from('facturas').insert({
      tipo: 'restaurante',
      referencia_id: oid,
      nit: 'CF',
      nombre_factura: 'Consumidor Final',
      subtotal,
      descuento,
      total,
    }).select('id').single()

    if (factura) {
      await supabase.from('pagos').insert({
        factura_id: factura.id,
        forma_pago: forma,
        detalle_pago: detalle,
        monto: total,
        cambio,
      })

      await supabase.from('movimientos_caja').insert({
        tipo: 'ingreso',
        concepto: `Venta Restaurante ${mesa ? `Mesa ${mesa}` : ''} · Orden`,
        monto: total,
        referencia_id: factura.id,
        referencia_tipo: 'factura',
      })
    }

    toast.success(`Pago registrado · Total: Q${total.toFixed(2)}`)
    resetOrder()
    setLoading(false)
  }

  function resetOrder() {
    setItems([]); setOrdenId(null); setMesa(''); setDescuento(0); setPropina(0)
    setShowPayment(false)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <button onClick={() => router.push('/')} className="w-11 h-11 rounded-xl hover:bg-slate-700 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0">
          <House className="h-5 w-5 text-slate-300" />
        </button>
        <span className="text-base font-black">Restaurante</span>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-slate-400">Mesa:</span>
          <Input
            value={mesa}
            onChange={e => setMesa(e.target.value)}
            placeholder="1"
            className="w-16 h-9 bg-slate-800 border-slate-700 text-white text-center rounded-xl font-bold"
          />
          <button
            onClick={() => setShowAdmin(true)}
            className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-all"
            title="Gestionar productos"
          >
            <Settings className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* POS 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        <CategorySidebar
          categorias={categorias}
          selected={catSelected}
          onSelect={id => setCatSelected(id)}
        />

        <main className="flex-1 overflow-hidden">
          <ProductGrid
            productos={productos}
            onSelect={handleSelectProduct}
          />
        </main>

        <CurrentOrder
          items={items}
          mesa={mesa}
          descuento={descuento}
          propina={propina}
          onQtyChange={handleQtyChange}
          onRemove={tempId => setItems(prev => prev.filter(i => i.tempId !== tempId))}
          onDescuento={() => setShowDiscount(true)}
          onPropina={handlePropina}
          onPagar={() => setShowPayment(true)}
          onCerrar={resetOrder}
          loading={loading}
        />
      </div>

      {/* Modals */}
      <ProductoAdminModal open={showAdmin} onClose={() => setShowAdmin(false)} />

      <VariantModal
        producto={variantProd}
        open={!!variantProd}
        onClose={() => setVariantProd(null)}
        onAdd={addItem}
      />

      <PaymentModal
        open={showPayment}
        total={total}
        onClose={() => setShowPayment(false)}
        onPagar={handlePagar}
      />

      <DiscountModal
        open={showDiscount}
        subtotal={subtotal}
        currentDescuento={descuento}
        currentPropina={propina}
        onClose={() => setShowDiscount(false)}
        onApply={(d, p) => { setDescuento(d); setPropina(p) }}
      />
    </div>
  )
}
