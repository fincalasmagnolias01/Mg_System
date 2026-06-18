import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
import CajaBloqueadaOverlay from '@/components/shared/CajaBloqueadaOverlay'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <CajaBloqueadaOverlay>{children}</CajaBloqueadaOverlay>
}
