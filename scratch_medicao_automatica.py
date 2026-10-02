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

# --- DataContext.tsx ---
apply('src/context/DataContext.tsx', [
    # import — também precisa de prepararMedicaoMesAtual
    (
        "import { calcularScoreMesAtual } from '../utils/score';",
        "import { calcularScoreMesAtual, prepararMedicaoMesAtual } from '../utils/score';",
        1,
    ),
    # reconciliarScoresDoMes — agora também cria/atualiza a Medição do mês
    # corrente de cada contrato ativo, não só o score (pedido explícito da
    # usuária: o histórico precisa ficar registrado de verdade)
    (
        """function reconciliarScoresDoMes(carregados: DadosCarregados): DadosCarregados {
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
}""",
        """function reconciliarScoresDoMes(carregados: DadosCarregados): DadosCarregados {
  let medicoes = carregados.medicoes;

  const contratos = carregados.contratos.map((c) => {
    if (c.status !== 'ativo') return c;
    const resultado = calcularScoreMesAtual(c.id, carregados.ocorrencias);

    const preparada = prepararMedicaoMesAtual(c.id, resultado, medicoes);
    if (preparada?.nova && preparada.medicaoCompleta) {
      const novaMedicao = preparada.medicaoCompleta;
      medicoes = [...medicoes, novaMedicao];
      sincronizar(dbMedicoes.inserir(novaMedicao), `criar medição do mês do contrato ${c.id}`);
    } else if (preparada && !preparada.nova && preparada.patch) {
      const idMedicao = preparada.id;
      const patchMedicao = preparada.patch;
      medicoes = medicoes.map((m) => (m.id === idMedicao ? { ...m, ...patchMedicao } : m));
      sincronizar(dbMedicoes.atualizar(idMedicao, patchMedicao), `atualizar medição do mês do contrato ${c.id}`);
    }

    if (c.score === resultado.score && c.faixa === resultado.faixa && c.pagamento === resultado.pagamento) return c;
    sincronizar(
      dbContratos.atualizar(c.id, { score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento }),
      `recalcular score do mês do contrato ${c.id}`,
    );
    return { ...c, score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento };
  });

  return { ...carregados, contratos, medicoes };
}""",
        1,
    ),
    # addOcorrencia — agora também cria/atualiza a Medição do mês corrente
    (
        """    const ocorrenciasAtualizadas = [o, ...(dados?.ocorrencias ?? [])];
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
        """    const ocorrenciasAtualizadas = [o, ...(dados?.ocorrencias ?? [])];
    const resultado = calcularScoreMesAtual(o.contratoId, ocorrenciasAtualizadas);

    // A Medição do mês corrente também é criada/atualizada na hora — pedido
    // explícito da usuária: o histórico precisa ficar registrado de verdade,
    // não só calculado pra exibir (ver `prepararMedicaoMesAtual`).
    const preparada = prepararMedicaoMesAtual(o.contratoId, resultado, dados?.medicoes ?? []);
    if (preparada?.nova && preparada.medicaoCompleta) {
      const novaMedicao = preparada.medicaoCompleta;
      setDados((prev) => (prev ? { ...prev, medicoes: [...prev.medicoes, novaMedicao] } : prev));
      sincronizar(dbMedicoes.inserir(novaMedicao), `criar medição do mês do contrato ${o.contratoId}`);
    } else if (preparada && !preparada.nova && preparada.patch) {
      const idMedicao = preparada.id;
      const patchMedicao = preparada.patch;
      setDados((prev) =>
        prev ? { ...prev, medicoes: prev.medicoes.map((m) => (m.id === idMedicao ? { ...m, ...patchMedicao } : m)) } : prev,
      );
      sincronizar(dbMedicoes.atualizar(idMedicao, patchMedicao), `atualizar medição do mês do contrato ${o.contratoId}`);
    }

    updateContrato(
      o.contratoId,
      { score: resultado.score, faixa: resultado.faixa, pagamento: resultado.pagamento },
      o.tipoRegistro === 'treinamento'
        ? undefined
        : {
            tipo: 'ocorrencia',
            descricao: `Nova ocorrência registrada: -${o.deducao} ponto${o.deducao === 1 ? '' : 's'}. Score do mês atualizado para ${resultado.score} (dedução total do mês: -${resultado.deducaoTotal}).`,
          },
    );
  };""",
        1,
    ),
])

# --- Cadastro.tsx — tira a etiqueta "Liberado/Pendente/Bloqueado" do
#     Histórico de Score (pedido explícito da usuária: não precisa aparecer) ---
apply('src/pages/Cadastro.tsx', [
    (
        """                <div key={m.id} className="score-history-row">
                  <div className="history-period">{m.periodo}</div>
                  <div className="history-meta">
                    Score: {m.score} · {m.pagamento}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                  </div>
                  <div className={`history-status history-status--${m.status}`}>
                    {m.status === 'liberado' ? 'Liberado' : m.status === 'pendente' ? 'Pendente' : 'Bloqueado'}
                  </div>
                </div>""",
        """                <div key={m.id} className="score-history-row">
                  <div className="history-period">{m.periodo}</div>
                  <div className="history-meta">
                    Score: {m.score} · {m.pagamento}% do pagamento · {m.ocorrencias} ocorrência{m.ocorrencias !== 1 ? 's' : ''}
                  </div>
                </div>""",
        1,
    ),
])

# --- CalculoScore.tsx — volta ao formato original: agora que a Medição do mês
#     corrente é um registro de verdade (criado/atualizado pelo DataContext),
#     não precisa mais de nenhum tratamento especial pra "mês em andamento" —
#     ele já aparece sozinho no histórico, igual qualquer outro mês ---
apply('src/pages/CalculoScore.tsx', [
    (
        "import { useEffect, useMemo, useState } from 'react';\nimport { PieChart, Pie, Cell } from 'recharts';\nimport { useData } from '../context/DataContext';\nimport { calcularScoreMesAtual } from '../utils/score';",
        "import { useEffect, useMemo, useState } from 'react';\nimport { PieChart, Pie, Cell } from 'recharts';\nimport { useData } from '../context/DataContext';",
        1,
    ),
    (
        "const MESES_ABREV: Record<string, number> = {\n  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,\n  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,\n};\nconst MESES_ABREV_ORDEM = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];",
        "const MESES_ABREV: Record<string, number> = {\n  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,\n  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,\n};",
        1,
    ),
    (
        "  const { contratos: todosContratos, medicoes, ocorrencias } = useData();",
        "  const { contratos: todosContratos, medicoes } = useData();",
        1,
    ),
    (
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
        """  const opcoesPeriodo = useMemo(
    () => [...historicoAsc].reverse().map((m) => m.periodo),
    [historicoAsc],
  );""",
        1,
    ),
    (
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
        """  const medicao = periodoSel ? historico.find((m) => m.periodo === periodoSel) : undefined;

  const score = medicao?.score ?? contrato?.score ?? 0;
  const ocorrenciasQtd = medicao?.ocorrencias ?? 0;
  const deducaoTotal = ocorrenciasQtd * 25;
  const pagamentoPct = medicao?.pagamento ?? contrato?.pagamento ?? 0;
  const faixa = getFaixa(score);""",
        1,
    ),
    (
        """          <h3 className="score-card-title">Detalhamento — {contrato.fornecedorNome}</h3>
          <p className="score-contract-num">{contrato.numero}</p>
          {vendoMesAtual && (
            <p className="form-hint form-hint--muted" style={{ marginTop: -4, marginBottom: 8 }}>
              {periodoSel} — mês em andamento, atualizado automaticamente a cada nova ocorrência registrada.
            </p>
          )}
          {contrato.status === 'inativo' && (""",
        """          <h3 className="score-card-title">Detalhamento — {contrato.fornecedorNome}</h3>
          <p className="score-contract-num">{contrato.numero}</p>
          {contrato.status === 'inativo' && (""",
        1,
    ),
])
