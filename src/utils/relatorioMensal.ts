import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Contrato, Medicao, Ocorrencia } from '../types';
import { PAGAMENTO_MINIMO_NF, SCORE_INICIAL_MES, calcularValorAPagar, faixaDoScore, periodoParaAnoMes } from './score';
import { formatarReais } from './moeda';

const NOME_FAIXA: Record<ReturnType<typeof faixaDoScore>, string> = {
  verde: 'Faixa verde (450 a 500)',
  cinza: 'Faixa cinza (350 a 449)',
  preto: 'Zona preta (abaixo de 350)',
};

function dataBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

function statusTexto(status: Medicao['status']) {
  return status === 'liberado' ? 'Liberado' : status === 'pendente' ? 'Pendente' : 'Bloqueado';
}

export function nomeArquivoRelatorioMensal(contratoNumero: string, periodo: string) {
  return `relatorio_${contratoNumero.replace(/[^\w-]+/g, '_')}_${periodo.replace('/', '-')}.pdf`;
}

interface Dados {
  contrato: Contrato;
  medicao: Medicao;
  ocorrencias: Ocorrencia[];
  geradoPor?: string;
}

/**
 * Relatório de medição de UM mês de UM contrato — o documento que subsidia o pagamento
 * daquele mês: identificação, score, faixa, valor da NF e valor a pagar, as ocorrências
 * que geraram os descontos e campos de assinatura. O histórico de todos os meses continua
 * existindo à parte (visão gerencial).
 */
export function gerarRelatorioMensalPDF({ contrato, medicao, ocorrencias, geradoPor }: Dados) {
  const doc = new jsPDF();
  const largura = doc.internal.pageSize.getWidth();
  const verde: [number, number, number] = [61, 92, 62];

  doc.setFontSize(15);
  doc.setTextColor(30);
  doc.text('Relatório Mensal de Medição e Pagamento', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`Referência: ${medicao.periodo}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.2 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 } },
    body: [
      ['Fornecedor', contrato.fornecedorNome],
      ['Contrato', contrato.numero + (contrato.ano ? `/${contrato.ano}` : '')],
      ['Objeto', contrato.objeto ?? '—'],
      ['Unidade', contrato.unidade ?? '—'],
      ['Gestor do contrato', contrato.gestor ?? '—'],
      ['Preposto da contratada', contrato.preposto ?? '—'],
    ],
  });

  const calculo = calcularValorAPagar(medicao.valor, medicao.score);
  const faixa = faixaDoScore(medicao.score);
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text('Resultado do mês', 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Score', 'Faixa', 'Pagamento', 'Valor da NF', 'Valor a pagar', 'Status']],
    body: [[
      `${medicao.score} / ${SCORE_INICIAL_MES}`,
      NOME_FAIXA[faixa],
      `${calculo.percentual}%`,
      medicao.valor > 0 ? formatarReais(medicao.valor) : 'não informado',
      medicao.valor > 0 ? formatarReais(calculo.valorAPagar) : '—',
      statusTexto(medicao.status),
    ]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: verde },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  doc.setFontSize(8.5);
  doc.setTextColor(90);
  const notas = [
    `Pagamento mínimo garantido: ${PAGAMENTO_MINIMO_NF}% do valor da NF. Score abaixo de 350 mantém o pagamento em ${PAGAMENTO_MINIMO_NF}% e aciona as sanções previstas em contrato.`,
    ...(medicao.valor > 0 && calculo.desconto > 0 ? [`Desconto aplicado sobre a NF neste mês: ${formatarReais(calculo.desconto)}.`] : []),
  ];
  for (const nota of notas) {
    const linhas = doc.splitTextToSize(nota, largura - 28) as string[];
    doc.text(linhas, 14, y);
    y += linhas.length * 4;
  }
  y += 3;

  const anoMes = periodoParaAnoMes(medicao.periodo);
  const doMes = anoMes
    ? ocorrencias
        .filter((o) => o.contratoId === contrato.id && o.data.startsWith(anoMes))
        .sort((a, b) => a.data.localeCompare(b.data))
    : [];
  const totalDeducao = doMes.filter((o) => o.tipoRegistro !== 'treinamento').reduce((s, o) => s + (o.deducao || 0), 0);

  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(`Ocorrências do mês (${doMes.length})`, 14, y);
  if (doMes.length === 0) {
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text('Nenhuma ocorrência registrada no mês.', 14, y + 6);
    y += 12;
  } else {
    autoTable(doc, {
      startY: y + 2,
      head: [['Data', 'Aspecto', 'Tipo', 'Descrição', 'Dedução']],
      body: doMes.map((o) => [
        dataBR(o.data),
        o.indicadorNome || '—',
        o.tipoRegistro === 'treinamento' ? 'Treinamento' : 'Ocorrência',
        o.descricao,
        o.tipoRegistro === 'treinamento' ? '0' : `-${o.deducao || 0}`,
      ]),
      foot: [['', '', '', 'Total de pontos descontados', `-${totalDeducao}`]],
      styles: { fontSize: 8.5, cellPadding: 1.8 },
      headStyles: { fillColor: verde },
      footStyles: { fillColor: [235, 238, 235], textColor: 30, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 38 }, 2: { cellWidth: 24 }, 4: { cellWidth: 20, halign: 'right' } },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  // Assinaturas — vão para a próxima página se não houver espaço.
  const alturaPagina = doc.internal.pageSize.getHeight();
  if (y > alturaPagina - 62) {
    doc.addPage();
    y = 20;
  }
  y += 22;
  doc.setDrawColor(60);
  doc.setLineWidth(0.3);
  const colunas: Array<{ x: number; titulo: string; nome?: string }> = [
    { x: 14, titulo: 'Fiscal / Gestor do contrato', nome: contrato.gestor },
    { x: 112, titulo: 'Preposto da contratada', nome: contrato.preposto },
  ];
  for (const c of colunas) {
    doc.line(c.x, y, c.x + 84, y);
    doc.setFontSize(9.5);
    doc.setTextColor(30);
    doc.text(c.titulo, c.x, y + 5);
    if (c.nome) {
      doc.setTextColor(90);
      doc.text(c.nome, c.x, y + 10);
    }
    doc.setTextColor(90);
    doc.text('Data: ____ / ____ / ________', c.x, y + 17);
  }

  // Rodapé em todas as páginas.
  const total = doc.getNumberOfPages();
  const emitidoEm = new Date().toLocaleString('pt-BR');
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Gerado em ${emitidoEm}${geradoPor ? ' por ' + geradoPor : ''} — SustentaScore`, 14, alturaPagina - 8);
    doc.text(`Página ${i} de ${total}`, largura - 14, alturaPagina - 8, { align: 'right' });
  }

  doc.save(nomeArquivoRelatorioMensal(contrato.numero, medicao.periodo));
}
