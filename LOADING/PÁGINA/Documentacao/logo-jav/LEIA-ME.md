# Logo J.A.V. animada: telas de carregamento

Este pacote leva a animação da logo J.A.V. do sistema Controle Patrimonial para outros sistemas. São dois tipos de carregamento:

| Tipo | Quando usar | Como aparece |
|---|---|---|
| **Tela cheia** | Abertura do sistema, verificação de sessão/login | Cobre a tela toda, com a logo grande, barra de progresso e mensagem |
| **Compacto** | Qualquer página ou área esperando dados do backend (listas, detalhes, modais) | Cartão escuro com a logo menor, **dentro** da área que está carregando. Menu e topo continuam visíveis. |

Não use a tela cheia para carregar páginas. Ela esconde o menu, e em respostas rápidas aparece e some em seguida, parecendo um defeito.

## Arquivos

| Arquivo | Para quê |
|---|---|
| `jav-loading.js` | Versão em **JavaScript puro**, para sistemas sem React (PHP, ASP.NET, HTML…). Injeta o próprio CSS. |
| `exemplo.html` | Demonstração da versão JS. Abra no navegador e clique nos botões. Precisa estar na mesma pasta do `jav-loading.js`. |
| Seção "Código React" abaixo | Os 3 componentes React, prontos para copiar |

## Regras de comportamento

Estas regras valem para qualquer implementação:

1. **Atraso de 300 ms no compacto.** O carregamento compacto só aparece se a resposta passar de 300 ms. Respostas rápidas não mostram nada, e por isso a tela não pisca.
2. **Fecha sempre**, com sucesso ou com erro. Use `finally`, nunca só o `then`.
3. **Ocupa o lugar do conteúdo.** O compacto reserva uma altura mínima (260 px) para a página não "pular" quando ele aparece ou some.
4. **Peças muito pequenas** (uma linha de tabela, um campo) continuam com um indicador simples de texto ou spinner. A logo fica para áreas de conteúdo.
5. **Tela cheia na abertura:** o Controle Patrimonial mantém a logo por no mínimo 3 s na abertura, para a animação ser vista inteira, e depois espera a verificação de sessão terminar. É opcional.

## Como a animação funciona

É um SVG desenhado em código, animado só com CSS (`@keyframes` e `transition`). Não usa imagem nem biblioteca. Quando a logo é criada, uma sequência de temporizadores revela as partes:

| Tempo | Parte | Efeito |
|---|---|---|
| 100 ms | Colchetes ┌ ┘ azuis | Linha "desenhada" (`stroke-dashoffset` de 220 para 0) |
| 500 ms | Letra J (prata) | Entra da esquerda com efeito de mola |
| 750 ms | Pico do A (prata) | Desce de cima |
| 950 ms | Letra V (azul) | Entra da direita |
| 1100 ms | 4 quadradinhos azuis | "Pulam" um após o outro, a cada 80 ms |
| a partir de 1,6 s | Logo inteira | Flutua (7 px, ciclo de 3,5 s) e o brilho azul pulsa (ciclo de 2,8 s) |

O efeito de mola usa `cubic-bezier(.34,1.56,.64,1)`.

**Cores:**
- Prata do J e do A: `#c8c8c8` → `#f0f0f0` → `#888888`
- Azul do V: `#4f8ef7` → `#1a3fcc`
- Colchetes: `#60a5fa` → `#2563eb`
- Quadradinhos: `#3b82f6`
- Fundo da tela cheia: `#060614` → `#000000` (gradiente radial)

Cada logo gera ids próprios para os gradientes do SVG. Assim, duas logos na mesma tela (por exemplo, a página e um modal) não entram em conflito.

---

## Opção 1: JavaScript puro (sem React)

Inclua o arquivo na página:

```html
<script src="/caminho/jav-loading.js"></script>
```

### Tela cheia (abertura do sistema)

```js
var tela = JAV.telaCheia('Iniciando sistema');
// ...quando o sistema estiver pronto:
tela.fechar();
```

Para a logo aparecer **antes** de todo o resto carregar, chame `JAV.telaCheia(...)` num `<script>` logo no início do `<body>`.

### Compacto (dentro de uma área da página)

```js
var area = document.getElementById('conteudo');
var c = JAV.carregando(area, 'Carregando...');   // atraso padrão de 300 ms

fetch('/api/ativos')
  .then(function (r) { return r.json(); })
  .then(function (dados) { /* desenhar os dados dentro de `area` */ })
  .finally(function () { c.fechar(); });
```

Atalho para uma Promise:

```js
JAV.aguardar(area, fetch('/api/ativos').then(r => r.json()))
  .then(dados => { /* desenhar os dados */ });
```

**Atenção:** `JAV.carregando` **limpa o conteúdo** do elemento passado. Passe o elemento que vai receber os dados novos, nunca a página inteira.

### Referência

| Função | Retorno | Descrição |
|---|---|---|
| `JAV.telaCheia(mensagem)` | `{ fechar() }` | Tela cheia por cima de tudo |
| `JAV.carregando(elemento, mensagem, atraso = 300)` | `{ fechar() }` | Compacto dentro do elemento |
| `JAV.aguardar(elemento, promise, mensagem)` | a mesma Promise | Mostra o compacto até a Promise terminar |
| `JAV.logo(tamanho)` | elemento `<div>` | Só a logo animada, para montar um layout próprio |

---

## Opção 2: React

Copie os 3 arquivos abaixo para `src/components/` do outro sistema. Eles não dependem de nenhuma biblioteca além do React 18, porque `useId` é do React 18.

| Componente | Uso |
|---|---|
| `LogoJAV` | Só a logo animada. Prop `tamanho` (padrão 230). |
| `LoadingScreen` | Tela cheia. Prop `mensagem`. |
| `CarregandoLogo` | Compacto. Props `mensagem`, `atraso` (padrão 300 ms), `altura` (padrão 260 px). |

### Padrão de uso nas páginas

```tsx
import CarregandoLogo from '../components/CarregandoLogo';

export default function MinhaPagina() {
  const [dados, setDados] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listar()
      .then(setDados)
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));   // fecha com sucesso ou erro
  }, []);

  return (
    <div>
      <h2>Minha página</h2>                {/* cabeçalho continua visível */}
      {loading ? <CarregandoLogo /> : <Tabela dados={dados} />}
    </div>
  );
}
```

### Tela cheia na abertura (como no Controle Patrimonial)

```tsx
function AppRoutes() {
  const { loading } = useAuth();            // verificação de sessão
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 3000);  // mínimo de 3 s
    return () => clearTimeout(t);
  }, []);

  if (splash || loading) return <LoadingScreen mensagem="Iniciando sistema" />;
  return <Routes>...</Routes>;
}
```

### Código React

#### `src/components/LogoJAV.tsx`

```tsx
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
```

#### `src/components/LoadingScreen.tsx`

```tsx
import React from 'react';
import LogoJAV from './LogoJAV';

// Tela cheia de carregamento — usada na abertura do sistema e na verificação de sessão.
// Para carregamento dentro das páginas, use CarregandoLogo (mantém menu e topo visíveis).
export default function LoadingScreen({ mensagem = 'Carregando...' }: { mensagem?: string }) {
  return (
    <>
      <style>{`
        @keyframes jav-bar-fill {
          from { width: 0; }
          to   { width: 100%; }
        }
      `}</style>

      <div style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'radial-gradient(ellipse at 40% 40%, #060614 0%, #000000 100%)',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:36,
      }}>

        {/* LOGO SVG */}
        <LogoJAV tamanho={230} />

        {/* BARRA + MENSAGEM */}
        <div style={{ width:260, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ width:'100%', height:3, background:'rgba(255,255,255,.06)', borderRadius:99, overflow:'hidden' }}>
            <div style={{
              height:'100%', width:0, borderRadius:99,
              background:'linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa)',
              boxShadow:'0 0 10px rgba(59,130,246,.7)',
              animation: 'jav-bar-fill 1.7s cubic-bezier(.4,0,.2,1) .1s forwards',
            }}/>
          </div>
          <div style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,.35)', letterSpacing:'.5px' }}>
            {mensagem}
          </div>
        </div>
      </div>
    </>
  );
}
```

#### `src/components/CarregandoLogo.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import LogoJAV from './LogoJAV';

// Carregamento dentro das páginas: logo J.A.V. animada num cartão escuro, sem cobrir menu/topo.
// Só aparece se o carregamento passar de `atraso` ms — respostas rápidas não fazem a tela piscar.
export default function CarregandoLogo({ mensagem = 'Carregando...', atraso = 300, altura = 260 }: {
  mensagem?: string;
  atraso?: number;
  altura?: number;
}) {
  const [visivel, setVisivel] = useState(atraso <= 0);

  useEffect(() => {
    if (atraso <= 0) return;
    const t = setTimeout(() => setVisivel(true), atraso);
    return () => clearTimeout(t);
  }, [atraso]);

  return (
    <div style={{ minHeight: altura, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {visivel && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          padding: '22px 34px 18px',
          background: 'radial-gradient(ellipse at 40% 40%, #0b0b20 0%, #000000 100%)',
          border: '1px solid rgba(59,130,246,.18)',
          borderRadius: 18,
          boxShadow: '0 8px 32px rgba(0,0,0,.35)',
          animation: 'jav-card-in .25s ease-out',
        }}>
          <style>{`@keyframes jav-card-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }`}</style>
          <LogoJAV tamanho={110} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', letterSpacing: '.5px' }}>{mensagem}</div>
        </div>
      )}
    </div>
  );
}
```
