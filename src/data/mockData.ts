import type { Fornecedor, Contrato, Indicador, Ocorrencia, Medicao, ScoreHistorico } from '../types';

export const fornecedores: Fornecedor[] = [
  { id: 'f1', nome: 'Construtora Alfa S.A.', cnpj: '48.921.442/0001-09', contratos: 1, score: 475, faixa: 'verde', endereco: 'Rua das Flores, 123 - Brasília/DF', telefone: '(61) 3333-4444', preposto: 'Carlos Mendes' },
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
  { id: 'ct6', fornecedorId: 'f6', fornecedorNome: 'Fornecedor C', numero: 'CT-008/2024', ano: '2024', objeto: 'Serviço de limpeza', unidade: 'Superintendência de TI', vigencia: '08/2024', fiscalTecnico: 'Beatriz Luz', gestor: 'Eduardo Reis', score: 356, faixa: 'cinza', pagamento: 95, status: 'ativo' },
  { id: 'ct7', fornecedorId: 'f7', fornecedorNome: 'Fornecedor D', numero: 'CT-022/2024', ano: '2024', objeto: 'Locação de veículos', unidade: 'Núcleo de Logística', vigencia: '10/2024', fiscalTecnico: 'Camila Fonseca', gestor: 'Sergio Brito', score: 360, faixa: 'cinza', pagamento: 95, status: 'ativo' },
  { id: 'ct8', fornecedorId: 'f8', fornecedorNome: 'Fornecedor E', numero: 'CT-031/2024', ano: '2024', objeto: 'Serviços administrativos', unidade: 'Assessoria Jurídica', vigencia: '12/2024', fiscalTecnico: 'Natalia Pinto', gestor: 'Vitor Moura', score: 372, faixa: 'cinza', pagamento: 95, status: 'ativo' },
];

export const indicadores: Indicador[] = [
  {
    id: 'i1',
    nome: 'Gestão de Resíduos Sólidos',
    descricao: 'Descarte e destinação adequada de resíduos conforme normas ambientais.',
    categoria: 'Meio Ambiente',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'recycle',
  },
  {
    id: 'i2',
    nome: 'Uso Racional de Água',
    descricao: 'Implementação de práticas de economia e reuso de água.',
    categoria: 'Meio Ambiente',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'droplets',
  },
  {
    id: 'i3',
    nome: 'Eficiência Energética',
    descricao: 'Uso de fontes renováveis e redução de consumo energético.',
    categoria: 'Meio Ambiente',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'zap',
  },
  {
    id: 'i4',
    nome: 'Práticas Sustentáveis Gerais',
    descricao: 'Cumprimento de certificações e políticas ambientais vigentes.',
    categoria: 'Governança',
    tipo: 'Serviço de limpeza',
    contratosVinculados: 2,
    icone: 'leaf',
  },
  {
    id: 'i5',
    nome: 'Gestão de Emissões de GEE',
    descricao: 'Monitoramento e redução de emissões de gases de efeito estufa.',
    categoria: 'Meio Ambiente',
    tipo: 'Construção',
    contratosVinculados: 1,
    icone: 'wind',
  },
  {
    id: 'i6',
    nome: 'Condições de Trabalho',
    descricao: 'Garantia de condições dignas e seguras de trabalho.',
    categoria: 'Social / Trabalhista',
    tipo: 'Geral',
    contratosVinculados: 3,
    icone: 'users',
  },
];

export const ocorrencias: Ocorrencia[] = [
  { id: 'o1', fornecedorId: 'f1', fornecedorNome: 'Construtora Alfa S.A.', contratoId: 'ct1', indicadorId: 'i1', indicadorNome: 'Gestão de Resíduos Sólidos', categoria: 'Meio Ambiente', descricao: 'Descarte irregular de resíduos classe II-B', data: '2024-03-11', deducao: 25 },
  { id: 'o2', fornecedorId: 'f2', fornecedorNome: 'ServiLimp Ltda.', contratoId: 'ct2', indicadorId: 'i4', indicadorNome: 'Práticas Sustentáveis Gerais', categoria: 'Governança', descricao: 'Atraso no envio de documentação ambiental', data: '2024-02-27', deducao: 25 },
  { id: 'o3', fornecedorId: 'f2', fornecedorNome: 'ServiLimp Ltda.', contratoId: 'ct2', indicadorId: 'i1', indicadorNome: 'Gestão de Resíduos Sólidos', categoria: 'Meio Ambiente', descricao: 'Uso irregular de produto químico sem FISPQ', data: '2024-02-14', deducao: 25 },
  { id: 'o4', fornecedorId: 'f4', fornecedorNome: 'Fornecedor A', contratoId: 'ct4', indicadorId: 'i5', indicadorNome: 'Gestão de Emissões de GEE', categoria: 'Meio Ambiente', descricao: 'Emissão de poluentes acima do permitido', data: '2024-01-19', deducao: 25 },
  { id: 'o5', fornecedorId: 'f4', fornecedorNome: 'Fornecedor A', contratoId: 'ct4', indicadorId: 'i2', indicadorNome: 'Uso Racional de Água', categoria: 'Meio Ambiente', descricao: 'Consumo de água acima do limite contratual', data: '2024-01-09', deducao: 25 },
];

export const medicoes: Medicao[] = [
  { id: 'm1', contratoId: 'ct1', periodo: 'Mar/2024', score: 475, ocorrencias: 1, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm2', contratoId: 'ct1', periodo: 'Fev/2024', score: 450, ocorrencias: 2, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm3', contratoId: 'ct1', periodo: 'Jan/2024', score: 450, ocorrencias: 2, pagamento: 100, valor: 45000, status: 'liberado' },
  { id: 'm4', contratoId: 'ct2', periodo: 'Mar/2024', score: 500, ocorrencias: 0, pagamento: 100, valor: 32000, status: 'liberado' },
  { id: 'm5', contratoId: 'ct2', periodo: 'Fev/2024', score: 475, ocorrencias: 1, pagamento: 100, valor: 32000, status: 'liberado' },
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
