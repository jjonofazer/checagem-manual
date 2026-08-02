import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, LogOut, Users, KeyRound, ListTree, ClipboardList } from 'lucide-react';
import './App.css';
import Login from './Login';
import AdminUsers from './AdminUsers';
import ChangePassword from './ChangePassword';
import AdminSections from './AdminSections';
import SectionModal from './SectionModal';
import ItemInstructions from './ItemInstructions';
import ObsModal from './ObsModal';
import Report from './Report';
import AdminDashboard from './AdminDashboard';
import Footer from './Footer';
import {
  getToken,
  setToken,
  getCurrentUser,
  logout,
  getSections,
  getRegistros,
  createRegistro,
  deleteRegistro,
  resetRegistros
} from './api';

const getCurrentDate = () => new Date().toISOString().split('T')[0];

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [sections, setSections] = useState([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});
  const [activeSection, setActiveSection] = useState(null);
  const [instructionsFor, setInstructionsFor] = useState(null);
  const [obsFor, setObsFor] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAdminSections, setShowAdminSections] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [loadError, setLoadError] = useState('');

  const allItems = sections.flatMap((section) => section.items);

  const today = getCurrentDate();

  // Valida sessão salva ao carregar a página
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setAuthLoading(false);
      return;
    }
    getCurrentUser()
      .then(({ user }) => setCurrentUser(user))
      .catch(() => setToken(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const loadSections = useCallback(() => {
    return getSections()
      .then(({ sections }) => setSections(sections))
      .catch((err) => setLoadError(err.message));
  }, []);

  const loadRegistros = useCallback(() => {
    return getRegistros(today)
      .then(({ registros }) => {
        const mapped = {};
        registros.forEach((r) => {
          mapped[r.item_id] = { name: r.user_name, username: r.username, status: r.status, obs: r.obs };
        });
        setCheckedItems(mapped);
      })
      .catch((err) => setLoadError(err.message));
  }, [today]);

  // Busca topicos e registros de hoje assim que o usuário loga
  useEffect(() => {
    if (currentUser) {
      setSectionsLoading(true);
      Promise.all([loadSections(), loadRegistros()]).finally(() => setSectionsLoading(false));
    }
  }, [currentUser, loadSections, loadRegistros]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // sessão já pode estar expirada no servidor; segue com o logout local
    }
    setToken(null);
    setCurrentUser(null);
    setSections([]);
    setSectionsLoading(true);
    setCheckedItems({});
    setActiveSection(null);
  };

  const setItemStatus = async (item, status, obs) => {
    setLoadError('');
    try {
      const { registro } = await createRegistro({ itemId: item.id, date: today, status, obs });
      setCheckedItems((prev) => ({
        ...prev,
        [item.id]: { name: registro.user_name, username: registro.username, status: registro.status, obs: registro.obs }
      }));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const removeRegistro = async (section, item) => {
    setLoadError('');
    try {
      await deleteRegistro(item.id, today);
      setCheckedItems((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const setOnline = (section, item) => setItemStatus(item, 'online', null);

  const openInstructions = (section, item) => {
    setInstructionsFor({ section, item });
  };

  const confirmInstructions = async () => {
    if (!instructionsFor) return;
    await setItemStatus(instructionsFor.item, 'online', null);
    setInstructionsFor(null);
  };

  const requestOffline = (section, item) => {
    setObsFor({ section, item });
  };

  const confirmOffline = async (obs) => {
    if (!obsFor) return;
    await setItemStatus(obsFor.item, 'offline', obs);
    setObsFor(null);
  };

  const allChecked = allItems.every((item) => checkedItems[item.id]);
  const checkedCount = allItems.filter((item) => checkedItems[item.id]).length;

  const getSectionProgress = (section) => {
    const checked = section.items.filter((item) => checkedItems[item.id]).length;
    return { checked, total: section.items.length };
  };

  const handleReset = async () => {
    if (!window.confirm('Tem certeza que deseja resetar a checagem de hoje?')) return;
    try {
      await resetRegistros(today);
      setCheckedItems({});
    } catch (err) {
      setLoadError(err.message);
    }
  };

  if (authLoading) {
    return (
      <div className="App">
        <div className="card">
          <div className="header">
            <h1>CHECAGEM MANUAL</h1>
            <p>Carregando...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="App">
      <div className="card">
        {/* Cabeçalho */}
        <div className="header">
          <div className="user-bar">
            <span>Olá, {currentUser.name}</span>
            <div className="user-bar-actions">
              <button type="button" className="icon-button" onClick={() => setShowChangePassword(true)}>
                <KeyRound size={16} /> Alterar senha
              </button>
              <button type="button" className="icon-button" onClick={handleLogout}>
                <LogOut size={16} /> Sair
              </button>
            </div>
          </div>
          <h1>CHECAGEM MANUAL</h1>
          <p>{isAdmin ? 'Painel de administração' : 'Confirme cada item verificado'}</p>
          {loadError && <p className="login-error">{loadError}</p>}
        </div>

        {isAdmin ? (
          <>
          {!sectionsLoading && <AdminDashboard sections={sections} checkedItems={checkedItems} />}
          <div className="admin-dashboard">
            <button type="button" className="admin-tile" onClick={() => setShowAdmin(true)}>
              <Users size={28} />
              <span className="admin-tile-title">Usuários</span>
              <span className="admin-tile-desc">Criar e gerenciar quem pode registrar as checagens</span>
            </button>
            <button type="button" className="admin-tile" onClick={() => setShowAdminSections(true)}>
              <ListTree size={28} />
              <span className="admin-tile-title">Tópicos</span>
              <span className="admin-tile-desc">Criar, editar e organizar os locais e itens da ronda</span>
            </button>
            <button type="button" className="admin-tile" onClick={() => setShowReport(true)}>
              <ClipboardList size={28} />
              <span className="admin-tile-title">Relatório</span>
              <span className="admin-tile-desc">Acompanhar o status das rondas por data</span>
            </button>
          </div>
          </>
        ) : (
          <>
            {/* Grid de Seções */}
            {sectionsLoading ? (
              <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Carregando tópicos...</p>
            ) : sections.length === 0 ? (
              <p style={{ textAlign: 'center', marginBottom: '2rem' }}>Nenhum tópico cadastrado ainda.</p>
            ) : (
              <div className="grid-container">
                {sections.map((section) => {
                  const progress = getSectionProgress(section);
                  const sectionComplete = progress.checked === progress.total;

                  return (
                    <div key={section.id} className="column">
                      {/* Título da Seção (abre modal) */}
                      <button
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        className={`column-header ${sectionComplete ? 'complete' : ''}`}
                      >
                        <h2>{section.title}</h2>
                        <span className="section-progress">
                          {progress.checked}/{progress.total}
                        </span>
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botão de Confirmação Final */}
            <div className="status-section">
              {allChecked ? (
                <div>
                  <div className="status-box status-success">
                    <p>✓ TODOS OS ITENS VERIFICADOS HOJE!</p>
                  </div>
                  <button onClick={handleReset} className="reset-button">
                    RESETAR CHECAGEM
                  </button>
                </div>
              ) : (
                <div>
                  <div className="status-box status-warning">
                    <p>
                      ⚠ {checkedCount} de {allItems.length} itens verificados
                    </p>
                  </div>
                  {checkedCount > 0 && (
                    <button onClick={handleReset} className="reset-button" style={{ marginTop: '1rem' }}>
                      RESETAR CHECAGEM
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Timestamp */}
        <div className="timestamp">
          <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>

      {showAdmin && <AdminUsers onClose={() => setShowAdmin(false)} />}
      {showChangePassword && <ChangePassword onClose={() => setShowChangePassword(false)} />}
      {showAdminSections && (
        <AdminSections sections={sections} onReload={loadSections} onClose={() => setShowAdminSections(false)} />
      )}
      {activeSection && (
        <SectionModal
          section={sections.find((s) => s.id === activeSection)}
          checkedItems={checkedItems}
          onSetOnline={setOnline}
          onRequestOffline={requestOffline}
          onOpenInstructions={openInstructions}
          onRemove={removeRegistro}
          onClose={() => setActiveSection(null)}
        />
      )}
      {instructionsFor && (
        <ItemInstructions
          item={instructionsFor.item}
          onConfirm={confirmInstructions}
          onClose={() => setInstructionsFor(null)}
        />
      )}
      {obsFor && <ObsModal item={obsFor.item} onConfirm={confirmOffline} onClose={() => setObsFor(null)} />}
      {showReport && <Report sections={sections} onClose={() => setShowReport(false)} />}
      <Footer />
    </div>
  );
}

export default App;
