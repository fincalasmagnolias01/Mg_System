/**
 * EJEMPLOS DE USO — ImageUpload & GalleryUpload
 * Este archivo es solo referencia, no lo importes en producción.
 */
'use client'

import { useState } from 'react'
import ImageUpload, { GalleryUpload } from './ImageUpload'
import { supabase } from '@/lib/supabase'

/* ─── 1. Imagen de un PRODUCTO ──────────────────────────── */
export function EjemploProducto({ productoId }: { productoId: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)

  async function guardar(url: string) {
    setImagenUrl(url)
    await supabase
      .from('productos')
      .update({ imagen_url: url })
      .eq('id', productoId)
  }

  async function eliminar() {
    setImagenUrl(null)
    await supabase
      .from('productos')
      .update({ imagen_url: null })
      .eq('id', productoId)
  }

  return (
    <ImageUpload
      bucket="productos"
      folder={productoId}
      currentUrl={imagenUrl}
      label="Imagen del producto"
      aspectRatio="square"
      onUpload={guardar}
      onDelete={eliminar}
      className="w-40"
    />
  )
}

/* ─── 2. Imagen principal de una CABAÑA ─────────────────── */
export function EjemploCabanaImagen({ cabanaId }: { cabanaId: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)

  async function guardar(url: string) {
    setImagenUrl(url)
    await supabase
      .from('cabanas')
      .update({ imagen_url: url })
      .eq('id', cabanaId)
  }

  return (
    <ImageUpload
      bucket="cabanas"
      folder={cabanaId}
      currentUrl={imagenUrl}
      label="Foto principal de la cabaña"
      aspectRatio="video"
      onUpload={guardar}
      className="w-full max-w-sm"
    />
  )
}

/* ─── 3. Galería de fotos de una CABAÑA ─────────────────── */
export function EjemploCabanaGaleria({ cabanaId }: { cabanaId: string }) {
  const [galeria, setGaleria] = useState<string[]>([])

  async function agregar(url: string) {
    const nueva = [...galeria, url]
    setGaleria(nueva)
    await supabase
      .from('cabanas')
      .update({ imagenes: nueva.map((u, i) => ({ url: u, orden: i })) })
      .eq('id', cabanaId)
  }

  async function quitar(url: string) {
    const nueva = galeria.filter((u) => u !== url)
    setGaleria(nueva)
    await supabase
      .from('cabanas')
      .update({ imagenes: nueva.map((u, i) => ({ url: u, orden: i })) })
      .eq('id', cabanaId)
  }

  return (
    <GalleryUpload
      bucket="cabanas"
      folder={`${cabanaId}/galeria`}
      urls={galeria}
      onAdd={agregar}
      onRemove={quitar}
      maxImages={8}
    />
  )
}

/* ─── 4. Imagen de un EVENTO ─────────────────────────────── */
export function EjemploEvento({ eventoId }: { eventoId: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)

  async function guardar(url: string) {
    setImagenUrl(url)
    await supabase
      .from('eventos')
      .update({ imagen_url: url })
      .eq('id', eventoId)
  }

  return (
    <ImageUpload
      bucket="eventos"
      folder={eventoId}
      currentUrl={imagenUrl}
      label="Imagen del evento"
      aspectRatio="wide"
      onUpload={guardar}
      className="w-full"
    />
  )
}

/* ─── 5. Imagen de una CATEGORÍA ────────────────────────── */
export function EjemploCategoria({ categoriaId }: { categoriaId: string }) {
  const [imagenUrl, setImagenUrl] = useState<string | null>(null)

  async function guardar(url: string) {
    setImagenUrl(url)
    await supabase
      .from('categorias')
      .update({ imagen_url: url })
      .eq('id', categoriaId)
  }

  return (
    <ImageUpload
      bucket="categorias"
      folder={categoriaId}
      currentUrl={imagenUrl}
      label="Ícono de categoría"
      aspectRatio="square"
      onUpload={guardar}
      className="w-24"
    />
  )
}
