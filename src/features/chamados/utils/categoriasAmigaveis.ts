/** "O que parou?" em linguagem de cliente (spec §5.3). Chave = nome da categoria no dados.json. */
export const CATEGORIA_AMIGAVEL: Record<string, string> = {
  'Acesso e senhas': 'Não consigo entrar (acesso ou senha)',
  'E-mail': 'E-mail',
  'Rede e VPN': 'Internet, rede ou VPN',
  'Estação de trabalho': 'Meu computador ou equipamento',
  'ERP': 'Sistema de gestão (ERP)',
  'CRM': 'Sistema de clientes (CRM)',
  'Relatórios e BI': 'Relatórios e painéis',
  'Integrações': 'Integração entre sistemas',
}
export const amigavel = (nome: string) => CATEGORIA_AMIGAVEL[nome] ?? nome
