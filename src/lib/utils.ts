import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `Q${amount.toFixed(2)}`
}

export function formatDate(date: string | Date): string {
  // Bare date strings ("2026-06-12") are UTC midnight — parse as local noon
  // to avoid off-by-one in UTC-6 timezone
  const d = typeof date === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T12:00:00' : date)
    : date
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string'
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? date + 'T12:00:00' : date)
    : date
  return d.toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}
