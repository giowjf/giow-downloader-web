const API = "https://giow-downloader-api.onrender.com";

async function analyze() {

    const url = document.getElementById("url").value;

    const response = await fetch(API + "/analyze", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
    });

    const data = await response.json();

    const select = document.getElementById("resolution");

    select.innerHTML = "";

    data.resolutions.forEach(r => {
        const option = document.createElement("option");
        option.text = r;
        select.add(option);
    });

}

async function download() {

    const url = document.getElementById("url").value;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const resolution = document.getElementById("resolution").value;

    const response = await fetch(API + "/download", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: url,
            mode: mode,
            resolution: resolution
        })
    });

    const blob = await response.blob();

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "download";

    a.click();
}