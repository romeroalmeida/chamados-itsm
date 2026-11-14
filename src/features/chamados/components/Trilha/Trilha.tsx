import type { MouseEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import type { Perfil } from '@/shared/types'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import s from './Trilha.module.css'

const LISTA: Record<Perfil, string> = { cliente: 'Meus chamados', consultor: 'Minha fila', gestor: 'Equipe' }

interface Props {
  perfil: Perfil
  numero?: number
  /** Volta pelo histórico quando a pessoa chegou navegando no app (preserva filtro e rolagem da lista). */
  usarHistorico?: boolean
  className?: string
}

export function Trilha({ perfil, numero, usarHistorico = false, className }: Props) {
  const nav = useNavigate()
  const loc = useLocation()
  const voltar = (e: MouseEvent) => {
    // 'default' = primeira entrada da aba (link colado, recarga): não há para onde voltar dentro do app
    if (usarHistorico && loc.key !== 'default') { e.preventDefault(); nav(-1) }
  }
  return (
    <nav aria-label="Trilha" className={`${s.trilha} ${className ?? ''}`}>
      <Link to={ROTA_INICIAL[perfil]} onClick={voltar} className={s.voltar}>
        <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        {LISTA[perfil]}
      </Link>
      {numero !== undefined && <><span aria-hidden className={s.separador}>/</span><span aria-current="page" className={s.atual}>#{numero}</span></>}
    </nav>
  )
}
