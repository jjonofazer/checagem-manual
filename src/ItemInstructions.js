import React from 'react';
import { Check } from 'lucide-react';
import ModalOverlay from './ModalOverlay';

function ItemInstructions({ item, onConfirm, onClose }) {
  return (
    <ModalOverlay cardClassName="section-modal-card" onClose={onClose}>
      <div className="header">
        <h1>{item.label}</h1>
        <p>Confira os itens abaixo antes de registrar</p>
      </div>

      <ol className="instructions-list">
        {item.instructions.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

      <button type="button" className="register-button registered instructions-confirm" onClick={onConfirm}>
        <Check size={16} />
        TUDO CONFERIDO, MARCAR ONLINE
      </button>
      <button type="button" className="icon-button" onClick={onClose} style={{ marginTop: '0.75rem' }}>
        CANCELAR
      </button>
    </ModalOverlay>
  );
}

export default ItemInstructions;
