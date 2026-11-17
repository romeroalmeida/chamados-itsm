import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router'
import type { Usuario } from '@/shared/types'
import { api, ApiError } from '@/api/apiClient'
import { chaves } from '@/api/queries/chaves'
import { hidratar } from '@/api/realtime'
import { lerUltimaVisita, marcarVisita } from '@/shared/hooks/useUltimaVisita'
import { relogio } from '@/shared/utils/relogio'
import { useSessao } from '@/state/sessao'
import { ROTA_INICIAL } from '@/shared/utils/rotas'
import { CampoCodigo } from '../../components/CampoCodigo/CampoCodigo'
import { CODIGO_DEMO, entrar, PERSONAS, pedirCodigo } from '../../services/entrar'
import s from './LoginPage.module.css'

const ESPERA_REENVIO = 60

// Ícones no traço do lucide (stroke 2), inline para não trazer dependência.
const ICONES = {
  seta: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  email: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  conversa: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
  prazo: <><path d="M10 2h4" /><path d="m12 14 3-3" /><circle cx="12" cy="14" r="8" /></>,
  equipe: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  caixa: <><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  abrir: <path d="m6 9 6 6 6-6" />,
}
function Icone({ nome, className }: { nome: keyof typeof ICONES; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICONES[nome]}
    </svg>
  )
}

const BENEFICIOS = [
  { icone: 'conversa', titulo: 'Acompanhe sem jargão', texto: 'Saiba quem está cuidando e quando terá resposta, no seu fuso.' },
  { icone: 'prazo', titulo: 'O que estoura primeiro, no topo', texto: 'Fila ordenada pelo prazo e aviso antes de estourar.' },
  { icone: 'equipe', titulo: 'A equipe num relance', texto: 'Quem está sobrecarregado, quem está sem nada e o que vai estourar o SLA nas próximas horas.' },
] as const

// Login em dois passos, no padrão do escalanova: e-mail, depois o código de 6 números "mandado" para ele.
export function LoginPage() {
  const usuario = useSessao((st) => st.usuario)
  const guardar = useSessao((st) => st.entrar)
  const nav = useNavigate()
  const qc = useQueryClient()
  const loc = useLocation() as { state?: { de?: string } }
  const [email, setEmail] = useState('')
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)
  // A cada envio a tela do código recomeça (campo limpo, contagem de 60 s): é a chave dela.
  const [envio, setEnvio] = useState(0)

  const pedir = useMutation({
    mutationFn: (e: string) => pedirCodigo(e),
    onSuccess(_, e) { setEnviadoPara(e); setEnvio((n) => n + 1) },
  })
  const entrada = useMutation({
    mutationFn: (codigo: string) => entrar(enviadoPara!, codigo),
    onSuccess(u: Usuario) {
      guardar(u)
      // primeira visita = agora (relógio virtual), spec §5.0; a faixa de novidades do cliente parte daqui
      if (lerUltimaVisita(u.id) === null) marcarVisita(u.id, relogio.agora())
      // hidrata `usuarios` do espelho já no login (spec §4.6): o reducer precisa do perfil do autor
      void qc.prefetchQuery({ queryKey: chaves.usuarios, queryFn: async () => { const d = await api.get<Usuario[]>('/usuarios'); hidratar.usuarios(d); return d } })
      nav(loc.state?.de && loc.state.de !== '/' ? loc.state.de : ROTA_INICIAL[u.perfil], { replace: true })
    },
  })
  if (usuario) return <Navigate to={ROTA_INICIAL[usuario.perfil]} replace />

  const usarOutro = () => { setEnviadoPara(null); setEmail(''); pedir.reset(); entrada.reset() }

  return (
    <div className={s.pagina}>
      <div aria-hidden className={s.manchas}><i /><i /><i /></div>
      <main className={s.grade}>
        <div className={s.lado}>
          <span className={s.marca}><span className={s.marcaIcone}><Icone nome="caixa" /></span>Chamados</span>
          <p className={s.chamada}>Cada chamado no lugar certo.<br />Para quem precisa ver.</p>
          <ul className={s.beneficios}>
            {BENEFICIOS.map((b) => (
              <li key={b.titulo}>
                <span className={s.beneficioIcone}><Icone nome={b.icone} /></span>
                <span><strong>{b.titulo}</strong><span>{b.texto}</span></span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.cartao}>
          {enviadoPara
            ? <TelaCodigo key={envio} email={enviadoPara} entrada={entrada} reenviar={() => pedir.mutate(enviadoPara)} reenviando={pedir.isPending} usarOutro={usarOutro} />
            : <TelaEmail email={email} setEmail={setEmail} pedir={pedir} />}
        </div>
      </main>
    </div>
  )
}

function Moldura({ titulo, sub, children, rodape }: { titulo: string; sub: ReactNode; children: ReactNode; rodape: ReactNode }) {
  return (
    <div className={s.moldura}>
      <div className={s.topo}>
        <h1 className={s.titulo}>{titulo}</h1>
        <div className={s.sub}>{sub}</div>
      </div>
      <div className={s.meio}>{children}</div>
      <div className={s.rodape}>{rodape}</div>
    </div>
  )
}

type Pedir = { mutate: (e: string) => void; isPending: boolean; error: Error | null }

function TelaEmail({ email, setEmail, pedir }: { email: string; setEmail: (v: string) => void; pedir: Pedir }) {
  const [personas, setPersonas] = useState(false)
  const erro = pedir.error?.message
  const enviar = (e: FormEvent) => { e.preventDefault(); pedir.mutate(email.trim()) }
  return (
    <Moldura
      titulo="Entrar"
      sub="Sem senha: a cada acesso, mandamos um código de 6 números para o seu e-mail."
      rodape={<>Ambiente de demonstração: nenhum e-mail é enviado. O código é {CODIGO_DEMO}.</>}
    >
      <form className={s.form} onSubmit={enviar} noValidate>
        <div>
          <label htmlFor="email" className={s.rotulo}>Seu e-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="voce@empresa.com" required autoFocus
            className={s.entrada} value={email} onChange={(e) => setEmail(e.target.value)}
            aria-invalid={erro ? true : undefined} aria-describedby={erro ? 'email-erro' : undefined} />
          {erro && <p id="email-erro" role="alert" className={s.erro}>{erro}</p>}
        </div>
        <button type="submit" className={`${s.botao} ${pedir.isPending ? s.carregando : ''}`} disabled={pedir.isPending} aria-busy={pedir.isPending}>
          {pedir.isPending ? <><Spinner />Enviando código…</> : <>Receber o código <Icone nome="seta" className={s.botaoSeta} /></>}
        </button>
      </form>
      <div className={s.personas}>
        <button type="button" className={s.revelar} aria-expanded={personas} aria-controls="personas" onClick={() => setPersonas((v) => !v)}>
          Quem posso ser? <Icone nome="abrir" className={`${s.revelarSeta} ${personas ? s.aberto : ''}`} />
        </button>
        {personas && (
          <ul id="personas" className={s.listaPersonas}>
            {PERSONAS.map((p) => (
              <li key={p.email}>
                <button type="button" className={s.persona} disabled={pedir.isPending} onClick={() => { setEmail(p.email); pedir.mutate(p.email) }}>
                  <span className={s.personaNome}>{p.nome}<span className={s.personaPerfil}>{p.perfil}</span></span>
                  <span className={s.personaEmail}>{p.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Moldura>
  )
}

type Entrada = { mutate: (c: string) => void; isPending: boolean; isError: boolean; error: Error | null; reset: () => void }

function TelaCodigo({ email, entrada, reenviar, reenviando, usarOutro }: { email: string; entrada: Entrada; reenviar: () => void; reenviando: boolean; usarOutro: () => void }) {
  const [codigo, setCodigo] = useState('')
  const [restam, setRestam] = useState(ESPERA_REENVIO)
  useEffect(() => {
    const t = setInterval(() => setRestam((r) => (r > 0 ? r - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [])
  const erro = entrada.isError
    ? (entrada.error instanceof ApiError && entrada.error.status === 401 ? 'Código incorreto. Confira e tente de novo.' : entrada.error?.message)
    : undefined
  const tentar = (c: string) => { if (!entrada.isPending) entrada.mutate(c) }
  return (
    <Moldura
      titulo="Confira o seu e-mail"
      sub={
        <span role="status" className={s.enviado}>
          <span className={s.enviadoIcone}><Icone nome="email" /></span>
          <span>Se <strong>{email}</strong> puder entrar, o código chega em instantes. Vale por 10 minutos e só uma vez.</span>
        </span>
      }
      rodape={
        <span className={s.acoes}>
          <button type="button" className={s.link} disabled={reenviando || restam > 0} onClick={reenviar}>
            {reenviando ? 'Reenviando…' : restam > 0 ? `Reenviar código (em ${restam} s)` : 'Reenviar código'}
          </button>
          <button type="button" className={s.link} onClick={usarOutro}>Usar outro e-mail</button>
        </span>
      }
    >
      <form className={s.form} onSubmit={(e) => { e.preventDefault(); if (codigo.length === 6) tentar(codigo) }} noValidate>
        <div>
          <label htmlFor="codigo" className={s.rotulo}>Código de acesso</label>
          {/* 3 + 3 como no e-mail; entra sozinho no 6º número (o botão continua para quem preferir). */}
          <CampoCodigo id="codigo" idErro="codigo-erro" valor={codigo} erro={Boolean(erro)} desativado={entrada.isPending}
            aoMudar={(v) => { setCodigo(v); if (entrada.isError) entrada.reset() }} aoCompletar={tentar} />
          {erro && <p id="codigo-erro" role="alert" className={s.erro}>{erro}</p>}
        </div>
        <button type="submit" className={`${s.botao} ${entrada.isPending ? s.carregando : ''}`} disabled={entrada.isPending || codigo.length !== 6} aria-busy={entrada.isPending}>
          {entrada.isPending ? <><Spinner />Entrando…</> : 'Entrar'}
        </button>
      </form>
    </Moldura>
  )
}

/** Indicador de carregamento dos botões do login; decorativo, o texto do botão já diz o que está acontecendo. */
function Spinner() {
  return <span className={s.spinner} aria-hidden />
}
