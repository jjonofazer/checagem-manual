import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [checkedItems, setCheckedItems] = useState({});
  const [lastCheckDate, setLastCheckDate] = useState('');

  const sections = [
    {
      id: 'hbase',
      title: 'HBASE',
      items: [
        { id: 'hbase-backup', label: 'BACKUP' },
        { id: 'hbase-tv', label: 'TV CARDAPIO' },
        { id: 'hbase-camera', label: 'CAMERA' }
      ]
    },
    {
      id: 'hrsm',
      title: 'HRSM',
      items: [
        { id: 'hrsm-backup', label: 'BACKUP' },
        { id: 'hrsm-tv', label: 'TV CARDAPIO' },
        { id: 'hrsm-camera', label: 'CAMERA' }
      ]
    },
    {
      id: 'recepcao',
      title: 'RECEPÇÃO',
      items: [
        { id: 'recepcao-ativo', label: 'SISTEMA ATIVO' }
      ]
    },
    {
      id: 'eco',
      title: 'ECO HOSPITALAR',
      items: [
        { id: 'eco-ativo', label: 'SISTEMA ATIVO' }
      ]
    }
  ];

  const allItems = sections.flatMap(section => section.items);

  // Função para obter a data atual no formato YYYY-MM-DD
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Carregar dados salvos ao iniciar
  useEffect(() => {
    const savedData = localStorage.getItem('checagemManual');
    if (savedData) {
      const { date, items } = JSON.parse(savedData);
      const today = getCurrentDate();
      
      // Se a data salva for diferente de hoje, reseta a checagem
      if (date === today) {
        setCheckedItems(items);
        setLastCheckDate(date);
      } else {
        // Novo dia, reseta tudo
        setCheckedItems({});
        setLastCheckDate('');
        localStorage.removeItem('checagemManual');
      }
    }
  }, []);

  // Salvar dados sempre que houver mudança
  useEffect(() => {
    if (Object.keys(checkedItems).length > 0) {
      const dataToSave = {
        date: getCurrentDate(),
        items: checkedItems
      };
      localStorage.setItem('checagemManual', JSON.stringify(dataToSave));
      setLastCheckDate(getCurrentDate());
    }
  }, [checkedItems]);

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const allChecked = allItems.every(item => checkedItems[item.id]);
  const checkedCount = allItems.filter(item => checkedItems[item.id]).length;

  // Verificar quantos itens cada seção tem checados
  const getSectionProgress = (section) => {
    const checkedInSection = section.items.filter(item => checkedItems[item.id]).length;
    const totalInSection = section.items.length;
    return { checked: checkedInSection, total: totalInSection };
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja resetar a checagem de hoje?')) {
      setCheckedItems({});
      setLastCheckDate('');
      localStorage.removeItem('checagemManual');
    }
  };

  return (
    <div className="App">
      <div className="card">
        {/* Cabeçalho */}
        <div className="header">
          <h1>CHECAGEM MANUAL</h1>
          <p>Confirme cada item verificado</p>
          {lastCheckDate && (
            <p style={{ fontSize: '0.875rem', color: '#059669', marginTop: '0.5rem' }}>
              ✓ Última checagem: {new Date(lastCheckDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>

        {/* Grid de Seções */}
        <div className="grid-container">
          {sections.map((section) => {
            const progress = getSectionProgress(section);
            const sectionComplete = progress.checked === progress.total;
            
            return (
              <div key={section.id} className="column">
                {/* Título da Seção */}
                <div className={`column-header ${sectionComplete ? 'complete' : ''}`}>
                  <h2>{section.title}</h2>
                  <span className="section-progress">
                    {progress.checked}/{progress.total}
                  </span>
                </div>
                
                {/* Itens da Seção */}
                <div className="items-list">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleCheck(item.id)}
                      className={`check-button ${checkedItems[item.id] ? 'checked' : ''}`}
                    >
                      <span>{item.label}</span>
                      <div className="check-icon">
                        {checkedItems[item.id] && (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão de Confirmação Final */}
        <div className="status-section">
          {allChecked ? (
            <div>
              <div className="status-box status-success">
                <p>✓ TODOS OS ITENS VERIFICADOS HOJE!</p>
              </div>
              <button
                onClick={handleReset}
                className="reset-button"
              >
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
                <button
                  onClick={handleReset}
                  className="reset-button"
                  style={{ marginTop: '1rem' }}
                >
                  RESETAR CHECAGEM
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="timestamp">
          <p>Data: {new Date().toLocaleDateString('pt-BR')}</p>
          <p>Hora: {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}

export default App;