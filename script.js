const API = "https://giow-downloader-api-windowless.onrender.com";

async function analyze() {
  const url = document.getElementById("url").value.trim();
  const resultDiv = document.getElementById("result");

  resultDiv.innerHTML = "Carregando...";

  if (!url) {
    resultDiv.innerHTML = "Digite uma URL";
    return;
  }

  try {
    const res = await fetch(API + "/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: url })
    });

    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = "Erro: " + data.details;
      return;
    }

    let html = `<h3>${data.title}</h3>`;

    data.formats.forEach(f => {
      html += `
        <div class="format" onclick="download('${url}', '${f.format_id}')">
          ${f.ext} - ${f.resolution || "audio"}
        </div>
      `;
    });

    resultDiv.innerHTML = html;

  } catch (err) {
    resultDiv.innerHTML = "Erro na requisição";
  }
}

async function download(url, format_id) {
  try {
    const res = await fetch(API + "/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: url,
        format_id: format_id,
        mode: "mp4"
      })
    });

    if (!res.ok) {
      const err = await res.json();
      alert("Erro: " + err.details);
      return;
    }

    const blob = await res.blob();
    const link = document.createElement("a");

    link.href = window.URL.createObjectURL(blob);
    link.download = "video.mp4";
    link.click();

  } catch (err) {
    alert("Erro no download");
  }
}
