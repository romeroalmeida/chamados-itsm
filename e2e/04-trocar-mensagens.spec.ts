import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

test('Marina troca mensagens; nota interna aparece para ela e não para o cliente', async ({ page, context }) => {
  await entrar(page, EMAILS.marina)
  await page.getByRole('searchbox', { name: 'Buscar chamado' }).fill('10611')
  await page.getByText('10611').first().click()
  await expect(page).toHaveURL(/\/fila\/[\w-]+$/)
  const chamadoId = page.url().split('/fila/')[1]

  const resposta = `Resposta de teste e2e ${Date.now()}`
  await page.getByRole('textbox', { name: 'Resposta' }).fill(resposta)
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByLabel('Conversa', { exact: true }).getByText(resposta)).toBeVisible()

  const notaInterna = `Nota interna de teste e2e ${Date.now()}`
  await page.getByRole('radiogroup', { name: 'Tipo de mensagem' }).getByText('Nota interna').click()
  await page.getByRole('textbox', { name: 'Nota interna' }).fill(notaInterna)
  await page.getByRole('button', { name: 'Salvar nota' }).click()
  const linhaNota = page.getByLabel('Conversa', { exact: true }).getByText(notaInterna)
  await expect(linhaNota).toBeVisible()
  await expect(page.getByText('Nota interna · só a equipe vê')).toBeVisible()

  // a cliente dona do chamado, logada em outra aba (mesmo "backend" local), não deve ver a nota interna;
  // o mock-server guarda o estado no localStorage por origem, por isso aqui é outra aba do mesmo contexto,
  // e não um novo browser context (que começaria com o dados.json puro, sem a mensagem que acabamos de enviar)
  const paginaHelena = await context.newPage()
  await entrar(paginaHelena, EMAILS.helena)
  await paginaHelena.goto(`/chamados/${chamadoId}`)
  await expect(paginaHelena.getByLabel('Conversa', { exact: true }).getByText(resposta)).toBeVisible()
  await expect(paginaHelena.getByText(notaInterna)).toHaveCount(0)
  await paginaHelena.close()
})
