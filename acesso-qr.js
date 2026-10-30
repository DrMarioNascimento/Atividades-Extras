/* QR de acesso direto, sempre visível no canto. Não altera os QR de sessão. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || document.getElementById('acesso-qr-site')) return;
  const fisio = new URLSearchParams(location.search).get('percurso') === 'fisioterapia';
  const url = fisio && script.dataset.fisioUrl ? script.dataset.fisioUrl : script.dataset.url;
  const image = fisio && script.dataset.fisioImage ? script.dataset.fisioImage : script.dataset.image;
  const title = fisio && script.dataset.fisioTitle ? script.dataset.fisioTitle : script.dataset.title;
  if (!url || !image) return;
  const host = document.createElement('div');
  host.id = 'acesso-qr-site';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `
    <style>
      :host{position:fixed;left:max(10px,env(safe-area-inset-left));bottom:calc(10px + env(safe-area-inset-bottom));z-index:10000;font:10px/1.3 system-ui,sans-serif;color-scheme:light}
      *{box-sizing:border-box}
      a{display:block;width:96px;padding:3px 3px 5px;border:1px solid #d8dfdd;border-radius:9px;background:#fff;color:#334741;text-align:center;text-decoration:none;box-shadow:0 2px 9px #0002}
      a:focus-visible{outline:3px solid #167151;outline-offset:3px}
      img{display:block;width:88px;height:88px;max-width:100%;background:#fff}
      span{display:block;margin-top:1px;font-size:10px;letter-spacing:.02em}
      @media(max-width:600px){a{width:88px}img{width:80px;height:80px}span{font-size:9px}}
      @media print{:host{display:none}}
    </style>
    <a><img width="88" height="88"><span>QR do site</span></a>`;
  const link = root.querySelector('a');
  link.href = url;
  link.title = title || 'Acesso direto';
  link.setAttribute('aria-label','Acesso direto a '+(title || url));
  const img = root.querySelector('img');
  img.src = new URL(image,script.src).href;
  img.alt = 'QR Code para '+(title || url);
  // No chat compacto, deixa livres a caixa de pergunta e os atalhos inferiores.
  if (document.getElementById('moodleTutorChat')) host.style.bottom='calc(100px + env(safe-area-inset-bottom))';
  document.body.appendChild(host);
})();
