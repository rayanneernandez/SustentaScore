import { useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LabelList,
} from 'recharts';
import {
  FileText,
  Users,
  Gauge,
  CalendarCheck,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Award,
  Calendar,
  Filter,
  Maximize2,
  Minimize2,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
} from 'lucide-react';
import {
  scoreHistorico,
  distribuicaoScore,
} from '../data/mockData';
import { useData } from '../context/DataContext';
import NotificationBell from '../components/NotificationBell';
import type { LayoutContext } from '../components/Layout';

const faixasPagamento = [
  { range: '500 a 450', percentual: '100%', status: 'Verde', color: 'verde' },
  { range: '449 a 350', percentual: '95%', status: 'Cinza', color: 'cinza' },
  { range: 'Abaixo de 350', percentual: '90%', status: 'Preto', color: 'preto' },
];

const mesesAbreviados = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// Paleta categórica validada (ordem fixa, distinguível em daltonismo) — usada para as
// linhas de "evolução do score por unidade". Acima de 6 unidades, o excedente é
// agrupado em "Outras unidades" na cor neutra, para não poluir o gráfico.
const CORES_UNIDADE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'];
const COR_OUTRAS_UNIDADES = '#9CA3AF';
const MAX_LINHAS_UNIDADE = 6;

function normalizarPeriodoDaData(data: string) {
  const [ano, mes] = data.split('-');
  const indiceMes = Number(mes) - 1;
  const anoCurto = ano.slice(-2);
  return `${mesesAbreviados[indiceMes]}/${anoCurto}`;
}

function limitarScore(score: number) {
  return Math.max(0, Math.min(500, Math.round(score)));
}

const labelFaixaCompleto: Record<'verde' | 'cinza' | 'preto', string> = {
  verde: 'Verde',
  cinza: 'Cinza',
  preto: 'Preto',
};

/** Usado no nome dos arquivos exportados (imagem/CSV/PDF) — data e hora local por
 * extenso, sem caracteres que dão problema em nome de arquivo. */
function timestampArquivo() {
  const agora = new Date();
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${agora.getFullYear()}${dois(agora.getMonth() + 1)}${dois(agora.getDate())}_${dois(agora.getHours())}${dois(agora.getMinutes())}`;
}

/** Uma "seção" do relatório de monitoramento — vira uma tabela no PDF e um bloco
 * (faixa de título + cabeçalho + linhas, formatado) na planilha Excel. Mantém os
 * dois formatos de exportação sempre com exatamente as mesmas informações,
 * montadas num só lugar. */
interface SecaoRelatorio {
  titulo: string;
  colunas: string[];
  linhas: string[][];
}

// Mesma paleta do resto do sistema (ver `:root` em `index.css`), em hex sem o "#" —
// é o formato que o ExcelJS espera pras cores de preenchimento (ARGB).
const EXCEL_COR_TITULO = 'FF2C4A2E'; // var(--primary)
const EXCEL_COR_SECAO = 'FF5C8B5F'; // var(--accent)
const EXCEL_COR_CABECALHO = 'FFEAF0EA'; // var(--primary-pale)
const EXCEL_COR_LINHA_PAR = 'FFF5F1EA'; // var(--bg)
const EXCEL_COR_BORDA = 'FFE2DDD5'; // var(--border)

export default function Dashboard() {
  const { notifAberto, setNotifAberto } = useOutletContext<LayoutContext>();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [orgao, setOrgao] = useState('Todos');
  const [contrato, setContrato] = useState('Todos');
  const [fornecedor, setFornecedor] = useState('Todos');
  const [periodo, setPeriodo] = useState('Todos');
  const [expandido, setExpandido] = useState(false);
  const [modoEvolucao, setModoEvolucao] = useState<'geral' | 'unidade'>('geral');
  const [mostrarTodosMenoresScore, setMostrarTodosMenoresScore] = useState(false);
  const [menuExportAberto, setMenuExportAberto] = useState(false);
  const [exportando, setExportando] = useState<'imagem' | 'excel' | 'pdf' | null>(null);

  const { contratos: todosContratos, ocorrencias, eixosPDLS } = useData();

  // Contratos inativos não são contabilizados no score, nos indicadores nem nos alertas do painel.
  const contratos = useMemo(
    () => todosContratos.filter((item) => item.status === 'ativo'),
    [todosContratos],
  );

  const mediaScoreGlobal = useMemo(() => {
    if (!contratos.length) return 0;
    const totalScoreGlobal = contratos.reduce((total, item) => total + item.score, 0);
    return Math.round(totalScoreGlobal / contratos.length);
  }, [contratos]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setExpandido(document.fullscreenElement === dashboardRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const opcoesOrgao = useMemo(
    () => ['Todos', ...new Set(contratos.map((item) => item.unidade).filter(Boolean) as string[])],
    [contratos],
  );

  const opcoesContrato = useMemo(
    () => ['Todos', ...contratos.map((item) => item.numero)],
    [contratos],
  );

  // O filtro de Fornecedor fica atrelado ao Órgão/Unidade selecionado — só lista
  // fornecedores que têm contrato naquela unidade.
  const opcoesFornecedor = useMemo(
    () => [
      'Todos',
      ...new Set(
        contratos
          .filter((item) => orgao === 'Todos' || item.unidade === orgao)
          .map((item) => item.fornecedorNome),
      ),
    ],
    [contratos, orgao],
  );

  useEffect(() => {
    if (fornecedor !== 'Todos' && !opcoesFornecedor.includes(fornecedor)) {
      setFornecedor('Todos');
    }
  }, [opcoesFornecedor, fornecedor]);

  const opcoesPeriodo = useMemo(
    () => ['Todos', ...scoreHistorico.map((item) => item.mes)],
    [],
  );

  const contratosFiltrados = useMemo(
    () =>
      contratos.filter((item) => {
        const matchOrgao = orgao === 'Todos' || item.unidade === orgao;
        const matchContrato = contrato === 'Todos' || item.numero === contrato;
        const matchFornecedor = fornecedor === 'Todos' || item.fornecedorNome === fornecedor;
        return matchOrgao && matchContrato && matchFornecedor;
      }),
    [contrato, fornecedor, orgao, contratos],
  );

  const idsContratosFiltrados = useMemo(
    () => new Set(contratosFiltrados.map((item) => item.id)),
    [contratosFiltrados],
  );

  const ocorrenciasFiltradas = useMemo(
    () =>
      ocorrencias.filter((item) => {
        const matchContrato = idsContratosFiltrados.has(item.contratoId);
        const matchPeriodo = periodo === 'Todos' || normalizarPeriodoDaData(item.data) === periodo;
        return matchContrato && matchPeriodo;
      }),
    [idsContratosFiltrados, periodo],
  );

  const scoreMedio = useMemo(() => {
    if (!contratosFiltrados.length) {
      return 0;
    }

    const total = contratosFiltrados.reduce((sum, item) => sum + item.score, 0);
    return Math.round(total / contratosFiltrados.length);
  }, [contratosFiltrados]);

  const pagamentoMedio = useMemo(() => {
    if (!contratosFiltrados.length) {
      return 0;
    }

    const total = contratosFiltrados.reduce((sum, item) => sum + item.pagamento, 0);
    return Math.round(total / contratosFiltrados.length);
  }, [contratosFiltrados]);

  const fornecedoresAvaliados = useMemo(
    () => new Set(contratosFiltrados.map((item) => item.fornecedorId)).size,
    [contratosFiltrados],
  );

  const distribuicaoFiltrada = useMemo(() => {
    const totais = contratosFiltrados.reduce(
      (acc, item) => {
        acc[item.faixa] += 1;
        return acc;
      },
      { verde: 0, cinza: 0, preto: 0 },
    );

    return distribuicaoScore.map((item) => {
      if (item.name.includes('Verde')) {
        return { ...item, value: totais.verde };
      }

      if (item.name.includes('Cinza')) {
        return { ...item, value: totais.cinza };
      }

      return { ...item, value: totais.preto };
    });
  }, [contratosFiltrados]);

  const percentualFaixaVerde = useMemo(() => {
    const total = distribuicaoFiltrada.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return 0;
    }

    return Math.round((distribuicaoFiltrada[0].value / total) * 100);
  }, [distribuicaoFiltrada]);

  const historicoFiltrado = useMemo(() => {
    const ajuste = scoreMedio ? scoreMedio - mediaScoreGlobal : -mediaScoreGlobal;
    const serie = scoreHistorico.map((item) => ({
      ...item,
      score: limitarScore(item.score + ajuste),
    }));

    if (periodo === 'Todos') {
      return serie;
    }

    const indicePeriodo = serie.findIndex((item) => item.mes === periodo);
    return indicePeriodo >= 0 ? serie.slice(0, indicePeriodo + 1) : serie;
  }, [periodo, scoreMedio]);

  /**
   * Evolução do score aplicada por unidade — usa a mesma técnica da série geral
   * (desloca a tendência de `scoreHistorico` pela diferença entre a média da
   * unidade e a média global), só que uma linha por unidade em vez de uma única
   * linha agregada. Limita a `MAX_LINHAS_UNIDADE` linhas nomeadas e agrupa o
   * restante em "Outras unidades" para o gráfico não ficar poluído.
   */
  const { historicoPorUnidade, unidadesDoGrafico } = useMemo(() => {
    const porUnidade = new Map<string, { total: number; qtd: number }>();
    for (const c of contratosFiltrados) {
      if (!c.unidade) continue;
      const atual = porUnidade.get(c.unidade) ?? { total: 0, qtd: 0 };
      atual.total += c.score;
      atual.qtd += 1;
      porUnidade.set(c.unidade, atual);
    }

    const unidadesOrdenadas = Array.from(porUnidade.entries())
      .map(([nome, { total, qtd }]) => ({ nome, media: total / qtd, qtd }))
      .sort((a, b) => b.qtd - a.qtd || b.media - a.media);

    const principais = unidadesOrdenadas.slice(0, MAX_LINHAS_UNIDADE);
    const restantes = unidadesOrdenadas.slice(MAX_LINHAS_UNIDADE);

    const nomesGrafico = principais.map((u) => u.nome);
    if (restantes.length) nomesGrafico.push('Outras unidades');

    const mediaRestantes = restantes.length
      ? restantes.reduce((soma, u) => soma + u.media, 0) / restantes.length
      : null;

    const serie = scoreHistorico.map((item) => {
      const linha: Record<string, string | number> = { mes: item.mes };
      for (const u of principais) {
        linha[u.nome] = limitarScore(item.score + (u.media - mediaScoreGlobal));
      }
      if (mediaRestantes !== null) {
        linha['Outras unidades'] = limitarScore(item.score + (mediaRestantes - mediaScoreGlobal));
      }
      return linha;
    });

    const serieFinal =
      periodo === 'Todos'
        ? serie
        : (() => {
            const indicePeriodo = serie.findIndex((item) => item.mes === periodo);
            return indicePeriodo >= 0 ? serie.slice(0, indicePeriodo + 1) : serie;
          })();

    return { historicoPorUnidade: serieFinal, unidadesDoGrafico: nomesGrafico };
  }, [contratosFiltrados, mediaScoreGlobal, periodo]);

  /** Unidade com a maior média de score entre os contratos ativos — independe dos
   * filtros de Órgão/Unidade (senão a comparação perde sentido), mas respeita
   * fornecedor/contrato/período selecionados. */
  const unidadeMaisSustentavel = useMemo(() => {
    const porUnidade = new Map<string, { total: number; qtd: number }>();
    for (const c of contratos) {
      if (!c.unidade) continue;
      const atual = porUnidade.get(c.unidade) ?? { total: 0, qtd: 0 };
      atual.total += c.score;
      atual.qtd += 1;
      porUnidade.set(c.unidade, atual);
    }

    let melhor: { nome: string; media: number } | null = null;
    for (const [nome, { total, qtd }] of porUnidade) {
      const media = Math.round(total / qtd);
      if (!melhor || media > melhor.media) melhor = { nome, media };
    }
    return melhor;
  }, [contratos]);

  // Ocorrências agrupadas por Eixo PDLS (1 a 6) — cada ocorrência está atrelada a um
  // dos 6 eixos, então esse gráfico mostra em quais eixos os fornecedores mais têm
  // descumprido metas.
  const ocorrenciasAgrupadas = useMemo(() => {
    const totais = ocorrenciasFiltradas.reduce<Record<string, number>>((acc, item) => {
      acc[item.eixoPDLSId] = (acc[item.eixoPDLSId] ?? 0) + 1;
      return acc;
    }, {});

    const agrupadas = Object.entries(totais)
      .map(([eixoId, total]) => {
        const eixo = eixosPDLS.find((e) => e.id === eixoId);
        return { tipo: eixo ? `Eixo ${eixo.numero}` : 'Outro', total };
      })
      .sort((a, b) => b.total - a.total);

    return agrupadas.length ? agrupadas : [{ tipo: 'Sem registros', total: 0 }];
  }, [ocorrenciasFiltradas, eixosPDLS]);

  const menoresFornecedoresTodos = useMemo(
    () => [...contratosFiltrados].sort((a, b) => a.score - b.score),
    [contratosFiltrados],
  );

  const menoresFornecedores = mostrarTodosMenoresScore
    ? menoresFornecedoresTodos
    : menoresFornecedoresTodos.slice(0, 5);

  const totalOcorrencias = useMemo(
    () => ocorrenciasAgrupadas.reduce((sum, item) => sum + item.total, 0),
    [ocorrenciasAgrupadas],
  );

  const labelPeriodo = periodo === 'Todos' ? 'todos os períodos' : periodo;
  // O wrapper externo (alvo da API de fullscreen) NÃO tem a classe `page` — ela
  // ficou só no `<div className="page">` interno, que envolve filtros/KPIs/gráficos.
  // Isso deixa o `dashboard-header` (o cabeçalho branco) como um irmão fora desse
  // container com largura máxima, ocupando 100% da largura do `.main-content` (sem
  // as margens esquerda/direita que apareciam em monitores muito largos, quando o
  // `.page` de dentro batia no `max-width` e ficava centralizado com `margin:auto`).
  const dashboardClasses = expandido ? 'page--fullscreen' : undefined;

  const limparFiltros = () => {
    setOrgao('Todos');
    setContrato('Todos');
    setFornecedor('Todos');
    setPeriodo('Todos');
  };

  const alternarFullscreen = async () => {
    try {
      if (document.fullscreenElement === dashboardRef.current) {
        await document.exitFullscreen();
        return;
      }

      await dashboardRef.current?.requestFullscreen();
    } catch (error) {
      console.error('Nao foi possivel alternar o fullscreen do dashboard.', error);
    }
  };

  /**
   * Todas as informações do painel, organizadas em seções — respeita os filtros
   * (Órgão/Contrato/Fornecedor/Período) e o modo de evolução (geral/por unidade)
   * que estão selecionados na tela no momento da exportação. Usado tanto pelo CSV
   * quanto pelo PDF, pra os dois sempre saírem com o mesmo conteúdo.
   */
  const montarSecoesRelatorio = (): SecaoRelatorio[] => {
    const secoes: SecaoRelatorio[] = [];

    secoes.push({
      titulo: 'Filtros aplicados',
      colunas: ['Filtro', 'Valor'],
      linhas: [
        ['Órgão / Unidade', orgao],
        ['Contrato', contrato],
        ['Fornecedor', fornecedor],
        ['Período', periodo],
      ],
    });

    secoes.push({
      titulo: 'Indicadores gerais',
      colunas: ['Indicador', 'Valor'],
      linhas: [
        ['Contratos monitorados (ativos)', String(contratosFiltrados.length)],
        ['Fornecedores avaliados', String(fornecedoresAvaliados)],
        ['Score médio', `${scoreMedio} de 500 pontos`],
        ['Contratos avaliados no mês', `${contratosFiltrados.length} (em ${labelPeriodo})`],
        ['Pagamento médio', `${pagamentoMedio}%`],
        [
          'Unidade mais sustentável',
          unidadeMaisSustentavel
            ? `${unidadeMaisSustentavel.nome} (${unidadeMaisSustentavel.media} pontos em média)`
            : 'Sem dados suficientes',
        ],
      ],
    });

    secoes.push({
      titulo: 'Distribuição dos contratos por faixa de score',
      colunas: ['Faixa', 'Contratos'],
      linhas: distribuicaoFiltrada.map((item) => [item.name, String(item.value)]),
    });

    if (modoEvolucao === 'geral') {
      secoes.push({
        titulo: 'Evolução do score médio (geral)',
        colunas: ['Mês', 'Score'],
        linhas: historicoFiltrado.map((item) => [item.mes, String(item.score)]),
      });
    } else {
      secoes.push({
        titulo: 'Evolução do score médio (por unidade)',
        colunas: ['Mês', ...unidadesDoGrafico],
        linhas: historicoPorUnidade.map((linha) => [
          String(linha.mes),
          ...unidadesDoGrafico.map((nome) => String(linha[nome] ?? '')),
        ]),
      });
    }

    secoes.push({
      titulo: 'Distribuição das ocorrências por Eixo PDLS',
      colunas: ['Eixo', 'Ocorrências'],
      linhas: [
        ...ocorrenciasAgrupadas.map((item) => [item.tipo, String(item.total)]),
        ['Total', String(totalOcorrencias)],
      ],
    });

    secoes.push({
      titulo: 'Faixas de pagamento',
      colunas: ['Score', 'Percentual de pagamento', 'Status'],
      linhas: faixasPagamento.map((f) => [f.range, f.percentual, f.status]),
    });

    secoes.push({
      titulo: `Fornecedores com menor score (${menoresFornecedoresTodos.length})`,
      colunas: ['Fornecedor', 'Unidade', 'Contrato', 'Score', 'Status'],
      linhas: menoresFornecedoresTodos.map((c) => [
        c.fornecedorNome,
        c.unidade || '—',
        c.numero,
        String(c.score),
        labelFaixaCompleto[c.faixa],
      ]),
    });

    return secoes;
  };

  /**
   * Planilha Excel (.xlsx) formatada — faixas de título coloridas por seção, cabeçalho
   * destacado, linhas zebradas e números alinhados à direita (ver `EXCEL_COR_*` acima,
   * mesma paleta do resto do sistema). Um CSV puro não tem como carregar nenhuma dessas
   * formatações — foi o que a usuária testou primeiro e achou "desorganizado" no Excel
   * (sem negrito, sem cor, tudo colado) — por isso a exportação de dados virou .xlsx
   * de verdade em vez de .csv.
   */
  const exportarExcel = async () => {
    if (exportando) return;
    setExportando('excel');
    try {
      // Import dinâmico — o ExcelJS só é baixado quando alguém realmente exporta a
      // planilha, em vez de engordar o pacote inicial carregado por todo mundo.
      const ExcelJS = (await import('exceljs')).default;
      const secoes = montarSecoesRelatorio();

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SustentaScore';
      workbook.created = new Date();
      const ws = workbook.addWorksheet('Monitoramento', { views: [{ showGridLines: false }] });

      const maxColunas = Math.max(...secoes.map((s) => s.colunas.length), 1);

      ws.mergeCells(1, 1, 1, maxColunas);
      const celulaTitulo = ws.getCell(1, 1);
      celulaTitulo.value = 'Monitoramento de Desempenho de Fornecedores – Sustentabilidade (IMR)';
      celulaTitulo.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
      celulaTitulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COR_TITULO } };
      celulaTitulo.alignment = { vertical: 'middle', horizontal: 'left' };
      ws.getRow(1).height = 26;

      ws.mergeCells(2, 1, 2, maxColunas);
      const celulaSubtitulo = ws.getCell(2, 1);
      celulaSubtitulo.value = `Painel Gerencial — gerado em ${new Date().toLocaleString('pt-BR')}`;
      celulaSubtitulo.font = { italic: true, size: 9.5, color: { argb: 'FF6B7280' } };
      celulaSubtitulo.alignment = { vertical: 'middle', horizontal: 'left' };

      let linha = 4;

      secoes.forEach((secao) => {
        const numColunas = Math.max(secao.colunas.length, 1);

        // Faixa de título da seção — mesclada, fundo verde-claro, texto branco.
        ws.mergeCells(linha, 1, linha, numColunas);
        const celulaSecao = ws.getCell(linha, 1);
        celulaSecao.value = secao.titulo;
        celulaSecao.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        celulaSecao.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COR_SECAO } };
        celulaSecao.alignment = { vertical: 'middle', horizontal: 'left' };
        ws.getRow(linha).height = 20;
        linha += 1;

        // Cabeçalho das colunas — negrito, fundo verde bem clarinho.
        const linhaCabecalho = ws.getRow(linha);
        secao.colunas.forEach((coluna, i) => {
          const cel = linhaCabecalho.getCell(i + 1);
          cel.value = coluna;
          cel.font = { bold: true, size: 10, color: { argb: 'FF1A1A1A' } };
          cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COR_CABECALHO } };
          cel.border = { bottom: { style: 'thin', color: { argb: EXCEL_COR_BORDA } } };
          cel.alignment = { vertical: 'middle' };
        });
        linha += 1;

        // Linhas de dados — zebrado a cada 2ª linha; valores puramente numéricos viram
        // número de verdade (alinhado à direita), em vez de texto alinhado à esquerda.
        secao.linhas.forEach((valores, indiceLinha) => {
          const linhaExcel = ws.getRow(linha);
          valores.forEach((valor, i) => {
            const cel = linhaExcel.getCell(i + 1);
            const numero = /^-?\d+(\.\d+)?$/.test(valor) ? Number(valor) : null;
            cel.value = numero !== null ? numero : valor;
            cel.font = { size: 10, color: { argb: 'FF1A1A1A' } };
            cel.alignment = { horizontal: numero !== null ? 'right' : 'left', vertical: 'middle' };
            cel.border = { bottom: { style: 'thin', color: { argb: EXCEL_COR_BORDA } } };
            if (indiceLinha % 2 === 1) {
              cel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL_COR_LINHA_PAR } };
            }
          });
          linha += 1;
        });

        linha += 1; // linha em branco entre seções
      });

      ws.getColumn(1).width = 34;
      for (let i = 2; i <= maxColunas; i += 1) {
        ws.getColumn(i).width = 22;
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `monitoramento_sustentascore_${timestampArquivo()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Não foi possível gerar a planilha Excel.', error);
    } finally {
      setExportando(null);
      setMenuExportAberto(false);
    }
  };

  const exportarPDF = () => {
    if (exportando) return;
    setExportando('pdf');
    try {
      const secoes = montarSecoesRelatorio();
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text('Monitoramento de Desempenho de Fornecedores – Sustentabilidade (IMR)', 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text(`Painel Gerencial — gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 22);

      let y = 30;
      secoes.forEach((secao) => {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(11);
        doc.setTextColor(30);
        doc.text(secao.titulo, 14, y);
        autoTable(doc, {
          startY: y + 4,
          head: [secao.colunas],
          body: secao.linhas,
          styles: { fontSize: 8.5 },
          headStyles: { fillColor: [61, 92, 62] },
          margin: { left: 14, right: 14 },
        });
        // `lastAutoTable` é anexado ao `doc` em tempo de execução pelo próprio
        // jspdf-autotable — não tem tipo declarado, por isso o cast.
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      });

      doc.save(`monitoramento_sustentascore_${timestampArquivo()}.pdf`);
    } finally {
      setExportando(null);
      setMenuExportAberto(false);
    }
  };

  const exportarImagem = async () => {
    if (exportando || !dashboardRef.current) return;
    setExportando('imagem');
    try {
      // Import dinâmico — o html2canvas só é baixado quando alguém realmente pede a
      // imagem, em vez de engordar o pacote inicial carregado por todo mundo.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#F5F1EA',
        scale: 2,
        useCORS: true,
        // Botões/menus de ação não são "informação do painel" — só o conteúdo.
        ignoreElements: (el) => el.classList.contains('dashboard-export-hide'),
      });
      const link = document.createElement('a');
      link.download = `monitoramento_sustentascore_${timestampArquivo()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Não foi possível gerar a imagem do painel.', error);
    } finally {
      setExportando(null);
      setMenuExportAberto(false);
    }
  };

  return (
    <div ref={dashboardRef} className={dashboardClasses}>
      {/* Header */}
      <div className="page-header dashboard-header">
        <div>
          <h1 className="page-title">Monitoramento de Desempenho de Fornecedores – Sustentabilidade (IMR)</h1>
          <p className="page-subtitle">Painel Gerencial</p>
        </div>
        <div className="dashboard-header-actions">
          {/* `dashboard-export-hide` marca o que é controle/ação da tela, não informação do
              painel — fica de fora da imagem exportada em `exportarImagem` (html2canvas). */}
          <div className="export-menu-wrapper dashboard-export-hide">
            <button
              type="button"
              className="btn-secondary dashboard-expand-btn"
              onClick={() => setMenuExportAberto((v) => !v)}
              disabled={exportando !== null}
            >
              <Download size={16} />
              {exportando ? 'Exportando…' : 'Exportar relatório'}
              <ChevronDown size={13} />
            </button>
            {menuExportAberto && (
              <>
                <div className="export-menu-overlay" onClick={() => setMenuExportAberto(false)} />
                <div className="export-menu">
                  <button type="button" className="export-menu-item" onClick={exportarImagem}>
                    <ImageIcon size={15} />
                    Exportar como imagem (PNG)
                  </button>
                  <button type="button" className="export-menu-item" onClick={exportarExcel}>
                    <FileSpreadsheet size={15} />
                    Exportar dados em Excel (XLSX)
                  </button>
                  <button type="button" className="export-menu-item" onClick={exportarPDF}>
                    <FileText size={15} />
                    Exportar relatório em PDF
                  </button>
                </div>
              </>
            )}
          </div>
          <button className="btn-secondary dashboard-expand-btn dashboard-export-hide" onClick={alternarFullscreen}>
            {expandido ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {expandido ? 'Sair da tela inteira' : 'Tela inteira'}
          </button>
          <div className="dashboard-last-update-row">
            <div className="dashboard-last-update">
              <Calendar size={14} />
              <span>Última atualização:<br />31/05/2024 10:30</span>
            </div>
            <div className="dashboard-export-hide">
              <NotificationBell aberto={notifAberto} onAbrirChange={setNotifAberto} />
            </div>
          </div>
        </div>
      </div>

      {/* O corpo (filtros/KPIs/gráficos/tabelas) continua com a classe `page` (padding +
          largura máxima centralizada) — só o `dashboard-header` acima ficou fora disso.
          Em tela inteira, ganha `dashboard-body--fullscreen` pra ignorar o `max-width` e
          aproveitar a largura toda do monitor (quem controla o tamanho/scroll do modo
          tela inteira em si é o wrapper externo, com `page--fullscreen`). */}
      <div className={`page${expandido ? ' dashboard-body--fullscreen' : ''}`}>
      {/* Filtros */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-label">Órgão / Unidade</label>
          <select className="filter-select-input" value={orgao} onChange={(event) => setOrgao(event.target.value)}>
            {opcoesOrgao.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Contrato</label>
          <select className="filter-select-input" value={contrato} onChange={(event) => setContrato(event.target.value)}>
            {opcoesContrato.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Fornecedor</label>
          <select className="filter-select-input" value={fornecedor} onChange={(event) => setFornecedor(event.target.value)}>
            {opcoesFornecedor.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Período</label>
          <select className="filter-select-input filter-select-input--date" value={periodo} onChange={(event) => setPeriodo(event.target.value)}>
            {opcoesPeriodo.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-clear-filter" onClick={limparFiltros}>
          <Filter size={14} />
          Limpar filtros
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon"><FileText size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{contratosFiltrados.length}</div>
          <div className="kpi-label">Contratos ativos</div>
          <div className="kpi-title">CONTRATOS MONITORADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Users size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{fornecedoresAvaliados}</div>
          <div className="kpi-label">Fornecedores</div>
          <div className="kpi-title">FORNECEDORES AVALIADOS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Gauge size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{scoreMedio}</div>
          <div className="kpi-label">de 500 pontos</div>
          <div className="kpi-title">SCORE MÉDIO</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><CalendarCheck size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{contratosFiltrados.length}</div>
          <div className="kpi-label">Avaliados em {labelPeriodo}</div>
          <div className="kpi-title">CONTRATOS NO MÊS</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><DollarSign size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value">{pagamentoMedio}%</div>
          <div className="kpi-label">Percentual médio</div>
          <div className="kpi-title">PAGAMENTO MÉDIO</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon"><Award size={24} strokeWidth={1.5} /></div>
          <div className="kpi-value kpi-value--sm">{unidadeMaisSustentavel?.nome ?? '—'}</div>
          <div className="kpi-label">{unidadeMaisSustentavel ? `${unidadeMaisSustentavel.media} pontos em média` : 'Sem dados suficientes'}</div>
          <div className="kpi-title">UNIDADE MAIS SUSTENTÁVEL</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Donut Chart */}
        <div className="chart-card">
          <h3 className="chart-title">DISTRIBUIÇÃO DOS CONTRATOS POR FAIXA DE SCORE</h3>
          <div className="donut-wrapper">
            <PieChart width={200} height={200}>
              <Pie
                data={distribuicaoFiltrada}
                cx={100}
                cy={100}
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {distribuicaoFiltrada.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
            <div className="donut-center">
              <span className="donut-pct">{percentualFaixaVerde}%</span>
            </div>
          </div>
          <div className="donut-legend">
            {distribuicaoFiltrada.map((item, i) => (
              <div key={i} className="legend-item">
                <span className="legend-dot" style={{ background: item.color }} />
                <span className="legend-label">{item.name}</span>
                <span className="legend-count">{item.value} contratos</span>
              </div>
            ))}
          </div>
        </div>

        {/* Line Chart */}
        <div className="chart-card chart-card--wide">
          <div className="chart-card-header">
            <h3 className="chart-title">EVOLUÇÃO DO SCORE MÉDIO</h3>
            <div className="segmented-toggle segmented-toggle--sm">
              <button
                type="button"
                className={`segmented-toggle-btn ${modoEvolucao === 'geral' ? 'segmented-toggle-btn--active' : ''}`}
                onClick={() => setModoEvolucao('geral')}
              >
                Geral
              </button>
              <button
                type="button"
                className={`segmented-toggle-btn ${modoEvolucao === 'unidade' ? 'segmented-toggle-btn--active' : ''}`}
                onClick={() => setModoEvolucao('unidade')}
              >
                Por unidade
              </button>
            </div>
          </div>
          {modoEvolucao === 'geral' ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historicoFiltrado} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 500]} ticks={[0, 100, 200, 300, 400, 500]} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E1D8', fontSize: 12 }}
                  labelStyle={{ color: '#1C1C1C', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3D5C3E"
                  strokeWidth={2.5}
                  dot={{ fill: '#3D5C3E', r: 4 }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList dataKey="score" position="top" style={{ fontSize: 11, fill: '#3D5C3E', fontWeight: 600 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={historicoPorUnidade} margin={{ top: 12, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E1D8" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 500]} ticks={[0, 100, 200, 300, 400, 500]} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #E5E1D8', fontSize: 12 }}
                  labelStyle={{ color: '#1C1C1C', fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={9} />
                {unidadesDoGrafico.map((nome, i) => (
                  <Line
                    key={nome}
                    type="monotone"
                    dataKey={nome}
                    stroke={nome === 'Outras unidades' ? COR_OUTRAS_UNIDADES : CORES_UNIDADE[i % CORES_UNIDADE.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Horizontal Bar Chart */}
        <div className="chart-card">
          <h3 className="chart-title">DISTRIBUIÇÃO DAS OCORRÊNCIAS POR EIXO PDLS</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={ocorrenciasAgrupadas}
              layout="vertical"
              margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="tipo"
                width={140}
                tick={{ fontSize: 12, fill: '#1C1C1C' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E5E1D8', fontSize: 12 }}
              />
              <Bar dataKey="total" fill="#5C8B5F" radius={[0, 4, 4, 0]} barSize={16}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 12, fill: '#1C1C1C', fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="occurrence-total">
            <span>Total de ocorrências</span>
            <strong>{totalOcorrencias}</strong>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Faixas de Pagamento */}
        <div className="table-card">
          <h3 className="chart-title">FAIXAS DE PAGAMENTO</h3>
          <div className="table-scroll">
          <table className="payment-table">
            <thead>
              <tr>
                <th>SCORE</th>
                <th>PERCENTUAL DE PAGAMENTO</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {faixasPagamento.map((f, i) => (
                <tr key={i}>
                  <td>{f.range}</td>
                  <td className="text-center">{f.percentual}</td>
                  <td>
                    <span className={`status-badge status-badge--${f.color}`}>
                      <span className="status-dot" />
                      {f.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Menores Scores */}
        <div className="table-card table-card--wide">
          <h3 className="chart-title">FORNECEDORES COM MENOR SCORE NO MÊS</h3>
          <div className="table-scroll">
          <table className="suppliers-table">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Unidade</th>
                <th>Contrato</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {menoresFornecedores.length ? (
                menoresFornecedores.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fornecedorNome}</td>
                    <td>{c.unidade || '—'}</td>
                    <td>{c.numero}</td>
                    <td>{c.score}</td>
                    <td>
                      <span className={`status-dot-only status-dot-only--${c.faixa}`} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="table-empty-state">Nenhum contrato encontrado para os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          {menoresFornecedoresTodos.length > 5 && (
            <div className="table-footer">
              <button className="btn-link" onClick={() => setMostrarTodosMenoresScore((v) => !v)}>
                {mostrarTodosMenoresScore ? 'Ver menos' : `Ver todos (${menoresFornecedoresTodos.length})`}
                {mostrarTodosMenoresScore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
