/** Tavily Proxy 中文管理台，单文件内嵌，无额外前端构建步骤。 */

const CSS = `
  :root {
    color-scheme: dark;
    --bg: #071018; --panel: #0e1a24; --panel-2: #122331;
    --border: #213544; --text: #e8f2f7; --muted: #8fa6b5;
    --brand: #25c2ad; --brand-2: #0b8f83; --ok: #41d69a;
    --warn: #f6c75b; --bad: #ff7082; --shadow: 0 18px 50px rgba(0,0,0,.24);
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; color: var(--text); font-family: Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
    background: radial-gradient(circle at 15% -10%, rgba(37,194,173,.16), transparent 32rem), var(--bg); }
  button, input { font: inherit; }
  button { border: 0; cursor: pointer; transition: transform .16s ease, filter .16s ease, opacity .16s ease; }
  button:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  button:disabled { opacity: .48; cursor: not-allowed; }
  .shell { width: min(1240px, calc(100% - 32px)); margin: 0 auto; padding: 30px 0 64px; }
  .topbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px; }
  .brand { display: flex; align-items: center; gap: 13px; }
  .logo { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; color: #03201c;
    background: linear-gradient(135deg, #69ead7, var(--brand)); box-shadow: 0 10px 28px rgba(37,194,173,.28); font-weight: 900; }
  h1 { margin: 0; font-size: clamp(20px, 3vw, 27px); letter-spacing: -.02em; }
  .subtitle, .hint, .muted { color: var(--muted); }
  .subtitle { margin-top: 4px; font-size: 13px; }
  .card { margin-bottom: 16px; padding: 20px; border: 1px solid var(--border); border-radius: 18px;
    background: linear-gradient(145deg, rgba(18,35,49,.92), rgba(12,25,35,.96)); box-shadow: var(--shadow); }
  .card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
  .card h2 { margin: 0 0 5px; font-size: 16px; }
  .hint { font-size: 12px; line-height: 1.65; }
  .form-row, .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  input { min-width: 220px; flex: 1; height: 42px; padding: 0 13px; color: var(--text); outline: none;
    background: rgba(4,13,20,.72); border: 1px solid var(--border); border-radius: 11px; }
  input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(37,194,173,.12); }
  .btn { min-height: 40px; padding: 0 15px; border-radius: 10px; color: #03201c; background: var(--brand); font-weight: 700; }
  .btn.secondary { color: var(--text); background: #193443; border: 1px solid #2a4859; }
  .btn.danger { color: var(--bad); background: rgba(255,112,130,.08); border: 1px solid rgba(255,112,130,.32); }
  .btn.small { min-height: 32px; padding: 0 10px; font-size: 12px; font-weight: 600; }
  .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .stat { min-height: 100px; padding: 16px; border: 1px solid var(--border); border-radius: 15px; background: rgba(14,28,38,.78); }
  .stat-label { color: var(--muted); font-size: 12px; }
  .stat-value { margin-top: 10px; font-size: 24px; font-weight: 800; letter-spacing: -.03em; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; }
  table { width: 100%; min-width: 950px; border-collapse: collapse; font-size: 13px; }
  th { padding: 12px; color: var(--muted); background: rgba(5,14,21,.55); text-align: left; font-weight: 600; }
  td { padding: 13px 12px; border-top: 1px solid var(--border); vertical-align: middle; }
  code { color: #bceee7; font-family: "Cascadia Code", Consolas, monospace; }
  .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 99px; font-size: 12px; white-space: nowrap; }
  .badge:before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .active { color: var(--ok); background: rgba(65,214,154,.11); }
  .cooling { color: var(--warn); background: rgba(246,199,91,.11); }
  .exhausted { color: var(--bad); background: rgba(255,112,130,.11); }
  .balance { min-width: 130px; }
  .balance-line { display: flex; justify-content: space-between; gap: 8px; font-variant-numeric: tabular-nums; }
  .bar { width: 100%; height: 6px; margin-top: 7px; overflow: hidden; border-radius: 9px; background: #20323e; }
  .bar > i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--brand-2), #62e3cd); }
  .note { max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .msg { min-height: 20px; margin-top: 10px; font-size: 13px; }
  .msg.ok { color: var(--ok); } .msg.err { color: var(--bad); }
  .empty { padding: 34px 16px; color: var(--muted); text-align: center; }
  .notice { margin: 0 0 14px; padding: 10px 12px; color: #bdd1dc; border-left: 3px solid var(--brand); background: rgba(37,194,173,.07); font-size: 12px; line-height: 1.65; }
  [hidden] { display: none !important; }
  @media (max-width: 800px) {
    .shell { width: min(100% - 20px, 1240px); padding-top: 18px; }
    .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .card { padding: 15px; border-radius: 15px; }
    .card-head { align-items: stretch; flex-direction: column; }
    .card-head .actions { justify-content: flex-start; }
  }
  @media (max-width: 520px) {
    .topbar { align-items: flex-start; }
    .logo { width: 38px; height: 38px; }
    .stats { gap: 8px; }
    .stat { min-height: 84px; padding: 13px; }
    .stat-value { font-size: 20px; }
    .form-row { align-items: stretch; flex-direction: column; }
    input, .form-row .btn { width: 100%; min-width: 0; }
  }
`;

export const ADMIN_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#071018" />
  <title>Tavily Proxy 管理台</title>
  <style>${CSS}</style>
</head>
<body>
<main class="shell">
  <header class="topbar">
    <div class="brand"><div class="logo">T</div><div><h1>Tavily Proxy</h1><div class="subtitle">API Key 池与额度管理</div></div></div>
    <button id="logoutBtn" class="btn secondary" hidden>退出管理</button>
  </header>

  <section id="loginCard" class="card">
    <h2>进入管理台</h2>
    <p class="hint">请输入 Worker 中配置的 AUTH_KEY，凭据只保存在当前浏览器。</p>
    <form id="loginForm" class="form-row">
      <input id="authInput" type="password" placeholder="管理密钥（AUTH_KEY）" autocomplete="current-password" />
      <button class="btn" type="submit">验证并进入</button>
    </form>
    <div id="loginMsg" class="msg" aria-live="polite"></div>
  </section>

  <div id="dashboard" hidden>
    <section class="stats" aria-label="Key 池概览">
      <div class="stat"><div class="stat-label">Key 总数</div><div id="totalStat" class="stat-value">0</div></div>
      <div class="stat"><div class="stat-label">当前可用</div><div id="activeStat" class="stat-value">0</div></div>
      <div class="stat"><div class="stat-label">已同步剩余额度</div><div id="creditStat" class="stat-value">—</div></div>
      <div class="stat"><div class="stat-label">最近同步</div><div id="syncStat" class="stat-value">—</div></div>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>添加 Tavily Key</h2><div class="hint">添加时会校验 Key，并读取一次当前额度。</div></div></div>
      <form id="addForm" class="form-row">
        <input id="keyInput" type="password" placeholder="tvly-..." autocomplete="off" spellcheck="false" />
        <input id="noteInput" type="text" maxlength="200" placeholder="备注，例如：主账号（可选）" autocomplete="off" />
        <button class="btn" type="submit">添加 Key</button>
      </form>
      <div id="addMsg" class="msg" aria-live="polite"></div>
    </section>

    <section class="card">
      <div class="card-head">
        <div><h2>Key 与额度</h2><div class="hint">余额为最近一次从 Tavily 同步的缓存值，不会在普通搜索请求中估算扣减。</div></div>
        <div class="actions"><button id="reloadBtn" class="btn secondary">重新载入</button><button id="syncAllBtn" class="btn">刷新全部余额</button></div>
      </div>
      <p class="notice">单个 Key 同步失败不会影响其他 Key；额度刷新只用于管理展示，实际可用状态仍以上游响应为准。</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Key</th><th>状态</th><th>剩余额度</th><th>备注</th><th>最后使用</th><th>额度同步</th><th>操作</th></tr></thead>
          <tbody id="rows"></tbody>
        </table>
        <div id="empty" class="empty" hidden>还没有 Key，请先添加。</div>
      </div>
      <div id="listMsg" class="msg" aria-live="polite"></div>
    </section>
  </div>
</main>

<script>
(function () {
  "use strict";
  var STORAGE_KEY = "tavilyProxyAuthKey";
  var keys = [];
  var syncing = false;
  var el = function (id) { return document.getElementById(id); };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function number(value) { return Number(value || 0).toLocaleString("zh-CN"); }
  function formatTime(seconds) {
    if (!seconds) return "未同步";
    return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(seconds * 1000));
  }
  function timeAgo(seconds) {
    if (!seconds) return "从未";
    var diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + " 分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + " 小时前";
    return Math.floor(diff / 86400) + " 天前";
  }
  function setMsg(id, message, error) {
    el(id).textContent = message || "";
    el(id).className = "msg " + (error ? "err" : "ok");
  }
  function showLogin(message) {
    el("loginCard").hidden = false; el("dashboard").hidden = true; el("logoutBtn").hidden = true;
    if (message) setMsg("loginMsg", message, true);
  }
  function showDashboard() {
    el("loginCard").hidden = true; el("dashboard").hidden = false; el("logoutBtn").hidden = false;
  }
  async function api(path, options) {
    options = options || {};
    var headers = Object.assign({}, options.headers || {}, { "x-api-key": localStorage.getItem(STORAGE_KEY) || "" });
    if (options.body) headers["Content-Type"] = "application/json";
    var response = await fetch(path, Object.assign({}, options, { headers: headers }));
    var data = await response.json().catch(function () { return {}; });
    if (response.status === 401) { showLogin("管理密钥不正确，请重新输入。"); throw new Error("未授权"); }
    if (!response.ok) throw new Error(data.error || ("请求失败（HTTP " + response.status + "）"));
    return data;
  }
  function statusOf(key) {
    if (key.cooldownUntil > Math.floor(Date.now() / 1000)) return { cls: "cooling", label: "冷却中" };
    if (key.status === "exhausted") return { cls: "exhausted", label: "已耗尽" };
    return { cls: "active", label: "可用" };
  }
  function balanceHtml(key) {
    if (!key.creditSyncedAt) return '<span class="muted">尚未同步</span>';
    var limit = Math.max(0, Number(key.creditLimit || 0));
    var remaining = Math.max(0, Number(key.creditRemaining || 0));
    var percent = limit > 0 ? Math.min(100, Math.round(remaining / limit * 100)) : 0;
    return '<div class="balance"><div class="balance-line"><strong>' + number(remaining) + '</strong><span class="muted">/ ' + number(limit) + '</span></div><div class="bar"><i style="width:' + percent + '%"></i></div></div>';
  }
  function render(nextKeys) {
    keys = Array.isArray(nextKeys) ? nextKeys : [];
    var now = Math.floor(Date.now() / 1000);
    var active = keys.filter(function (key) { return key.status === "active" && key.cooldownUntil <= now; }).length;
    var synced = keys.filter(function (key) { return key.creditSyncedAt > 0; });
    var credits = synced.reduce(function (sum, key) { return sum + Math.max(0, Number(key.creditRemaining || 0)); }, 0);
    var latest = synced.reduce(function (max, key) { return Math.max(max, key.creditSyncedAt || 0); }, 0);
    el("totalStat").textContent = number(keys.length); el("activeStat").textContent = number(active);
    el("creditStat").textContent = synced.length ? number(credits) : "—"; el("syncStat").textContent = latest ? timeAgo(latest) : "—";

    var body = el("rows"); body.innerHTML = ""; el("empty").hidden = keys.length > 0;
    keys.forEach(function (key) {
      var status = statusOf(key); var row = document.createElement("tr");
      row.innerHTML = '<td><code>' + escapeHtml(key.mask) + '</code></td>' +
        '<td><span class="badge ' + status.cls + '">' + status.label + '</span></td>' +
        '<td>' + balanceHtml(key) + '</td>' +
        '<td class="note" title="' + escapeHtml(key.note) + '">' + (key.note ? escapeHtml(key.note) : '<span class="muted">—</span>') + '</td>' +
        '<td class="muted">' + timeAgo(key.lastUsedAt) + '</td>' +
        '<td class="muted" title="' + formatTime(key.creditSyncedAt) + '">' + timeAgo(key.creditSyncedAt) + '</td>';
      var actions = document.createElement("td"); actions.className = "actions";
      var refresh = document.createElement("button"); refresh.className = "btn secondary small"; refresh.textContent = "刷新余额";
      refresh.disabled = syncing; refresh.onclick = function () { syncUsage(key.apiKey); };
      var remove = document.createElement("button"); remove.className = "btn danger small"; remove.textContent = "删除";
      remove.disabled = syncing; remove.onclick = function () { deleteKey(key.apiKey, key.mask); };
      actions.appendChild(refresh); actions.appendChild(remove); row.appendChild(actions); body.appendChild(row);
    });
  }
  async function loadKeys() {
    setMsg("listMsg", "正在载入…", false);
    try { var data = await api("/api/keys"); showDashboard(); render(data.keys); setMsg("listMsg", "", false); }
    catch (error) { if (error.message !== "未授权") setMsg("listMsg", error.message, true); }
  }
  async function syncUsage(apiKey) {
    if (syncing) return; syncing = true; render(keys); el("syncAllBtn").disabled = true;
    setMsg("listMsg", apiKey ? "正在刷新该 Key 的额度…" : "正在刷新全部 Key 的额度…", false);
    try {
      var data = await api("/api/keys/sync", { method: "POST", body: JSON.stringify(apiKey ? { apiKey: apiKey } : {}) });
      render(data.keys); var summary = data.sync || {};
      var message = "刷新完成：成功 " + number(summary.succeeded || 0) + " 个";
      if (summary.failed) message += "，失败 " + number(summary.failed) + " 个";
      setMsg("listMsg", message, Boolean(summary.failed));
    } catch (error) { setMsg("listMsg", error.message, true); }
    finally { syncing = false; el("syncAllBtn").disabled = false; render(keys); }
  }
  async function deleteKey(apiKey, mask) {
    if (!confirm("确定删除 " + mask + " 吗？")) return;
    try { await api("/api/keys", { method: "DELETE", body: JSON.stringify({ apiKey: apiKey }) }); await loadKeys(); }
    catch (error) { setMsg("listMsg", error.message, true); }
  }

  el("loginForm").addEventListener("submit", function (event) {
    event.preventDefault(); var value = el("authInput").value.trim();
    if (!value) { setMsg("loginMsg", "请输入管理密钥。", true); return; }
    localStorage.setItem(STORAGE_KEY, value); setMsg("loginMsg", "", false); loadKeys();
  });
  el("addForm").addEventListener("submit", async function (event) {
    event.preventDefault(); var value = el("keyInput").value.trim(); var note = el("noteInput").value.trim();
    if (!value) { setMsg("addMsg", "请输入 Tavily API Key。", true); return; }
    setMsg("addMsg", "正在校验并添加…", false);
    try { await api("/api/keys", { method: "POST", body: JSON.stringify({ apiKey: value, note: note }) });
      el("keyInput").value = ""; el("noteInput").value = ""; setMsg("addMsg", "添加成功。", false); await loadKeys();
    } catch (error) { setMsg("addMsg", error.message, true); }
  });
  el("reloadBtn").addEventListener("click", loadKeys);
  el("syncAllBtn").addEventListener("click", function () { syncUsage(""); });
  el("logoutBtn").addEventListener("click", function () { localStorage.removeItem(STORAGE_KEY); el("authInput").value = ""; showLogin(""); });
  if (localStorage.getItem(STORAGE_KEY)) loadKeys(); else showLogin("");
})();
</script>
</body>
</html>`;
