import { create } from 'zustand'
import type { Usuario } from '@/shared/types'

export const CHAVE_SESSAO = 'itsm:sessao'

interface Sessao { usuario: Usuario | null; entrar(u: Usuario): void; sair(): void }

function lerInicial(): Usuario | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO)
    return bruto ? (JSON.parse(bruto) as Usuario) : null
  } catch { return null }
}

/** Por aba (sessionStorage): Marina e Helena convivem no mesmo navegador (spec §4.1). */
export const useSessao = create<Sessao>((set) => ({
  usuario: lerInicial(),
  entrar(u) { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(u)); set({ usuario: u }) },
  sair() { sessionStorage.removeItem(CHAVE_SESSAO); set({ usuario: null }) },
}))

export const usuarioAtual = () => useSessao.getState().usuario
