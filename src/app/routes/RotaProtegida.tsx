import { Link, Navigate, Outlet, useLocation } from 'react-router'
import type { Perfil } from '@/shared/types'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { useSessao } from '@/state/sessao'

export function RotaProtegida({ perfis }: { perfis?: Perfil[] }) {
  const usuario = useSessao((s) => s.usuario)
  const loc = useLocation()
  if (!usuario) return <Navigate to="/entrar" replace state={{ de: loc.pathname }} />
  if (perfis && !perfis.includes(usuario.perfil)) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Sem acesso</h1>
        <p>Esta tela não é do seu perfil. <Link to={ROTA_INICIAL[usuario.perfil]}>Ir para a minha tela</Link></p>
      </main>
    )
  }
  return <Outlet />
}
