import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Controle de paginação simples (Anterior / Página X de Y / Próxima). Some quando só há uma página. */
export default function Paginacao({
  pagina,
  totalPaginas,
  onMudar,
  rotuloItens,
}: {
  pagina: number;
  totalPaginas: number;
  onMudar: (pagina: number) => void;
  /** Ex: "12 eventos" — mostrado ao lado, para dar noção do total. */
  rotuloItens?: string;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Paginação">
      {rotuloItens && <span className="paginacao-total">{rotuloItens}</span>}
      <div className="paginacao-controles">
        <button type="button" className="paginacao-btn" onClick={() => onMudar(pagina - 1)} disabled={pagina <= 1}>
          <ChevronLeft size={14} /> Anterior
        </button>
        <span className="paginacao-pagina">Página {pagina} de {totalPaginas}</span>
        <button type="button" className="paginacao-btn" onClick={() => onMudar(pagina + 1)} disabled={pagina >= totalPaginas}>
          Próxima <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
