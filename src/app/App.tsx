import { useEffect } from 'react'
import type { MockServer } from '@/mock-server'
import { ToastProvider, useToast } from '@/shared/components'
import { QueryProvider } from './providers/QueryProvider'
import { RealtimeProvider, useRealtime } from './providers/RealtimeProvider'
import { Rotas } from './routes'

function AvisosIniciais() {
  const { servidor } = useRealtime()
  const { notificar } = useToast()
  useEffect(() => {
    // id fixo: em StrictMode o efeito roda duas vezes e o ToastProvider deduplica por id
    const n = servidor.ignoradosNoReplay
    if (n > 0) notificar({ id: 'replay-ignorados', tipo: 'alerta', titulo: n === 1 ? '1 evento inválido foi ignorado ao carregar' : `${n} eventos inválidos foram ignorados ao carregar` })
  }, [servidor, notificar])
  return null
}

export function App({ servidor }: { servidor: MockServer }) {
  return (
    <QueryProvider>
      <RealtimeProvider servidor={servidor}>
        <ToastProvider>
          <AvisosIniciais />
          <Rotas />
        </ToastProvider>
      </RealtimeProvider>
    </QueryProvider>
  )
}
