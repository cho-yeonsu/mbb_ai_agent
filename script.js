<script>
  const $launcher = document.getElementById("mbb-launcher");
  const $modal = document.getElementById("mbb-modal");
  const $close = document.getElementById("mbb-close");
  const $form = document.getElementById("mbb-form");
  const $input = document.getElementById("mbb-input");
  const $log = document.getElementById("mbb-log");
  const $send = document.getElementById("mbb-send");

  let thinkTimer = null;   // “생각중…” 애니메이션 타이머

  $launcher.onclick = () => { $modal.style.display = "block"; $input.focus(); };
  $close.onclick = () => { $modal.style.display = "none"; };

  $form.onsubmit = async (e) => {
    e.preventDefault();
    const text = $input.value.trim();
    if (!text) return;

    appendUser(text);
    $input.value = "";
    setSending(true);

    // “생각중…” + 추론 상자 표시(모의)
    const $thinkRow = appendThinkingRow();

    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = data?.error || `HTTP ${r.status}`;
        appendAgent("⚠️ 오류: " + msg);
      } else {
        // ③ [1] → <sup>[1]</sup> 치환 (링크 [text](url) 보존)
        const html = toSuperscriptCitations(data?.answer || "(응답 없음)");
        appendAgentHTML(html);
      }
    } catch (err) {
      appendAgent("⚠️ 네트워크 오류: " + (err?.message || err));
    } finally {
      clearThinking($thinkRow);
      setSending(false);
    }
  };

  function setSending(sending) {
    $send.disabled = sending;
    $send.textContent = sending ? "전송중..." : "보내기";
  }

  function appendUser(t) {
    $log.insertAdjacentHTML("beforeend",
      `<div><b>나</b>:</div>
       <div class="bubble">${escapeHtml(t)}</div>`);
    $log.scrollTop = $log.scrollHeight;
  }

  function appendAgent(t) {
    $log.insertAdjacentHTML("beforeend",
      `<div style="margin-top:10px"><b>Agent</b>:</div>
       <div class="bubble">${escapeHtml(t)}</div>`);
    $log.scrollTop = $log.scrollHeight;
  }

  function appendAgentHTML(html) {
    $log.insertAdjacentHTML("beforeend",
      `<div style="margin-top:10px"><b>Agent</b>:</div>
       <div class="bubble">${html}</div>`);
    $log.scrollTop = $log.scrollHeight;
  }

  // === ① “생각중…” UI + 간단 추론 텍스트(모의 갱신) ===
  function appendThinkingRow() {
    const id = "think-" + Date.now();
    $log.insertAdjacentHTML("beforeend", `
      <div id="${id}" style="margin-top:8px">
        <div class="thinking">생각중<span class="dots"></span></div>
        <div id="${id}-box" style="display:none">
          <div id="${id}-think" class="bubble" style="margin-top:6px">
            <div id="${id}-thinkbox" ></div>
          </div>
        </div>
      </div>
    `);
    $log.scrollTop = $log.scrollHeight;

    // 간단한 모의 “추론 로그”(실제 스트리밍 없으니 사용자 체감만)
    const $boxWrap = document.getElementById(`${id}-box`);
    const $box = document.getElementById(`${id}-thinkbox`);
    let step = 0;
    const hints = [
      "질문 의도 파악 중…",
      "관련 문서 검색 중…",
      "핵심 수치/인용 정리 중…",
      "각주 구성 중…"
    ];
    thinkTimer = setInterval(() => {
      $boxWrap.style.display = "block";
      $box.textContent = hints[Math.min(step, hints.length - 1)];
      step++;
    }, 900);

    return id;
  }

  function clearThinking(id) {
    if (thinkTimer) clearInterval(thinkTimer);
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  // === ③ [1]을 <sup>[1]</sup>로 치환 ===
  function toSuperscriptCitations(md) {
    // 1) 코드블록/인라인코드는 그대로 남김
    // 2) [text](url) 링크는 건드리지 않음
    // 3) 순수 [숫자]만 <sup>로 치환
    //   - (?!\() : 바로 뒤에 ( 가 오면 링크이므로 제외
    //   - (?<!\]) : 앞이 ] 이면 링크텍스트의 닫힘일 수 있으니 제외
    const safe = md
      .replace(/(?<!\])\[(\d+)\](?!\()/g, (_m, g1) => `<sup>[${g1}]</sup>`);
    return safe
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      // 위에서 escape하면 HTML이 보이므로, 위첨자만 다시 되살림
      .replace(/&lt;sup&gt;\[(\d+)\]&lt;\/sup&gt;/g, '<sup>[$1]</sup>')
      // 줄바꿈 보존
      .replace(/\n/g, '<br/>');
  }

  function escapeHtml(s){
    return s.replace(/[&<>]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
  }
</script>
