import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { Usuario } from '@/shared/types'
import { api } from '@/api/apiClient'
import { chaves } from '@/api/queries/chaves'
import { hidratar } from '@/api/realtime'
import { Button, Campo } from '@/shared/components'
import { lerUltimaVisita, marcarVisita } from '@/shared/hooks/useUltimaVisita'
import { relogio } from '@/shared/utils/relogio'
import { useSessao } from '@/state/sessao'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { entrar, PERSONAS, PIN_PADRAO } from '../../services/entrar'
import s from './LoginPage.module.css'

export function LoginPage() {
  const usuario = useSessao((st) => st.usuario)
  const guardar = useSessao((st) => st.entrar)
  const nav = useNavigate()
  const qc = useQueryClient()
  const loc = useLocation() as { state?: { de?: string } }
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [mostrarPersonas, setMostrarPersonas] = useState(false)
  const m = useMutation({
    mutationFn: () => entrar(email.trim(), pin),
    onSuccess(u) {
      guardar(u)
      // primeira visita = agora (relógio virtual), spec §5.0; a faixa de novidades do cliente parte daqui
      if (lerUltimaVisita(u.id) === null) marcarVisita(u.id, relogio.agora())
      // hidrata `usuarios` do espelho já no login (spec §4.6): o reducer precisa do perfil do autor
      void qc.prefetchQuery({ queryKey: chaves.usuarios, queryFn: async () => { const d = await api.get<Usuario[]>('/usuarios'); hidratar.usuarios(d); return d } })
      nav(loc.state?.de && loc.state.de !== '/' ? loc.state.de : ROTA_INICIAL[u.perfil], { replace: true })
    },
  })
  if (usuario) return <Navigate to={ROTA_INICIAL[usuario.perfil]} replace />

  const enviar = (e: FormEvent) => { e.preventDefault(); if (pin.length === 6) m.mutate() }
  return (
    <main className={s.pagina}>
      <form className={s.cartao} onSubmit={enviar} aria-labelledby="titulo-login">
        <h1 id="titulo-login" className={s.titulo}>Entrar nos chamados</h1>
        <Campo rotulo="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Campo rotulo="PIN (6 dígitos)" type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="current-password" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} required ajuda={`Ambiente de demonstração: o PIN de todos é ${PIN_PADRAO}`} />
        {m.isError && <p role="alert" style={{ color: 'var(--sla-vencido)', margin: 0 }}>{m.error.message}</p>}
        <Button type="submit" variante="primaria" disabled={m.isPending || pin.length !== 6}>{m.isPending ? 'Entrando…' : 'Entrar'}</Button>
        <button type="button" className={s.link} onClick={() => setMostrarPersonas((v) => !v)}>Quem posso ser?</button>
        {mostrarPersonas && (
          <div className={s.personas}>
            {PERSONAS.map((p) => (
              <Button key={p.email} className={s.persona} onClick={() => { setEmail(p.email); setPin(PIN_PADRAO) }}>
                <span>{p.nome}</span><small>{p.perfil} · {p.email}</small>
              </Button>
            ))}
          </div>
        )}
      </form>
    </main>
  )
}
