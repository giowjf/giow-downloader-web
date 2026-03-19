// ⚠️ Altere esta URL para a URL do seu serviço no Render
const API = "https://giow-downloader-api-windowless.onrender.com";

let currentUrl = null;
let downloading = false;

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("analyzeBtn");
  const input = document.getElementById("url");

  btn.addEventListener("click", analyze);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") analyze();
  });

  // Habilita/desabilita botão visualmente conforme input
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
  } catch (err) {
    resultDiv.innerHTML = `<div class="error-box">FALHA DE CONEXAO. VERIFIQUE SE A API ESTA ONLINE.</div>`;
  } finally {
    setLoading(false);
  }
}

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

      // Monta format_id robusto: se for vídeo sem áudio (DASH), pede merge com melhor áudio
      const isVideoOnly = f.ext !== "mp3" && f.acodec === "none";
      const safeFormatId = isVideoOnly
        ? `${f.format_id}+bestaudio[ext=m4a]/${f.format_id}+bestaudio/best[ext=mp4]/best`
        : f.format_id;

      return `
      <button class="format-btn"
        data-format-id="${escapeHtml(safeFormatId)}"
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

async function startDownload(btn, formatId, mode) {
  if (downloading) return;
  downloading = true;

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="downloading-indicator">▶ BAIXANDO...</span>`;

  try {
    const res = await fetch(`${API}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl, format_id: formatId, mode }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("ERRO: " + (err.details || err.error || res.status));
      return;
    }

    const blob = await res.blob();
    const ext = mode === "mp3" ? "mp3" : "mp4";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `video.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (err) {
    alert("FALHA NA CONEXAO DURANTE O DOWNLOAD.");
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
    downloading = false;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
