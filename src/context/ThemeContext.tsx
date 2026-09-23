import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'claro' | 'escuro';

interface ThemeContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const CHAVE_ARMAZENAMENTO = 'sustentascore-tema';

function temaInicial(): Tema {
  try {
    const salvo = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch {
    // localStorage pode estar bloqueado (modo privado) — segue sem preferência salva.
  }
  // Sem preferência salva: respeita o tema do sistema operacional na primeira visita.
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'escuro';
  return 'claro';
}

/** Provider do tema Claro/Escuro — persiste a escolha no navegador (localStorage) e
 * aplica via atributo `data-theme` na tag <html>, que o index.css usa pra trocar as
 * variáveis de cor (ver bloco ":root[data-theme='dark']"). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    if (tema === 'escuro') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try {
      window.localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
    } catch {
      // Sem persistência disponível — o tema só não é lembrado na próxima visita.
    }
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === 'claro' ? 'escuro' : 'claro'));

  return <ThemeContext.Provider value={{ tema, alternarTema }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>');
  return ctx;
}
