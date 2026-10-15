/**
 * Conectores e preposições que ficam em minúscula quando aparecem no meio de um
 * título ("Capacitação e Conscientização Ambiental", "Uso Sustentável da Água") —
 * pedido da Vanessa (gestora do contrato): só as palavras principais levam letra
 * maiúscula. A primeira palavra do texto sempre fica maiúscula.
 */
const CONECTORES_MINUSCULOS = new Set([
  'a', 'as', 'o', 'os',
  'e', 'ou',
  'de', 'da', 'das', 'do', 'dos',
  'em', 'na', 'nas', 'no', 'nos',
  'ao', 'aos', 'à', 'às',
  'por', 'pela', 'pelas', 'pelo', 'pelos',
  'para', 'com', 'sem', 'sob', 'sobre', 'entre', 'até',
  'um', 'uma', 'acerca',
]);

/**
 * Deixa a primeira letra das palavras principais maiúscula (e o resto minúsculo)
 * — conectores e preposições (e, de, da, do, dos, em, para…) ficam em minúscula,
 * exceto se forem a primeira palavra do texto. Usado pra exibir de forma
 * consistente nomes que a usuária cadastra em texto livre (Objeto Contratual,
 * Aspecto de Sustentabilidade, Eixo PDLS, Indicador de Desempenho), não importa
 * como foram digitados originalmente.
 * Só mexe na exibição: o valor salvo (usado como id/comparação em selects,
 * por exemplo) continua exatamente como foi digitado.
 */
export function capitalizarPalavras(texto: string): string {
  return texto
    .split(' ')
    .map((palavra, indice) => {
      if (!palavra) return palavra;
      const minuscula = palavra.toLocaleLowerCase('pt-BR');
      if (indice > 0 && CONECTORES_MINUSCULOS.has(minuscula)) return minuscula;
      return palavra.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
    })
    .join(' ');
}
