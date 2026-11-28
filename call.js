/* Reliable "Call" buttons for every phone.
   1) telNum(): cleans messy numbers ("98765 43210 / 98940 12345", "+91-98765-43210", "098765 43210") into ONE dialable number.
   2) Click guard: if the phone/browser does not open the dialer (some in-app browsers, tablets, desktops), a small bar
      appears with the number + Copy + Dial buttons so the user is never stuck. */
(function () {
  'use strict';
  function telNum(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    var part = s;
    if (s.replace(/\D/g, '').length > 13) {            // several numbers typed in one field -> use the first
      var ps = s.split(/[\/,;|&\n]|\bor\b|அல்லது/i);
      for (var i = 0; i < ps.length; i++) { if (ps[i].replace(/\D/g, '').length >= 8) { part = ps[i]; break; } }
    }
    var plus = /^\s*\(?\s*\+/.test(part);
    var d = part.replace(/\D/g, '');
    if (!d) return '';
    if (d.indexOf('00') === 0) { d = d.slice(2); plus = true; }
    if (plus) return '+' + d;
    if (d.length === 12 && d.indexOf('91') === 0) return '+' + d;          // 91XXXXXXXXXX
    if (d.length === 11 && /^0[6-9]/.test(d)) return d.slice(1);           // 0XXXXXXXXXX mobile
    return d;                                                               // 10-digit mobile / landline with STD code
  }
  window.telNum = telNum;

  var bar, timer;
  function hideBar() { if (bar) { bar.remove(); bar = null; } }
  function showBar(num) {
    hideBar();
    bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:fixed;left:10px;right:10px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:99999;background:#0B1B20;color:#EAF2F1;border:1px solid #E3A92B;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px #000a;font:600 15px/1.4 system-ui,sans-serif;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
    var t = document.createElement('span'); t.style.flex = '1 1 100%';
    t.textContent = '📞 ' + num + ' — Dialer open aagala-na ithu use pannunga';
    var mk = function (label, fn, primary) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'flex:1;min-height:44px;border-radius:99px;border:1px solid #E3A92B;font:700 14px system-ui,sans-serif;cursor:pointer;' + (primary ? 'background:#E3A92B;color:#1a1200' : 'background:transparent;color:#F6D06F');
      b.onclick = fn; return b;
    };
    bar.appendChild(t);
    bar.appendChild(mk('Dial', function () { location.href = 'tel:' + num; }, true));
    bar.appendChild(mk('Copy', function (e) {
      var b = e.currentTarget, done = function () { b.textContent = 'Copied ✓'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).then(done, fb); else fb();
      function fb() {
        var ta = document.createElement('textarea'); ta.value = num; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (_) { } ta.remove();
      }
    }));
    bar.appendChild(mk('✕', hideBar));
    document.body.appendChild(bar);
    setTimeout(hideBar, 15000);
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a) return;
    var num = telNum(decodeURIComponent(a.getAttribute('href').slice(4)));
    if (!num) { e.preventDefault(); return; }
    if (a.getAttribute('href') !== 'tel:' + num) a.setAttribute('href', 'tel:' + num);   // self-heal bad hrefs
    var left = false, mark = function () { left = true; };
    document.addEventListener('visibilitychange', mark, { once: true });
    window.addEventListener('pagehide', mark, { once: true });
    window.addEventListener('blur', mark, { once: true });
    clearTimeout(timer);
    timer = setTimeout(function () {
      document.removeEventListener('visibilitychange', mark); window.removeEventListener('pagehide', mark); window.removeEventListener('blur', mark);
      if (!left && document.visibilityState === 'visible') showBar(num);
    }, 1600);
  }, false);
})();
