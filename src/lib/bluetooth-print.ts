// Web Bluetooth ESC/POS printing for Sunmi NT212 (58mm thermal printer)

export interface TicketItem {
  nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  variante?: string
}

export interface TicketData {
  tipo: 'restaurante' | 'cabana' | 'evento'
  numero?: string | number
  fecha: string
  hora: string
  mesa?: string
  cabanaNombre?: string
  eventoNombre?: string
  nit?: string
  nombreFactura?: string
  items: TicketItem[]
  subtotal: number
  descuento?: number
  propina?: number
  total: number
  formaPago?: string
  cambio?: number
  notas?: string
}

declare global {
  interface Navigator {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bluetooth: any
  }
}

// 58mm at 12 chars/dot = ~32 characters per line
const LINE_WIDTH = 32

const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

const CMD = {
  INIT:         [ESC, 0x40],
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  SIZE_2X:      [GS, 0x21, 0x11],
  SIZE_NORMAL:  [GS, 0x21, 0x00],
  FEED:         (n: number) => [ESC, 0x64, n],
  CUT:          [GS, 0x56, 0x41, 0x00],
}

// Ordered list of (serviceUUID, writeCharUUID) pairs to try
const KNOWN_PAIRS: [string, string][] = [
  ['000018f0-0000-1000-8000-00805f9b34fb', '00002af1-0000-1000-8000-00805f9b34fb'],
  ['0000ff00-0000-1000-8000-00805f9b34fb', '0000ff02-0000-1000-8000-00805f9b34fb'],
  ['0000ff00-0000-1000-8000-00805f9b34fb', '0000ff01-0000-1000-8000-00805f9b34fb'],
  ['6e400001-b5a3-f393-e0a9-e50e24dcca9e', '6e400002-b5a3-f393-e0a9-e50e24dcca9e'],
  ['e7810a71-73ae-499d-8c15-faa9aef0c3f2', 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'],
  ['49535343-fe7d-4ae5-8fa9-9fafd205e455', '49535343-8841-43f4-a8d4-ecbe34729bb3'],
]

const OPTIONAL_SERVICES = [...new Set(KNOWN_PAIRS.map(([s]) => s))]

export class BluetoothPrinter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private device: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private writeChar: any = null

  get isConnected(): boolean {
    return !!(this.device?.gatt?.connected && this.writeChar)
  }

  get deviceName(): string {
    return this.device?.name ?? 'Impresora'
  }

  async connect(): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth no disponible. Usa Chrome en Android.')
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'NT212' },
        { namePrefix: 'Sunmi' },
        { namePrefix: 'SUNMI' },
        { namePrefix: 'Printer' },
        { namePrefix: 'PRN' },
        { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
        { services: ['0000ff00-0000-1000-8000-00805f9b34fb'] },
      ],
      optionalServices: OPTIONAL_SERVICES,
    })

    this.device.addEventListener('gattserverdisconnected', () => {
      this.writeChar = null
    })

    const server = await this.device.gatt.connect()
    this.writeChar = await this._findWriteChar(server)

    if (!this.writeChar) {
      throw new Error('No se encontró característica de escritura. Verifica que la impresora esté encendida.')
    }
  }

  disconnect(): void {
    this.device?.gatt?.disconnect()
    this.device = null
    this.writeChar = null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _findWriteChar(server: any): Promise<any> {
    for (const [svcUUID, charUUID] of KNOWN_PAIRS) {
      try {
        const svc = await server.getPrimaryService(svcUUID)
        const char = await svc.getCharacteristic(charUUID)
        if (char.properties.write || char.properties.writeWithoutResponse) return char
      } catch { /* try next */ }
    }
    // Last resort: scan all available services
    try {
      const services = await server.getPrimaryServices()
      for (const svc of services) {
        try {
          const chars = await svc.getCharacteristics()
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) return char
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
    return null
  }

  private async _send(bytes: number[]): Promise<void> {
    if (!this.writeChar) throw new Error('Impresora no conectada')
    const MTU = 512
    const useWWR = this.writeChar.properties.writeWithoutResponse
    for (let i = 0; i < bytes.length; i += MTU) {
      const chunk = new Uint8Array(bytes.slice(i, i + MTU))
      if (useWWR) {
        await this.writeChar.writeValueWithoutResponse(chunk)
      } else {
        await this.writeChar.writeValue(chunk)
      }
      if (i + MTU < bytes.length) await delay(20)
    }
  }

  async printTicket(data: TicketData): Promise<void> {
    const b: number[] = []
    const add = (d: number[]) => b.push(...d)
    const line = (s: string) => [...latin1(s), LF]
    const div = () => line('-'.repeat(LINE_WIDTH))
    const padRow = (left: string, right: string) => {
      const gap = LINE_WIDTH - left.length - right.length
      return line(left + ' '.repeat(Math.max(1, gap)) + right)
    }

    const LABEL: Record<string, string> = {
      restaurante: 'RESTAURANTE',
      cabana:      'CABANAS',
      evento:      'EVENTO',
    }

    // ── Header ────────────────────────────────────────────
    add(CMD.INIT)
    add(CMD.ALIGN_CENTER); add(CMD.BOLD_ON); add(CMD.SIZE_2X)
    add(line('Finca Las Magnolias'))
    add(CMD.SIZE_NORMAL); add(CMD.BOLD_OFF)
    add(line('System Mg'))
    add(line(LABEL[data.tipo] ?? data.tipo.toUpperCase()))

    // ── Info ──────────────────────────────────────────────
    add(CMD.ALIGN_LEFT)
    add(div())
    add(padRow('Fecha:', data.fecha))
    add(padRow('Hora:', data.hora))
    if (data.numero)       add(padRow('No.:', String(data.numero)))
    if (data.mesa)         add(padRow('Mesa:', data.mesa))
    if (data.cabanaNombre) add(padRow('Cabana:', data.cabanaNombre))
    if (data.eventoNombre) add(padRow('Evento:', data.eventoNombre))

    // ── Items ─────────────────────────────────────────────
    add(div()); add(CMD.BOLD_ON); add(line('DETALLE')); add(CMD.BOLD_OFF); add(div())

    for (const item of data.items) {
      add(line(`${item.cantidad}x ${item.nombre}`.slice(0, LINE_WIDTH)))
      if (item.variante) add(line(`  ${item.variante}`.slice(0, LINE_WIDTH)))
      add(padRow(`  Q${item.precio_unitario.toFixed(2)} c/u`, `Q${item.subtotal.toFixed(2)}`))
    }

    // ── Totals ────────────────────────────────────────────
    add(div())
    add(padRow('Subtotal:', `Q${data.subtotal.toFixed(2)}`))
    if (data.descuento && data.descuento > 0)
      add(padRow('Descuento:', `-Q${data.descuento.toFixed(2)}`))
    if (data.propina && data.propina > 0)
      add(padRow('Propina:', `Q${data.propina.toFixed(2)}`))
    add(CMD.BOLD_ON)
    add(padRow('TOTAL:', `Q${data.total.toFixed(2)}`))
    add(CMD.BOLD_OFF)

    // ── Payment ───────────────────────────────────────────
    add(div())
    if (data.formaPago) add(padRow('Pago:', data.formaPago))
    if (data.cambio && data.cambio > 0) add(padRow('Cambio:', `Q${data.cambio.toFixed(2)}`))

    // ── Fiscal ────────────────────────────────────────────
    add(div())
    add(padRow('NIT:', data.nit ?? 'CF'))
    add(line(`Nombre: ${(data.nombreFactura ?? 'Consumidor Final').slice(0, 22)}`))

    if (data.notas) { add(div()); add(line(data.notas.slice(0, LINE_WIDTH))) }

    // ── Footer ────────────────────────────────────────────
    add(div())
    add(CMD.ALIGN_CENTER); add(CMD.BOLD_ON)
    add(line('Gracias por su visita!'))
    add(CMD.BOLD_OFF)
    add(line('Finca Las Magnolias'))
    add(CMD.FEED(4))
    add(CMD.CUT)

    await this._send(b)
  }
}

function latin1(str: string): number[] {
  return Array.from(str).map(c => {
    const code = c.charCodeAt(0)
    // Remap common Spanish chars that have Latin-1 equivalents
    const MAP: Record<string, number> = { á: 0xe1, é: 0xe9, í: 0xed, ó: 0xf3, ú: 0xfa, ñ: 0xf1, ü: 0xfc, Á: 0xc1, É: 0xc9, Í: 0xcd, Ó: 0xd3, Ú: 0xda, Ñ: 0xd1 }
    return MAP[c] ?? (code > 255 ? 63 : code)
  })
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// Module-level singleton — connect once, reuse across components
export const printer = new BluetoothPrinter()
