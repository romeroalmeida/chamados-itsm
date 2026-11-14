import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router'
import { LoginPage } from '@/features/auth'
import { ChamadoPage, FilaConsultorPage, MeusChamadosPage, NovoChamadoPage } from '@/features/chamados'
import { EquipePage } from '@/features/equipe'
import { useSessao } from '@/state/sessao'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { Casca } from '../layout/Casca'
import { RotaProtegida } from './RotaProtegida'

function Raiz() {
  const usuario = useSessao((s) => s.usuario)
  return <Navigate to={usuario ? ROTA_INICIAL[usuario.perfil] : '/entrar'} replace />
}

export function Rotas() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/entrar" element={<LoginPage />} />
        <Route element={<RotaProtegida />}>
          <Route element={<Casca />}>
            <Route path="/" element={<Raiz />} />
            <Route path="/chamados/:id" element={<ChamadoPage />} />
            <Route element={<RotaProtegida perfis={['consultor']} />}>
              <Route path="/fila" element={<FilaConsultorPage />} />
              <Route path="/fila/:id" element={<FilaConsultorPage />} />
            </Route>
            <Route element={<RotaProtegida perfis={['gestor']} />}>
              <Route path="/equipe" element={<EquipePage />} />
            </Route>
            <Route element={<RotaProtegida perfis={['cliente']} />}>
              <Route path="/meus-chamados" element={<MeusChamadosPage />} />
              <Route path="/meus-chamados/novo" element={<NovoChamadoPage />} />
            </Route>
            <Route path="*" element={<main style={{ padding: 24 }}><h1>Página não encontrada</h1><Link to="/">Ir para a minha tela</Link></main>} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
