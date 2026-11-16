import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

const ID_10612_FECHADO = '9db4fcff-9aeb-40e4-af81-dbd6adabce11'

test('Marina marca um chamado como resolvido informando o motivo (obrigatório)', async ({ page }) => {
  await entrar(page, EMAILS.marina)
  await page.getByRole('searchbox', { name: 'Buscar chamado' }).fill('10611')
  await page.getByText('10611').first().click()
  await expect(page).toHaveURL(/\/fila\/[\w-]+$/)

  await page.getByRole('button', { name: 'Marcar como resolvido' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('Mudar status')

  // sem motivo, o diálogo não deixa confirmar
  const confirmar = dialogo.getByRole('button', { name: 'Confirmar' })
  await expect(confirmar).toBeDisabled()

  await dialogo.getByLabel('Motivo').fill('Reiniciei o serviço e o cliente confirmou que voltou a funcionar.')
  await expect(confirmar).toBeEnabled()
  await confirmar.click()

  await expect(dialogo).not.toBeVisible()
  await expect(page.getByText('Resolvido', { exact: true }).first()).toBeVisible()
})

test('Helena reabre um chamado fechado contando o que aconteceu', async ({ page }) => {
  await entrar(page, EMAILS.helena)
  await page.goto(`/chamados/${ID_10612_FECHADO}`)
  await expect(page.getByText('Fechado', { exact: true }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Reabrir' }).click()
  const dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('Reabrir chamado')
  await dialogo.getByLabel('Conte o que aconteceu').fill('O problema voltou a acontecer hoje de manhã.')
  await dialogo.getByRole('button', { name: 'Confirmar' }).click()

  await expect(dialogo).not.toBeVisible()
  await expect(page.getByText(/Em atendimento/).first()).toBeVisible()
})
