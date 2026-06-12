const CACHE = 'systemmg-v1'
const SHELL = ['/', '/login']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

// Only cache clean 200 responses — never opaque, redirects, or errors
function tryCache(request, response) {
  if (!response || response.status !== 200 || response.type === 'opaque') return
  // Clone SYNCHRONOUSLY before any async gap — prevents "body already used"
  const clone = response.clone()
  caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {})
}

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Only intercept same-origin GETs
  if (request.method !== 'GET') return
  if (url.hostname !== location.hostname) return

  // Let Next.js data fetches and API calls pass through untouched
  if (
    url.pathname.startsWith('/_next/data/') ||
    url.pathname.startsWith('/api/')
  ) return

  // ── Cache-first: Next.js hashed static assets ──────────────────────────
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          tryCache(request, res)   // clone happens inside, synchronously
          return res
        })
      })
    )
    return
  }

  // ── Network-first: HTML navigation ─────────────────────────────────────
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          tryCache(request, res)   // clone happens inside, synchronously
          return res
        })
        .catch(() =>
          caches.match(request).then(r => r || caches.match('/'))
        )
    )
    return
  }
})
