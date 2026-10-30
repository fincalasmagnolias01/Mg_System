import CajaBloqueadaOverlay from '@/components/shared/CajaBloqueadaOverlay'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <CajaBloqueadaOverlay>{children}</CajaBloqueadaOverlay>
}
