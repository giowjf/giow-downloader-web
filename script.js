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

  // Colar link automaticamente da área de transferência
  input.addEventListener("focus", async () => {
    if (input.value.trim()) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text.startsWith("http")) input.value = text;
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
  btn.textContent = isLoading ? "Analisando..." : "Analisar";
}

async function analyze() {
  const url = document.getElementById("url").value.trim();
  const resultDiv = document.getElementById("result");

  if (!url) {
    resultDiv.innerHTML = `<div class="error-box">Digite ou cole uma URL válida.</div>`;
    return;
  }

  currentUrl = url;
  setLoading(true);
  resultDiv.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Analisando o link...</p>
    </div>`;

  try {
    const res = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const msg = data.details || data.error || "Erro desconhecido";
      resultDiv.innerHTML = `<div class="error-box"><strong>Erro:</strong> ${escapeHtml(msg)}</div>`;
      return;
    }

    renderResult(data);
  } catch (err) {
    resultDiv.innerHTML = `<div class="error-box"><strong>Falha de conexão.</strong> Verifique se a API está online.</div>`;
  } finally {
    setLoading(false);
  }
}

function renderResult(data) {
  const resultDiv = document.getElementById("result");
  const duration = formatDuration(data.duration);
  const uploader = data.uploader ? `· ${escapeHtml(data.uploader)}` : "";
  const details = [duration, uploader].filter(Boolean).join(" ");

  const formatsHtml = data.formats
    .map((f) => {
      const size = formatFilesize(f.filesize);
      const fps = f.fps ? `${f.fps}fps` : "";
      const label = [f.resolution, fps].filter(Boolean).join(" · ");
      const sizeHtml = size ? `<span class="format-size">${size}</span>` : "";

      return `
      <button class="format-btn" data-format-id="${escapeHtml(f.format_id)}" data-mode="${f.ext === "mp3" ? "mp3" : "mp4"}">
        <span class="format-label">
          <span class="format-badge ${badgeClass(f.ext)}">${f.ext.toUpperCase()}</span>
          <span class="format-resolution">${escapeHtml(label || "auto")}</span>
          ${sizeHtml}
        </span>
        <span class="dl-icon">↓</span>
      </button>`;
    })
    .join("");

  resultDiv.innerHTML = `
    <div class="video-card">
      <div class="video-info">
        ${data.thumbnail ? `<img class="video-thumb" src="${escapeHtml(data.thumbnail)}" alt="thumbnail" loading="lazy" />` : ""}
        <div class="video-meta">
          <div class="video-title">${escapeHtml(data.title || "Sem título")}</div>
          <div class="video-details">${details}</div>
        </div>
      </div>
      <div class="formats-header">Escolha o formato</div>
      <div class="formats-list">${formatsHtml}</div>
    </div>`;

  // Eventos de download
  resultDiv.querySelectorAll(".format-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const formatId = btn.dataset.formatId;
      const mode = btn.dataset.mode;
      startDownload(btn, formatId, mode);
    });
  });
}

async function startDownload(btn, formatId, mode) {
  if (downloading) return;
  downloading = true;

  const original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `
    <span class="downloading-indicator">
      <span class="dot"></span> Baixando...
    </span>`;

  try {
    const res = await fetch(`${API}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl, format_id: formatId, mode }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Erro no download: " + (err.details || err.error || res.status));
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
    alert("Falha na conexão durante o download.");
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
