import type { Fornecedor, Contrato, Indicador, Ocorrencia, Medicao, ScoreHistorico, EixoPDLS, IndicadorPDLS, Usuario, Perfil, PaginaKey } from '../types';

/** Lista padrão de Objetos Contratuais — cadastrável pelo usuário via DataContext. */
export const OBJETOS_CONTRATUAIS_PADRAO = [
  'Serviço de limpeza',
  'Locação de veículos',
  'Vigilância orgânica',
  'Serviços administrativos',
  'Apoio Administrativo',
  'Construção',
  'Geral',
];

/**
 * Toda tela do sistema que pode ter acesso controlado por perfil, na ordem em
 * que aparece no menu lateral — fonte única usada pelo `Sidebar`, pelas rotas
 * protegidas (`App.tsx`) e pela grade de permissões em Usuários e Permissões.
 */
export const PAGINAS_SISTEMA: { key: PaginaKey; label: string; num: number }[] = [
  { key: 'cadastro', label: 'Fornecedores', num: 1 },
  { key: 'indicadores', label: 'Aspectos de Sustentabilidade', num: 2 },
  { key: 'cadastroPdls', label: 'Estrutura de Sustentabilidade', num: 3 },
  { key: 'ocorrencias', label: 'Registro de Ocorrências', num: 4 },
  { key: 'score', label: 'Cálculo do Score', num: 5 },
  { key: 'medicao', label: 'Medição e Pagamento', num: 6 },
  { key: 'dashboard', label: 'Monitoramento e Painel Gerencial', num: 7 },
  { key: 'usuarios', label: 'Usuários', num: 8 },
  { key: 'perfis', label: 'Perfis de Acesso', num: 9 },
];

/**
 * Telas que ficam sob "Administração" no menu, ou que ficam de fora do acesso
 * padrão do perfil Colaborador (`PERFIS_PADRAO`, abaixo) — são as telas de
 * configuração/estrutura, não do dia a dia operacional. `cadastroPdls` entra
 * aqui porque é onde se monta a estrutura (Objeto → Aspecto → Eixo PDLS →
 * Indicador de Desempenho) — a tela de Aspectos de Sustentabilidade continua
 * visível para todo mundo, só que em modo leitura/seleção.
 */
export const PAGINAS_ADMINISTRACAO: PaginaKey[] = ['cadastroPdls', 'usuarios', 'perfis'];

export const permissoesTotais = (valor: boolean): Perfil['permissoes'] =>
  PAGINAS_SISTEMA.reduce(
    (acc, p) => ({ ...acc, [p.key]: { ver: valor, criar: valor, editar: valor, excluir: valor } }),
    {} as Perfil['permissoes'],
  );

/** Ids fixos dos dois perfis padrão — usados pelo DataContext para nunca deixar o sistema sem um caminho de acesso total. */
export const PERFIL_ADMIN_ID = 'perfil-administrador';
export const PERFIL_COLABORADOR_ID = 'perfil-colaborador';

/**
 * Perfis de acesso padrão do sistema. Administrador tem acesso total e não pode
 * ser editado/excluído (sempre precisa existir um caminho de acesso total).
 * Colaborador só visualiza tudo — pode ser editado/excluído se não for mais o
 * único perfil de leitura, mas por padrão já vem pronto pra uso imediato. Novos
 * perfis (com combinações próprias de telas/permissões) são criados na tela de
 * Perfis de Acesso.
 */
export const PERFIS_PADRAO: Perfil[] = [
  { id: PERFIL_ADMIN_ID, nome: 'Administrador', padrao: true, permissoes: permissoesTotais(true) },
  {
    id: PERFIL_COLABORADOR_ID,
    nome: 'Colaborador',
    padrao: true,
    // Vê tudo, exceto as telas de Administração (Usuários / Perfis de Acesso) — mantém o
    // comportamento original. Isso é só o padrão de fábrica: pode ser ajustado livremente
    // depois, como qualquer outro perfil.
    permissoes: PAGINAS_SISTEMA.reduce(
      (acc, p) => ({
        ...acc,
        [p.key]: { ver: !PAGINAS_ADMINISTRACAO.includes(p.key), criar: false, editar: false, excluir: false },
      }),
      {} as Perfil['permissoes'],
    ),
  },
];

/**
 * Usuários de exemplo do protótipo — login local, sem backend (ver aviso em
 * `Usuario`, em types/index.ts). Servem para já dar acesso a alguém a cada
 * perfil padrão; novos usuários, perfis e permissões são gerenciados em
 * Usuários e Permissões.
 */
export const USUARIOS_PADRAO: Usuario[] = [
  { id: 'u1', nome: 'Administrador SustentaScore', email: 'admin@sustentascore.gov.br', senha: 'admin123', cargo: 'Administrador do Sistema', perfilId: PERFIL_ADMIN_ID },
  { id: 'u2', nome: 'Fiscal Colaborador', email: 'colaborador@sustentascore.gov.br', senha: 'colab123', cargo: 'Fiscal de Contrato', perfilId: PERFIL_COLABORADOR_ID },
];

export const fornecedores: Fornecedor[] = [
  { id: 'f1', nome: 'Construtora Alfa S.A.', cnpj: '48.921.442/0001-09', contratos: 2, score: 475, faixa: 'verde', endereco: 'Rua das Flores, 123 - Brasília/DF', telefone: '(61) 3333-4444', preposto: 'Carlos Mendes' },
  { id: 'f2', nome: 'ServiLimp Ltda.', cnpj: '12.345.678/0001-90', contratos: 1, score: 500, faixa: 'verde', endereco: 'Av. das Nações, 500 - Brasília/DF', telefone: '(61) 4444-5555', preposto: 'Ana Paula Silva' },
  { id: 'f3', nome: 'TransLog Veículos ME', cnpj: '98.765.432/0001-11', contratos: 1, score: 500, faixa: 'verde', endereco: 'SGAS 910, Bloco B - Brasília/DF', telefone: '(61) 5555-6666', preposto: 'Roberto Lima' },
  { id: 'f4', nome: 'Fornecedor A', cnpj: '11.222.333/0001-44', contratos: 1, score: 312, faixa: 'preto', endereco: 'Rua 7, Quadra 3 - Taguatinga/DF', telefone: '(61) 9999-1111', preposto: 'José Santos' },
  { id: 'f5', nome: 'Fornecedor B', cnpj: '55.666.777/0001-88', contratos: 1, score: 324, faixa: 'preto', endereco: 'Setor Industrial, Lote 12 - Gama/DF', telefone: '(61) 9999-2222', preposto: 'Maria Costa' },
  { id: 'f6', nome: 'Fornecedor C', cnpj: '99.888.777/0001-22', contratos: 1, score: 356, faixa: 'cinza', endereco: 'Av. Central, 200 - Ceilândia/DF', telefone: '(61) 9999-3333', preposto: 'Pedro Alves' },
  { id: 'f7', nome: 'Fornecedor D', cnpj: '33.444.555/0001-66', contratos: 1, score: 360, faixa: 'cinza', endereco: 'QNN 12, Área Especial - Ceilândia/DF', telefone: '(61) 9999-4444', preposto: 'Fernanda Rocha' },
  { id: 'f8', nome: 'Fornecedor E', cnpj: '77.888.999/0001-00', contratos: 1, score: 372, faixa: 'cinza', endereco: 'Setor Comercial Sul, Bl. A - Brasília/DF', telefone: '(61) 9999-5555', preposto: 'Lucas Pereira' },
];

export const contratos: Contrato[] = [
  { id: 'ct1', fornecedorId: 'f1', fornecedorNome: 'Construtora Alfa S.A.', numero: 'CT-2024/001', ano: '2024', objeto: 'Serviço de limpeza', unidade: 'Superintendência de Infraestrutura', vigencia: '12/2024', fiscalTecnico: 'Ana Souza', fiscalAdministrativo: 'Bruno Torres', gestor: 'Carla Neves', score: 475, faixa: 'verde', pagamento: 100, status: 'ativo' },
  { id: 'ct2', fornecedorId: 'f2', fornecedorNome: 'ServiLimp Ltda.', numero: 'CT-2024/002', ano: '2024', objeto: 'Serviço de limpeza', unidade: 'Diretoria de Gestão', vigencia: '06/2025', fiscalTecnico: 'Marcos Lima', fiscalAdministrativo: 'Patrícia Rios', gestor: 'Sandra Melo', score: 500, faixa: 'verde', pagamento: 100, status: 'ativo' },
  { id: 'ct3', fornecedorId: 'f3', fornecedorNome: 'TransLog Veículos ME', numero: 'CT-2024/003', ano: '2024', objeto: 'Locação de veículos', unidade: 'Secretaria Executiva', vigencia: '03/2025', fiscalTecnico: 'Rafael Costa', fiscalAdministrativo: 'Julia Martins', gestor: 'Tiago Braga', score: 500, faixa: 'verde', pagamento: 100, status: 'ativo' },
  { id: 'ct4', fornecedorId: 'f4', fornecedorNome: 'Fornecedor A', numero: 'CT-001/2024', ano: '2024', objeto: 'Serviços administrativos', unidade: 'Coordenação Geral', vigencia: '09/2024', fiscalTecnico: 'Felipe Dias', gestor: 'Renata Faria', score: 312, faixa: 'preto', pagamento: 90, status: 'ativo' },
  { id: 'ct5', fornecedorId: 'f5', fornecedorNome: 'Fornecedor B', numero: 'CT-015/2024', ano: '2024', objeto: 'Vigilância orgânica', unidade: 'Divisão de Segurança', vigencia: '11/2024', fiscalTecnico: 'Amanda Vaz', gestor: 'Rodrigo Campos', score: 324, faixa: 'preto', pagamento: 90, status: 'ativo' },
  { id: 'ct6', fornecedorId: 'f6', fornecedorNome: 'Fornecedor C', numero: 'CT-008/2024', ano: '2024', objeto: 'Serviço de limpeza', unidade: 'Superintendência de TI', vigencia: '08/2024', fiscalTecnico: 'Beatriz Luz', gestor: 'Eduardo Reis', score: 356, faixa: 'cinza', pagamento: 95, status: 'inativo' },
  { id: 'ct7', fornecedorId: 'f7', fornecedorNome: 'Fornecedor D', numero: 'CT-022/2024', ano: '2024', objeto: 'Locação de veículos', unidade: 'Núcleo de Logística', vigencia: '10/2024', fiscalTecnico: 'Camila Fonseca', gestor: 'Sergio Brito', score: 360, faixa: 'cinza', pagamento: 95, status: 'ativo' },
  { id: 'ct8', fornecedorId: 'f8', fornecedorNome: 'Fornecedor E', numero: 'CT-031/2024', ano: '2024', objeto: 'Serviços administrativos', unidade: 'Assessoria Jurídica', vigencia: '12/2024', fiscalTecnico: 'Natalia Pinto', gestor: 'Vitor Moura', score: 372, faixa: 'cinza', pagamento: 95, status: 'ativo' },
  // Segundo contrato ativo da Construtora Alfa (f1), em outra unidade — exemplo para
  // comparar o score do mesmo fornecedor (mesmo CNPJ) por unidade administrativa.
  { id: 'ct9', fornecedorId: 'f1', fornecedorNome: 'Construtora Alfa S.A.', numero: 'CT-2024/009', ano: '2024', objeto: 'Construção', unidade: 'Divisão de Manutenção', vigencia: '05/2025', fiscalTecnico: 'Diego Farias', gestor: 'Helena Prado', score: 410, faixa: 'cinza', pagamento: 95, status: 'ativo' },
];

export const indicadores: Indicador[] = [
  {
    id: 'i1',
    nome: 'Gestão de Resíduos Sólidos',
    descricao: 'Descarte e destinação adequada de resíduos conforme normas ambientais.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'recycle',
  },
  {
    id: 'i2',
    nome: 'Uso Racional de Água',
    descricao: 'Implementação de práticas de economia e reuso de água.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'droplets',
  },
  {
    id: 'i3',
    nome: 'Eficiência Energética',
    descricao: 'Uso de fontes renováveis e redução de consumo energético.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'zap',
  },
  {
    id: 'i4',
    nome: 'Práticas Sustentáveis Gerais',
    descricao: 'Cumprimento de certificações e políticas ambientais vigentes.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'leaf',
  },
  {
    id: 'i5',
    nome: 'Gestão de Emissões de GEE',
    descricao: 'Monitoramento e redução de emissões de gases de efeito estufa.',
    tipo: 'Construção',
    contratosVinculados: 1,
    icone: 'wind',
  },
  {
    id: 'i6',
    nome: 'Condições de Trabalho',
    descricao: 'Garantia de condições dignas e seguras de trabalho.',
    tipo: 'Geral',
    contratosVinculados: 3,
    icone: 'users',
  },
  // ── Macroindicadores transcritos das tabelas reais de Consolidação dos Critérios
  // de Sustentabilidade — Tabela 1 (TR nº 9/2023, Serviço de Limpeza) e Tabela 4
  // (TR nº 101/2024, Apoio Administrativo). Cada um tem seu Indicador de Desempenho
  // (PDLS) correspondente em `indicadoresPDLS`, abaixo.
  {
    id: 'i7',
    nome: 'Gestão de Resíduos e Coleta Seletiva',
    descricao: 'Destinação adequada de resíduos e manutenção de coleta seletiva pela contratada.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 0,
    icone: 'recycle',
  },
  {
    id: 'i8',
    nome: 'Uso Sustentável da Água',
    descricao: 'Redução do consumo de água em relação ao ano anterior.',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 0,
    icone: 'droplets',
  },
  {
    id: 'i9',
    nome: 'Uso Racional de Materiais',
    descricao: 'Redução da aquisição de materiais de consumo administrativo.',
    tipo: 'Apoio Administrativo',
    contratosVinculados: 0,
    icone: 'leaf',
  },
  {
    id: 'i10',
    nome: 'Redução do Consumo de Água e Energia',
    descricao: 'Redução do consumo de energia elétrica e água nas instalações.',
    tipo: 'Apoio Administrativo',
    contratosVinculados: 0,
    icone: 'zap',
  },
  {
    id: 'i11',
    nome: 'Gestão Ambiental de Resíduos Automotivos',
    descricao: 'Destinação adequada de resíduos gerados pela frota de veículos.',
    tipo: 'Apoio Administrativo',
    contratosVinculados: 0,
    icone: 'recycle',
  },
  {
    id: 'i12',
    nome: 'Consumo Consciente de Água e Lavagem Sustentável',
    descricao: 'Redução do consumo de água em processos de lavagem de veículos.',
    tipo: 'Apoio Administrativo',
    contratosVinculados: 0,
    icone: 'droplets',
  },
];

/**
 * Os 6 Eixos temáticos do PDLS (Plano de Desenvolvimento Local Sustentável).
 * Só o nome do Eixo 1 está confirmado pelos documentos recebidos até agora — os
 * demais ficam com nome provisório "(a definir)" para serem renomeados depois,
 * em Macroindicadores → Objetos e Eixos PDLS, sem precisar recriar os vínculos já
 * feitos pelos Indicadores de Desempenho.
 */
export const eixosPDLS: EixoPDLS[] = [
  { id: 'eixo1', numero: 1, nome: 'Racionalização do Consumo de Bens e Serviços' },
  { id: 'eixo2', numero: 2, nome: 'Eixo 2 (nome a definir)' },
  { id: 'eixo3', numero: 3, nome: 'Eixo 3 (nome a definir)' },
  { id: 'eixo4', numero: 4, nome: 'Eixo 4 (nome a definir)' },
  { id: 'eixo5', numero: 5, nome: 'Eixo 5 (nome a definir)' },
  { id: 'eixo6', numero: 6, nome: 'Eixo 6 (nome a definir)' },
];

/**
 * Indicadores de Desempenho (PDLS) transcritos das mesmas tabelas — cada um vinculado
 * a um Macroindicador (`macroindicadorId`) e a um Eixo (`eixoId`). A linha "Produtos de..."
 * da Tabela 1 (Eixo 3) não entrou aqui porque ficou cortada nos prints recebidos —
 * falta a Rayanne reenviar essa parte para completar.
 */
export const indicadoresPDLS: IndicadorPDLS[] = [
  {
    id: 'pdls1',
    macroindicadorId: 'i7',
    eixoId: 'eixo1',
    nome: 'Percentual de resíduos destinados adequadamente',
    meta: 'Acréscimo de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv1', descricao: 'Certificados de destinação final' },
      { id: 'mv2', descricao: 'Comprovantes de coleta seletiva' },
      { id: 'mv3', descricao: 'Logística reversa e registros da fiscalização' },
    ],
    referenciaNormativa: 'OB04 – Racionalizar a gestão de resíduos',
  },
  {
    id: 'pdls2',
    macroindicadorId: 'i8',
    eixoId: 'eixo1',
    nome: 'Percentual de água consumida (m³) em relação ao ano anterior',
    meta: 'Redução de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv4', descricao: 'Relatórios de consumo' },
      { id: 'mv5', descricao: 'Registros operacionais e evidências das ações de economia de água' },
    ],
    referenciaNormativa: 'OB03 – Promover o consumo consciente de água',
  },
  {
    id: 'pdls3',
    macroindicadorId: 'i9',
    eixoId: 'eixo1',
    nome: 'Percentual de redução de aquisição de materiais de consumo',
    meta: 'Redução de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv6', descricao: 'Relatórios da contratada' },
      { id: 'mv7', descricao: 'Registros de consumo e acompanhamento da fiscalização' },
    ],
    referenciaNormativa: 'OB06 – Promover o uso consciente do material de consumo',
  },
  {
    id: 'pdls4',
    macroindicadorId: 'i10',
    eixoId: 'eixo1',
    nome: 'Percentual de energia elétrica consumida (kWh) e percentual de água consumida (m³)',
    meta: 'Redução de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv8', descricao: 'Relatórios de consumo' },
      { id: 'mv9', descricao: 'Registros operacionais e ações de conscientização' },
    ],
    referenciaNormativa: 'OB02 – Promover o consumo consciente de energia elétrica; OB03 – Promover o consumo consciente de água',
  },
  {
    id: 'pdls5',
    macroindicadorId: 'i11',
    eixoId: 'eixo1',
    nome: 'Percentual de resíduos destinados adequadamente',
    meta: 'Acréscimo de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv10', descricao: 'Certificados de destinação final, notas fiscais e comprovantes de recolhimento' },
      { id: 'mv11', descricao: 'Fichas técnicas e inventário da frota' },
    ],
    referenciaNormativa: 'OB04 – Racionalizar a gestão de resíduos',
  },
  {
    id: 'pdls6',
    macroindicadorId: 'i12',
    eixoId: 'eixo1',
    nome: 'Percentual de água consumida (m³)',
    meta: 'Redução de 5%',
    unidadeMedida: 'percentual',
    meiosVerificacao: [
      { id: 'mv12', descricao: 'Relatórios operacionais' },
      { id: 'mv13', descricao: 'Declaração da empresa de lavagem' },
    ],
    referenciaNormativa: 'OB03 – Promover o consumo consciente de água',
  },
];

export const ocorrencias: Ocorrencia[] = [
  { id: 'o1', fornecedorId: 'f1', fornecedorNome: 'Construtora Alfa S.A.', contratoId: 'ct1', indicadorId: 'i1', indicadorNome: 'Gestão de Resíduos Sólidos', eixoPDLSId: 'eixo3', descricao: 'Descarte irregular de resíduos classe II-B', data: '2024-03-11', deducao: 25 },
  { id: 'o2', fornecedorId: 'f2', fornecedorNome: 'ServiLimp Ltda.', contratoId: 'ct2', indicadorId: 'i4', indicadorNome: 'Práticas Sustentáveis Gerais', eixoPDLSId: 'eixo2', descricao: 'Atraso no envio de documentação ambiental', data: '2024-02-27', deducao: 25 },
  { id: 'o3', fornecedorId: 'f2', fornecedorNome: 'ServiLimp Ltda.', contratoId: 'ct2', indicadorId: 'i1', indicadorNome: 'Gestão de Resíduos Sólidos', eixoPDLSId: 'eixo3', descricao: 'Uso irregular de produto químico sem FISPQ', data: '2024-02-14', deducao: 25 },
  { id: 'o4', fornecedorId: 'f4', fornecedorNome: 'Fornecedor A', contratoId: 'ct4', indicadorId: 'i5', indicadorNome: 'Gestão de Emissões de GEE', eixoPDLSId: 'eixo5', descricao: 'Emissão de poluentes acima do permitido', data: '2024-01-19', deducao: 25 },
  { id: 'o5', fornecedorId: 'f4', fornecedorNome: 'Fornecedor A', contratoId: 'ct4', indicadorId: 'i2', indicadorNome: 'Uso Racional de Água', eixoPDLSId: 'eixo1', descricao: 'Consumo de água acima do limite contratual', data: '2024-01-09', deducao: 25 },
];

export const medicoes: Medicao[] = [
  { id: 'm1', contratoId: 'ct1', periodo: 'Mar/2024', score: 475, ocorrencias: 1, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm2', contratoId: 'ct1', periodo: 'Fev/2024', score: 450, ocorrencias: 2, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm3', contratoId: 'ct1', periodo: 'Jan/2024', score: 450, ocorrencias: 2, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm4', contratoId: 'ct2', periodo: 'Mar/2024', score: 500, ocorrencias: 0, pagamento: 100, valor: 32000, status: 'liberado' },
  { id: 'm5', contratoId: 'ct2', periodo: 'Fev/2024', score: 475, ocorrencias: 1, pagamento: 100, valor: 32000, status: 'liberado' },
  // Histórico do contrato ct6 (Fornecedor C), hoje inativo — fica disponível como
  // informação gerencial de desempenho passado, mesmo sem contar no score atual.
  { id: 'm6', contratoId: 'ct6', periodo: 'Ago/2024', score: 356, ocorrencias: 1, pagamento: 95, valor: 28000, status: 'liberado' },
  { id: 'm7', contratoId: 'ct6', periodo: 'Jul/2024', score: 380, ocorrencias: 1, pagamento: 95, valor: 28000, status: 'liberado' },
  { id: 'm8', contratoId: 'ct6', periodo: 'Jun/2024', score: 400, ocorrencias: 0, pagamento: 100, valor: 28000, status: 'liberado' },
];

export const scoreHistorico: ScoreHistorico[] = [
  { mes: 'dez/23', score: 389 },
  { mes: 'jan/24', score: 402 },
  { mes: 'fev/24', score: 415 },
  { mes: 'mar/24', score: 423 },
  { mes: 'abr/24', score: 431 },
  { mes: 'mai/24', score: 428 },
];

export const ocorrenciasPorTipo = [
  { tipo: 'Resíduos', total: 32 },
  { tipo: 'Água', total: 24 },
  { tipo: 'Materiais / Insumos', total: 18 },
  { tipo: 'Energia', total: 16 },
  { tipo: 'Social / Trabalhista', total: 12 },
  { tipo: 'Outros', total: 8 },
];

export const distribuicaoScore = [
  { name: '500 a 450 (Verde)', value: 74, color: '#3D5C3E' },
  { name: '449 a 350 (Cinza)', value: 34, color: '#9CA3AF' },
  { name: 'Abaixo de 350 (Preto)', value: 20, color: '#1F2937' },
];
