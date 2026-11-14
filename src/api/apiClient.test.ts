import { ApiError, api } from './apiClient'
import { useSessao } from '@/state/sessao'
import { MARINA } from '@/tests/fixtures/dados'

describe('apiClient', () => {
  it('manda X-Usuario-Id e converte não-2xx em ApiError', async () => {
    useSessao.getState().entrar(MARINA)
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ codigo: 'conflito', mensagem: 'Rafael pegou antes de você' }), { status: 409 }))
    await expect(api.post('/chamados/x/atribuir', {})).rejects.toMatchObject({ status: 409, codigo: 'conflito', message: 'Rafael pegou antes de você' } satisfies Partial<ApiError>)
    const init = fetchMock.mock.calls[0]![1]!
    expect(new Headers(init.headers).get('X-Usuario-Id')).toBe(MARINA.id)
    fetchMock.mockRestore()
  })
})
