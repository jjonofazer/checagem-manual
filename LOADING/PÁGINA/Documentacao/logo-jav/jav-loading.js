/*
 * Logo J.A.V. animada — versão JavaScript puro (sem React, sem dependências).
 * Basta incluir este arquivo na página: ele injeta o próprio CSS.
 *
 *   <script src="jav-loading.js"></script>
 *
 *   // Tela cheia (abertura do sistema / login):
 *   var tela = JAV.telaCheia('Iniciando sistema');
 *   tela.fechar();
 *
 *   // Dentro de uma área da página (só aparece se demorar mais de 300 ms):
 *   var c = JAV.carregando(document.getElementById('conteudo'), 'Carregando...');
 *   fetch('/api/dados').then(...).finally(function () { c.fechar(); });
 *
 *   // Atalho para uma Promise:
 *   JAV.aguardar(document.getElementById('conteudo'), fetch('/api/dados'));
 */
(function (global) {
  var CSS = [
    '@keyframes jav-draw    { from { stroke-dashoffset: 220; } to { stroke-dashoffset: 0; } }',
    '@keyframes jav-float   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }',
    '@keyframes jav-glow    { 0%,100% { filter: drop-shadow(0 0 6px rgba(59,130,246,.3)); } 50% { filter: drop-shadow(0 0 22px rgba(59,130,246,.8)); } }',
    '@keyframes jav-bar     { from { width: 0; } to { width: 100%; } }',
    '@keyframes jav-dot-pop { 0% { opacity: 0; transform: translateY(-12px) scale(.4); } 60% { transform: translateY(3px) scale(1.15); } 100% { opacity: 1; transform: translateY(0) scale(1); } }',
    '@keyframes jav-card-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }',

    '.jav-logo-wrap { line-height: 0; animation: jav-float 3.5s ease-in-out infinite 1.6s, jav-glow 2.8s ease-in-out infinite 1.6s; }',
    '.jav-bracket { stroke-dasharray: 220; stroke-dashoffset: 220; }',
    '.jav-f1 .jav-bracket-tl { animation: jav-draw .55s cubic-bezier(.4,0,.2,1) forwards; }',
    '.jav-f1 .jav-bracket-br { animation: jav-draw .55s cubic-bezier(.4,0,.2,1) .1s forwards; }',
    '.jav-letter { opacity: 0; transition: opacity .35s ease, transform .4s cubic-bezier(.34,1.56,.64,1); }',
    '.jav-j { transform: translateX(-30px); }',
    '.jav-a { transform: translateY(-20px); }',
    '.jav-v { transform: translateX(30px); }',
    '.jav-f2 .jav-j, .jav-f3 .jav-a, .jav-f4 .jav-v { opacity: 1; transform: none; }',
    '.jav-pixel { opacity: 0; transform-box: fill-box; transform-origin: center; }',
    '.jav-f5 .jav-pixel { animation: jav-dot-pop .4s cubic-bezier(.34,1.56,.64,1) both; }',

    // Tela cheia
    '.jav-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 36px;',
    '  background: radial-gradient(ellipse at 40% 40%, #060614 0%, #000 100%); font-family: system-ui, sans-serif; }',
    '.jav-bottom { width: 260px; display: flex; flex-direction: column; gap: 10px; }',
    '.jav-track { width: 100%; height: 3px; background: rgba(255,255,255,.06); border-radius: 99px; overflow: hidden; }',
    '.jav-fill { height: 100%; width: 0; border-radius: 99px; background: linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa); box-shadow: 0 0 10px rgba(59,130,246,.7);',
    '  animation: jav-bar 1.7s cubic-bezier(.4,0,.2,1) .1s forwards; }',
    '.jav-msg { text-align: center; font-size: 12px; color: rgba(255,255,255,.35); letter-spacing: .5px; }',

    // Compacto (dentro da página)
    '.jav-area { min-height: 260px; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }',
    '.jav-card { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 22px 34px 18px; border-radius: 18px;',
    '  background: radial-gradient(ellipse at 40% 40%, #0b0b20 0%, #000 100%); border: 1px solid rgba(59,130,246,.18);',
    '  box-shadow: 0 8px 32px rgba(0,0,0,.35); animation: jav-card-in .25s ease-out; font-family: system-ui, sans-serif; }',
    '.jav-card .jav-msg { color: rgba(255,255,255,.45); }'
  ].join('\n');

  var contador = 0;

  function injetarCss() {
    if (document.getElementById('jav-loading-css')) return;
    var s = document.createElement('style');
    s.id = 'jav-loading-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Monta o SVG da logo e dispara a sequência de fases (mesmos tempos do sistema original).
  function logo(tamanho) {
    injetarCss();
    var n = ++contador; // ids únicos por instância, para os gradientes não colidirem
    var wrap = document.createElement('div');
    wrap.className = 'jav-logo-wrap';
    wrap.innerHTML =
      '<svg viewBox="15 8 300 285" width="' + tamanho + '" height="' + tamanho + '">' +
        '<defs>' +
          '<linearGradient id="jav-silver-' + n + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#c8c8c8"/><stop offset="40%" stop-color="#f0f0f0"/><stop offset="100%" stop-color="#888888"/></linearGradient>' +
          '<linearGradient id="jav-blue-' + n + '" x1="20%" y1="0%" x2="80%" y2="100%">' +
            '<stop offset="0%" stop-color="#4f8ef7"/><stop offset="100%" stop-color="#1a3fcc"/></linearGradient>' +
          '<linearGradient id="jav-bracket-' + n + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>' +
          '<linearGradient id="jav-blend-' + n + '" x1="0%" y1="0%" x2="100%" y2="0%">' +
            '<stop offset="0%" stop-color="#d0d0d0"/><stop offset="60%" stop-color="#e8e8e8"/><stop offset="100%" stop-color="#aaaaaa"/></linearGradient>' +
        '</defs>' +
        // Colchetes ┌ ┘
        '<path class="jav-bracket jav-bracket-tl" d="M 158,30 L 40,30 L 40,128" fill="none" stroke="url(#jav-bracket-' + n + ')" stroke-width="7" stroke-linecap="square"/>' +
        '<path class="jav-bracket jav-bracket-br" d="M 160,280 L 290,280 L 290,180" fill="none" stroke="url(#jav-bracket-' + n + ')" stroke-width="7" stroke-linecap="square"/>' +
        // J
        '<g class="jav-letter jav-j">' +
          '<line x1="74" y1="50" x2="114" y2="50" stroke="url(#jav-silver-' + n + ')" stroke-width="13" stroke-linecap="round"/>' +
          '<line x1="104" y1="50" x2="104" y2="215" stroke="url(#jav-silver-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
          '<path d="M 104,215 Q 104,260 78,260 Q 58,260 58,235" fill="none" stroke="url(#jav-silver-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
        '</g>' +
        // A (pico)
        '<g class="jav-letter jav-a">' +
          '<line x1="108" y1="252" x2="168" y2="50" stroke="url(#jav-silver-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
          '<line x1="168" y1="50" x2="212" y2="165" stroke="url(#jav-blend-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
        '</g>' +
        // V (azul)
        '<g class="jav-letter jav-v">' +
          '<line x1="210" y1="162" x2="236" y2="252" stroke="url(#jav-blue-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
          '<line x1="236" y1="252" x2="272" y2="88" stroke="url(#jav-blue-' + n + ')" stroke-width="22" stroke-linecap="round"/>' +
        '</g>' +
        // Pixels
        '<rect class="jav-pixel" x="232" y="34" width="14" height="14" rx="1" fill="#3b82f6" style="animation-delay:0ms"/>' +
        '<rect class="jav-pixel" x="249" y="22" width="10" height="10" rx="1" fill="#3b82f6" style="animation-delay:80ms"/>' +
        '<rect class="jav-pixel" x="250" y="40" width="7" height="7" rx="1" fill="#3b82f6" style="animation-delay:160ms"/>' +
        '<rect class="jav-pixel" x="238" y="50" width="5" height="5" rx="1" fill="#3b82f6" style="animation-delay:240ms"/>' +
      '</svg>';

    [[1, 100], [2, 500], [3, 750], [4, 950], [5, 1100]].forEach(function (f) {
      setTimeout(function () { wrap.classList.add('jav-f' + f[0]); }, f[1]);
    });
    return wrap;
  }

  function texto(msg) {
    var d = document.createElement('div');
    d.className = 'jav-msg';
    d.textContent = msg;
    return d;
  }

  // Tela cheia: cobre tudo. Use só na abertura do sistema / verificação de sessão.
  function telaCheia(mensagem) {
    var overlay = document.createElement('div');
    overlay.className = 'jav-overlay';
    overlay.appendChild(logo(230));
    var bottom = document.createElement('div');
    bottom.className = 'jav-bottom';
    bottom.innerHTML = '<div class="jav-track"><div class="jav-fill"></div></div>';
    bottom.appendChild(texto(mensagem || 'Carregando...'));
    overlay.appendChild(bottom);
    document.body.appendChild(overlay);
    return { fechar: function () { overlay.remove(); } };
  }

  // Compacto: substitui o conteúdo de `container` enquanto carrega.
  // Só mostra a logo se demorar mais que `atraso` ms (padrão 300) — cargas rápidas não piscam.
  function carregando(container, mensagem, atraso) {
    if (atraso == null) atraso = 300;
    var area = document.createElement('div');
    area.className = 'jav-area';
    container.innerHTML = '';
    container.appendChild(area);

    var t = setTimeout(function () {
      var card = document.createElement('div');
      card.className = 'jav-card';
      card.appendChild(logo(110));
      card.appendChild(texto(mensagem || 'Carregando...'));
      area.appendChild(card);
    }, atraso);

    return { fechar: function () { clearTimeout(t); area.remove(); } };
  }

  // Atalho: mostra o carregamento em `container` até a Promise terminar (sucesso ou erro).
  function aguardar(container, promessa, mensagem) {
    var c = carregando(container, mensagem);
    return Promise.resolve(promessa).finally(function () { c.fechar(); });
  }

  global.JAV = { logo: logo, telaCheia: telaCheia, carregando: carregando, aguardar: aguardar };
})(window);
