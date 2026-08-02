import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { listUsers, createUser, updateUser } from './api';
import ModalOverlay from './ModalOverlay';

function AdminUsers({ onClose }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { id, username, name, role, password }
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadUsers = async () => {
    try {
      const { users } = await listUsers();
      setUsers(users);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createUser(form);
      setForm({ username: '', name: '', password: '', role: 'user' });
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (u) => {
    setEditError('');
    setEditingUser({ id: u.id, username: u.username, name: u.name, role: u.role, password: '' });
  };

  const handleEditChange = (field) => (e) => {
    setEditingUser((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingEdit(true);
    try {
      await updateUser(editingUser.id, {
        username: editingUser.username,
        name: editingUser.name,
        role: editingUser.role,
        password: editingUser.password || undefined
      });
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <ModalOverlay cardClassName="admin-card" onClose={onClose}>
      <div className="header">
        <h1>USUÁRIOS</h1>
        <p>Cadastre quem pode registrar as checagens</p>
      </div>

      <form className="login-form" onSubmit={handleSubmit}>
        <label htmlFor="new-name">Nome</label>
        <input id="new-name" type="text" value={form.name} onChange={handleChange('name')} required />

        <label htmlFor="new-username">Usuário (login)</label>
        <input id="new-username" type="text" value={form.username} onChange={handleChange('username')} required />

        <label htmlFor="new-password">Senha</label>
        <input
          id="new-password"
          type="password"
          value={form.password}
          onChange={handleChange('password')}
          required
        />

        <label htmlFor="new-role">Perfil</label>
        <select id="new-role" value={form.role} onChange={handleChange('role')}>
          <option value="user">Usuário</option>
          <option value="admin">Administrador</option>
        </select>

        {error && <p className="login-error">{error}</p>}

        <button type="submit" className="reset-button" disabled={loading}>
          {loading ? 'SALVANDO...' : 'ADICIONAR USUÁRIO'}
        </button>
      </form>

      <div className="users-list">
        {users.map((u) =>
          editingUser?.id === u.id ? (
            <form key={u.id} className="login-form user-edit-form" onSubmit={handleSaveEdit}>
              <label htmlFor={`edit-name-${u.id}`}>Nome</label>
              <input
                id={`edit-name-${u.id}`}
                type="text"
                value={editingUser.name}
                onChange={handleEditChange('name')}
                required
              />

              <label htmlFor={`edit-username-${u.id}`}>Usuário (login)</label>
              <input
                id={`edit-username-${u.id}`}
                type="text"
                value={editingUser.username}
                onChange={handleEditChange('username')}
                required
              />

              <label htmlFor={`edit-password-${u.id}`}>Nova senha (opcional)</label>
              <input
                id={`edit-password-${u.id}`}
                type="password"
                value={editingUser.password}
                onChange={handleEditChange('password')}
                placeholder="Deixe em branco para manter a atual"
                minLength={6}
              />

              <label htmlFor={`edit-role-${u.id}`}>Perfil</label>
              <select id={`edit-role-${u.id}`} value={editingUser.role} onChange={handleEditChange('role')}>
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>

              {editError && <p className="login-error">{editError}</p>}

              <div className="section-admin-actions" style={{ marginTop: '0.5rem' }}>
                <button type="submit" className="icon-button" disabled={savingEdit}>
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
                <button type="button" className="icon-button" onClick={() => setEditingUser(null)}>
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div key={u.id} className="user-row">
              <div>
                <span>{u.name}</span>
                <span className="user-row-meta">
                  {' '}
                  · @{u.username} · {u.role === 'admin' ? 'admin' : 'usuário'}
                </span>
              </div>
              {u.id !== 1 && (
                <button type="button" className="icon-button" onClick={() => startEdit(u)}>
                  <Pencil size={14} /> Editar
                </button>
              )}
            </div>
          )
        )}
      </div>

      <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1rem' }}>
        FECHAR
      </button>
    </ModalOverlay>
  );
}

export default AdminUsers;
