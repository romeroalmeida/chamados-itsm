export const chaves = {
  chamados: ['chamados'] as const,
  chamado: (id: string) => ['chamado', id] as const,
  historico: ['historico'] as const,
  usuarios: ['usuarios'] as const,
  categorias: ['categorias'] as const,
  grupos: ['grupos'] as const,
  sla: ['sla'] as const,
}
