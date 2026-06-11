'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!usuario.trim() || !password) { toast.error('Completa todos los campos'); return }
    setLoading(true)
    const supabase = createClient()
    const email = `${usuario.trim().toLowerCase()}@systemmg.local`
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error('Usuario o contraseña incorrectos'); setLoading(false); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex items-center justify-center">
      <div className="w-full max-w-sm px-6">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Mg</h1>
          <p className="text-slate-400 text-sm mt-2">Ingresa tus credenciales para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={usuario}
                onChange={e => setUsuario(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                autoFocus
                className="w-full h-13 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:outline-none rounded-2xl pl-11 pr-4 text-slate-900 placeholder:text-slate-300 transition-colors text-base"
                style={{ height: '52px' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-13 bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:outline-none rounded-2xl pl-11 pr-12 text-slate-900 placeholder:text-slate-300 transition-colors text-base"
                style={{ height: '52px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-base mt-2"
            style={{ height: '52px' }}
          >
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Ingresando...</> : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-slate-300 text-xs mt-10">© 2025 System Mg</p>
      </div>
    </div>
  )
}
