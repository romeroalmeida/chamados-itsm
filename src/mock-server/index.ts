import { setupWorker } from 'msw/browser'
import type { Dados, Usuario } from '@/shared/types'
import { relogio } from '@/shared/utils/relogio'
import { criarBus } from './bus'
import { criarDb, type Db } from './db'
import { criarEventLog } from './eventLog'
import { criarHandlers } from './handlers'
import { CHAVE_SIMULADOR, criarSimulador, type Simulador } from './simulator'
import { criarSocket, type Socket } from './socket'

export interface MockServer { db: Db; socket: Socket; simulador: Simulador; resetar(): void; ignoradosNoReplay: number }

/** Chamado uma vez em main.tsx. `usuarioSessao` é lido do store de sessão da aba. */
export async function iniciarMockServer(usuarioSessao: () => Usuario | null): Promise<MockServer> {
  const log = criarEventLog(localStorage)
  const bus = criarBus({ storage: localStorage, deveDuplicar: () => localStorage.getItem(CHAVE_SIMULADOR) !== 'off' && Math.random() < 0.1 })
  const db = await criarDb({ bus, log, carregar: async () => (await import('./dados.json')).default as unknown as Dados })
  relogio.iniciar(db.lookups().meta.agora)
  const worker = setupWorker(...criarHandlers({ db, relogio }))
  await worker.start({ onUnhandledRequest: 'bypass', quiet: true })
  const socket = criarSocket({ bus, db, usuarioSessao })
  const simulador = criarSimulador({ db, velocidade: () => relogio.velocidade(), storage: localStorage })
  if (simulador.ligado()) simulador.ligar()
  return {
    db, socket, simulador, ignoradosNoReplay: db.ignoradosNoReplay(),
    resetar() { log.limparTudo(); relogio.resetar(); location.reload() },
  }
}
