/* alerts.js: bus alerts (web push + Android app alarms), tones, name prompt. Loaded by index.html (defer). */
(function () {
  const TONES = [['default', '🔔 Default · இயல்பு'], ['chime', '🎵 Chime'], ['bell', '🛎 Bell'], ['horn', '🚌 Bus horn'], ['alarm', '⏰ Alarm'], ['soft', '🌿 Soft']];
  const MINS = [0, 5, 10, 15, 20, 30, 45, 60];
  const DN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const IN_APP = () => !!(window.AndroidBridge && typeof AndroidBridge.syncAlerts === 'function');
  const OLD_APP = () => !!(window.AndroidBridge && typeof AndroidBridge.syncAlerts !== 'function');
  const E = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Y = d => d.toLocaleDateString('en-CA');
  const daysOk = (days, d) => { const x = String(days || 'Daily').toLowerCase(); return x.includes('daily') || x.includes(DN[d.getDay()]) };
  const trigAt = (dep, mins, d) => { const [h, m] = String(dep).split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m - mins, 0, 0).getTime() };
  const hhmm = s => String(s).slice(0, 5);
  let ALERTS = [], lastU = '', lastT = 0, asking = false, audio = null, tableMissing = false;

  /* ---------- time maths ---------- */
  function triggersFor(a) {
    const out = [], now = Date.now();
    for (let i = 0; i < 8 && out.length < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      if (a.fire_on ? Y(d) !== a.fire_on : !daysOk(a.days, d)) continue;
      const t = trigAt(a.dep_time, a.minutes_before, d); if (t > now) out.push(t);
    }
    return out;
  }
  function nextFireDate(dep, days, mins) {
    for (let i = 0; i < 8; i++) { const d = new Date(); d.setDate(d.getDate() + i); if (daysOk(days, d) && trigAt(dep, mins, d) > Date.now()) return d }
    return null;
  }
  const f12 = t => { const [h, m] = hhmm(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` };
  const bodyOf = a => `${a.place_name ? a.place_name + ' · ' : ''}${f12(a.dep_time)} — ${a.minutes_before ? a.minutes_before + ' நிமிடத்தில் புறப்படும் · leaves in ' + a.minutes_before + ' min' : 'இப்போது புறப்படுகிறது · leaving now'}`;

  /* ---------- Android app ---------- */
  function syncNative() {
    if (!IN_APP()) return;
    try {
      const p = ALERTS.filter(a => a.enabled).map(a => ({ id: a.id, title: '🚌 ' + a.bus_name, body: bodyOf(a), tone: a.tone, t: triggersFor(a) })).filter(x => x.t.length);
      AndroidBridge.syncAlerts(JSON.stringify(p));
    } catch (e) {}
  }
  window.onNativeTone = title => {
    try { localStorage.setItem('al_phone_title', title || 'Phone tone') } catch (e) {}
    const s = document.getElementById('al_tone'); if (s) { fillTone(s, 'phone') }
  };

  /* ---------- tones ---------- */
  function toneOpts(sel) {
    const t = (() => { try { return localStorage.getItem('al_phone_title') } catch (e) { return '' } })();
    const list = TONES.concat(IN_APP() ? [['phone', t ? '📱 ' + t : '📱 Choose from phone…']] : []);
    return list.map(([k, l]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${E(l)}</option>`).join('');
  }
  function fillTone(s, v) { s.innerHTML = toneOpts(v); s.value = v }
  function playTone(k) { try { if (audio) audio.pause(); if (!k || k === 'default' || k === 'phone') k = 'chime'; audio = new Audio('/tones/' + k + '.wav'); audio.play().catch(() => {}) } catch (e) {} }
  async function testNotif(k) {
    if (IN_APP()) { try { AndroidBridge.requestNotifPermission() } catch (e) {} AndroidBridge.testNotification(k || 'default'); return }
    const r = await ensurePush(true); if (r !== 'ok') return alert(statusMsg(r));
    try { const reg = await navigator.serviceWorker.ready; reg.showNotification('🚌 Bus Timings', { body: 'Test alert · சோதனை', icon: '/logo.png', tag: 'test' }) } catch (e) {}
    if (k && k !== 'default') playTone(k);
  }
  function wireTone(selId, pvId) {
    const s = document.getElementById(selId), p = document.getElementById(pvId); let prev = s.value;
    s.onchange = () => { if (s.value === 'phone') { try { AndroidBridge.pickTone() } catch (e) {} s.value = prev; return } prev = s.value; testNotifQuiet(s.value) };
    p.onclick = () => testNotif(s.value);
  }
  function testNotifQuiet(k) { if (!IN_APP() && k !== 'default') playTone(k) }

  /* ---------- web push ---------- */
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = (s + p).replace(/-/g, '+').replace(/_/g, '/'), raw = atob(r); return Uint8Array.from([...raw].map(c => c.charCodeAt(0))) };
  async function regSW() { if (!('serviceWorker' in navigator) || IN_APP()) return null; try { return await navigator.serviceWorker.register('/sw.js') } catch (e) { return null } }
  async function ensurePush(ask) {
    if (IN_APP()) return 'ok';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
    await getSB().catch(() => {});
    if (typeof VAPID_PUBLIC_KEY === 'undefined' || !VAPID_PUBLIC_KEY) return 'nokey';
    let p = Notification.permission; if (p === 'default' && ask) p = await Notification.requestPermission();
    if (p === 'denied') return 'denied'; if (p !== 'granted') return 'default';
    try {
      await regSW(); const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC_KEY) });
      const j = sub.toJSON(), sb = await getSB();
      const { error } = await sb.from('push_subscriptions').upsert({ user_id: user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, ua: navigator.userAgent.slice(0, 120) }, { onConflict: 'endpoint' });
      return error ? 'dberr' : 'ok';
    } catch (e) { return 'error' }
  }
  const statusMsg = r => ({
    ok: '✅ Notifications are ON for this device.', denied: '🚫 Notifications are blocked. Allow them in the browser / site settings, then try again.',
    unsupported: 'This browser cannot show background notifications. Please use Chrome, or install the Android app.',
    nokey: 'Notifications are not set up on the server yet (admin: add the VAPID keys).', default: 'Please tap Allow when the browser asks.',
    dberr: 'Could not save this device. Run schema_v16_alerts.sql in Supabase.', error: 'Could not turn on notifications on this device.'
  }[r] || '');

  /* ---------- data ---------- */
  async function loadAlerts() {
    try {
      const sb = await getSB(); const { data, error } = await sb.from('bus_alerts').select('*').order('created_at', { ascending: false });
      if (error) throw error; tableMissing = false;
      const t = Y(new Date()), old = data.filter(a => a.fire_on && a.fire_on < t);
      if (old.length) sb.from('bus_alerts').delete().in('id', old.map(a => a.id)).then(() => {});
      ALERTS = data.filter(a => !(a.fire_on && a.fire_on < t));
    } catch (e) { tableMissing = /does not exist|schema cache|42P01|PGRST205/i.test((e.code || '') + ' ' + (e.message || '')); ALERTS = [] }
    syncNative(); badge();
  }
  function badge() { const b = document.getElementById('alBtn'); if (b) b.textContent = '🔔 My alerts · என் நினைவூட்டல்' + (ALERTS.length ? ' (' + ALERTS.length + ')' : '') }

  /* ---------- name prompt ---------- */
  function askName() {
    if (asking) return; asking = true;
    const stop = e => e.preventDefault();
    dlg.innerHTML = `<h3>👤 உங்கள் பெயர் · Your name</h3><p class="muted">Please tell us your name. · உங்கள் பெயரைச் சொல்லுங்கள்.</p><input id="nm_i" maxlength="60" autocomplete="name" placeholder="Your name"><div class="row" style="margin-top:12px"><button id="nm_s">Save · சேமி</button></div>`;
    dlg.addEventListener('cancel', stop); if (!dlg.open) dlg.showModal();
    document.getElementById('nm_s').onclick = async () => {
      const v = document.getElementById('nm_i').value.trim(); if (v.length < 2) return alert('Please enter your name.');
      const sb = await getSB(); const { error } = await sb.auth.updateUser({ data: { full_name: v } });
      if (error) return alert(error.message);
      dlg.removeEventListener('cancel', stop); dlg.close(); asking = false; who();
    };
  }

  /* ---------- "Notify me" dialog ---------- */
  window.openAlert = async function (id) {
    await who(); if (!user) return;
    const b = buses.find(x => x.id === id); if (!b) return;
    const ts = [...tms(b)].sort((x, y) => x.departure_time.localeCompare(y.departure_time));
    if (!ts.length) return alert('No timings for this bus.');
    const nx = ts.find(t => left(t) >= 0 && today(t)) || ts[0];
    const pn = (typeof PL !== 'undefined' && PL && PL.name) || '';
    dlg.innerHTML = `<h3>🔔 Bus alert · நினைவூட்டல்</h3><p><b>${E(b.name)}</b><br><span class="muted">${E(b.from_place)} → ${E(b.to_place)}</span></p>
<label for="al_t">Bus time · பேருந்து நேரம்</label><select id="al_t">${ts.map((t, i) => `<option value="${i}"${t === nx ? ' selected' : ''}>${fmt(t.departure_time)} · ${E(t.days || 'Daily')}</option>`).join('')}</select>
<label for="al_m">Remind me · எவ்வளவு முன்</label><select id="al_m">${MINS.map(m => `<option value="${m}"${m === 10 ? ' selected' : ''}>${m ? m + ' min before · ' + m + ' நிமிடம் முன்' : 'At departure time'}</option>`).join('')}</select>
<label for="al_r">Repeat</label><select id="al_r"><option value="1">Every day this bus runs</option><option value="0">Only the next time</option></select>
<label for="al_tone">Tone · ஒலி</label><div class="row" style="flex-wrap:nowrap"><select id="al_tone" style="flex:1"></select><button type="button" class="ghost" id="al_pv">▶</button></div>
<p class="muted" id="al_note" style="font-size:.85rem"></p>
<div class="row" style="margin-top:12px"><button id="al_s">🔔 Set alert</button><button class="ghost" id="r_x">Cancel</button></div>`;
    fillTone(document.getElementById('al_tone'), 'default'); wireTone('al_tone', 'al_pv');
    document.getElementById('al_note').textContent = IN_APP() ? '' : 'Web: custom tones play while the site is open. When the browser is closed your phone plays its default notification sound. The Android app plays your chosen tone always.';
    if (OLD_APP()) document.getElementById('al_note').textContent = '⚠️ Please update the Android app to get alerts.';
    dlg.showModal(); document.getElementById('r_x').onclick = () => dlg.close();
    document.getElementById('al_s').onclick = async e => {
      const btn = e.currentTarget, t = ts[+document.getElementById('al_t').value], mins = +document.getElementById('al_m').value, rep = document.getElementById('al_r').value === '1', tone = document.getElementById('al_tone').value;
      const row = { bus_id: b.id, bus_name: b.name, place_name: pn || null, dep_time: hhmm(t.departure_time), days: t.days || 'Daily', minutes_before: mins, tone };
      if (!rep) { const d = nextFireDate(row.dep_time, row.days, mins); if (!d) return alert('No upcoming trip found.'); row.fire_on = Y(d) }
      if (ALERTS.some(a => a.bus_id === b.id && hhmm(a.dep_time) === row.dep_time && a.minutes_before === mins)) return alert('You already set this alert.');
      btn.disabled = true;
      let pr = 'ok'; if (IN_APP()) { try { AndroidBridge.requestNotifPermission() } catch (e) {} } else pr = await ensurePush(true);   // permission first (needs the tap)
      const sb = await getSB(); const { error } = await sb.from('bus_alerts').insert(row);
      btn.disabled = false;
      if (error) return alert(/does not exist|schema cache/i.test(error.message) ? 'Alerts are not set up yet (admin: run schema_v16_alerts.sql).' : error.message);
      await loadAlerts();
      dlg.innerHTML = `<h3>✅ Alert set!</h3><p><b>${E(b.name)}</b><br>${f12(row.dep_time)} · ${mins ? mins + ' min before' : 'at departure'} · ${rep ? E(row.days) : 'once'}</p><p class="muted">${E(statusMsg(pr))}</p><div class="row"><button id="al_my">🔔 My alerts</button><button class="ghost" id="r_x">Close</button></div>`;
      document.getElementById('r_x').onclick = () => dlg.close(); document.getElementById('al_my').onclick = window.openMyAlerts;
    };
  };

  /* ---------- "My alerts" dialog ---------- */
  window.openMyAlerts = async function () {
    await who(); if (!user) return; await loadAlerts();
    const draw = () => {
      document.getElementById('al_ls').innerHTML = ALERTS.map(a => `<div class="card" data-id="${a.id}" style="margin:8px 0"><div class="body" style="padding:10px 12px"><b>🚌 ${E(a.bus_name)}</b>${a.enabled ? '' : ' <span class="tag">paused</span>'}<br>
<span class="muted">${f12(a.dep_time)} · ${a.minutes_before ? a.minutes_before + ' min before' : 'at departure'} · ${a.fire_on ? 'once ' + E(a.fire_on) : E(a.days)}</span>
<div class="row" style="margin-top:6px;flex-wrap:nowrap"><select class="al_tn" style="flex:1">${toneOpts(a.tone)}</select><button type="button" class="ghost al_on">${a.enabled ? '⏸' : '▶'}</button><button type="button" class="ghost al_del">🗑</button></div></div></div>`).join('') || `<p class="muted">${tableMissing ? 'Alerts are not set up yet (admin: run schema_v16_alerts.sql).' : 'No alerts yet. Tap “🔔 Notify me” on a bus.'}</p>`;
    };
    const st = async () => {
      let s = ''; if (IN_APP()) { try { s = AndroidBridge.hasNotifPermission() ? '✅ App notifications are ON.' : '🚫 Notifications are off. Tap “Enable”.'; if (!AndroidBridge.canExact()) s += ' Alerts may come a few minutes late. Tap “Exact timing” to fix.' } catch (e) {} }
      else if (!('Notification' in window)) s = statusMsg('unsupported'); else s = Notification.permission === 'granted' ? '✅ Notifications are ON for this browser.' : Notification.permission === 'denied' ? statusMsg('denied') : 'Notifications are not enabled yet. Tap “Enable”.';
      document.getElementById('al_st').textContent = s;
    };
    dlg.innerHTML = `<h3>🔔 My alerts · என் நினைவூட்டல்</h3><p class="muted" id="al_st"></p><div id="al_ls"></div>
<div class="row" style="margin-top:10px"><button id="al_en">Enable</button><button class="ghost" id="al_tt">▶ Test</button>${IN_APP() ? '<button class="ghost" id="al_ex">Exact timing</button>' : ''}<button class="ghost" id="r_x">Close</button></div>`;
    draw(); st(); dlg.showModal();
    document.getElementById('r_x').onclick = () => dlg.close();
    document.getElementById('al_en').onclick = async () => { if (IN_APP()) { try { AndroidBridge.requestNotifPermission() } catch (e) {} } else { const r = await ensurePush(true); alert(statusMsg(r)) } st() };
    document.getElementById('al_tt').onclick = () => testNotif((ALERTS[0] && ALERTS[0].tone) || 'default');
    const ex = document.getElementById('al_ex'); if (ex) ex.onclick = () => { try { AndroidBridge.openExactSettings() } catch (e) {} };
    const ls = document.getElementById('al_ls');
    ls.onclick = async e => {
      const c = e.target.closest('.card'); if (!c) return; const a = ALERTS.find(x => x.id === c.dataset.id); if (!a) return; const sb = await getSB();
      if (e.target.closest('.al_on')) { const { error } = await sb.from('bus_alerts').update({ enabled: !a.enabled, last_sent: null }).eq('id', a.id); if (error) return alert(error.message) }
      else if (e.target.closest('.al_del')) { if (!confirm('Delete this alert?')) return; const { error } = await sb.from('bus_alerts').delete().eq('id', a.id); if (error) return alert(error.message) }
      else return;
      await loadAlerts(); draw();
    };
    ls.onchange = async e => {
      const s = e.target.closest('.al_tn'); if (!s) return; const c = s.closest('.card'), a = ALERTS.find(x => x.id === c.dataset.id); if (!a) return;
      if (s.value === 'phone') { try { AndroidBridge.pickTone() } catch (er) {} s.value = a.tone; return }
      const sb = await getSB(); const { error } = await sb.from('bus_alerts').update({ tone: s.value }).eq('id', a.id); if (error) return alert(error.message);
      a.tone = s.value; syncNative(); testNotifQuiet(s.value);
    };
  };

  /* ---------- hooks ---------- */
  let blockedUid = '';
  function showBlocked() {
    const g = document.getElementById('gate'); g.hidden = false; document.body.classList.add('gated');
    g.querySelector('.gbox').innerHTML = '<img src="logo.png" width="84" height="84" alt=""><h2>🚫 Account blocked</h2><p>Your account has been blocked by the admin.</p><p><small>உங்கள் கணக்கு நிர்வாகியால் தடை செய்யப்பட்டுள்ளது.</small></p><button type="button" id="gOut">Log out</button>';
    document.getElementById('gOut').onclick = async () => { const sb = await getSB(); await sb.auth.signOut(); location.reload() };
  }
  async function checkBlocked(u) {
    try { const sb = await getSB(); const { data, error } = await sb.rpc('is_blocked'); if (!error && data === true) { blockedUid = u.id; showBlocked() } } catch (e) {}
  }
  window.__onUser = async function (u) {
    if (blockedUid === u.id) { showBlocked(); return }
    if (!(u.user_metadata?.full_name || u.user_metadata?.name)) askName();
    if (u.id === lastU && Date.now() - lastT < 60000) return; lastU = u.id; lastT = Date.now();
    checkBlocked(u); regSW(); await loadAlerts();
    if (!IN_APP() && 'Notification' in window && Notification.permission === 'granted') ensurePush(false);
  };
  if ('serviceWorker' in navigator && !IN_APP()) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.type === 'play-tone') playTone(e.data.tone) });
  document.addEventListener('click', e => {
    const a = e.target.closest('.alr'); if (a) { window.openAlert(a.dataset.id); return }
    if (e.target.closest('#alBtn')) window.openMyAlerts();
  });
})();
