import { expect, test } from '@playwright/test'
import { EMAILS, entrar } from './helpers'

function chamadosDoLabel(label: string | null): number {
  // em atendimento + aguardando cliente, os dois números do cartão
  const m = label?.match(/,\s*(\d+) em atendimento,\s*(\d+) aguardando cliente/)
  return m ? Number(m[1]) + Number(m[2]) : NaN
}

test('Ricardo vê os 12 consultores, as seções da equipe e redistribui um chamado', async ({ page }) => {
  await entrar(page, EMAILS.ricardo)
  await expect(page).toHaveURL(/\/equipe$/)

  const cartoes = page.getByRole('button', { name: /aguardando cliente$/ })
  await expect(cartoes).toHaveCount(12)

  await expect(page.getByRole('heading', { name: /Estouram o SLA nas próximas 4 horas/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Fila do grupo que ninguém pegou/ })).toBeVisible()

  const cartaoMarina = page.getByRole('button', { name: /^Marina Almeida,/ })
  const antes = chamadosDoLabel(await cartaoMarina.getAttribute('aria-label'))
  expect(antes).toBeGreaterThan(0)
  await cartaoMarina.click()

  const painel = page.getByRole('heading', { name: 'Chamados de Marina Almeida' })
  await expect(painel).toBeVisible()
  await page.getByRole('checkbox', { name: /^Selecionar #/ }).first().check()

  const destinoSelect = page.getByRole('combobox', { name: 'Destino' })
  await destinoSelect.click()
  const primeiraOpcao = page.getByRole('option').first()
  const nomeDestino = (await primeiraOpcao.textContent())?.trim()
  await primeiraOpcao.click()

  // os cartões sobrecarregados também têm um botão "Redistribuir"; o do painel leva a contagem
  await page.getByRole('button', { name: /^Redistribuir \d/ }).click()
  await expect(painel).not.toBeVisible()

  await expect.poll(async () => chamadosDoLabel(await cartaoMarina.getAttribute('aria-label'))).toBe(antes - 1)

  const cartaoDestino = page.getByRole('button', { name: new RegExp(`^${nomeDestino},`) })
  await expect(cartaoDestino).toBeVisible()
})
