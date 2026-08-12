import React from 'react';
import ModalOverlay from './ModalOverlay';
import ItemRow from './ItemRow';

function GroupItemModal({ item, checkedItems, onSetOnline, onRequestOffline, onOpenInstructions, onRemove, onClose }) {
  const checkedCount = item.children.filter((child) => checkedItems[child.id]).length;

  return (
    <ModalOverlay cardClassName="section-modal-card" onClose={onClose}>
      <div className="header">
        <h1>{item.label}</h1>
        <p>
          {checkedCount}/{item.children.length} itens verificados
        </p>
      </div>

      <div className="items-list">
        {item.children.map((child) => (
          <ItemRow
            key={child.id}
            item={child}
            registro={checkedItems[child.id]}
            onSetOnline={() => onSetOnline(null, child)}
            onRequestOffline={() => onRequestOffline(null, child)}
            onOpenInstructions={() => onOpenInstructions(null, child)}
            onRemove={() => onRemove(null, child)}
          />
        ))}
      </div>

      <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1.5rem' }}>
        FECHAR
      </button>
    </ModalOverlay>
  );
}

export default GroupItemModal;
