import { useLocation, useParams } from 'react-router'
import { useChamado } from '@/api/queries'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../../components/DetalheChamado/DetalheChamado'
import { Trilha } from '../../components/Trilha/Trilha'
import s from './ChamadoPage.module.css'

export function ChamadoPage() {
  const { id } = useParams<{ id: string }>()
  const usuario = useSessao((st) => st.usuario)!
  const loc = useLocation() as { state?: { reabrir?: string } }
  // mesma query do detalhe (cache compartilhado): só para o número na trilha
  const numero = useChamado(id).data?.chamado.numero
  if (!id) return null
  return (
    <div className={s.pagina}>
      <Trilha perfil={usuario.perfil} numero={numero} usarHistorico />
      <div className={s.detalhe}><DetalheChamado id={id} usuario={usuario} reabrirInicial={loc.state?.reabrir} /></div>
    </div>
  )
}
