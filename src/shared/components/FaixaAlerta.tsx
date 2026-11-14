import type { ResumoAlerta } from '@/shared/utils/sla'

interface Props { resumo: ResumoAlerta; onFiltrar?: (qual: 'vencidos' | 'proximaHora') => void; sufixo?: string }

/** Faixa fixa no topo (spec §5.1). Some quando não há nada. */
export function FaixaAlerta({ resumo, onFiltrar, sufixo = 'seus' }: Props) {
  if (resumo.vencidos === 0 && resumo.proximaHora === 0) return null
  const partes: Array<{ texto: string; qual: 'vencidos' | 'proximaHora' }> = []
  if (resumo.proximaHora) partes.push({ texto: `${resumo.proximaHora} ${resumo.proximaHora === 1 ? 'chamado' : 'chamados'} ${sufixo} ${resumo.proximaHora === 1 ? 'vence' : 'vencem'} na próxima hora`, qual: 'proximaHora' })
  if (resumo.vencidos) partes.push({ texto: `${resumo.vencidos} já ${resumo.vencidos === 1 ? 'venceu' : 'venceram'}`, qual: 'vencidos' })
  return (
    <div role="status" style={{ background: resumo.vencidos ? 'var(--sla-vencido)' : 'var(--sla-ultima-hora)', color: '#fff', padding: '8px 16px', display: 'flex', gap: 16, alignItems: 'center', fontWeight: 600 }}>
      {partes.map((p) => onFiltrar
        ? <button key={p.qual} onClick={() => onFiltrar(p.qual)} style={{ background: 'transparent', border: 0, color: 'inherit', fontWeight: 'inherit', textDecoration: 'underline', padding: 0 }}>{p.texto}</button>
        : <span key={p.qual}>{p.texto}</span>)}
    </div>
  )
}
