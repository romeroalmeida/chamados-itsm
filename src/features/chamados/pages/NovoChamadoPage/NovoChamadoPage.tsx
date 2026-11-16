import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useAbrirChamado, useCategorias, useChamados } from '@/api/queries'
import { useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { sugerirParecido } from '@/shared/utils/similaridade'
import { useSessao } from '@/state/sessao'
import { Trilha } from '../../components/Trilha/Trilha'
import { amigavel } from '../../utils/categoriasAmigaveis'
import s from './NovoChamadoPage.module.css'

const MAX_TITULO = 120

export function NovoChamadoPage() {
  const usuario = useSessao((st) => st.usuario) as UsuarioCliente
  const nav = useNavigate()
  const { notificar } = useToast()
  const categorias = useCategorias().data ?? []
  const meus = useChamados().data ?? []
  const agora = useNow()
  const abrir = useAbrirChamado()
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState<string | undefined>()
  const [descartou, setDescartou] = useState<string | null>(null)
  const [tentou, setTentou] = useState(false)
  const refs = { categoria: useRef<HTMLDivElement>(null), titulo: useRef<HTMLInputElement>(null), descricao: useRef<HTMLTextAreaElement>(null) }

  const parecido = useMemo(() => (titulo.trim().length >= 4 ? sugerirParecido(titulo, meus, agora) : null), [titulo, meus, agora])
  const mostrarSugestao = parecido && descartou !== parecido.id

  // as mesmas regras do servidor (POST /chamados), ditas antes de enviar e só depois da primeira tentativa
  const erros = {
    categoria: !categoria ? 'Escolha o que parou, mesmo que seja só aproximado.' : null,
    titulo: !titulo.trim() ? 'Escreva em poucas palavras o que está acontecendo.' : null,
    descricao: !descricao.trim() ? 'Conte um pouco mais para quem vai atender.' : null,
  }
  const mostrar = (campo: keyof typeof erros) => (tentou ? erros[campo] : null)

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    setTentou(true)
    if (erros.categoria) { refs.categoria.current?.querySelector('input')?.focus(); return }
    if (erros.titulo) { refs.titulo.current?.focus(); return }
    if (erros.descricao) { refs.descricao.current?.focus(); return }
    abrir.mutate({ titulo: titulo.trim(), descricao: descricao.trim(), categoria_id: categoria! }, {
      onSuccess: ({ id }) => nav(`/chamados/${id}`, { replace: true }),
      onError: (err) => notificar({ titulo: 'Não foi possível abrir', descricao: err.message, tipo: 'erro' }),
    })
  }

  return (
    <div className={s.pagina}>
      <Trilha perfil="cliente" className={s.trilha} />
      <form className={s.cartao} onSubmit={enviar} noValidate aria-labelledby="t-novo">
        <div>
          <h1 id="t-novo" className={s.titulo}>O que aconteceu?</h1>
          <p className={s.sub}>Conte do seu jeito. A gente encaminha para quem resolve.</p>
        </div>

        <div>
          <span className={s.rotulo} id="lb-cat">O que parou?</span>
          <div ref={refs.categoria} className={s.chips} role="radiogroup" aria-labelledby="lb-cat" aria-invalid={!!mostrar('categoria')} aria-describedby={mostrar('categoria') ? 'er-cat' : undefined}>
            {categorias.map((c) => (
              <label key={c.id} className={s.chip}>
                <input type="radio" name="categoria" value={c.id} checked={categoria === c.id} onChange={() => setCategoria(c.id)} />
                <span>{amigavel(c.nome)}</span>
              </label>
            ))}
          </div>
          {mostrar('categoria') && <Erro id="er-cat">{erros.categoria}</Erro>}
        </div>

        <div>
          <label className={s.rotulo} htmlFor="f-tit">Em uma frase <span className={s.contador} aria-hidden>{titulo.length}/{MAX_TITULO}</span></label>
          <input ref={refs.titulo} id="f-tit" className={s.campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={MAX_TITULO} placeholder="Ex.: o e-mail não envia anexos"
            aria-invalid={!!mostrar('titulo')} aria-describedby={mostrar('titulo') ? 'er-tit' : undefined} />
          {mostrar('titulo') && <Erro id="er-tit">{erros.titulo}</Erro>}
          {mostrarSugestao && (
            <div role="status" className={s.reabrir}>
              <div className={s.reabrirLinha}>
                <span className={s.reabrirIcone} aria-hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg></span>
                <p>
                  Parece com o seu chamado <b>#{parecido.numero} · {parecido.titulo}</b>, {parecido.status === 'fechado' ? 'fechado' : 'resolvido'} em {formatarDataHora((parecido.status === 'fechado' ? parecido.fechado_em : parecido.resolvido_em) ?? parecido.atualizado_em, usuario, { day: '2-digit', month: '2-digit' })}. É o mesmo problema?
                  <span className={s.mini}>Reabrir mantém a conversa com quem já conhece o caso.</span>
                </p>
              </div>
              <div className={s.reabrirAcoes}>
                <button type="button" className={`${s.btn} ${s.pri} ${s.peq}`} onClick={() => nav(`/chamados/${parecido.id}`, { state: { reabrir: descricao.trim() || titulo.trim() } })}>Reabrir o #{parecido.numero}</button>
                <button type="button" className={`${s.btn} ${s.peq}`} onClick={() => { setDescartou(parecido.id); refs.descricao.current?.focus() }}>É outro problema</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className={s.rotulo} htmlFor="f-desc">Detalhes</label>
          <textarea ref={refs.descricao} id="f-desc" className={`${s.campo} ${s.area}`} rows={5} value={descricao} onChange={(e) => setDescricao(e.target.value)}
            placeholder="O que você estava fazendo, o que apareceu na tela, desde quando"
            aria-invalid={!!mostrar('descricao')} aria-describedby={`aj-desc${mostrar('descricao') ? ' er-desc' : ''}`} />
          <p className={s.ajuda} id="aj-desc">Se puder, diga se acontece com mais alguém.</p>
          {mostrar('descricao') && <Erro id="er-desc">{erros.descricao}</Erro>}
        </div>

        <div className={s.rodape}>
          <button type="submit" className={`${s.btn} ${s.pri} ${s.grande}`} disabled={abrir.isPending}>
            Abrir chamado
            <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
          <button type="button" className={`${s.btn} ${s.fant} ${s.grande}`} onClick={() => nav('/meus-chamados')}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}

function Erro({ id, children }: { id: string; children: string | null }) {
  return (
    <p className={s.erro} id={id}>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
      {children}
    </p>
  )
}
