import React from 'react';
import ModalOverlay from './ModalOverlay';

function SectionModal({ section, checkedItems, onSetOnline, onRequestOffline, onOpenInstructions, onRemove, onClose }) {
  const checkedCount = section.items.filter((item) => checkedItems[item.id]).length;

  return (
    <ModalOverlay cardClassName="section-modal-card" onClose={onClose}>
        <div className="header">
          <h1>{section.title}</h1>
          <p>
            {checkedCount}/{section.items.length} itens verificados
          </p>
        </div>

        <div className="items-list">
          {section.items.map((item) => {
            const registro = checkedItems[item.id];
            const hasInstructions = !!item.instructions;
            const isOnline = registro?.status === 'online';
            const isOffline = registro?.status === 'offline';

            const handleOnlineClick = () => {
              if (isOnline) {
                onRemove(section, item);
                return;
              }
              if (hasInstructions) {
                onOpenInstructions(section, item);
              } else {
                onSetOnline(section, item);
              }
            };

            const handleOfflineClick = () => {
              if (isOffline) {
                onRemove(section, item);
                return;
              }
              onRequestOffline(section, item);
            };

            return (
              <div key={item.id} className={`check-item ${isOnline ? 'checked' : ''} ${isOffline ? 'offline' : ''}`}>
                <div className="check-item-info">
                  <span>{item.label}</span>
                  {registro && (
                    <span className={`registered-by ${isOffline ? 'registered-offline' : ''}`}>
                      {isOffline ? 'OFFLINE' : 'ONLINE'} · {registro.name}
                      {isOffline && registro.obs ? ` — Obs: ${registro.obs}` : ''}
                    </span>
                  )}
                </div>
                <div className="status-buttons">
                  <button
                    type="button"
                    onClick={handleOnlineClick}
                    className={`status-button online ${isOnline ? 'active' : ''}`}
                  >
                    ONLINE
                  </button>
                  <button
                    type="button"
                    onClick={handleOfflineClick}
                    className={`status-button offline ${isOffline ? 'active' : ''}`}
                  >
                    OFFLINE
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1.5rem' }}>
          FECHAR
        </button>
    </ModalOverlay>
  );
}

export default SectionModal;
