import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useAbrirChamado, useCategorias, useChamados } from '@/api/queries'
import { Button, Campo, Select, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { sugerirParecido } from '@/shared/utils/similaridade'
import { useSessao } from '@/state/sessao'
import { Trilha } from '../../components/Trilha/Trilha'
import { amigavel } from '../../utils/categoriasAmigaveis'
import s from './NovoChamadoPage.module.css'

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

  const parecido = useMemo(() => (titulo.trim().length >= 4 ? sugerirParecido(titulo, meus, agora) : null), [titulo, meus, agora])
  const mostrarSugestao = parecido && descartou !== parecido.id

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!categoria) return
    abrir.mutate({ titulo: titulo.trim(), descricao: descricao.trim(), categoria_id: categoria }, {
      onSuccess: ({ id }) => nav(`/chamados/${id}`, { replace: true }),
      onError: (err) => notificar({ titulo: 'Não foi possível abrir', descricao: err.message, tipo: 'erro' }),
    })
  }

  return (
    <div className={s.pagina}>
      <Trilha perfil="cliente" />
      <form className={s.cartao} onSubmit={enviar} aria-labelledby="t-novo">
        <div className={s.cabeca}>
          <h1 id="t-novo" className={s.titulo}>Abrir chamado</h1>
        </div>
        <div className={s.grupo}>
          <span className={s.rotulo}>O que parou?</span>
          <Select className={s.selecao} ariaLabel="O que parou" valor={categoria} onChange={setCategoria} placeholder="Escolha" opcoes={categorias.map((c) => ({ valor: c.id, rotulo: amigavel(c.nome) }))} />
        </div>
        <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} placeholder="Em uma frase, o que está acontecendo" />
        {mostrarSugestao && (
          <div role="status" className={s.sugestao}>
            <span>Parece com seu chamado <strong>#{parecido.numero}</strong> ({parecido.status === 'fechado' ? 'fechado' : 'resolvido'} em {formatarDataHora(parecido.atualizado_em, usuario, { day: '2-digit', month: '2-digit' })}). É o mesmo problema?</span>
            <div className={s.botoes}>
              <Button variante="primaria" onClick={() => nav(`/chamados/${parecido.id}`, { state: { reabrir: descricao.trim() || titulo.trim() } })}>Reabrir esse</Button>
              <Button onClick={() => setDescartou(parecido.id)}>É outro</Button>
            </div>
          </div>
        )}
        <Campo multilinha rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required rows={5} placeholder="O que você estava fazendo, o que apareceu na tela, desde quando" />
        <div className={`${s.botoes} ${s.rodape}`}>
          <Button type="submit" variante="primaria" disabled={abrir.isPending || !categoria || !titulo.trim() || !descricao.trim()}>Abrir chamado</Button>
          <Button onClick={() => nav('/meus-chamados')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
