import { useLocation, useParams } from 'react-router'
import { useSessao } from '@/state/sessao'
import { DetalheChamado } from '../components/DetalheChamado'

export function ChamadoPage() {
  const { id } = useParams<{ id: string }>()
  const usuario = useSessao((s) => s.usuario)!
  const loc = useLocation() as { state?: { reabrir?: string } }
  if (!id) return null
  return <div style={{ height: '100%' }}><DetalheChamado id={id} usuario={usuario} reabrirInicial={loc.state?.reabrir} /></div>
}
