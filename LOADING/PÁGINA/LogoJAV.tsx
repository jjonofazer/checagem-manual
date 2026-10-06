import React, { useEffect, useId, useState } from 'react';

// Logo J.A.V. animada (SVG + CSS). Usada na tela cheia (LoadingScreen) e no carregamento compacto (CarregandoLogo).
// A sequência de fases começa quando o componente é montado.
export default function LogoJAV({ tamanho = 230 }: { tamanho?: number }) {
  const [fase, setFase] = useState(0);
  // ids únicos por instância, para os gradientes não colidirem quando houver mais de uma logo na tela
  const uid = useId().replace(/:/g, '');
  const g = (nome: string) => `jav-${nome}-${uid}`;

  useEffect(() => {
    const timers = [
      setTimeout(() => setFase(1), 100),   // brackets
      setTimeout(() => setFase(2), 500),   // J
      setTimeout(() => setFase(3), 750),   // A
      setTimeout(() => setFase(4), 950),   // V
      setTimeout(() => setFase(5), 1100),  // pixels
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const tr = 'opacity .35s ease, transform .4s cubic-bezier(.34,1.56,.64,1)';

  return (
    <>
      <style>{`
        @keyframes jav-draw-bracket {
          from { stroke-dashoffset: 220; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes jav-logo-float {
          0%,100% { transform: translateY(0);  }
          50%      { transform: translateY(-7px); }
        }
        @keyframes jav-glow-pulse {
          0%,100% { filter: drop-shadow(0 0 6px rgba(59,130,246,.3)); }
          50%      { filter: drop-shadow(0 0 22px rgba(59,130,246,.8)); }
        }
        @keyframes jav-dot-pop {
          0%   { opacity:0; transform: translateY(-12px) scale(.4); }
          60%  { transform: translateY(3px) scale(1.15); }
          100% { opacity:1; transform: translateY(0) scale(1); }
        }
        .jav-logo-wrap {
          animation: jav-logo-float 3.5s ease-in-out infinite 1.6s, jav-glow-pulse 2.8s ease-in-out infinite 1.6s;
        }
        .jav-bracket {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
        }
        .jav-bracket-tl { animation: jav-draw-bracket .55s cubic-bezier(.4,0,.2,1) forwards; }
        .jav-bracket-br { animation: jav-draw-bracket .55s cubic-bezier(.4,0,.2,1) .1s forwards; }
      `}</style>

      <div className="jav-logo-wrap" style={{ lineHeight: 0 }}>
        <svg viewBox="15 8 300 285" width={tamanho} height={tamanho}>
          <defs>
            <linearGradient id={g('silver')} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#c8c8c8"/>
              <stop offset="40%"  stopColor="#f0f0f0"/>
              <stop offset="100%" stopColor="#888888"/>
            </linearGradient>
            <linearGradient id={g('blue-v')} x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%"   stopColor="#4f8ef7"/>
              <stop offset="100%" stopColor="#1a3fcc"/>
            </linearGradient>
            <linearGradient id={g('bracket')} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#60a5fa"/>
              <stop offset="100%" stopColor="#2563eb"/>
            </linearGradient>
            <linearGradient id={g('ja-blend')} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#d0d0d0"/>
              <stop offset="60%"  stopColor="#e8e8e8"/>
              <stop offset="100%" stopColor="#aaaaaa"/>
            </linearGradient>
          </defs>

          {/* ── BRACKET TOP-LEFT ┌ ─────────────────── */}
          <path className={fase >= 1 ? 'jav-bracket jav-bracket-tl' : 'jav-bracket'}
            d="M 158,30 L 40,30 L 40,128"
            fill="none" stroke={`url(#${g('bracket')})`} strokeWidth="7" strokeLinecap="square"/>

          {/* ── BRACKET BOTTOM-RIGHT ┘ ───────────────── */}
          <path className={fase >= 1 ? 'jav-bracket jav-bracket-br' : 'jav-bracket'}
            d="M 160,280 L 290,280 L 290,180"
            fill="none" stroke={`url(#${g('bracket')})`} strokeWidth="7" strokeLinecap="square"/>

          {/* ── LETRA J ──────────────────────────────── */}
          <g style={{
            opacity: fase >= 2 ? 1 : 0,
            transform: fase >= 2 ? 'translateX(0)' : 'translateX(-30px)',
            transition: tr,
          }}>
            {/* Serifa topo */}
            <line x1="74" y1="50" x2="114" y2="50"
              stroke={`url(#${g('silver')})`} strokeWidth="13" strokeLinecap="round"/>
            {/* Haste vertical */}
            <line x1="104" y1="50" x2="104" y2="215"
              stroke={`url(#${g('silver')})`} strokeWidth="22" strokeLinecap="round"/>
            {/* Curva inferior */}
            <path d="M 104,215 Q 104,260 78,260 Q 58,260 58,235"
              fill="none" stroke={`url(#${g('silver')})`} strokeWidth="22" strokeLinecap="round"/>
          </g>

          {/* ── PICO /\ (corpo do A) ─────────────────── */}
          <g style={{
            opacity: fase >= 3 ? 1 : 0,
            transform: fase >= 3 ? 'translateY(0)' : 'translateY(-20px)',
            transition: tr,
          }}>
            {/* Braço esquerdo: base → topo */}
            <line x1="108" y1="252" x2="168" y2="50"
              stroke={`url(#${g('silver')})`} strokeWidth="22" strokeLinecap="round"/>
            {/* Braço direito: topo → ponto onde V começa */}
            <line x1="168" y1="50" x2="212" y2="165"
              stroke={`url(#${g('ja-blend')})`} strokeWidth="22" strokeLinecap="round"/>
          </g>

          {/* ── LETRA V (azul) — DUAS PERNAS ─────────── */}
          <g style={{
            opacity: fase >= 4 ? 1 : 0,
            transform: fase >= 4 ? 'translateX(0)' : 'translateX(30px)',
            transition: tr,
          }}>
            {/* Perna esquerda: continua do A descendo */}
            <line x1="210" y1="162" x2="236" y2="252"
              stroke={`url(#${g('blue-v')})`} strokeWidth="22" strokeLinecap="round"/>
            {/* Perna direita: sobe em diagonal para a direita */}
            <line x1="236" y1="252" x2="272" y2="88"
              stroke={`url(#${g('blue-v')})`} strokeWidth="22" strokeLinecap="round"/>
          </g>

          {/* ── PIXELS (quadrados azuis top-right) ──── */}
          {[
            { x:232, y:34, s:14, o:1.0, delay:0    },
            { x:249, y:22, s:10, o:0.9, delay:80   },
            { x:250, y:40, s:7,  o:0.7, delay:160  },
            { x:238, y:50, s:5,  o:0.5, delay:240  },
          ].map((p, i) => (
            <rect key={i} x={p.x} y={p.y} width={p.s} height={p.s} rx="1"
              fill="#3b82f6" opacity={p.o}
              style={{
                opacity: fase >= 5 ? p.o : 0,
                animation: fase >= 5 ? `jav-dot-pop .4s cubic-bezier(.34,1.56,.64,1) ${p.delay}ms both` : 'none',
              }}
            />
          ))}
        </svg>
      </div>
    </>
  );
}
