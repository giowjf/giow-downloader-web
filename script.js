// ⚠️ Altere esta URL para a URL do seu serviço no Render
const API = "https://giow-downloader-api-windowless.onrender.com";

let currentUrl = null;
let currentClient = null;
let currentTitle = null;
let downloading = false;

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("analyzeBtn");
  const input = document.getElementById("url");

  btn.addEventListener("click", analyze);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyze();
  });

  function updateBtn() {
    if (input.value.trim().length > 0) {
      btn.classList.add("enabled");
    } else {
      btn.classList.remove("enabled");
    }
  }
  input.addEventListener("input", updateBtn);
  updateBtn();

  input.addEventListener("focus", async () => {
    if (input.value.trim()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith("http")) {
        input.value = text;
        updateBtn();
      }
    } catch (_) {}
  });
});

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatFilesize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function badgeClass(ext) {
  if (ext === "mp4") return "badge-mp4";
  if (ext === "webm") return "badge-webm";
  if (ext === "mp3") return "badge-mp3";
  return "badge-other";
}

function setLoading(isLoading) {
  const btn = document.getElementById("analyzeBtn");
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "[ ... ]" : "[ SCAN ]";
}

// ── Lock global de download ──────────────────────────────────────────────────
// Bloqueia TODOS os botões de formato exceto o que está sendo usado,
// e aplica classe visual de "locked" nos demais.

function lockAllButtons(exceptBtn) {
  document.querySelectorAll(".format-btn").forEach((b) => {
    if (b !== exceptBtn) {
      b.disabled = true;
      b.classList.add("dl-locked");
    }
  });
}

function unlockAllButtons() {
  document.querySelectorAll(".format-btn").forEach((b) => {
    b.disabled = false;
    b.classList.remove("dl-locked");
  });
}

// ── Status dentro do botão ───────────────────────────────────────────────────

function renderBtnPhase(btn, phase, pct = null) {
  // Fases com texto e ícone pixel
  const phases = {
    connecting:   { icon: "◈", label: "CONECTANDO...",          pulse: true,  bar: false },
    processing:   { icon: "◧", label: "PROCESSANDO...",         pulse: true,  bar: false },
    transferring: { icon: "▶", label: "TRANSFERINDO",           pulse: false, bar: true  },
    done:         { icon: "■", label: "CONCLUIDO!",             pulse: false, bar: true  },
    error:        { icon: "✖", label: "ERRO",                   pulse: false, bar: false },
  };

  const p = phases[phase] || phases.connecting;
  const pctVal = pct !== null ? Math.round(pct) : 0;

  btn.innerHTML = `
    <span class="progress-wrap">
      <span class="progress-icon ${p.pulse ? "phase-pulse" : ""}">${p.icon}</span>
      <span class="progress-col">
        <span class="progress-label">${p.label}</span>
        ${p.bar ? `
        <span class="progress-bar-outer">
          <span class="progress-bar-fill" style="width:${pctVal}%"></span>
        </span>` : `
        <span class="progress-dots"><span></span><span></span><span></span></span>`}
      </span>
      ${p.bar ? `<span class="progress-pct">${pctVal}%</span>` : ""}
    </span>`;
}

// ── Download ─────────────────────────────────────────────────────────────────

async function startDownload(btn, formatId, mode) {
  if (downloading) return;
  downloading = true;

  const original = btn.innerHTML;
  lockAllButtons(btn);

  // Fase 1 — conectando ao servidor
  renderBtnPhase(btn, "connecting");

  try {
    // Pequeno delay visual para o "CONECTANDO" aparecer antes do fetch
    await new Promise(r => setTimeout(r, 120));

    const fetchPromise = fetch(`${API}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentUrl,
        format_id: formatId,
        mode,
        preferred_client: currentClient,
      }),
    });

    // Fase 2 — aguardando processamento no servidor
    // O servidor demora porque precisa baixar o vídeo antes de responder
    renderBtnPhase(btn, "processing");

    const res = await fetchPromise;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      renderBtnPhase(btn, "error");
      await new Promise(r => setTimeout(r, 800));
      alert("ERRO: " + (err.details || err.error || res.status));
      return;
    }

    // Fase 3 — transferindo bytes para o browser
    renderBtnPhase(btn, "transferring", 0);

    const contentLength = res.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;

    // Animação de progresso indeterminado quando não há Content-Length
    let indeterminateTimer = null;
    if (!total) {
      let fakePct = 5;
      indeterminateTimer = setInterval(() => {
        // Cresce rápido até 60%, depois desacelera — nunca chega em 100%
        fakePct = fakePct < 60
          ? fakePct + 3
          : fakePct + (90 - fakePct) * 0.04;
        renderBtnPhase(btn, "transferring", Math.min(fakePct, 90));
      }, 200);
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      if (total > 0) {
        renderBtnPhase(btn, "transferring", (loaded / total) * 100);
      }
    }

    if (indeterminateTimer) clearInterval(indeterminateTimer);

    // Fase 4 — concluído
    renderBtnPhase(btn, "done", 100);
    await new Promise(r => setTimeout(r, 500));

    // Dispara o download do arquivo
    const blob = new Blob(chunks);
    const ext = mode === "mp3" ? "mp3" : "mp4";
    // Usa o título do vídeo como nome do arquivo — remove caracteres inválidos
    const safeTitle = currentTitle
      ? currentTitle.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 100)
      : "video";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${safeTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);

  } catch (err) {
    renderBtnPhase(btn, "error");
    await new Promise(r => setTimeout(r, 800));
    alert("FALHA NA CONEXAO DURANTE O DOWNLOAD.");
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
    unlockAllButtons();
    downloading = false;
  }
}

// ── Analyze ──────────────────────────────────────────────────────────────────

async function analyze() {
  const input = document.getElementById("url");
  const url = input.value.trim();
  const resultDiv = document.getElementById("result");

  if (!url) {
    resultDiv.innerHTML = `<div class="error-box">URL NAO ENCONTRADA. INSIRA UM LINK VALIDO.</div>`;
    return;
  }

  currentUrl = url;
  setLoading(true);
  resultDiv.innerHTML = `
    <div class="loading">
      <div class="pixel-loader">
        <span></span><span></span><span></span><span></span><span></span>
      </div>
      <p>ANALISANDO...</p>
    </div>`;

  try {
    const res = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.details || data.error || "ERRO DESCONHECIDO";
      resultDiv.innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`;
      return;
    }

    renderResult(data);
    currentClient = data.client_used || null;
    currentTitle = data.title || null;
  } catch (err) {
    resultDiv.innerHTML = `<div class="error-box">FALHA DE CONEXAO. VERIFIQUE SE A API ESTA ONLINE.</div>`;
  } finally {
    setLoading(false);
  }
}

// ── Render result ─────────────────────────────────────────────────────────────

function renderResult(data) {
  const resultDiv = document.getElementById("result");
  const duration = formatDuration(data.duration);
  const uploader = data.uploader ? `[ ${escapeHtml(data.uploader)} ]` : "";
  const details = [duration, uploader].filter(Boolean).join("  ");

  const formatsHtml = data.formats
    .map((f) => {
      const size = formatFilesize(f.filesize);
      const fps = f.fps ? ` ${f.fps}FPS` : "";
      const label = `${f.resolution || "AUTO"}${fps}`;
      const sizeHtml = size ? `<span class="format-size">${size}</span>` : "";

      return `
      <button class="format-btn"
        data-format-id="${escapeHtml(f.format_id)}"
        data-mode="${f.ext === "mp3" ? "mp3" : "mp4"}">
        <span class="format-label">
          <span class="format-badge ${badgeClass(f.ext)}">${f.ext.toUpperCase()}</span>
          <span class="format-resolution">${escapeHtml(label)}</span>
          ${sizeHtml}
        </span>
        <span class="dl-icon">▼</span>
      </button>`;
    })
    .join("");

  resultDiv.innerHTML = `
    <div class="video-card">
      <div class="video-info">
        ${data.thumbnail ? `<img class="video-thumb" src="${escapeHtml(data.thumbnail)}" alt="thumb" loading="lazy" />` : ""}
        <div class="video-meta">
          <div class="video-title">${escapeHtml(data.title || "SEM TITULO")}</div>
          <div class="video-details">${details}</div>
        </div>
      </div>
      <div class="formats-header">&gt;&gt; SELECT FORMAT TO DOWNLOAD</div>
      <div class="formats-list">${formatsHtml}</div>
    </div>`;

  resultDiv.querySelectorAll(".format-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      startDownload(btn, btn.dataset.formatId, btn.dataset.mode);
    });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
