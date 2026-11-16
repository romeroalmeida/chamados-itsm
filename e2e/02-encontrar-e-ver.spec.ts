import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

test('Marina busca por número, abre o chamado e vê conversa, status, responsável e prazo', async ({ page }) => {
  await entrar(page, EMAILS.marina)
  await expect(page).toHaveURL(/\/fila$/)

  await page.getByRole('searchbox', { name: 'Buscar chamado' }).fill('10611')
  await page.getByText('10611').first().click()

  await expect(page).toHaveURL(/\/fila\/[\w-]+$/)
  await expect(page.getByLabel('Conversa', { exact: true })).toBeVisible()
  await expect(page.getByText('Em atendimento', { exact: true })).toBeVisible()
  await expect(page.getByText('Responsável Marina Almeida')).toBeVisible()

  // o prazo relevante aparece como badge (tempo restante) no cabeçalho do chamado
  await expect(page.getByTitle(/Prazo de/).first()).toBeVisible()

  const chamadoId = page.url().split('/fila/')[1]

  // trilha/voltar também funciona na rota /chamados/:id
  await page.goto(`/chamados/${chamadoId}`)
  const trilha = page.getByRole('navigation', { name: 'Trilha' })
  await expect(trilha).toContainText('Minha fila')
  await expect(trilha.getByText(/#\d+/)).toBeVisible()
  await trilha.getByRole('link', { name: /Minha fila/ }).click()
  await expect(page).toHaveURL(/\/fila$/)
})
