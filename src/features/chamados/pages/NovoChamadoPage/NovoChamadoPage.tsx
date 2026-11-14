import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import type { UsuarioCliente } from '@/shared/types'
import { useAbrirChamado, useCategorias, useChamados } from '@/api/queries'
import { Button, Campo, Select, useToast } from '@/shared/components'
import { useNow } from '@/shared/hooks/useNow'
import { formatarDataHora } from '@/shared/utils/datas'
import { sugerirParecido } from '@/shared/utils/similaridade'
import { useSessao } from '@/state/sessao'
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
    <form className={s.pagina} onSubmit={enviar} aria-labelledby="t-novo">
      <h1 id="t-novo" style={{ margin: 0, fontSize: 20 }}>Abrir chamado</h1>
      <div>
        <span style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>O que parou?</span>
        <Select ariaLabel="O que parou" valor={categoria} onChange={setCategoria} placeholder="Escolha" opcoes={categorias.map((c) => ({ valor: c.id, rotulo: amigavel(c.nome) }))} />
      </div>
      <Campo rotulo="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} required maxLength={120} placeholder="Em uma frase, o que está acontecendo" />
      {mostrarSugestao && (
        <div role="status" style={{ background: 'var(--cor-interna)', border: '1px solid var(--cor-interna-borda)', borderRadius: 'var(--raio)', padding: 12, display: 'grid', gap: 8 }}>
          <span>Parece com seu chamado <strong>#{parecido.numero}</strong> ({parecido.status === 'fechado' ? 'fechado' : 'resolvido'} em {formatarDataHora(parecido.atualizado_em, usuario, { day: '2-digit', month: '2-digit' })}). É o mesmo problema?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variante="primaria" onClick={() => nav(`/chamados/${parecido.id}`, { state: { reabrir: descricao.trim() || titulo.trim() } })}>Reabrir esse</Button>
            <Button onClick={() => setDescartou(parecido.id)}>É outro</Button>
          </div>
        </div>
      )}
      <Campo multilinha rotulo="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required rows={5} placeholder="O que você estava fazendo, o que apareceu na tela, desde quando" />
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" variante="primaria" disabled={abrir.isPending || !categoria || !titulo.trim() || !descricao.trim()}>Abrir chamado</Button>
        <Button onClick={() => nav('/meus-chamados')}>Cancelar</Button>
      </div>
    </form>
  )
}
