import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/tokens.css'
import '@/shared/styles/reset.css'
import { App } from '@/app/App'
import { iniciarMockServer } from '@/mock-server'
import { usuarioAtual } from '@/state/sessao'

const servidor = await iniciarMockServer(usuarioAtual)
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App servidor={servidor} />
  </StrictMode>,
)
