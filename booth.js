/* Booth presentation with real OTP issue, QR payload and single-device access checks. */
(() => {
  "use strict";
  const ui = window.StampTourUI.create("booth");
  const {
    root,
    panel,
    state,
    config,
    booths,
    I,
    E,
    statusbar,
    remaining,
    totals,
    mount,
    render,
    toast,
  } = ui;

  function qrMarkup() { return `<div id="ft-booth-qr" class="ft-live-qr" aria-label="학생용 부스 인증 QR 코드"></div>`; }

  function codeArea() {
    if (!state.expires)
      return `<div class="ft-code-placeholder"><span>${I("qr-code")}</span><strong>첫 QR 코드를 발급해 주세요</strong><p>학생들이 이 화면을 스캔해 도장을 모아요.</p></div>`;
    if (!remaining())
      return `<div class="ft-code-placeholder"><span>${I("timer-off")}</span><strong>코드가 만료됐어요</strong><p>새 코드를 발급해 학생들에게 보여 주세요.</p></div>`;
    return state.manual
      ? `<div class="ft-code-caption">QR 스캔이 어려운 학생에게 알려 주세요</div><div class="ft-manual-code">${E(state.code || "")}</div><p class="ft-code-caption">방문한 부스와 코드를 함께 입력하면 돼요.</p>`
      : qrMarkup();
  }

  function booth() {
    const b = booths.find(booth => booth.id === state.booth),
      left = remaining(),
      t = totals();
    return `<article class="ft-operator">${statusbar()}<header class="ft-header"><div class="ft-brand"><span class="ft-brandmark">${I(b.icon)}</span><div><span class="ft-header-label">${E(config.eventName)} · 부스 담당자</span>${E(b.name)}</div></div><button type="button" class="ft-secondary cursor-interaction" data-action="logout">${I("log-out")}로그아웃</button></header><main class="ft-operator-main"><div class="ft-operator-title"><span class="ft-chip">${I("map-pin")}${E(b.location || "위치 안내 준비 중")}</span><h1>새로운 발견에<br><span class="ft-highlight">도장을 더해 주세요.</span></h1><p>학생들이 아래 코드를 스캔하면 방문이 기록돼요.</p></div><section class="ft-code-card"><span class="ft-code-label" aria-hidden="true">SCAN & COLLECT</span><div class="ft-code-tabs" aria-label="인증 코드 표시 방식"><button type="button" class="cursor-interaction" aria-pressed="${!state.manual}" data-action="code-mode" data-mode="qr">QR 코드</button><button type="button" class="cursor-interaction" aria-pressed="${state.manual}" data-action="code-mode" data-mode="manual">6자리 숫자 코드</button></div><div class="ft-code-area">${codeArea()}</div><div class="ft-timer-meta"><span data-timer-label>${state.expires ? (left ? "코드 유효 시간" : "코드 만료") : "아직 발급되지 않았어요"}</span><strong data-time-left>${state.expires ? left + "초" : "—"}</strong></div><div class="ft-timer-bar"><div data-time-bar style="width:${(left / 60) * 100}%"></div></div></section><button type="button" class="ft-primary cursor-interaction" data-action="issue">${I("refresh-cw")}${state.issues ? "코드 갱신하기" : "첫 코드 발급하기"}</button><div class="ft-operator-stats"><div class="ft-operator-stat">${I("users")}<div><span>도장 적립 학생</span><b>${state.visitors ?? "—"}명</b></div></div><div class="ft-operator-stat">${I("ticket-check")}<div><span>이 화면의 코드 발급</span><b>${state.issues}회</b></div></div></div><p class="ft-small-note">한 코드는 60초 동안 여러 학생이 사용할 수 있어요.<br>만료되면 갱신 버튼을 눌러 주세요.</p></main></article>`;
  }


  const service = window.StampTourService;
  let active = false, issuing = false, ending = false, stops = [];
  function dispose() { active = false; stops.splice(0).forEach(stop => stop()); }
  async function terminate() {
    if (ending) return;
    ending = true; dispose();
    state.expires = 0; state.payload = ""; state.code = ""; render();
    ui.showModal("로그인이 종료됐어요", `<p>다른 기기에서 로그인했거나 현재 권한이 만료됐어요. 운영진 로그인 화면에서 다시 시작해 주세요.</p><button type="button" class="ft-primary" data-action="session-exit">다시 로그인</button>`, { dismissible: false });
    try { await service.logout(); } catch (_) {}
  }
  async function refreshVisitors() {
    try {
      const count = await service.visitors(state.booth);
      if (active) { state.visitors = count; state.error = ""; render(); }
    } catch (error) { if (active) { state.error = error.message; render(); } }
  }
  function drawQr() {
    const target = panel.querySelector("#ft-booth-qr");
    if (!target || !state.payload || !remaining()) return;
    if (typeof window.QRCode !== "function") {
      target.textContent = "QR을 표시하지 못했어요. 숫자 코드를 이용해 주세요."; return;
    }
    new QRCode(target, { text: state.payload, width: 180, height: 180, colorDark: "#342a42", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
  }
  async function init() {
    if (ending) return;
    dispose();
    try {
      if (!state.booth) { ui.navigate("portal.html"); return; }
      const current = await service.staffAccess("L2", state.booth);
      if (!current) { ui.navigate("portal.html"); return; }
      const clubs = await service.clubs();
      booths.splice(0, booths.length, ...clubs);
      if (!booths.some(booth => booth.id === state.booth)) throw new Error("담당 부스 정보를 찾지 못했어요.");
      active = true; state.ready = true; state.error = ""; render();
      stops.push(service.watchStaff(current, terminate));
      stops.push(service.watchBooth(state.booth, refreshVisitors));
      await refreshVisitors();
    } catch (error) { if (error.code === "ACCESS_DENIED") await terminate(); else { state.error = error.message; render(); } }
  }
  mount({
    view: booth, onRender: drawQr,
    onRefresh: refreshVisitors,
    async onLogout() {
      if (ending) return;
      ending = true;
      try { await service.logout(); dispose(); ui.navigate("portal.html"); }
      catch (error) { ending = false; throw error; }
    },
    async onAction(action, button) {
      if (action === "retry") { await init(); return; }
      if (!active || ending) return;
      if (action === "issue") {
        if (issuing) return;
        issuing = true; button.disabled = true;
        try {
          const issued = await service.issueCode(state.booth);
          if (!active) return;
          state.code = issued.code; state.payload = issued.payload; state.expires = issued.expires;
          state.issues++; state.expiredRendered = false; state.error = ""; render();
          toast("새 코드를 발급했어요. 남은 시간 안에 스캔해 주세요.");
        } finally { issuing = false; button.disabled = false; }
      } else if (action === "code-mode") {
        state.manual = button.dataset.mode === "manual"; render();
      }
    },
  });
  // Expiry hides the code; renewal requires an explicit user action.
  const timer = setInterval(() => {
    if (!root.isConnected) {
      clearInterval(timer);
      return;
    }
    if (!active || !state.expires) return;
    const left = remaining();
    const value = panel.querySelector("[data-time-left]");
    const label = panel.querySelector("[data-timer-label]");
    const bar = panel.querySelector("[data-time-bar]");
    if (value) {
      value.textContent = `${left}초`;
      value.classList.toggle("ft-timer-warn", left <= 10);
    }
    if (label)
      label.textContent =
        left <= 0 ? "코드 만료" : left <= 10 ? "곧 만료돼요 · 새 코드 준비" : "코드 유효 시간";
    if (bar) {
      bar.style.width = `${(left / 60) * 100}%`;
      bar.style.background = left <= 10 ? "#db9667" : "var(--ft-purple)";
    }
    if (!left && !state.expiredRendered) {
      state.expiredRendered = true;
      render();
    }
  }, 1000);
  window.addEventListener("pagehide", () => { clearInterval(timer); dispose(); }, { once: true });
  window.addEventListener("pageshow", event => { if (event.persisted) location.reload(); });
  init();
})();
