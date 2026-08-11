import { Bell, AlertTriangle, Clock, Info, X, CheckCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import type { Notificacao } from '../types';

/** Ícone por urgência — o `tipo` da notificação pode variar (vigência, ocorrência, score, etc.),
 * mas a urgência é o que define a aparência, então novos tipos já se encaixam sem precisar de mapa novo. */
function IconeNotificacao({ urgencia }: { urgencia: Notificacao['urgencia'] }) {
  if (urgencia === 'alta') return <AlertTriangle size={15} />;
  if (urgencia === 'media') return <Clock size={15} />;
  return <Info size={15} />;
}

interface NotificationBellProps {
  aberto: boolean;
  onAbrirChange: (aberto: boolean) => void;
}

/**
 * O painel abre como uma faixa fixa à direita da tela (não um dropdown por cima
 * do conteúdo) — o estado `aberto` vive no Layout para que ele possa encolher o
 * conteúdo principal (.main-content--notif-open) enquanto o painel está aberto.
 */
export default function NotificationBell({ aberto, onAbrirChange }: NotificationBellProps) {
  const { notificacoes, marcarNotificacaoLida, marcarTodasNotificacoesLidas } = useData();

  const naoLidas = notificacoes.filter((n) => !n.lida);

  return (
    <div className="notif-wrapper">
      <button className="notif-bell" onClick={() => onAbrirChange(!aberto)} aria-label="Notificações">
        <Bell size={18} strokeWidth={1.8} />
        {naoLidas.length > 0 && <span className="notif-badge">{naoLidas.length}</span>}
      </button>

      {aberto && (
        <>
          <div className="notif-overlay" onClick={() => onAbrirChange(false)} />
          <div className="notif-panel">
            <div className="notif-panel-header">
              <span>Notificações</span>
              <div className="notif-panel-header-actions">
                {naoLidas.length > 0 && (
                  <button
                    className="notif-marcar-todas"
                    onClick={() => marcarTodasNotificacoesLidas(naoLidas.map((n) => n.id))}
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck size={13} />
                    Marcar todas como lidas
                  </button>
                )}
                <button className="modal-close" onClick={() => onAbrirChange(false)}><X size={16} /></button>
              </div>
            </div>

            {notificacoes.length === 0 ? (
              <p className="notif-empty">Nenhuma notificação por aqui. Tudo em dia.</p>
            ) : (
              <div className="notif-list">
                {notificacoes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notif-item notif-item--${n.urgencia}${n.lida ? ' notif-item--lida' : ''}`}
                    onClick={() => marcarNotificacaoLida(n.id)}
                  >
                    <IconeNotificacao urgencia={n.urgencia} />
                    <div className="notif-item-body">
                      <p className="notif-item-title">{n.titulo}</p>
                      <p className="notif-item-desc">{n.descricao}</p>
                    </div>
                    {!n.lida && <span className="notif-item-dot" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
