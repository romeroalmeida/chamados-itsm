import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

test('Helena abre um chamado e ele aparece em Meus chamados', async ({ page }) => {
  await entrar(page, EMAILS.helena)
  await expect(page).toHaveURL(/\/meus-chamados$/)

  await page.getByRole('link', { name: 'Abrir chamado' }).click()
  await expect(page).toHaveURL(/\/meus-chamados\/novo$/)

  const titulo = `Impressora não imprime ${Date.now()}`
  await page.getByLabel('Em uma frase').fill(titulo)
  await page.getByLabel('Detalhes').fill('A impressora do setor parou de responder desde ontem.')
  await page.getByRole('radiogroup', { name: 'O que parou?' }).getByRole('radio').first().check()

  await page.getByRole('button', { name: 'Abrir chamado' }).click()
  await expect(page).toHaveURL(/\/chamados\/[\w-]+$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(titulo)

  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Meus chamados' }).click()
  await expect(page).toHaveURL(/\/meus-chamados$/)
  await expect(page.getByText(titulo)).toBeVisible()
})

test('título igual ao do #10614 sugere reabrir o #10612', async ({ page }) => {
  await entrar(page, EMAILS.helena)
  await page.getByRole('link', { name: 'Abrir chamado' }).click()

  await page.getByLabel('Em uma frase').fill('VPN não liga a partir de casa (outra vez)')
  await page.getByLabel('Detalhes').fill('De novo, a VPN não conecta de casa.')

  const sugestao = page.getByRole('status').filter({ hasText: '#10612' })
  await expect(sugestao).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reabrir o #10612' })).toBeVisible()
})
