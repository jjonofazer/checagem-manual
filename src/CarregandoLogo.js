import React, { useEffect, useState } from 'react';
import LogoJAV from './LogoJAV';

// Carregamento dentro das páginas: logo J.A.V. animada num cartão escuro, sem
// cobrir menu/topo. Só aparece se o carregamento passar de `atraso` ms —
// respostas rápidas não fazem a tela piscar. Portado de
// LOADING/PÁGINA/CarregandoLogo.tsx.
export default function CarregandoLogo({ mensagem = 'Carregando...', atraso = 300, altura = 260 }) {
  const [visivel, setVisivel] = useState(atraso <= 0);

  useEffect(() => {
    if (atraso <= 0) return;
    const t = setTimeout(() => setVisivel(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);

  return (
    <div style={{ minHeight: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {visivel && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            padding: '22px 34px 18px',
            background: 'radial-gradient(ellipse at 40% 40%, #0b0b20 0%, #000000 100%)',
            border: '1px solid rgba(59,130,246,.18)',
            borderRadius: 18,
            boxShadow: '0 8px 32px rgba(0,0,0,.35)',
            animation: 'jav-card-in .25s ease-out'
          }}
        >
          <style>{`@keyframes jav-card-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }`}</style>
          <LogoJAV tamanho={110} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', letterSpacing: '.5px' }}>{mensagem}</div>
        </div>
      )}
    </div>
  );
}
