const API = "https://giow-downloader-api.onrender.com";

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

    if(!window.downloadLink){
        alert("Clique em analisar primeiro");
        return;
    }

    window.open(window.downloadLink,"_blank");
}
