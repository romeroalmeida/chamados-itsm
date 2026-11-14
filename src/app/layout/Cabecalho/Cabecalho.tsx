import { Link, NavLink, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Perfil } from '@/shared/types'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { useSessao } from '@/state/sessao'
import s from './Cabecalho.module.css'

const ROTULO_PERFIL: Record<Perfil, string> = { consultor: 'Consultora', gestor: 'Gestor', cliente: 'Cliente' }
const NAVEGACAO: Record<Perfil, Array<{ para: string; rotulo: string }>> = {
  consultor: [{ para: '/fila', rotulo: 'Minha fila' }],
  gestor: [{ para: '/equipe', rotulo: 'Equipe' }],
  cliente: [{ para: '/meus-chamados', rotulo: 'Meus chamados' }],
}

const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).map((p) => p[0]).filter((_, i, a) => i === 0 || i === a.length - 1).join('').toUpperCase()

export function Cabecalho() {
  const usuario = useSessao((st) => st.usuario)
  const sair = useSessao((st) => st.sair)
  const nav = useNavigate()
  const cache = useQueryClient()
  if (!usuario) return null
  const { perfil } = usuario
  return (
    <header className={s.topo}>
      <Link to={ROTA_INICIAL[perfil]} className={s.marca} aria-label="Chamados, ir para a minha tela">
        <span className={s.marcaIcone}>
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
        </span>
        <span className={s.marcaTexto}>Chamados</span>
      </Link>
      <nav className={s.nav} aria-label="Principal">
        {NAVEGACAO[perfil].map((l) => <NavLink key={l.para} to={l.para} className={({ isActive }) => `${s.link} ${isActive ? s.ativo : ''}`}>{l.rotulo}</NavLink>)}
      </nav>
      <span className={s.espaco} />
      {perfil === 'cliente' && (
        <Link to="/meus-chamados/novo" className={s.abrir}>
          <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          <span className={s.abrirTexto}>Abrir chamado</span>
        </Link>
      )}
      <div className={s.usuario}>
        <span className={s.avatar} aria-hidden>{iniciais(usuario.nome)}</span>
        <span className={s.quem}><strong>{usuario.nome}</strong><small>{ROTULO_PERFIL[perfil]}</small></span>
      </div>
      <button type="button" className={s.sair} onClick={() => { sair(); cache.clear(); nav('/entrar') /* sem clear, quem entra depois na mesma aba vê a lista do anterior */ }}>Sair</button>
    </header>
  )
}
