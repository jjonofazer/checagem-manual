import React from 'react';
import LogoJAV from './LogoJAV';

// Tela cheia de carregamento — usada na abertura do sistema e na verificação
// de sessão (antes do login). Para carregamento dentro das páginas, use
// CarregandoLogo (mantém menu e topo visíveis). Portado de
// LOADING/PÁGINA/LoadingScreen.tsx.
export default function LoadingScreen({ mensagem = 'Carregando...' }) {
  return (
    <>
      <style>{`
        @keyframes jav-bar-fill {
          from { width: 0; }
          to   { width: 100%; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'radial-gradient(ellipse at 40% 40%, #060614 0%, #000000 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36
        }}
      >
        {/* LOGO SVG */}
        <LogoJAV tamanho={230} />

        {/* BARRA + MENSAGEM */}
        <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: 0,
                borderRadius: 99,
                background: 'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)',
                boxShadow: '0 0 10px rgba(59,130,246,.7)',
                animation: 'jav-bar-fill 1.7s cubic-bezier(.4,0,.2,1) .1s forwards'
              }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,.35)', letterSpacing: '.5px' }}>
            {mensagem}
          </div>
        </div>
      </div>
    </>
  );
}
