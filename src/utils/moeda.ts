const formatadorReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 12345.6 -> "R$ 12.345,60" */
export function formatarReais(valor: number): string {
  return formatadorReais.format(valor);
}

/**
 * Lê o que a pessoa digitou num campo de valor em reais ("10000", "10.000", "10.000,50",
 * "R$ 5.000,00", "5000,5"). Devolve `null` se não for um número válido (>= 0).
 * Convenção brasileira: ponto separa milhar e vírgula separa os centavos.
 */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (!limpo) return null;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(limpo)) return null;
  const numero = Number(limpo.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}
