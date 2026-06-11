export type EstadoCabana = 'disponible' | 'reservada' | 'ocupada' | 'limpieza' | 'mantenimiento'
export type TipoHospedaje = 'noche' | 'dia'
export type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
export type EstadoOrden = 'abierta' | 'enviada_cocina' | 'lista' | 'pagada' | 'cancelada'
export type EstadoEvento = 'cotizacion' | 'confirmado' | 'en_curso' | 'completado' | 'cancelado'
export type FormaPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'

export interface Rol {
  id: string
  nombre: string
  descripcion?: string
  permisos: Record<string, unknown>
}

export interface Usuario {
  id: string
  auth_id: string
  nombre: string
  email: string
  rol_id?: string
  activo: boolean
  roles?: Rol
}

export interface Cliente {
  id: string
  nombre: string
  telefono?: string
  email?: string
  nit: string
  direccion?: string
  notas?: string
  created_at?: string
}

export interface Categoria {
  id: string
  nombre: string
  modulo: string
  icono?: string
  orden: number
  activo: boolean
  imagen_url?: string
}

export interface VarianteOpcion {
  nombre: string
  precio: number
}

export interface VarianteGrupo {
  grupo: string
  opciones: string[] | VarianteOpcion[]
}

export interface Producto {
  id: string
  categoria_id?: string
  nombre: string
  descripcion?: string
  precio: number
  tiene_variantes: boolean
  variantes: VarianteGrupo[]
  disponible: boolean
  orden: number
  imagen_url?: string
  categorias?: Categoria
}

export interface Cabana {
  id: string
  numero: number
  nombre: string
  capacidad_max: number
  precio_adulto_noche: number
  precio_nino_noche: number
  precio_dia_base: number
  precio_dia_adicional: number
  estado: EstadoCabana
  notas?: string
  imagen_url?: string
  imagenes?: { url: string; orden: number }[]
  hospedaje_activo?: Hospedaje | null
}

export interface Reserva {
  id: string
  numero_reserva: number
  cabana_id: string
  cliente_id: string
  usuario_id?: string
  tipo: TipoHospedaje
  fecha_entrada: string
  fecha_salida: string
  adultos: number
  ninos: number
  bebes: number
  precio_acordado?: number
  anticipo: number
  estado: EstadoReserva
  notas?: string
  cabanas?: Cabana
  clientes?: Cliente
}

export interface Hospedaje {
  id: string
  numero_hospedaje: number
  cabana_id: string
  reserva_id?: string
  cliente_id: string
  usuario_id?: string
  tipo: TipoHospedaje
  fecha_entrada: string
  fecha_salida?: string
  adultos: number
  ninos: number
  bebes: number
  precio_adulto: number
  precio_nino: number
  subtotal: number
  estado: 'activo' | 'checkout' | 'cancelado'
  notas?: string
  cabanas?: Cabana
  clientes?: Cliente
}

export interface VapepassTarifa {
  id: string
  horario: string
  etiqueta: string
  hora_inicio: string
  hora_fin: string
  precio_adulto: number
  precio_nino: number
  activo: boolean
}

export interface Vapepass {
  id: string
  tarifa_id: string
  hospedaje_id?: string
  cabana_id?: string
  cliente_id?: string
  adultos: number
  ninos: number
  precio_adulto: number
  precio_nino: number
  total: number
  created_at: string
  vapepass_tarifas?: VapepassTarifa
}

export interface ItemOrden {
  tempId: string
  producto_id?: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  variante?: Record<string, string>
  notas?: string
}

export interface Orden {
  id: string
  numero_orden: number
  mesa?: string
  cliente_id?: string
  usuario_id?: string
  estado: EstadoOrden
  subtotal: number
  descuento: number
  propina: number
  total: number
  notas?: string
  created_at: string
  updated_at: string
  clientes?: Cliente
}

export interface DetalleOrden {
  id: string
  orden_id: string
  producto_id?: string
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  variante?: Record<string, string>
  notas?: string
  enviado_cocina: boolean
}

export interface ServicioCatalogo {
  id: string
  nombre: string
  descripcion?: string
  precio_base: number
  activo: boolean
  orden: number
  imagen_url?: string
}

export interface ServicioEvento {
  id: string
  evento_id: string
  catalogo_id?: string
  nombre: string
  descripcion?: string
  precio_unitario: number
  cantidad: number
  subtotal: number
}

export interface Evento {
  id: string
  numero_evento: number
  cliente_id: string
  usuario_id?: string
  nombre_evento?: string
  fecha_evento: string
  hora_inicio?: string
  hora_fin?: string
  invitados: number
  lugar?: string
  estado: EstadoEvento
  subtotal: number
  descuento: number
  total: number
  anticipo: number
  saldo_pendiente: number
  observaciones?: string
  created_at: string
  updated_at: string
  clientes?: Cliente
  servicios_eventos?: ServicioEvento[]
}

export interface Factura {
  id: string
  numero_factura: number
  tipo: string
  referencia_id?: string
  cliente_id?: string
  usuario_id?: string
  nit: string
  nombre_factura: string
  subtotal: number
  descuento: number
  total: number
  estado: string
  created_at: string
  clientes?: Cliente
}

export interface Pago {
  id: string
  factura_id: string
  forma_pago: FormaPago
  detalle_pago: Record<string, number>
  monto: number
  cambio: number
  referencia?: string
  created_at: string
}

export interface DetallePagoMixto {
  efectivo: number
  tarjeta: number
  transferencia: number
}
