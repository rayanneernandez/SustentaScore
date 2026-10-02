/**
 * Deixa a primeira letra de cada palavra maiúscula (e o resto minúsculo) —
 * usado pra exibir de forma consistente nomes que a usuária cadastra em
 * texto livre (Objeto Contratual, Aspecto de Sustentabilidade, Eixo PDLS,
 * Indicador de Desempenho), não importa como foram digitados originalmente.
 * Só mexe na exibição: o valor salvo (usado como id/comparação em selects,
 * por exemplo) continua exatamente como foi digitado.
 */
export function capitalizarPalavras(texto: string): string {
  return texto
    .split(' ')
    .map((palavra) =>
      palavra ? palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1).toLocaleLowerCase('pt-BR') : palavra
    )
    .join(' ');
}
