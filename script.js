const API = "https://giow-downloader-api.onrender.com""

async function analyze(){

let url = document.getElementById("url").value

let res = await fetch(API + "/analyze",{

method:"POST",
headers:{ "Content-Type":"application/json" },

body:JSON.stringify({
url:url
})

})

let data = await res.json()

let select = document.getElementById("resolution")

select.innerHTML=""

data.resolutions.forEach(r=>{

let opt=document.createElement("option")
opt.text=r
select.add(opt)

})

document.getElementById("status").innerText="Resoluções carregadas"

}

async function download(){

let url=document.getElementById("url").value
let mode=document.querySelector('input[name="mode"]:checked').value
let resolution=document.getElementById("resolution").value

let res = await fetch(API + "/download",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

url:url,
mode:mode,
resolution:resolution

})

})

let blob = await res.blob()

let a=document.createElement("a")

a.href=URL.createObjectURL(blob)
a.download="download"

a.click()

document.getElementById("status").innerText="Download iniciado"

}
