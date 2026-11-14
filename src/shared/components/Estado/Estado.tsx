import { Button } from '../Button/Button'
import s from './Estado.module.css'

export function Carregando({ linhas = 4 }: { linhas?: number }) {
  return <div className={s.caixa} role="status" aria-label="Carregando">{Array.from({ length: linhas }, (_, i) => <div key={i} className={s.skeleton} style={{ width: `${90 - i * 10}%` }} />)}</div>
}
export function Vazio({ texto }: { texto: string }) {
  return <div className={s.caixa}>{texto}</div>
}
export function Erro({ erro, tentar }: { erro: unknown; tentar?: () => void }) {
  const msg = erro instanceof Error ? erro.message : 'Algo deu errado'
  return <div className={s.caixa} role="alert"><span>{msg}</span>{tentar && <Button onClick={tentar}>Tentar de novo</Button>}</div>
}
