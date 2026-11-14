import type { MockServer } from '@/mock-server'
import { ToastProvider } from '@/shared/components'
import { QueryProvider } from './providers/QueryProvider'
import { RealtimeProvider } from './providers/RealtimeProvider'
import { Rotas } from './routes'

export function App({ servidor }: { servidor: MockServer }) {
  return (
    <QueryProvider>
      <RealtimeProvider servidor={servidor}>
        <ToastProvider>
          <Rotas />
        </ToastProvider>
      </RealtimeProvider>
    </QueryProvider>
  )
}
