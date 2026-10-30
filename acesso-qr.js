/* QR de acesso integrado à apresentação. Os QR de sessão permanecem independentes. */
(() => {
  'use strict';
  const script = document.currentScript;
  if (!script || document.getElementById('acesso-qr-estilo')) return;
  const fisio = new URLSearchParams(location.search).get('percurso') === 'fisioterapia';
  const url = fisio && script.dataset.fisioUrl ? script.dataset.fisioUrl : script.dataset.url;
  const image = fisio && script.dataset.fisioImage ? script.dataset.fisioImage : script.dataset.image;
  const title = fisio && script.dataset.fisioTitle ? script.dataset.fisioTitle : script.dataset.title;
  if (!url || !image) return;
  const style = document.createElement('style');
  style.id = 'acesso-qr-estilo';
  style.textContent = `
    [data-qr-intro]{display:grid;grid-template-columns:minmax(0,1fr) 116px;align-items:center;gap:24px;margin-bottom:20px}
    [data-qr-copy]{min-width:0}
    [data-acesso-qr-slot]{display:flex;align-items:center;justify-content:center;min-width:0}
    [data-qr-compact]{grid-template-columns:minmax(0,1fr) 96px;gap:12px}
    @media(min-width:901px){.intro-banner[data-qr-banner]{grid-template-columns:124px minmax(0,1fr) 150px 116px;gap:22px}}
    @media(max-width:900px){[data-qr-banner]>[data-acesso-qr-slot]{grid-column:1/-1;justify-content:flex-start}}
    @media(max-width:760px){[data-qr-intro]{grid-template-columns:minmax(0,1fr);gap:14px}[data-qr-intro]>[data-acesso-qr-slot]{justify-content:flex-start}}
  `;
  document.head.appendChild(style);
  const host = document.createElement('div');
  host.id = 'acesso-qr-site';
  const root = host.attachShadow({mode:'open'});
  root.innerHTML = `
    <style>
      :host{display:block;width:116px;max-width:100%;font:11px/1.3 system-ui,sans-serif;color-scheme:light}
      *{box-sizing:border-box}
      a{display:block;padding:4px 4px 7px;border:1px solid #d8dfdd;border-radius:10px;background:#fff;color:#334741;text-align:center;text-decoration:none;box-shadow:0 2px 8px #0002}
      a:focus-visible{outline:3px solid #167151;outline-offset:3px}
      img{display:block;width:100%;height:auto;aspect-ratio:1;background:#fff}
      span{display:block;margin-top:2px;font-size:11px;white-space:nowrap}
      :host([compact]){width:96px}:host([compact]) span{font-size:9px}
      @media(max-width:760px){:host{width:104px}:host([compact]){width:96px}span{font-size:10px}}
    </style>
    <a><img width="106" height="106"><span>Abra no celular</span></a>`;
  const link = root.querySelector('a');
  link.href = url;
  link.title = title || 'Acesso direto';
  link.setAttribute('aria-label','Acesso direto a '+(title || url));
  const img = root.querySelector('img');
  img.src = new URL(image,script.src).href;
  img.alt = 'QR Code para '+(title || url);
  const mount = () => {
    const slots = [...document.querySelectorAll('[data-acesso-qr-slot]')];
    const slot = slots.find(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
    if (!slot) { if (host.isConnected) host.remove(); return; }
    host.toggleAttribute('compact',!!slot.closest('[data-qr-compact]'));
    if (host.parentElement !== slot) slot.appendChild(host);
  };
  mount();
  // A apresentação dos jogos é montada ao entrar; o QR acompanha somente essa tela.
  const observer = new MutationObserver(mount);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','class']});
})();
