import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle2, XCircle, Circle, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { getRegistros } from './api';
import ModalOverlay from './ModalOverlay';
import { flattenLeafItemsWithLabel } from './itemUtils';

const getCurrentDate = () => new Date().toISOString().split('T')[0];

const STATUS_LABEL = { online: 'ONLINE', offline: 'OFFLINE' };

function sheetName(title, used) {
  const base = title.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Topico';
  let candidate = base;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    counter++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function Report({ sections, onClose }) {
  const todayStr = getCurrentDate();
  const [date, setDate] = useState(todayStr);
  const [registrosMap, setRegistrosMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState({});

  useEffect(() => {
    setLoading(true);
    setError('');
    getRegistros(date)
      .then(({ registros }) => {
        const map = {};
        registros.forEach((r) => {
          map[r.item_id] = r;
        });
        setRegistrosMap(map);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [date]);

  const toggleExpanded = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const allItems = sections.flatMap((section) => flattenLeafItemsWithLabel(section.items));
  const total = allItems.length;
  const onlineCount = allItems.filter((item) => registrosMap[item.id]?.status === 'online').length;
  const offlineCount = allItems.filter((item) => registrosMap[item.id]?.status === 'offline').length;
  const pendingCount = total - onlineCount - offlineCount;

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();

    const geralRows = [['Seção', 'Item', 'Status', 'Registrado por', 'Horário', 'Observação']];
    sections.forEach((section) => {
      flattenLeafItemsWithLabel(section.items).forEach((item) => {
        const r = registrosMap[item.id];
        geralRows.push([
          section.title,
          item.label,
          r?.status ? STATUS_LABEL[r.status] : 'PENDENTE',
          r?.user_name || '',
          r?.registered_at ? r.registered_at.slice(11, 19) : '',
          r?.obs || ''
        ]);
      });
    });
    const geralSheet = XLSX.utils.aoa_to_sheet(geralRows);
    geralSheet['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, geralSheet, sheetName('Geral', usedNames));

    sections.forEach((section) => {
      const rows = [['Item', 'Status', 'Registrado por', 'Horário', 'Observação']];
      flattenLeafItemsWithLabel(section.items).forEach((item) => {
        const r = registrosMap[item.id];
        rows.push([
          item.label,
          r?.status ? STATUS_LABEL[r.status] : 'PENDENTE',
          r?.user_name || '',
          r?.registered_at ? r.registered_at.slice(11, 19) : '',
          r?.obs || ''
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet['!cols'] = [{ wch: 26 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(section.title, usedNames));
    });

    XLSX.writeFile(workbook, `relatorio-checagem-${date}.xlsx`);
  };

  return (
    <ModalOverlay cardClassName="admin-card report-card" onClose={onClose}>
      <div className="header">
        <h1>RELATÓRIO DE RONDAS</h1>
        <div className="report-date-row">
          <label htmlFor="report-date">Data</label>
          <input
            id="report-date"
            type="date"
            value={date}
            max={todayStr}
            onChange={(e) => setDate(e.target.value)}
          />
          <button type="button" className="icon-button" onClick={handleExport} disabled={loading || total === 0}>
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      <div className="report-summary">
        <div className="report-stat">
          <span className="report-stat-value">{total}</span>
          <span className="report-stat-label">Itens</span>
        </div>
        <div className="report-stat report-stat-online">
          <span className="report-stat-value">{onlineCount}</span>
          <span className="report-stat-label">Online</span>
        </div>
        <div className="report-stat report-stat-offline">
          <span className="report-stat-value">{offlineCount}</span>
          <span className="report-stat-label">Offline</span>
        </div>
        <div className="report-stat report-stat-pending">
          <span className="report-stat-value">{pendingCount}</span>
          <span className="report-stat-label">Não verificado</span>
        </div>
      </div>

      {error && <p className="login-error">{error}</p>}

      {loading ? (
        <p style={{ textAlign: 'center' }}>Carregando...</p>
      ) : sections.length === 0 ? (
        <p style={{ textAlign: 'center' }}>Nenhum tópico cadastrado ainda.</p>
      ) : (
        <div className="report-sections">
          {sections.map((section) => {
            const sectionLeafItems = flattenLeafItemsWithLabel(section.items);
            const sectionChecked = sectionLeafItems.filter((item) => registrosMap[item.id]).length;
            const isExpanded = !!expandedSections[section.id];

            return (
              <div key={section.id} className="section-admin-block">
                <div className="section-admin-title-row">
                  <button
                    type="button"
                    className="section-admin-toggle"
                    onClick={() => toggleExpanded(section.id)}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <strong>{section.title}</strong>
                  </button>
                  <span className="report-section-count">
                    {sectionChecked}/{sectionLeafItems.length}
                  </span>
                </div>

                {isExpanded && (
                  <div className="item-admin-list">
                    {sectionLeafItems.map((item) => {
                      const r = registrosMap[item.id];
                      const status = r?.status;
                      return (
                        <div key={item.id} className="report-item-row">
                          <div className="report-item-info">
                            <span>{item.label}</span>
                            {r && (
                              <span className="report-item-meta">
                                {r.user_name} às {r.registered_at ? r.registered_at.slice(11, 19) : ''}
                                {status === 'offline' && r.obs ? ` — ${r.obs}` : ''}
                              </span>
                            )}
                          </div>
                          <span className={`report-badge ${status || 'pending'}`}>
                            {status === 'online' && (
                              <>
                                <CheckCircle2 size={14} /> ONLINE
                              </>
                            )}
                            {status === 'offline' && (
                              <>
                                <XCircle size={14} /> OFFLINE
                              </>
                            )}
                            {!status && (
                              <>
                                <Circle size={14} /> PENDENTE
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button type="button" className="reset-button" onClick={onClose} style={{ marginTop: '1.5rem' }}>
        FECHAR
      </button>
    </ModalOverlay>
  );
}

export default Report;
