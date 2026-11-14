import type { ResumoAlerta } from '@/shared/utils/sla'
import s from './FaixaAlerta.module.css'

interface Props { resumo: ResumoAlerta; onFiltrar?: (qual: 'vencidos' | 'proximaHora') => void; sufixo?: string }

/** Faixa fixa no topo (spec §5.1). Some quando não há nada. */
export function FaixaAlerta({ resumo, onFiltrar, sufixo = 'seus' }: Props) {
  if (resumo.vencidos === 0 && resumo.proximaHora === 0) return null
  const partes: Array<{ texto: string; qual: 'vencidos' | 'proximaHora' }> = []
  if (resumo.proximaHora) partes.push({ texto: `${resumo.proximaHora} ${resumo.proximaHora === 1 ? 'chamado' : 'chamados'} ${sufixo} ${resumo.proximaHora === 1 ? 'vence' : 'vencem'} na próxima hora`, qual: 'proximaHora' })
  if (resumo.vencidos) partes.push({ texto: `${resumo.vencidos} já ${resumo.vencidos === 1 ? 'venceu' : 'venceram'}`, qual: 'vencidos' })
  return (
    <div role="status" className={s.faixa}>
      <span className={s.ponto} aria-hidden />
      {partes.map((p) => onFiltrar
        ? <button key={p.qual} type="button" className={s.filtro} onClick={() => onFiltrar(p.qual)}>{p.texto}</button>
        : <span key={p.qual}>{p.texto}</span>)}
    </div>
  )
}
