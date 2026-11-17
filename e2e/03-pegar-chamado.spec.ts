import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

test('Marina pega um chamado da fila do grupo e ele passa para Meus, em atendimento', async ({ page }) => {
  await entrar(page, EMAILS.marina)
  await page.getByRole('tab', { name: /Fila do grupo/ }).click()

  const lista = page.getByRole('list', { name: 'Chamados' })
  const primeiraLinha = lista.getByRole('button').first()
  const texto = (await primeiraLinha.innerText()) ?? ''
  const numero = texto.match(/\d{4,6}/)?.[0]
  expect(numero).toBeTruthy()
  await primeiraLinha.click()

  await page.getByRole('button', { name: 'Pegar para atender' }).click()
  await expect(page.getByRole('list', { name: 'Status' }).locator('[aria-current="step"]')).toContainText('Em atendimento')

  await page.getByRole('tab', { name: /^Meus/ }).click()
  await expect(lista.getByText(new RegExp(numero!))).toBeVisible()
})
