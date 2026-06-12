// systemmg-v2 — limpia el cache anterior que tenia respuestas rotas
const CACHE = 'systemmg-v2'

self.addEventListener('install', () => {
  // Toma control inmediatamente sin esperar que cierren las pestanas
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        // Borra TODOS los caches anteriores (v1 y cualquier otro)
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Solo interceptar GET del mismo origen
  if (request.method !== 'GET' || url.origin !== location.origin) return

  // Pasar sin tocar: rutas de datos y API
  if (url.pathname.startsWith('/_next/data/') || url.pathname.startsWith('/api/')) return

  // ── Assets estaticos de Next.js (_next/static/) ─────────────────────────
  // Son inmutables (nombre incluye hash), seguro hacer cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(hit => {
        if (hit) return hit
        return fetch(request).then(res => {
          if (res && res.ok) {
            const copy = res.clone()           // clone SINCRONICO antes de async
            caches.open(CACHE)
              .then(c => c.put(request, copy))
              .catch(() => {})
          }
          return res
        }).catch(() => new Response('', { status: 503 }))
      })
    )
    return
  }

  // ── Paginas HTML (navegacion) ────────────────────────────────────────────
  // Network-first: si la red falla, servir desde cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone()           // clone SINCRONICO antes de async
            caches.open(CACHE)
              .then(c => c.put(request, copy))
              .catch(() => {})
          }
          return res
        })
        .catch(async () => {
          // Red no disponible: intentar desde cache, luego raiz, luego error
          const fromCache = await caches.match(request).catch(() => null)
          if (fromCache) return fromCache
          const root = await caches.match('/').catch(() => null)
          if (root) return root
          return new Response('Sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        })
    )
  }
})
