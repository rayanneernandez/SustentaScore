/** Só os dígitos de um texto. */
export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Formata CNPJ enquanto a usuária digita: só aceita números (qualquer outro caractere é
 * descartado), no máximo 14, no padrão 00.000.000/0000-00.
 */
export function formatarCNPJ(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function cnpjCompleto(valor: string): boolean {
  return soDigitos(valor).length === 14;
}

/** Mensagem do que está faltando no CNPJ digitado (ou `null` se estiver vazio ou completo). */
export function erroCnpjIncompleto(valor: string): string | null {
  const n = soDigitos(valor).length;
  if (n === 0 || n === 14) return null;
  const faltam = 14 - n;
  return `CNPJ incompleto: faltam ${faltam} ${faltam === 1 ? 'número' : 'números'} (o CNPJ tem 14 números — digitou ${n}).`;
}

/** Para exibição: formata se tiver 14 dígitos; cadastros antigos fora do padrão aparecem como foram salvos. */
export function exibirCNPJ(valor: string): string {
  return cnpjCompleto(valor) ? formatarCNPJ(valor) : valor;
}
