import React from 'react';

function ItemRow({ item, registro, onSetOnline, onRequestOffline, onOpenInstructions, onRemove }) {
  const hasInstructions = !!item.instructions;
  const isOnline = registro?.status === 'online';
  const isOffline = registro?.status === 'offline';

  const handleOnlineClick = () => {
    if (isOnline) {
      onRemove();
      return;
    }
    if (hasInstructions) {
      onOpenInstructions();
    } else {
      onSetOnline();
    }
  };

  const handleOfflineClick = () => {
    if (isOffline) {
      onRemove();
      return;
    }
    onRequestOffline();
  };

  return (
    <div className={`check-item ${isOnline ? 'checked' : ''} ${isOffline ? 'offline' : ''}`}>
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
}

export default ItemRow;
