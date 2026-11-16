import type { Page } from '@playwright/test'

export const EMAILS = {
  marina: 'marina.almeida@suporte.example',
  ricardo: 'ricardo.monteiro@suporte.example',
  helena: 'helena.fernandes@lusitania.example',
}

const ROTA_INICIAL: Record<string, RegExp> = {
  [EMAILS.marina]: /\/fila$/,
  [EMAILS.ricardo]: /\/equipe$/,
  [EMAILS.helena]: /\/meus-chamados$/,
}

/** Login de duas etapas (e-mail -> código 123456), igual ao fluxo real do app. Só retorna depois
 * que a navegação pós-login terminou, para a sessão já estar gravada no sessionStorage da aba. */
export async function entrar(page: Page, email: string) {
  await page.goto('/entrar')
  await page.getByLabel('Seu e-mail').waitFor() // sinal de que o worker MSW já está pronto
  await page.getByLabel('Seu e-mail').fill(email)
  await page.getByRole('button', { name: 'Receber o código' }).click()
  const codigo = page.locator('#codigo')
  await codigo.waitFor()
  await codigo.pressSequentially('123456') // entra sozinho no 6º número
  await page.waitForURL(ROTA_INICIAL[email]!)
}
