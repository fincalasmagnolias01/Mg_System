'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { replaceImage, deleteImage, StorageBucket } from '@/lib/storage'

interface ImageUploadProps {
  bucket: StorageBucket
  currentUrl?: string | null
  folder?: string
  label?: string
  onUpload: (url: string) => void
  onDelete?: () => void
  className?: string
  aspectRatio?: 'square' | 'video' | 'wide'
}

export default function ImageUpload({
  bucket,
  currentUrl,
  folder,
  label = 'Subir imagen',
  onUpload,
  onDelete,
  className = '',
  aspectRatio = 'square',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const displayUrl = preview ?? currentUrl

  const aspectClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[3/1]',
  }[aspectRatio]

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen no puede superar 10 MB.')
      return
    }

    setError(null)
    setPreview(URL.createObjectURL(file))
    setLoading(true)

    try {
      const url = await replaceImage(bucket, file, currentUrl, folder)
      onUpload(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al subir imagen'
      setError(msg)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  async function handleDelete() {
    if (!currentUrl) return
    setLoading(true)
    try {
      await deleteImage(bucket, currentUrl)
      setPreview(null)
      onDelete?.()
    } catch {
      setError('Error al eliminar imagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div
        className={[
          'relative w-full overflow-hidden rounded-xl border-2 transition-all cursor-pointer',
          aspectClass,
          dragging
            ? 'border-blue-500 bg-blue-50'
            : displayUrl
            ? 'border-gray-200'
            : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50',
        ].join(' ')}
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {displayUrl ? (
          <>
            <Image
              src={displayUrl}
              alt="Imagen"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Overlay al hover */}
            <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/0 hover:bg-black/40 transition-all group">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                className="hidden group-hover:flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow hover:bg-gray-100"
              >
                <CameraIcon />
                Cambiar
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete() }}
                  className="hidden group-hover:flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-red-700"
                >
                  <TrashIcon />
                  Eliminar
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
            <UploadIcon className="h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP · Máx 10 MB</p>
            <p className="text-xs text-gray-400">Arrastra o toca para subir</p>
          </div>
        )}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <SpinnerIcon className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}

/* ── Galería de múltiples imágenes (para cabañas) ─────────────── */

interface GalleryUploadProps {
  bucket: StorageBucket
  folder?: string
  urls: string[]
  onAdd: (url: string) => void
  onRemove: (url: string) => void
  maxImages?: number
}

export function GalleryUpload({
  bucket,
  folder,
  urls,
  onAdd,
  onRemove,
  maxImages = 8,
}: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(files: FileList) {
    const remaining = maxImages - urls.length
    const toUpload = Array.from(files).slice(0, remaining)
    if (!toUpload.length) return

    setLoading(true)
    setError(null)
    try {
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue
        const { replaceImage: _, uploadImage } = await import('@/lib/storage')
        const url = await uploadImage(bucket, file, folder)
        onAdd(url)
      }
    } catch {
      setError('Error al subir imágenes')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(url: string) {
    try {
      await deleteImage(bucket, url)
      onRemove(url)
    } catch {
      setError('Error al eliminar imagen')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200">
            <Image src={url} alt={`Imagen ${i + 1}`} fill className="object-cover" sizes="150px" />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute right-1 top-1 hidden rounded-full bg-red-600 p-1 text-white shadow group-hover:flex"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}

        {urls.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 hover:border-blue-400 hover:text-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <SpinnerIcon className="h-6 w-6 animate-spin" />
            ) : (
              <PlusIcon className="h-6 w-6" />
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}
      <p className="text-xs text-gray-400">{urls.length}/{maxImages} imágenes</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}

/* ── Íconos inline ──────────────────────────────────────────── */

function UploadIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  )
}

function SpinnerIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function PlusIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
