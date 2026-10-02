/**
 * Formata telefone(s) enquanto a usuária digita, no padrão
 * (00) 0000-0000 / (00) 00000-0000. Aceita mais de um número no mesmo
 * campo, separados por vírgula — cada um é formatado separadamente
 * (pedido da usuária: o fornecedor pode ter mais de um telefone).
 */
export function formatarTelefone(valor: string): string {
  return valor
    .split(',')
    .map((parte) => formatarUmTelefone(parte))
    .join(', ');
}

function formatarUmTelefone(parte: string): string {
  const digitos = parte.replace(/\D/g, '').slice(0, 11);
  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
