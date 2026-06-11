import { createSupabaseServer } from '@/lib/supabase-server'
import ModuleSelector from '@/components/shared/ModuleSelector'

export default async function HomePage() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nombre, roles(nombre)')
    .eq('auth_id', user!.id)
    .single()

  const nombre = usuario?.nombre ?? user?.email ?? 'Usuario'

  return <ModuleSelector nombre={nombre} />
}
