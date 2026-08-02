import React from 'react';
import { X } from 'lucide-react';
import useEscapeKey from './useEscapeKey';

function ModalOverlay({ cardClassName = '', onClose, children }) {
  useEscapeKey(onClose);

  return (
    <div className="admin-overlay">
      <div className={`card ${cardClassName}`}>
        <div className="modal-close-row">
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default ModalOverlay;
