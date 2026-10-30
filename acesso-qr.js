/* QR de acesso ao endereço público; os QR de sessão continuam no próprio jogo. */
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
  const root = host.attachShadow({mode: 'open'});
  root.innerHTML = `
    <style>
      :host{position:fixed;left:max(12px,env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));z-index:10000;font:14px/1.5 system-ui,sans-serif;color:#eaf4f3;color-scheme:dark}
      *,*::before,*::after{box-sizing:border-box}
      button,a{font:inherit}button{cursor:pointer}
      .trigger{display:flex;align-items:center;gap:8px;min-height:44px;padding:9px 14px;border:1px solid #718c8a;border-radius:14px;background:linear-gradient(155deg,#24433e,#102b27);color:#fff;box-shadow:inset 0 1px #ffffff35,0 4px 0 #061b18,0 7px 18px #0005;font-weight:700}
      .trigger svg{width:20px;height:20px;flex:none}
      button:focus-visible,a:focus-visible{outline:3px solid #f8c96d;outline-offset:4px}
      dialog{position:fixed;inset:0;margin:auto;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:22px;border:1px solid #718c8a;border-radius:22px;background:linear-gradient(150deg,#203d38,#0d211e);color:#eaf4f3;overflow:auto;box-shadow:inset 0 1px #ffffff33,0 20px 70px #0009;text-align:center}
      dialog::backdrop{background:#041310bd;backdrop-filter:blur(5px)}
      .head{display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;margin-bottom:10px}
      h2{margin:0;font-size:19px;line-height:1.3}.close{flex:none;min-width:44px;min-height:44px;border:1px solid #718c8a;border-radius:12px;background:#ffffff12;color:#fff;font-size:23px}
      p{margin:10px 0;color:#d1e1df}.code{display:block;margin:18px auto 10px;width:min(100%,300px);line-height:0;border-radius:12px;overflow:hidden;background:white}
      img{display:block;width:100%;height:auto;aspect-ratio:1;background:#fff}
      .url{display:block;color:#bceee0;overflow-wrap:anywhere;font-size:12px;padding:6px 0}
      .actions{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:15px}.actions a,.actions button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 13px;border:1px solid #718c8a;border-radius:12px;background:#ffffff10;color:#fff;text-decoration:none}
      .status{min-height:21px;font-size:12px;margin-bottom:0}.hint{font-size:12px}
      @media(max-width:420px){dialog{padding:16px}.code{width:min(100%,260px)}.trigger{padding:8px 11px;font-size:12px}}
      @media print{:host{display:none}}
    </style>
    <button class="trigger" type="button" aria-haspopup="dialog" aria-label="Mostrar QR Code de acesso a esta página">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h3v3h3v3h-6zM12 3v3M3 12h6M12 12h3M21 12v3M12 18v3"/></svg>
      QR do site
    </button>
    <dialog aria-labelledby="qr-title" aria-describedby="qr-description">
      <div class="head"><h2 id="qr-title"></h2><button class="close" type="button" aria-label="Fechar QR Code">×</button></div>
      <p id="qr-description">Aponte a câmera do celular para abrir este endereço.</p>
      <a class="code" target="_blank" rel="noopener" aria-label="Ampliar QR Code em outra aba"><img width="300" height="300"></a>
      <p class="hint">Toque no código para ampliar.</p>
      <a class="url" target="_blank" rel="noopener"></a>
      <div class="actions"><button class="copy" type="button">Copiar endereço</button><a class="download" download>Baixar QR Code</a></div>
      <p class="status" role="status" aria-live="polite"></p>
    </dialog>`;
  const dialog = root.querySelector('dialog');
  const trigger = root.querySelector('.trigger');
  const status = root.querySelector('.status');
  const imageUrl = new URL(image, script.src).href;
  root.querySelector('h2').textContent = title || 'Acesso direto';
  root.querySelector('img').src = imageUrl;
  root.querySelector('img').alt = 'QR Code para ' + (title || url);
  root.querySelector('.code').href = imageUrl;
  root.querySelector('.download').href = imageUrl;
  root.querySelector('.download').download = image.split('/').pop();
  const link = root.querySelector('.url');
  link.href = url;
  link.textContent = url;
  trigger.addEventListener('click', () => { status.textContent = ''; dialog.showModal(); });
  root.querySelector('.close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const b = dialog.getBoundingClientRect();
    if (event.clientX < b.left || event.clientX > b.right || event.clientY < b.top || event.clientY > b.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => trigger.focus());
  root.querySelector('.copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); status.textContent = 'Endereço copiado.'; }
    catch { status.textContent = 'Selecione e copie o endereço acima.'; }
  });
  document.body.appendChild(host);
})();
