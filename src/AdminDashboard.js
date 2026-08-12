import React, { useEffect, useState } from 'react';
import { getDailyStats } from './api';
import { flattenLeafItems } from './itemUtils';

const STATUS_ORDER = ['online', 'offline', 'pending'];
const STATUS_META = {
  online: { label: 'Online', className: 'online' },
  offline: { label: 'Offline', className: 'offline' },
  pending: { label: 'Não verificado', className: 'pending' }
};

function formatShortDate(dateStr) {
  const [, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

function AdminDashboard({ sections, checkedItems }) {
  const [daily, setDaily] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDailyStats(7)
      .then(({ daily }) => setDaily(daily))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const allItems = sections.flatMap((section) => flattenLeafItems(section.items));
  const total = allItems.length;
  const todayOnline = allItems.filter((item) => checkedItems[item.id]?.status === 'online').length;
  const todayOffline = allItems.filter((item) => checkedItems[item.id]?.status === 'offline').length;
  const todayPending = total - todayOnline - todayOffline;
  const todayCounts = { online: todayOnline, offline: todayOffline, pending: todayPending };

  const maxTotal = Math.max(...daily.map((d) => d.total), 1);

  return (
    <div className="admin-dashboard-charts">
      <div className="chart-card">
        <h3 className="chart-title">Status de hoje</h3>
        {total === 0 ? (
          <p className="chart-empty">Nenhum item cadastrado ainda.</p>
        ) : (
          <>
            <div className="today-bar">
              {STATUS_ORDER.map((key) => {
                const count = todayCounts[key];
                if (count === 0) return null;
                const pct = (count / total) * 100;
                return (
                  <div
                    key={key}
                    className={`today-segment ${STATUS_META[key].className}`}
                    style={{ width: `${pct}%` }}
                    data-tooltip={`${STATUS_META[key].label}: ${count} (${pct.toFixed(0)}%)`}
                  >
                    {pct >= 15 && <span>{count}</span>}
                  </div>
                );
              })}
            </div>
            <ChartLegend counts={todayCounts} />
          </>
        )}
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Últimos 7 dias</h3>
        {loading ? (
          <p className="chart-empty">Carregando...</p>
        ) : error ? (
          <p className="login-error">{error}</p>
        ) : (
          <>
            <div className="trend-chart">
              {daily.map((d) => {
                const counts = { online: d.online, offline: d.offline, pending: d.pending };
                return (
                  <div key={d.date} className="trend-bar-group">
                    <div className="trend-bar">
                      {STATUS_ORDER.map((key) => {
                        const count = counts[key];
                        if (count === 0) return null;
                        const heightPct = d.total > 0 ? (count / maxTotal) * 100 : 0;
                        return (
                          <div
                            key={key}
                            className={`trend-segment ${STATUS_META[key].className}`}
                            style={{ height: `${heightPct}%` }}
                            data-tooltip={`${formatShortDate(d.date)} — ${STATUS_META[key].label}: ${count}`}
                          />
                        );
                      })}
                    </div>
                    <span className="trend-bar-label">{formatShortDate(d.date)}</span>
                  </div>
                );
              })}
            </div>
            <ChartLegend counts={null} />
          </>
        )}
      </div>
    </div>
  );
}

function ChartLegend({ counts }) {
  return (
    <div className="chart-legend">
      {STATUS_ORDER.map((key) => (
        <span key={key} className="chart-legend-item">
          <span className={`chart-legend-dot ${STATUS_META[key].className}`} />
          {STATUS_META[key].label}
          {counts && ` (${counts[key]})`}
        </span>
      ))}
    </div>
  );
}

export default AdminDashboard;
