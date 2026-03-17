const API = "https://giow-downloader-api-windowless.onrender.com";

async function analyze(){

    const url = document.getElementById("url").value;

    if(!url){
        alert("Cole um link do YouTube");
        return;
    }

    document.getElementById("status").innerText = "Analisando vídeo...";

    try{

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

        document.getElementById("status").innerText =
            "Vídeo encontrado: " + data.title;

    }catch(err){

        console.error(err);
        alert("Erro ao analisar vídeo");

    }
}


async function download(){

    const url = document.getElementById("url").value;

    if(!url){
        alert("Cole um link primeiro");
        return;
    }

    document.getElementById("status").innerText = "Baixando...";

    try{

        const res = await fetch(API + "/download",{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({url:url})
        });

        if(!res.ok){
            throw new Error("Erro no download");
        }

        const blob = await res.blob();

        const link = document.createElement("a");

        link.href = window.URL.createObjectURL(blob);
        link.download = "download";

        document.body.appendChild(link);
        link.click();
        link.remove();

        document.getElementById("status").innerText = "Download concluído";

    }catch(err){

        console.error(err);
        alert("Erro ao baixar vídeo");

    }
}
