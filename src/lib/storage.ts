import { supabase } from './supabase'

export type StorageBucket =
  | 'productos'
  | 'cabanas'
  | 'categorias'
  | 'eventos'
  | 'servicios'

/**
 * Sube una imagen al bucket indicado y devuelve la URL pública.
 * @param bucket  Nombre del bucket
 * @param file    Archivo a subir
 * @param folder  Subcarpeta opcional (ej. ID del registro)
 */
export async function uploadImage(
  bucket: StorageBucket,
  file: File,
  folder?: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const path = folder ? `${folder}/${uid}.${ext}` : `${uid}.${ext}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(`Error al subir imagen: ${error.message}`)

  return getPublicUrl(bucket, path)
}

/**
 * Devuelve la URL pública de un objeto en Storage.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Elimina una imagen dado su URL pública.
 */
export async function deleteImage(
  bucket: StorageBucket,
  url: string
): Promise<void> {
  const marker = `/storage/v1/object/public/${bucket}/`
  const path = url.split(marker)[1]
  if (!path) return

  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`Error al eliminar imagen: ${error.message}`)
}

/**
 * Reemplaza una imagen existente: sube la nueva y borra la anterior.
 */
export async function replaceImage(
  bucket: StorageBucket,
  file: File,
  oldUrl?: string | null,
  folder?: string
): Promise<string> {
  const newUrl = await uploadImage(bucket, file, folder)
  if (oldUrl) {
    await deleteImage(bucket, oldUrl).catch(() => {})
  }
  return newUrl
}

/**
 * Sube múltiples imágenes (para galería de cabañas).
 */
export async function uploadImages(
  bucket: StorageBucket,
  files: File[],
  folder?: string
): Promise<string[]> {
  const uploads = files.map((f) => uploadImage(bucket, f, folder))
  return Promise.all(uploads)
}
