/**
 * Festival Stamp Tour - In-App Browser Escape Engine
 * 카카오톡, 라인, 인스타그램, 네이버, 페이스북/페메, X(트위터), 틱톡 등 국내 주요 SNS 인앱브라우저 자동 탈출 및 가이드 모듈
 */

(function () {
  const ua = navigator.userAgent || navigator.vendor || window.opera || "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);

  // 국내 주요 SNS 및 인앱 브라우저 정밀 감지
  const isKakao = /kakaotalk/i.test(ua);
  const isLine = /line\//i.test(ua);
  const isInstagram = /instagram/i.test(ua);
  const isNaver = /naver(inapp|searchapp)?/i.test(ua);
  const isFacebook = /fb_iab|fb4a|fbav|messenger/i.test(ua); // 페북 & 페메
  const isTwitter = /twitter|tweetbot/i.test(ua);
  const isTiktok = /musical_ly|bytedance/i.test(ua);
  const isGenericInApp = /webview|wv|inapp/i.test(ua);

  const isInAppBrowser = isKakao || isLine || isInstagram || isNaver || isFacebook || isTwitter || isTiktok || isGenericInApp;

  if (!isInAppBrowser) {
    return; // 일반 정규 브라우저(Safari, Chrome 등)는 정상 진행
  }

  const currentUrl = window.location.href;

  // 1. Android 환경: 모든 인앱 브라우저에서 Chrome Intent로 100% 자동 탈출
  if (isAndroid) {
    const rawUrl = currentUrl.replace(/^https?:\/\//i, "");
    const chromeIntent = `intent://${rawUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    window.location.href = chromeIntent;
    return;
  }

  // 2. iOS 환경: 카카오톡 자동 탈출 (전용 스킴)
  if (isIOS && isKakao) {
    window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    return;
  }

  // 3. iOS 환경: 라인 자동 탈출 (전용 파라미터)
  if (isIOS && isLine) {
    if (!currentUrl.includes("openExternalBrowser=1")) {
      const sep = currentUrl.includes("?") ? "&" : "?";
      window.location.href = `${currentUrl}${sep}openExternalBrowser=1`;
      return;
    }
  }

  // 4. iOS 환경: 인스타그램, 네이버, 페이스북/페메, X 등 (애플 보안상 강제 실행 불가 -> 맞춤형 가이드 모달)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderInAppModal);
  } else {
    renderInAppModal();
  }

  function renderInAppModal() {
    if (document.getElementById("inapp-blocking-overlay")) return;

    let appName = "인앱 브라우저";
    let menuGuide = "우측 상단 <strong>[ ⋯ ]</strong> 버튼을 누른 후 <strong>[Safari로 열기]</strong>를 선택해 주세요.";
    let arrowPosition = "top-right"; // top-right or bottom-right

    if (isInstagram) {
      appName = "Instagram";
      menuGuide = "우측 상단의 <strong>[ ⋯ ]</strong> 또는 <strong>[공유]</strong> 버튼을 누르고<br><strong>[Safari로 열기]</strong> 또는 <strong>[브라우저에서 열기]</strong>를 선택해 주세요.";
      arrowPosition = "top-right";
    } else if (isNaver) {
      appName = "NAVER 앱";
      menuGuide = "우측 하단의 <strong>[ ⋯ ]</strong> 버튼을 누르고<br><strong>[다른 브라우저로 보기]</strong>를 선택해 주세요.";
      arrowPosition = "bottom-right";
    } else if (isFacebook) {
      appName = "Facebook / 페메";
      menuGuide = "우측 상단(또는 하단)의 <strong>[ ⋯ ]</strong> 버튼을 누르고<br><strong>[브라우저에서 열기]</strong>를 선택해 주세요.";
      arrowPosition = "top-right";
    } else if (isTwitter) {
      appName = "X (트위터)";
      menuGuide = "우측 상단의 <strong>[공유/더보기]</strong> 버튼을 누르고<br><strong>[Safari로 열기]</strong>를 선택해 주세요.";
      arrowPosition = "top-right";
    }

    const overlay = document.createElement("div");
    overlay.id = "inapp-blocking-overlay";
    overlay.className = "ft-inapp";
    overlay.innerHTML = `
      <section class="ft-modal" role="dialog" aria-modal="true" aria-label="외부 브라우저 안내">
        <h2>기본 브라우저에서 열어 주세요</h2>
        <p>${appName} 안에서는 카메라 사용이 제한될 수 있어요.</p>
        <p>${menuGuide}</p>
        <button id="btn-inapp-copy-url" type="button" class="ft-primary"><span id="btn-inapp-copy-text">웹사이트 주소 복사하기</span></button>
        <p class="ft-small-note">복사한 주소를 Safari 또는 Chrome 주소창에 붙여넣어 주세요.</p>
      </section>`;
    const root = document.getElementById("club-festival-suite") || document.body;
    root.appendChild(overlay);
    const panel = document.getElementById("ft-page");
    if (panel) panel.inert = true;
    document.body.classList.add("ft-scroll-lock");
    const copyButton = overlay.querySelector("button");
    copyButton.focus();
    overlay.addEventListener("keydown", event => { if (event.key === "Tab") { event.preventDefault(); copyButton.focus(); } });
    const btnCopy = document.getElementById("btn-inapp-copy-url");
    if (btnCopy) {
      btnCopy.addEventListener("click", async () => {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(currentUrl);
          } else {
            const tempInput = document.createElement("input");
            tempInput.value = currentUrl;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand("copy");
            document.body.removeChild(tempInput);
          }
          const textSpan = document.getElementById("btn-inapp-copy-text");
          if (textSpan) textSpan.innerText = "✓ 주소가 복사되었습니다!";

          setTimeout(() => {
            if (textSpan) textSpan.innerText = "웹사이트 주소 (URL) 복사하기";

          }, 3000);
        } catch (err) {
          alert("주소 복사 실패: 주소창의 링크를 직접 복사해 주세요.");
        }
      });
    }
  }
})();
