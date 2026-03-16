const API = "https://giow-downloader-api-docker-test.onrender.com";

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

    const data = await res.json();

    if(data.error){
        alert(data.error);
        return;
    }

    window.open(API + "/" + data.file);
}
