'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function SetupPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg]           = useState('')
  const [ok, setOk]             = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleCreate() {
    if (!email || password.length < 6) { setMsg('Email y contraseña (mín. 6 chars) requeridos'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMsg('Error: ' + error.message)
    } else {
      setOk(true)
      setMsg('✓ Usuario creado. Ya puedes ir a /login con estas credenciales.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm space-y-5 border border-slate-700">
        <div>
          <h1 className="text-xl font-black text-white">Crear cuenta de acceso</h1>
          <p className="text-xs text-slate-400 mt-1">Página temporal — elimínala después de usarla</p>
        </div>

        {!ok ? (
          <>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-slate-400"
              />
              <input
                type="password"
                placeholder="Contraseña (mín. 6 caracteres)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-slate-400"
              />
            </div>

            {msg && <p className="text-sm text-red-400">{msg}</p>}

            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-emerald-400 font-semibold text-sm">{msg}</p>
            <a
              href="/login"
              className="block w-full h-12 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm text-center leading-[3rem] transition-all"
            >
              Ir al Login →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
