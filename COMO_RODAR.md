# SustentaScore — Como Rodar

## Pré-requisitos
- Node.js instalado (https://nodejs.org — versão 18 ou superior)

## Passos

1. Abra o terminal (Prompt de Comando ou PowerShell) nesta pasta
2. Instale as dependências:
   ```
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```
4. Abra o navegador em: **http://localhost:5173**

## Estrutura do projeto

```
src/
  pages/
    Dashboard.tsx         → Painel Gerencial (página inicial)
    Cadastro.tsx          → Cadastro de fornecedores
    Indicadores.tsx       → Indicadores de sustentabilidade
    Ocorrencias.tsx       → Registro de ocorrências
    CalculoScore.tsx      → Cálculo do score
    MedicaoPagamento.tsx  → Medição e pagamento
  components/
    Sidebar.tsx           → Menu lateral
    Layout.tsx            → Estrutura da tela
  data/
    mockData.ts           → Dados de exemplo
  types/
    index.ts              → Tipagens TypeScript
```
