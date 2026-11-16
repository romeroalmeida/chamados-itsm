import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

test('mensagem enviada por Helena aparece na tela de Marina sem recarregar', async ({ context }) => {
  const paginaMarina = await context.newPage()
  await entrar(paginaMarina, EMAILS.marina)
  await paginaMarina.getByRole('searchbox', { name: 'Buscar chamado' }).fill('10611')
  await paginaMarina.getByText('10611').first().click()
  await expect(paginaMarina).toHaveURL(/\/fila\/[\w-]+$/)
  const chamadoId = paginaMarina.url().split('/fila/')[1]

  const paginaHelena = await context.newPage()
  await entrar(paginaHelena, EMAILS.helena)
  await paginaHelena.goto(`/chamados/${chamadoId}`)

  const mensagem = `Mensagem em tempo real ${Date.now()}`
  await paginaHelena.getByRole('textbox', { name: 'Resposta' }).fill(mensagem)
  await paginaHelena.getByRole('button', { name: 'Enviar' }).click()
  await expect(paginaHelena.getByLabel('Conversa', { exact: true }).getByText(mensagem)).toBeVisible()

  // sem reload na página da Marina: o evento chega pelo BroadcastChannel (mesmo contexto, localStorage compartilhado)
  await expect(paginaMarina.getByLabel('Conversa', { exact: true }).getByText(mensagem)).toBeVisible()

  await paginaMarina.close()
  await paginaHelena.close()
})
