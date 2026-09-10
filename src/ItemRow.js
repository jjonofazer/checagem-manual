import React from 'react';
import { frequencyLabel } from './itemUtils';

function formatRegisteredDate(isoString) {
  if (!isoString) return '';
  const [datePart] = isoString.split(' ').length > 1 ? isoString.split(' ') : isoString.split('T');
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function ItemRow({ item, registro, onSetOnline, onRequestOffline, onOpenInstructions, onRemove }) {
  const hasInstructions = !!item.instructions;
  const isOnline = registro?.status === 'online';
  const isOffline = registro?.status === 'offline';
  const isNotDaily = item.frequency && item.frequency !== 'daily';

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
        <span>
          {item.label}
          {isNotDaily && <em className="item-frequency-badge">{frequencyLabel(item.frequency)}</em>}
        </span>
        {registro && (
          <span className={`registered-by ${isOffline ? 'registered-offline' : ''}`}>
            {isOffline ? 'OFFLINE' : 'ONLINE'} · {registro.name}
            {isNotDaily && registro.registeredAt ? ` — em ${formatRegisteredDate(registro.registeredAt)}` : ''}
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
