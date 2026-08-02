import React, { useState } from 'react';
import { changePassword } from './api';
import ModalOverlay from './ModalOverlay';

function ChangePassword({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('A confirmação não bate com a nova senha');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay cardClassName="login-card" onClose={onClose}>
        <div className="header">
          <h1>ALTERAR SENHA</h1>
        </div>

        {success ? (
          <div>
            <div className="status-box status-success">
              <p>✓ Senha alterada com sucesso!</p>
            </div>
            <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1rem' }}>
              FECHAR
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="current-password">Senha atual</label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoFocus
              required
            />

            <label htmlFor="new-password">Nova senha</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />

            <label htmlFor="confirm-password">Confirmar nova senha</label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={6}
              required
            />

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="reset-button" disabled={loading}>
              {loading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
            </button>
            <button type="button" className="icon-button" onClick={onClose} style={{ marginTop: '0.75rem' }}>
              CANCELAR
            </button>
          </form>
        )}
    </ModalOverlay>
  );
}

export default ChangePassword;
