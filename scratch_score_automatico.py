def apply(path, edits):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new, expected in edits:
        count = content.count(old)
        assert count == expected, f"Expected {expected} occurrences, found {count} in {path}: {old[:90]!r}"
        content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK: {path}")

# --- types/index.ts — novo tipo de evento de histórico 'ocorrencia' ---
apply('src/types/index.ts', [
    (
        """export type HistoricoTipo =
  | 'criacao'
  | 'edicao'
  | 'status'
  | 'prorrogacao'
  | 'anexo'
  | 'observacao';""",
        """export type HistoricoTipo =
  | 'criacao'
  | 'edicao'
  | 'status'
  | 'prorrogacao'
  | 'anexo'
  | 'observacao'
  | 'ocorrencia';""",
        1,
    ),
])

# --- Cadastro.tsx — rótulo do novo tipo de histórico ---
apply('src/pages/Cadastro.tsx', [
    (
        """const rotuloTipoHistorico: Record<HistoricoTipo, string> = {
  criacao: 'Criação',
  edicao: 'Edição',
  status: 'Status',
  prorrogacao: 'Prorrogação',
  anexo: 'Anexo',
  observacao: 'Observação',
};""",
        """const rotuloTipoHistorico: Record<HistoricoTipo, string> = {
  criacao: 'Criação',
  edicao: 'Edição',
  status: 'Status',
  prorrogacao: 'Prorrogação',
  anexo: 'Anexo',
  observacao: 'Observação',
  ocorrencia: 'Ocorrência',
};""",
        1,
    ),
])

# --- DataContext.tsx ---
apply('src/context/DataContext.tsx', [
    # import do novo motor de cálculo de score
    (
        "import { supabase, supabaseConfigurado } from '../lib/supabaseClient';",
        "import { supabase, supabaseConfigurado } from '../lib/supabaseClient';\nimport { calcularScoreMesAtual } from '../utils/score';",
        1,
    ),
    # nova função de reconciliação — roda toda vez que os dados carregam, garante
    # que o score do mês corrente de cada contrato ativo reflita as Ocorrências
    # já registradas (cobre tanto a virada de mês quanto um score que ainda não
    # tinha sido recalculado antes dessa funcionalidade existir)
    (
        """    usuarios,
    perfis,
  };
}

/**
 * Gera notificações a partir da vigência dos contratos.""",
        """    usuarios,
    perfis,
  };
}

/**
 * Garante que o score/faixa/pagamento de cada contrato ATIVO reflita as
 * Ocorrências do mês corrente assim que os dados carregam — cobre tanto o caso
 * de "virou o mês e ninguém registrou nada ainda, o score precisa voltar pra
 * 500" quanto o de um contrato cujo score ainda não refletia Ocorrências já
 * registradas antes dessa funcionalidade existir (pedido explícito da
 * usuária: ocorrências com dedução têm que descontar do score do contrato).
 * Contratos inativos nunca são tocados aqui — o score deles fica congelado
 * como histórico (ver comentários em `scoreFornecedor` e nas telas de Score).
 * Só grava no Supabase os contratos cujo valor realmente mudou.
 */
function reconciliarScoresDoMes(carregados: DadosCarregados): DadosCarregados {
  let mudou = false;
  const contratos = carregados.contratos.map((c) => {
    if (c.status !== 'ativo') return c;
    const { score, faixa, pagamento } = calcularScoreMesAtual(c.id, carregados.ocorrencias);
    if (c.score === score && c.faixa === faixa && c.pagamento === pagamento) return c;
    mudou = true;
    sincronizar(dbContratos.atualizar(c.id, { score, faixa, pagamento }), `recalcular score do mês do contrato ${c.id}`);
    return { ...c, score, faixa, pagamento };
  });
  return mudou ? { ...carregados, contratos } : carregados;
}

/**
 * Gera notificações a partir da vigência dos contratos.""",
        1,
    ),
    # aplica a reconciliação assim que os dados terminam de carregar
    (
        """    carregarDoSupabase()
      .then((carregados) => {
        if (!cancelado) setDados(carregados);
      })""",
        """    carregarDoSupabase()
      .then((carregados) => {
        if (!cancelado) setDados(reconciliarScoresDoMes(carregados));
      })""",
        1,
    ),
    # addOcorrencia — recalcula e persiste o score do mês do contrato na hora
    (
        """  const addOcorrencia = (o: Ocorrencia) => {
    setDados((prev) => (prev ? { ...prev, ocorrencias: [o, ...prev.ocorrencias] } : prev));
    sincronizar(dbOcorrencias.inserir(o), `nova ocorrência ${o.id}`);
  };""",
        """  const addOcorrencia = (o: Ocorrencia) => {
    setDados((prev) => (prev ? { ...prev, ocorrencias: [o, ...prev.ocorrencias] } : prev));
    sincronizar(dbOcorrencias.inserir(o), `nova ocorrência ${o.id}`);

    // Toda Ocorrência "com dedução" desconta na hora o score do mês corrente do
    // contrato — o score reinicia em 500 todo mês (pedido explícito da usuária,
    // ver `calcularScoreMesAtual`). Ocorrências do tipo 'treinamento' nunca
    // descontam, mas mesmo assim recalculamos pra manter tudo consistente caso
    // o contador de ocorrências do mês volte a ser exibido em algum lugar.
    const ocorrenciasAtualizadas = [o, ...(dados?.ocorrencias ?? [])];
    const { score, faixa, pagamento, deducaoTotal } = calcularScoreMesAtual(o.contratoId, ocorrenciasAtualizadas);
    updateContrato(
      o.contratoId,
      { score, faixa, pagamento },
      o.tipoRegistro === 'treinamento'
        ? undefined
        : {
            tipo: 'ocorrencia',
            descricao: `Nova ocorrência registrada: -${o.deducao} ponto${o.deducao === 1 ? '' : 's'}. Score do mês atualizado para ${score} (dedução total do mês: -${deducaoTotal}).`,
          },
    );
  };""",
        1,
    ),
])

# --- CalculoScore.tsx — mostra o mês corrente (em andamento) por padrão,
#     calculado ao vivo a partir das Ocorrências, em vez de só o último mês
#     fechado no histórico de Medições ---
apply('src/pages/CalculoScore.tsx', [
    (
        "import { useEffect, useMemo, useState } from 'react';\nimport { PieChart, Pie, Cell } from 'recharts';\nimport { useData } from '../context/DataContext';",
        "import { useEffect, useMemo, useState } from 'react';\nimport { PieChart, Pie, Cell } from 'recharts';\nimport { useData } from '../context/DataContext';\nimport { calcularScoreMesAtual } from '../utils/score';",
        1,
    ),
    (
        "const MESES_ABREV: Record<string, number> = {\n  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,\n  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,\n};",
        "const MESES_ABREV: Record<string, number> = {\n  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,\n  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,\n};\nconst MESES_ABREV_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];",
        1,
    ),
    (
        "  const { contratos: todosContratos, medicoes } = useData();",
        "  const { contratos: todosContratos, medicoes, ocorrencias } = useData();",
        1,
    ),
    (
        """  const opcoesPeriodo = useMemo(
    () => [...historicoAsc].reverse().map((m) => m.periodo),
    [historicoAsc],
  );""",
        """  // "mmm/aa" do mês corrente (ex: "ago/26") — mesmo formato usado no histórico.
  const rotuloMesAtual = useMemo(() => {
    const agora = new Date();
    return `${MESES_ABREV_ORDEM[agora.getMonth()]}/${String(agora.getFullYear()).slice(-2)}`;
  }, []);

  // O mês corrente entra como primeira opção (e fica selecionado por padrão,
  // ver o `useEffect` logo abaixo) sempre que o contrato está ativo e ainda não
  // existe uma Medição fechada com esse período — nesse caso ele é calculado ao
  // vivo a partir das Ocorrências (ver `vendoMesAtual` mais abaixo), em vez de
  // mostrar direto o último mês fechado no histórico.
  const opcoesPeriodo = useMemo(() => {
    const historicos = [...historicoAsc].reverse().map((m) => m.periodo);
    if (contrato?.status === 'ativo' && !historicos.includes(rotuloMesAtual)) {
      return [rotuloMesAtual, ...historicos];
    }
    return historicos;
  }, [historicoAsc, contrato, rotuloMesAtual]);""",
        1,
    ),
    (
        """  const medicao = periodoSel ? historico.find((m) => m.periodo === periodoSel) : undefined;

  const score = medicao?.score ?? contrato?.score ?? 0;
  const ocorrenciasQtd = medicao?.ocorrencias ?? 0;
  const deducaoTotal = ocorrenciasQtd * 25;
  const pagamentoPct = medicao?.pagamento ?? contrato?.pagamento ?? 0;
  const faixa = getFaixa(score);""",
        """  const medicao = periodoSel ? historico.find((m) => m.periodo === periodoSel) : undefined;

  // Sem Medição fechada pro período selecionado == estamos olhando o mês em
  // andamento. `contrato.score/.pagamento` já vêm certos do DataContext (são
  // recalculados a cada Ocorrência registrada, ver `calcularScoreMesAtual`) —
  // só a quantidade de ocorrências e a dedução do mês precisam ser calculadas
  // aqui ao vivo, porque não ficam guardadas direto no contrato.
  const vendoMesAtual = contrato?.status === 'ativo' && !medicao;
  const liveDoMes = vendoMesAtual && contrato ? calcularScoreMesAtual(contrato.id, ocorrencias) : null;

  const score = medicao?.score ?? contrato?.score ?? 0;
  const ocorrenciasQtd = medicao?.ocorrencias ?? liveDoMes?.ocorrenciasQtd ?? 0;
  const deducaoTotal = medicao ? ocorrenciasQtd * 25 : liveDoMes?.deducaoTotal ?? 0;
  const pagamentoPct = medicao?.pagamento ?? contrato?.pagamento ?? 0;
  const faixa = getFaixa(score);""",
        1,
    ),
    (
        """          <h3 className="score-card-title">Detalhamento — {contrato.fornecedorNome}</h3>
          <p className="score-contract-num">{contrato.numero}</p>
          {contrato.status === 'inativo' && (""",
        """          <h3 className="score-card-title">Detalhamento — {contrato.fornecedorNome}</h3>
          <p className="score-contract-num">{contrato.numero}</p>
          {vendoMesAtual && (
            <p className="form-hint form-hint--muted" style={{ marginTop: -4, marginBottom: 8 }}>
              {periodoSel} — mês em andamento, atualizado automaticamente a cada nova ocorrência registrada.
            </p>
          )}
          {contrato.status === 'inativo' && (""",
        1,
    ),
])
