'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Categoria, Producto, ItemOrden } from '@/types'
import CategorySidebar from '@/components/restaurante/CategorySidebar'
import ProductGrid from '@/components/restaurante/ProductGrid'
import VariantModal from '@/components/restaurante/VariantModal'
import CurrentOrder from '@/components/restaurante/CurrentOrder'
import PaymentModal from '@/components/restaurante/PaymentModal'
import DiscountModal from '@/components/restaurante/DiscountModal'
import { House, Settings, Plus } from 'lucide-react'
import { generateId, cn } from '@/lib/utils'
import { toast } from 'sonner'
import ProductoAdminModal from '@/components/restaurante/ProductoAdminModal'

const CATEGORIAS_PERMITIDAS = ['bebidas', 'alcohol', 'desayuno', 'plato', 'postre']

type TabOrden = {
  id: string
  mesa: string
  items: ItemOrden[]
  descuento: number
  propina: number
  ordenId: string | null
}

type RestauranteState = {
  tabs: TabOrden[]
  activeId: string
}

function createTab(mesa = ''): TabOrden {
  return { id: generateId(), mesa, items: [], descuento: 0, propina: 0, ordenId: null }
}

export default function RestaurantePage() {
  const router = useRouter()
  const [rs, setRs] = useState<RestauranteState>(() => {
    const tab = createTab()
    return { tabs: [tab], activeId: tab.id }
  })

  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [catSelected, setCatSelected] = useState<string | null>(null)
  const [variantProd, setVariantProd] = useState<Producto | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showDiscount, setShowDiscount] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const activeTab = rs.tabs.find(t => t.id === rs.activeId) ?? rs.tabs[0]
  const subtotal = activeTab.items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal - activeTab.descuento + activeTab.propina

  // ── Tab helpers ──────────────────────────────────────────────────
  function updateTab(update: Partial<Omit<TabOrden, 'id'>>) {
    setRs(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id === prev.activeId ? { ...t, ...update } : t),
    }))
  }

  function addTab() {
    const tab = createTab()
    setRs(prev => ({ tabs: [...prev.tabs, tab], activeId: tab.id }))
  }

  function closeTab(id: string) {
    setRs(prev => {
      const newTabs = prev.tabs.filter(t => t.id !== id)
      if (newTabs.length === 0) {
        const tab = createTab()
        return { tabs: [tab], activeId: tab.id }
      }
      const newActiveId = prev.activeId === id
        ? newTabs[newTabs.length - 1].id
        : prev.activeId
      return { tabs: newTabs, activeId: newActiveId }
    })
  }

  // ── Products ─────────────────────────────────────────────────────
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

  // ── Order actions ─────────────────────────────────────────────────
  function handleSelectProduct(p: Producto) {
    if (p.tiene_variantes) {
      setVariantProd(p)
    } else {
      addItem({ tempId: generateId(), producto_id: p.id, nombre_producto: p.nombre, cantidad: 1, precio_unitario: p.precio, subtotal: p.precio })
    }
  }

  function addItem(item: ItemOrden) {
    setRs(prev => {
      const tab = prev.tabs.find(t => t.id === prev.activeId)!
      const existing = tab.items.find(i =>
        i.producto_id === item.producto_id && !item.variante && !i.variante
      )
      const newItems = existing
        ? tab.items.map(i => i.tempId === existing.tempId
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio_unitario }
            : i)
        : [...tab.items, item]
      return { ...prev, tabs: prev.tabs.map(t => t.id === prev.activeId ? { ...t, items: newItems } : t) }
    })
  }

  function handleQtyChange(tempId: string, qty: number) {
    setRs(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id !== prev.activeId ? t : {
        ...t,
        items: qty <= 0
          ? t.items.filter(i => i.tempId !== tempId)
          : t.items.map(i => i.tempId === tempId ? { ...i, cantidad: qty, subtotal: qty * i.precio_unitario } : i),
      }),
    }))
  }

  function handleNotaChange(tempId: string, notas: string) {
    setRs(prev => ({
      ...prev,
      tabs: prev.tabs.map(t => t.id !== prev.activeId ? t : {
        ...t,
        items: t.items.map(i => i.tempId === tempId ? { ...i, notas } : i),
      }),
    }))
  }

  function handlePropina() {
    const newPropina = activeTab.propina > 0 ? 0 : Math.round(subtotal * 0.1 * 100) / 100
    updateTab({ propina: newPropina })
  }

  async function handlePagar(
    forma: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto',
    detalle: Record<string, number>,
    cambio: number,
    nit: string,
    nombreFactura: string,
  ) {
    setLoading(true)
    const supabase = createClient()
    const tab = activeTab

    let oid = tab.ordenId
    if (!oid) {
      const { data: orden } = await supabase
        .from('ordenes')
        .insert({ mesa: tab.mesa, subtotal, descuento: tab.descuento, propina: tab.propina, total, estado: 'pagada' })
        .select('id').single()
      if (!orden) { toast.error('Error al crear orden'); setLoading(false); return }
      oid = orden.id
      await supabase.from('detalle_orden').insert(
        tab.items.map(i => ({
          orden_id: oid,
          producto_id: i.producto_id,
          nombre_producto: i.nombre_producto,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          variante: i.variante ?? {},
          notas: i.notas ?? '',
          enviado_cocina: false,
        }))
      )
    } else {
      await supabase.from('ordenes').update({ estado: 'pagada', subtotal, descuento: tab.descuento, propina: tab.propina, total }).eq('id', oid)
    }

    const { data: factura } = await supabase.from('facturas').insert({
      tipo: 'restaurante',
      referencia_id: oid,
      nit,
      nombre_factura: nombreFactura,
      subtotal,
      descuento: tab.descuento,
      total,
    }).select('id').single()

    if (factura) {
      await supabase.from('pagos').insert({ factura_id: factura.id, forma_pago: forma, detalle_pago: detalle, monto: total, cambio })
      await supabase.from('movimientos_caja').insert({
        tipo: 'ingreso',
        concepto: `Venta Restaurante${tab.mesa ? ` Mesa ${tab.mesa}` : ''}`,
        monto: total,
        referencia_id: factura.id,
        referencia_tipo: 'factura',
      })
    }

    toast.success(`Cobrado · Q${total.toFixed(2)}`)
    setShowPayment(false)
    closeTab(rs.activeId)
    setLoading(false)
  }

  function resetOrder() {
    closeTab(rs.activeId)
    setShowPayment(false)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 desk:px-6 h-14 desk:h-[68px] flex items-center gap-3 desk:gap-4 flex-shrink-0">
        <button
          onClick={() => router.push('/')}
          className="w-10 h-10 desk:w-12 desk:h-12 rounded-xl hover:bg-slate-800 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
        >
          <House className="h-5 w-5 desk:h-5 desk:w-5 text-slate-400" />
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 desk:w-9 desk:h-9 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-slate-900 font-black text-sm desk:text-base">R</span>
          </div>
          <div>
            <p className="text-sm desk:text-base font-black text-white leading-none">Restaurante</p>
            <p className="text-[10px] desk:text-xs text-slate-500 leading-none mt-0.5">Sistema POS</p>
          </div>
        </div>

        {/* Mesa tabs */}
        <div className="flex-1 flex items-center gap-1.5 desk:gap-2 overflow-x-auto scrollbar-none mx-3 desk:mx-6">
          {rs.tabs.map(tab => {
            const isActive  = tab.id === rs.activeId
            const itemCount = tab.items.reduce((n, i) => n + i.cantidad, 0)
            return (
              <div key={tab.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setRs(prev => ({ ...prev, activeId: tab.id }))}
                  className={cn(
                    'h-8 desk:h-10 px-3 desk:px-4 rounded-xl text-xs desk:text-sm font-bold flex items-center gap-2 transition-all active:scale-[0.96] border',
                    isActive
                      ? 'bg-amber-500 text-slate-900 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                  )}
                >
                  {tab.mesa ? `Mesa ${tab.mesa}` : 'Nueva mesa'}
                  {itemCount > 0 && (
                    <span className={cn(
                      'h-4.5 min-w-[18px] px-1 rounded-full text-[10px] desk:text-xs font-black flex items-center justify-center',
                      isActive ? 'bg-slate-900/40 text-slate-900' : 'bg-amber-500 text-white'
                    )}>
                      {itemCount}
                    </span>
                  )}
                </button>
                {rs.tabs.length > 1 && itemCount === 0 && (
                  <button
                    onClick={() => closeTab(tab.id)}
                    className="w-5 h-5 rounded-full bg-slate-700 hover:bg-red-500/80 text-slate-500 hover:text-white text-xs flex items-center justify-center transition-all"
                  >×</button>
                )}
              </div>
            )
          })}
          <button
            onClick={addTab}
            className="w-8 h-8 desk:w-10 desk:h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 border-dashed flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
            title="Nueva mesa"
          >
            <Plus className="h-4 w-4 desk:h-4 desk:w-4 text-slate-500" />
          </button>
        </div>

        {/* Admin */}
        <button
          onClick={() => setShowAdmin(true)}
          className="w-10 h-10 desk:w-12 desk:h-12 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-all active:scale-[0.96] flex-shrink-0"
          title="Gestionar productos"
        >
          <Settings className="h-4 w-4 desk:h-5 desk:w-5 text-slate-400" />
        </button>
      </header>

      {/* ── Main POS area ───────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Product column: categories + grid */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <CategorySidebar
            categorias={categorias}
            selected={catSelected}
            onSelect={id => setCatSelected(id)}
          />
          <ProductGrid productos={productos} onSelect={handleSelectProduct} />
        </main>

        {/* Order panel */}
        <CurrentOrder
          items={activeTab.items}
          mesa={activeTab.mesa}
          descuento={activeTab.descuento}
          propina={activeTab.propina}
          onMesaChange={mesa => updateTab({ mesa })}
          onQtyChange={handleQtyChange}
          onNotaChange={handleNotaChange}
          onRemove={tempId => handleQtyChange(tempId, 0)}
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
        mesa={activeTab.mesa}
        onClose={() => setShowPayment(false)}
        onPagar={handlePagar}
      />

      <DiscountModal
        open={showDiscount}
        subtotal={subtotal}
        currentDescuento={activeTab.descuento}
        currentPropina={activeTab.propina}
        onClose={() => setShowDiscount(false)}
        onApply={(d, p) => updateTab({ descuento: d, propina: p })}
      />
    </div>
  )
}
