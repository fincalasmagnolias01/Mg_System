/**
 * Generates public/icons/icon-192.png and icon-512.png
 * Pure Node.js — no extra dependencies needed.
 * Run once: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, '../public/icons')
mkdirSync(OUT, { recursive: true })

function crc32(data) {
  const T = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    T[n] = c
  }
  let crc = 0xffffffff
  for (const b of data) crc = T[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([t, data])
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size, bgR, bgG, bgB, fgR, fgG, fgB) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8-bit RGB

  // Draw: dark bg + lighter rounded square + white "M" letter (pixel approximation)
  const rowStride = 1 + size * 3
  const raw = Buffer.alloc(size * rowStride)

  const cx = size / 2, cy = size / 2
  const pad = size * 0.1
  const r = (size / 2) * 0.12 // inner square corner radius

  for (let y = 0; y < size; y++) {
    raw[y * rowStride] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const off = y * rowStride + 1 + x * 3
      const px = x / size, py = y / size // 0..1

      // Inner rounded rect (inset by pad)
      const ix = x - pad, iy = y - pad
      const iw = size - pad * 2, ih = size - pad * 2
      const inInner = ix >= r && ix <= iw - r && iy >= 0 && iy <= ih
        || ix >= 0 && ix <= iw && iy >= r && iy <= ih - r

      // Very rough "M" glyph in normalized space 0.15..0.85
      const nx = (px - 0.15) / 0.7  // 0..1 across M
      const ny = (py - 0.15) / 0.7

      const inM = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1 && (
        nx < 0.14 ||  // left leg
        nx > 0.86 ||  // right leg
        (nx >= 0.14 && nx <= 0.5 && ny < 0.14 + nx * 0.6) || // left diagonal
        (nx > 0.5 && nx <= 0.86 && ny < 0.14 + (1 - nx) * 0.6)  // right diagonal
      )

      if (inM && inInner) {
        raw[off] = 255; raw[off + 1] = 255; raw[off + 2] = 255
      } else if (inInner) {
        raw[off] = fgR; raw[off + 1] = fgG; raw[off + 2] = fgB
      } else {
        raw[off] = bgR; raw[off + 1] = bgG; raw[off + 2] = bgB
      }
    }
  }

  const compressed = deflateSync(raw)
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))])
}

// slate-950 bg (#020617 = 2,6,23), slate-800 inner (#1e293b = 30,41,59)
const i192 = makePNG(192, 2, 6, 23, 30, 41, 59, 16, 185, 129)
const i512 = makePNG(512, 2, 6, 23, 30, 41, 59, 16, 185, 129)

writeFileSync(join(OUT, 'icon-192.png'), i192)
writeFileSync(join(OUT, 'icon-512.png'), i512)

console.log('✓ public/icons/icon-192.png')
console.log('✓ public/icons/icon-512.png')
console.log('\nReemplaza estos archivos con el logo real de la finca para producción.')
