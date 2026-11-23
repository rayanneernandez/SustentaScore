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

/** DDDs em uso no Brasil. */
const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

const plural = (n: number, singular: string, plural_: string) => `${n} ${n === 1 ? singular : plural_}`;

/**
 * Confere UM telefone (com DDD) e devolve a mensagem do que está errado/faltando, ou `null` se estiver certo:
 * - DDD: 2 números e precisa existir;
 * - celular (começa com 9 depois do DDD): 9 números → 11 no total;
 * - fixo (começa com 2 a 5): 8 números → 10 no total.
 */
export function erroTelefone(valor: string): string | null {
  const d = valor.replace(/\D/g, '');
  if (d.length === 0) return null;
  if (d.length < 2) return 'Informe o DDD com 2 números, por exemplo (21).';
  const ddd = Number(d.slice(0, 2));
  if (!DDDS_VALIDOS.has(ddd)) return `DDD ${d.slice(0, 2)} inválido — confira o DDD do telefone.`;
  const numero = d.slice(2);
  if (numero.length === 0) return 'Faltam os números do telefone depois do DDD.';
  const primeiro = numero[0];
  if (primeiro === '9') {
    if (numero.length < 9) return `Celular incompleto: faltam ${plural(9 - numero.length, 'número', 'números')} (celular com DDD tem 11 números).`;
    return null;
  }
  if (['2', '3', '4', '5'].includes(primeiro)) {
    if (numero.length < 8) return `Telefone fixo incompleto: faltam ${plural(8 - numero.length, 'número', 'números')} (fixo com DDD tem 10 números).`;
    if (numero.length > 8) return 'Telefone fixo tem 8 números depois do DDD — se for celular, ele começa com 9.';
    return null;
  }
  return 'Número inválido: telefone fixo começa com 2, 3, 4 ou 5 e celular começa com 9 (depois do DDD).';
}

/** Cada número do campo (separados por vírgula) precisa estar completo e com DDD válido. */
export function telefonesValidos(valor: string): boolean {
  return valor.split(',').map((p) => p.trim()).filter((p) => p.replace(/\D/g, '')).every((p) => erroTelefone(p) === null);
}
