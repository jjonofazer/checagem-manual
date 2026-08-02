import React, { useState } from 'react';
import ModalOverlay from './ModalOverlay';

function ObsModal({ item, onConfirm, onClose }) {
  const [obs, setObs] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!obs.trim()) {
      setError('Descreva o motivo do item estar offline');
      return;
    }
    onConfirm(obs.trim());
  };

  return (
    <ModalOverlay cardClassName="section-modal-card" onClose={onClose}>
        <div className="header">
          <h1>{item.label}</h1>
          <p>Marcar como OFFLINE — explique o que está errado</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="obs">Observação</label>
          <textarea
            id="obs"
            rows={4}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ex: TV sem sinal HDMI, câmera desconectada, etc."
            autoFocus
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="register-button offline-confirm">
            CONFIRMAR OFFLINE
          </button>
          <button type="button" className="icon-button" onClick={onClose} style={{ marginTop: '0.75rem' }}>
            CANCELAR
          </button>
        </form>
    </ModalOverlay>
  );
}

export default ObsModal;
