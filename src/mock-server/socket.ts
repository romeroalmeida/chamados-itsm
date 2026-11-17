import type { Evento, Usuario } from '@/shared/types'
import { chamadoIdDe } from '@/shared/types'
import { mensagemVisivel, visivelPara } from '@/shared/utils/visibilidade'
import type { Bus } from './bus'
import type { Db } from './db'

export interface Socket {
  assinar(cb: (e: Evento) => void): () => void
  estado(): 'conectado' | 'desconectado'
}

interface Opcoes { bus: Bus; db: Db; usuarioSessao: () => Usuario | null }

/** O "servidor" do socket: entrega só o que o usuário desta aba pode ver (spec §4.3 passo 4). */
export function criarSocket({ bus, db, usuarioSessao }: Opcoes): Socket {
  return {
    assinar(cb) {
      return bus.assinar((e) => {
        const u = usuarioSessao()
        if (!u) return
        const id = chamadoIdDe(e)
        const chamado = e.tipo === 'chamado.aberto' ? e.payload : db.estado().chamados[id]
        // o db já aplicou o evento: o que tira o chamado da visão (ex.: reatribuído a outro grupo) só passa olhando o estado anterior
        const anterior = db.anterior(id)
        if (!chamado || !(visivelPara(u, chamado) || (anterior && visivelPara(u, anterior)))) return
        if (e.tipo === 'mensagem.adicionada' && !mensagemVisivel(u, e.payload)) return
        cb(e)
      })
    },
    estado: () => (bus.conectado() ? 'conectado' : 'desconectado'),
  }
}
