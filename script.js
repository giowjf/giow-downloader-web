const API = "https://giow-downloader-api-windowless.onrender.com";

async function analyze(){

    const url = document.getElementById("url").value;

    const res = await fetch(API + "/analyze",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({url:url})
    });

    const data = await res.json();

    if(data.error){
        alert(data.error);
        return;
    }

    window.downloadLink = data.download;

    document.getElementById("status").innerText = "Pronto para download";
}

async function download(){

    const url = document.getElementById("url").value;

    const res = await fetch(API + "/download",{
        method:"POST",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify({url:url})
    });

    if(!res.ok){
        alert("Erro no download");
        return;
    }

    const blob = await res.blob();
    const link = document.createElement("a");

    link.href = window.URL.createObjectURL(blob);
    link.download = "video";

    document.body.appendChild(link);
    link.click();
    link.remove();
}

    window.open(API + "/" + data.file);
}
