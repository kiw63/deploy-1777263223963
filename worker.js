/*
==========================================================
 TIMED VIDEO VAULT
 ONE-FILE CLOUDFLARE WORKER
==========================================================

REQUIRED BINDINGS

R2:
  VIDEO_BUCKET

KV:
  VIDEO_DB

SECRETS:
  ADMIN_PASSWORD
  TOKEN_SECRET

NO API URL IS REQUIRED IN THE FRONTEND.

Everything runs from the same Worker origin.
==========================================================
*/

const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024 * 1024, // 50 GB
  PART_SIZE: 8 * 1024 * 1024,             // 8 MiB
  MAX_PARTS: 10000,

  UPLOAD_SESSION_TTL: 6 * 60 * 60,
  MEDIA_TOKEN_TTL: 60 * 60,

  VIDEO_PREFIX: "videos/",
  META_PREFIX: "video:",
  UPLOAD_PREFIX: "upload:",

  MAX_TITLE: 160,
  MAX_DESCRIPTION: 2000
};

/* ========================================================
   HTML
======================================================== */

const HTML = String.raw`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f6efe4">
<meta name="description" content="Timed Video Vault">

<title>Timed Video Vault</title>

<style>
:root{
  --cream:#f6efe4;
  --paper:#fffaf3;
  --paper2:#f1e5d4;
  --coral:#d96b52;
  --coral2:#ee9479;
  --gold:#c99a48;
  --wine:#7b3145;
  --wine2:#9e5266;
  --brown:#513c32;
  --muted:#927f73;
  --line:rgba(81,60,50,.13);
  --shadow:0 25px 70px rgba(81,60,50,.14);
  --radius:28px;
}

*{
  box-sizing:border-box;
}

html{
  scroll-behavior:smooth;
}

body{
  margin:0;
  min-height:100vh;
  color:var(--brown);
  background:
    radial-gradient(circle at 10% 10%,rgba(217,107,82,.15),transparent 25%),
    radial-gradient(circle at 90% 20%,rgba(201,154,72,.16),transparent 25%),
    linear-gradient(135deg,#f6efe4,#fffaf3 45%,#eee0ce);
  font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  overflow-x:hidden;
}

body:before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  opacity:.22;
  background-image:
    radial-gradient(rgba(81,60,50,.08) .7px,transparent .7px);
  background-size:8px 8px;
  mask-image:linear-gradient(to bottom,black,transparent);
}

button,
input,
textarea{
  font:inherit;
}

button{
  border:0;
}

.shell{
  width:min(1180px,calc(100% - 28px));
  margin:auto;
}

.topbar{
  padding:22px 0;
  position:sticky;
  top:0;
  z-index:20;
  backdrop-filter:blur(18px);
  background:rgba(246,239,228,.76);
  border-bottom:1px solid rgba(81,60,50,.08);
}

.nav{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:20px;
}

.brand{
  display:flex;
  align-items:center;
  gap:12px;
  font-weight:900;
  letter-spacing:-.5px;
}

.brandMark{
  width:42px;
  height:42px;
  border-radius:14px;
  display:grid;
  place-items:center;
  color:white;
  background:linear-gradient(135deg,var(--coral),var(--wine));
  box-shadow:0 10px 25px rgba(123,49,69,.2);
  transform:rotate(-4deg);
}

.brandText small{
  display:block;
  font-size:10px;
  color:var(--muted);
  letter-spacing:1.8px;
  text-transform:uppercase;
  margin-bottom:2px;
}

.brandText strong{
  font-size:17px;
}

.serverClock{
  padding:9px 13px;
  border:1px solid var(--line);
  background:rgba(255,250,243,.72);
  border-radius:999px;
  font-size:12px;
  color:var(--muted);
}

.hero{
  padding:65px 0 38px;
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:28px;
  align-items:stretch;
}

.heroMain{
  min-height:430px;
  border-radius:36px;
  padding:42px;
  position:relative;
  overflow:hidden;
  color:#fff8f0;
  background:
    radial-gradient(circle at 85% 15%,rgba(238,148,121,.4),transparent 25%),
    radial-gradient(circle at 20% 90%,rgba(201,154,72,.3),transparent 25%),
    linear-gradient(135deg,#7b3145,#9e5266 52%,#d96b52);
  box-shadow:var(--shadow);
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.heroMain:after{
  content:"";
  width:260px;
  height:260px;
  position:absolute;
  right:-100px;
  bottom:-110px;
  border-radius:50%;
  border:40px solid rgba(255,255,255,.08);
  animation:float 7s ease-in-out infinite;
}

.eyebrow{
  font-size:11px;
  font-weight:900;
  letter-spacing:2.5px;
  text-transform:uppercase;
  opacity:.78;
}

.hero h1{
  margin:13px 0 16px;
  font-size:clamp(38px,6vw,72px);
  line-height:.95;
  letter-spacing:-4px;
  max-width:720px;
}

.hero p{
  max-width:620px;
  line-height:1.7;
  opacity:.85;
  margin:0 0 28px;
}

.heroActions{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
}

.primary{
  cursor:pointer;
  padding:14px 20px;
  border-radius:15px;
  color:#fff;
  background:linear-gradient(135deg,#e89074,#b94f61);
  box-shadow:0 12px 25px rgba(81,35,48,.25);
  font-weight:900;
  transition:.2s ease;
}

.primary:hover{
  transform:translateY(-2px);
  box-shadow:0 17px 30px rgba(81,35,48,.28);
}

.secondary{
  cursor:pointer;
  padding:14px 20px;
  border-radius:15px;
  color:var(--brown);
  background:var(--paper);
  border:1px solid var(--line);
  font-weight:800;
  transition:.2s ease;
}

.secondary:hover{
  transform:translateY(-2px);
}

.heroSide{
  display:grid;
  gap:16px;
}

.infoCard{
  padding:25px;
  border-radius:27px;
  background:rgba(255,250,243,.78);
  border:1px solid var(--line);
  box-shadow:0 15px 45px rgba(81,60,50,.08);
  position:relative;
  overflow:hidden;
}

.infoCard:before{
  content:"";
  position:absolute;
  width:100px;
  height:100px;
  right:-40px;
  top:-40px;
  border-radius:50%;
  background:rgba(217,107,82,.12);
}

.infoIcon{
  width:45px;
  height:45px;
  display:grid;
  place-items:center;
  border-radius:15px;
  background:var(--paper2);
  margin-bottom:15px;
}

.infoCard h3{
  margin:0 0 7px;
}

.infoCard p{
  margin:0;
  color:var(--muted);
  line-height:1.6;
  font-size:13px;
}

.sectionHead{
  display:flex;
  align-items:end;
  justify-content:space-between;
  gap:20px;
  margin:25px 0 18px;
}

.sectionHead h2{
  margin:0;
  font-size:29px;
  letter-spacing:-1.2px;
}

.sectionHead p{
  margin:6px 0 0;
  color:var(--muted);
  font-size:13px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:18px;
  padding-bottom:70px;
}

.card{
  border:1px solid var(--line);
  border-radius:26px;
  overflow:hidden;
  background:rgba(255,250,243,.82);
  box-shadow:0 14px 40px rgba(81,60,50,.08);
  transition:.25s ease;
  animation:cardIn .45s ease both;
}

.card:hover{
  transform:translateY(-5px);
  box-shadow:0 22px 50px rgba(81,60,50,.13);
}

.cardTop{
  height:155px;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 20% 30%,rgba(217,107,82,.18),transparent 30%),
    linear-gradient(135deg,#efe0cf,#fff8ee);
  position:relative;
}

.playOrb{
  width:65px;
  height:65px;
  display:grid;
  place-items:center;
  border-radius:50%;
  background:linear-gradient(135deg,var(--coral),var(--wine));
  color:white;
  box-shadow:0 12px 30px rgba(123,49,69,.2);
  font-size:24px;
}

.status{
  position:absolute;
  left:14px;
  top:14px;
  padding:7px 10px;
  border-radius:999px;
  background:rgba(255,250,243,.86);
  border:1px solid var(--line);
  font-size:10px;
  font-weight:900;
  letter-spacing:.7px;
}

.cardBody{
  padding:19px;
}

.cardTitle{
  margin:0;
  font-size:18px;
  line-height:1.25;
}

.cardDesc{
  margin:8px 0 14px;
  color:var(--muted);
  font-size:12px;
  line-height:1.55;
  min-height:38px;
}

.cardMeta{
  display:flex;
  justify-content:space-between;
  gap:10px;
  font-size:11px;
  color:var(--muted);
}

.countdown{
  margin-top:15px;
  padding:13px;
  border-radius:15px;
  background:#f2e5d6;
  text-align:center;
  font-weight:900;
  letter-spacing:1px;
  color:var(--wine);
}

.openBtn{
  width:100%;
  margin-top:12px;
  padding:12px;
  border-radius:14px;
  cursor:pointer;
  background:var(--wine);
  color:white;
  font-weight:900;
  transition:.2s;
}

.openBtn:hover{
  background:var(--wine2);
  transform:translateY(-1px);
}

.openBtn:disabled{
  cursor:not-allowed;
  opacity:.45;
  transform:none;
}

.empty{
  grid-column:1/-1;
  padding:65px 20px;
  text-align:center;
  border:1px dashed rgba(81,60,50,.2);
  border-radius:27px;
  color:var(--muted);
  background:rgba(255,250,243,.55);
}

.loader{
  grid-column:1/-1;
  height:220px;
  border-radius:27px;
  background:linear-gradient(90deg,#f0e3d3 25%,#fff8ef 50%,#f0e3d3 75%);
  background-size:200% 100%;
  animation:shimmer 1.3s infinite;
}

.modal{
  position:fixed;
  inset:0;
  z-index:100;
  display:none;
  place-items:center;
  padding:18px;
  background:rgba(81,60,50,.38);
  backdrop-filter:blur(14px);
}

.modal.show{
  display:grid;
  animation:fadeIn .2s ease;
}

.modalBox{
  width:min(760px,100%);
  max-height:92vh;
  overflow:auto;
  border-radius:30px;
  background:var(--paper);
  border:1px solid rgba(81,60,50,.13);
  box-shadow:0 35px 100px rgba(81,60,50,.3);
  padding:26px;
  animation:pop .25s ease;
}

.modalHead{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:15px;
  margin-bottom:22px;
}

.modalHead h2{
  margin:0;
}

.close{
  width:40px;
  height:40px;
  border-radius:13px;
  cursor:pointer;
  background:#efe0d0;
  color:var(--brown);
  font-size:20px;
}

.form{
  display:grid;
  gap:15px;
}

.field{
  display:grid;
  gap:7px;
}

.field label{
  font-size:12px;
  font-weight:900;
}

.field input,
.field textarea{
  width:100%;
  border:1px solid var(--line);
  outline:none;
  background:#fffaf3;
  color:var(--brown);
  padding:13px 14px;
  border-radius:14px;
  transition:.2s;
}

.field input:focus,
.field textarea:focus{
  border-color:rgba(217,107,82,.55);
  box-shadow:0 0 0 4px rgba(217,107,82,.09);
}

.field textarea{
  min-height:110px;
  resize:vertical;
}

.fileBox{
  border:1.5px dashed rgba(123,49,69,.3);
  border-radius:19px;
  padding:18px;
  background:#fbf1e6;
}

.fileBox input{
  width:100%;
}

.fileInfo{
  margin-top:10px;
  font-size:12px;
  color:var(--muted);
}

.progressWrap{
  display:none;
  margin-top:16px;
}

.progressWrap.show{
  display:block;
}

.progressOuter{
  height:11px;
  border-radius:999px;
  background:#eadaca;
  overflow:hidden;
}

.progressBar{
  width:0%;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg,var(--coral),var(--gold),var(--wine));
  transition:width .2s ease;
}

.progressText{
  display:flex;
  justify-content:space-between;
  margin-top:8px;
  font-size:11px;
  color:var(--muted);
}

.notice{
  padding:12px 14px;
  border-radius:14px;
  background:#f2e5d6;
  color:var(--wine);
  font-size:12px;
  line-height:1.5;
}

.viewer{
  width:min(1100px,100%);
}

.viewer video{
  width:100%;
  max-height:72vh;
  display:block;
  background:#241b18;
  border-radius:20px;
  box-shadow:0 30px 80px rgba(81,60,50,.3);
}

.viewerTitle{
  color:white;
  margin:15px 0 0;
}

.toast{
  position:fixed;
  right:18px;
  bottom:18px;
  z-index:300;
  max-width:340px;
  padding:14px 16px;
  border-radius:17px;
  background:#fffaf3;
  border:1px solid var(--line);
  box-shadow:0 20px 50px rgba(81,60,50,.18);
  display:none;
  animation:toastIn .25s ease;
}

.toast.show{
  display:block;
}

.toast strong{
  display:block;
  margin-bottom:3px;
}

.toast span{
  color:var(--muted);
  font-size:12px;
}

footer{
  padding:20px 0 40px;
  text-align:center;
  color:var(--muted);
  font-size:11px;
}

@keyframes float{
  0%,100%{transform:translateY(0) rotate(0)}
  50%{transform:translateY(-18px) rotate(8deg)}
}

@keyframes shimmer{
  to{background-position:-200% 0}
}

@keyframes cardIn{
  from{opacity:0;transform:translateY(15px)}
  to{opacity:1;transform:none}
}

@keyframes fadeIn{
  from{opacity:0}
  to{opacity:1}
}

@keyframes pop{
  from{opacity:0;transform:scale(.97) translateY(10px)}
  to{opacity:1;transform:none}
}

@keyframes toastIn{
  from{opacity:0;transform:translateY(12px)}
  to{opacity:1;transform:none}
}

@media(max-width:900px){
  .hero{
    grid-template-columns:1fr;
  }

  .grid{
    grid-template-columns:repeat(2,1fr);
  }
}

@media(max-width:620px){
  .shell{
    width:min(100% - 18px,1180px);
  }

  .hero{
    padding-top:35px;
  }

  .heroMain{
    padding:27px;
    min-height:390px;
    border-radius:27px;
  }

  .hero h1{
    letter-spacing:-2.5px;
  }

  .grid{
    grid-template-columns:1fr;
  }

  .serverClock{
    display:none;
  }
}
</style>
</head>

<body>

<header class="topbar">
  <div class="shell nav">
    <div class="brand">
      <div class="brandMark">▶</div>
      <div class="brandText">
        <small>Private video system</small>
        <strong>Timed Video Vault</strong>
      </div>
    </div>

    <div class="serverClock" id="serverClock">
      Server time: connecting...
    </div>
  </div>
</header>

<main class="shell">

<section class="hero">

  <div class="heroMain">

    <div class="eyebrow">Controlled video release</div>

    <h1>Video yang terbuka tepat pada waktunya.</h1>

    <p>
      Upload video, tentukan waktu pembukaan, lalu biarkan sistem
      mengatur countdown dan akses video berdasarkan waktu server.
    </p>

    <div class="heroActions">
      <button class="primary" id="uploadOpen">
        + Upload Video
      </button>

      <button class="secondary" id="refreshBtn">
        ↻ Refresh
      </button>
    </div>

  </div>

  <div class="heroSide">

    <div class="infoCard">
      <div class="infoIcon">⏱</div>
      <h3>Server Time</h3>
      <p>
        Countdown tidak bergantung pada jam HP pengunjung.
      </p>
    </div>

    <div class="infoCard">
      <div class="infoIcon">◈</div>
      <h3>Private Storage</h3>
      <p>
        Video disimpan di R2 dan tidak diberikan sebagai public bucket.
      </p>
    </div>

    <div class="infoCard">
      <div class="infoIcon">◆</div>
      <h3>Protected Access</h3>
      <p>
        Endpoint video tetap memeriksa waktu unlock sebelum memberikan data.
      </p>
    </div>

  </div>

</section>

<section>

  <div class="sectionHead">
    <div>
      <h2>Video Library</h2>
      <p id="libraryStatus">Memuat koleksi...</p>
    </div>
  </div>

  <div class="grid" id="videoGrid">
    <div class="loader"></div>
  </div>

</section>

<footer>
  Timed Video Vault · Private release system
</footer>

</main>


<!-- UPLOAD MODAL -->

<div class="modal" id="uploadModal">

  <div class="modalBox">

    <div class="modalHead">
      <div>
        <h2>Upload Video</h2>
        <div style="color:var(--muted);font-size:12px;margin-top:5px">
          Atur kapan video boleh dibuka.
        </div>
      </div>

      <button class="close" id="uploadClose">×</button>
    </div>

    <form class="form" id="uploadForm">

      <div class="field">
        <label>Admin Password</label>
        <input
          id="adminPassword"
          type="password"
          autocomplete="current-password"
          placeholder="Masukkan password admin"
          required
        >
      </div>

      <div class="field">
        <label>Judul Video</label>
        <input
          id="videoTitle"
          maxlength="160"
          placeholder="Contoh: Film Episode 01"
          required
        >
      </div>

      <div class="field">
        <label>Deskripsi</label>
        <textarea
          id="videoDescription"
          maxlength="2000"
          placeholder="Deskripsi video..."
        ></textarea>
      </div>

      <div class="field">
        <label>Waktu Video Dibuka</label>
        <input
          id="unlockAt"
          type="datetime-local"
          required
        >
      </div>

      <div class="fileBox">

        <strong>Pilih Video</strong>

        <div style="margin-top:8px">
          <input
            id="videoFile"
            type="file"
            accept="video/*"
            required
          >
        </div>

        <div class="fileInfo" id="fileInfo">
          Belum ada file.
        </div>

      </div>

      <div class="notice">
        Upload memakai multipart upload. File besar dibagi menjadi beberapa
        bagian sehingga kegagalan satu bagian dapat dicoba ulang.
      </div>

      <button
        class="primary"
        id="uploadSubmit"
        type="submit"
      >
        Upload & Publish
      </button>

      <div class="progressWrap" id="progressWrap">

        <div class="progressOuter">
          <div class="progressBar" id="progressBar"></div>
        </div>

        <div class="progressText">
          <span id="progressLabel">Preparing...</span>
          <span id="progressPercent">0%</span>
        </div>

      </div>

    </form>

  </div>

</div>


<!-- VIEWER -->

<div class="modal" id="viewerModal">

  <div class="viewer">

    <button
      class="close"
      id="viewerClose"
      style="margin-left:auto;display:block;margin-bottom:10px"
    >×</button>

    <video
      id="videoPlayer"
      controls
      playsinline
      preload="metadata"
    ></video>

    <h2 class="viewerTitle" id="viewerTitle"></h2>

  </div>

</div>


<!-- TOAST -->

<div class="toast" id="toast">
  <strong id="toastTitle">Info</strong>
  <span id="toastMessage"></span>
</div>


<script>
"use strict";

/* ========================================================
   CLIENT STATE
======================================================== */

var videos = [];
var serverOffset = 0;
var countdownTimer = null;
var serverSyncTimer = null;
var uploadBusy = false;


/* ========================================================
   ELEMENTS
======================================================== */

var grid = document.getElementById("videoGrid");
var libraryStatus = document.getElementById("libraryStatus");
var serverClock = document.getElementById("serverClock");

var uploadModal = document.getElementById("uploadModal");
var viewerModal = document.getElementById("viewerModal");

var uploadForm = document.getElementById("uploadForm");
var uploadSubmit = document.getElementById("uploadSubmit");

var fileInput = document.getElementById("videoFile");
var fileInfo = document.getElementById("fileInfo");

var progressWrap = document.getElementById("progressWrap");
var progressBar = document.getElementById("progressBar");
var progressLabel = document.getElementById("progressLabel");
var progressPercent = document.getElementById("progressPercent");

var videoPlayer = document.getElementById("videoPlayer");
var viewerTitle = document.getElementById("viewerTitle");


/* ========================================================
   HELPERS
======================================================== */

function jsonFetch(url, options){
  return fetch(url, Object.assign({
    cache:"no-store"
  }, options || {}));
}

function showToast(title, message){
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMessage").textContent = message;

  var el = document.getElementById("toast");

  el.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(function(){
    el.classList.remove("show");
  }, 4200);
}

function formatBytes(bytes){
  if(!bytes) return "0 B";

  var units = ["B","KB","MB","GB","TB"];
  var i = Math.floor(Math.log(bytes) / Math.log(1024));

  if(i >= units.length) i = units.length - 1;

  return (bytes / Math.pow(1024,i)).toFixed(i ? 2 : 0) + " " + units[i];
}

function escapeHtml(value){
  return String(value || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function formatDate(timestamp){
  try{
    return new Intl.DateTimeFormat("id-ID",{
      dateStyle:"medium",
      timeStyle:"short"
    }).format(new Date(timestamp));
  }catch(e){
    return new Date(timestamp).toLocaleString("id-ID");
  }
}

function getServerNow(){
  return Date.now() + serverOffset;
}

function formatRemaining(ms){

  if(ms <= 0){
    return "VIDEO SUDAH TERBUKA";
  }

  var total = Math.floor(ms / 1000);

  var days = Math.floor(total / 86400);
  total %= 86400;

  var hours = Math.floor(total / 3600);
  total %= 3600;

  var minutes = Math.floor(total / 60);
  var seconds = total % 60;

  if(days > 0){
    return days + "h " +
           String(hours).padStart(2,"0") + "j " +
           String(minutes).padStart(2,"0") + "m";
  }

  return String(hours).padStart(2,"0") + ":" +
         String(minutes).padStart(2,"0") + ":" +
         String(seconds).padStart(2,"0");
}


/* ========================================================
   SERVER CLOCK
======================================================== */

async function syncServerTime(){

  try{

    var started = Date.now();

    var response = await jsonFetch("/api/time");

    if(!response.ok){
      throw new Error("Time server error");
    }

    var data = await response.json();

    var finished = Date.now();

    var roundTrip = finished - started;

    var estimatedNow = Number(data.now) + Math.floor(roundTrip / 2);

    serverOffset = estimatedNow - finished;

    serverClock.textContent =
      "Server: " +
      new Intl.DateTimeFormat("id-ID",{
        dateStyle:"medium",
        timeStyle:"medium"
      }).format(new Date(getServerNow()));

  }catch(error){

    serverClock.textContent = "Server time unavailable";

  }
}


/* ========================================================
   LOAD VIDEO LIST
======================================================== */

async function loadVideos(){

  grid.innerHTML = '<div class="loader"></div>';

  try{

    var response = await jsonFetch("/api/videos");

    var data = await response.json();

    if(!response.ok){
      throw new Error(data.error || "Gagal memuat video");
    }

    videos = Array.isArray(data.videos) ? data.videos : [];

    renderVideos();

  }catch(error){

    grid.innerHTML =
      '<div class="empty">' +
      '<strong>Gagal memuat video</strong><br>' +
      escapeHtml(error.message) +
      '</div>';

    libraryStatus.textContent = "Terjadi kesalahan";

  }
}


/* ========================================================
   RENDER
======================================================== */

function renderVideos(){

  if(!videos.length){

    grid.innerHTML =
      '<div class="empty">' +
      '<div style="font-size:35px;margin-bottom:10px">◇</div>' +
      '<strong>Belum ada video</strong>' +
      '<div style="margin-top:7px">Upload video pertama kamu.</div>' +
      '</div>';

    libraryStatus.textContent = "0 video";

    return;
  }

  libraryStatus.textContent =
    videos.length + (videos.length === 1 ? " video" : " video");

  grid.innerHTML = videos.map(function(video,index){

    var unlocked = getServerNow() >= Number(video.unlockAt);

    return (
      '<article class="card" data-id="' +
      escapeHtml(video.id) +
      '" style="animation-delay:' +
      (index * 45) +
      'ms">' +

        '<div class="cardTop">' +

          '<div class="status">' +
            (unlocked ? "● OPEN" : "◷ LOCKED") +
          '</div>' +

          '<div class="playOrb">▶</div>' +

        '</div>' +

        '<div class="cardBody">' +

          '<h3 class="cardTitle">' +
            escapeHtml(video.title) +
          '</h3>' +

          '<p class="cardDesc">' +
            escapeHtml(video.description || "Tidak ada deskripsi.") +
          '</p>' +

          '<div class="cardMeta">' +
            '<span>' + formatBytes(video.size) + '</span>' +
            '<span>' + escapeHtml(video.type || "video") + '</span>' +
          '</div>' +

          '<div class="countdown" data-countdown="' +
            escapeHtml(video.id) +
          '">' +
            (unlocked ? "SIAP DITONTON" : formatRemaining(Number(video.unlockAt) - getServerNow())) +
          '</div>' +

          '<button class="openBtn" ' +
            'data-open="' + escapeHtml(video.id) + '"' +
            (unlocked ? "" : " disabled") +
          '>' +
            (unlocked ? "▶ Buka Video" : "🔒 Belum Terbuka") +
          '</button>' +

        '</div>' +

      '</article>'
    );

  }).join("");

  document.querySelectorAll("[data-open]").forEach(function(button){

    button.addEventListener("click",function(){

      var id = button.getAttribute("data-open");

      openVideo(id);

    });

  });
}


/* ========================================================
   COUNTDOWN
======================================================== */

function refreshCountdown(){

  document.querySelectorAll("[data-countdown]").forEach(function(el){

    var id = el.getAttribute("data-countdown");

    var video = videos.find(function(item){
      return item.id === id;
    });

    if(!video) return;

    var remaining = Number(video.unlockAt) - getServerNow();

    var button = document.querySelector(
      '[data-open="' + CSS.escape(id) + '"]'
    );

    if(remaining <= 0){

      el.textContent = "SIAP DITONTON";

      if(button){

        button.disabled = false;
        button.textContent = "▶ Buka Video";

      }

      var card = document.querySelector(
        '.card[data-id="' + CSS.escape(id) + '"]'
      );

      if(card){

        var status = card.querySelector(".status");

        if(status){
          status.textContent = "● OPEN";
        }

      }

    }else{

      el.textContent = formatRemaining(remaining);

    }

  });

}


/* ========================================================
   VIDEO OPEN
======================================================== */

async function openVideo(id){

  var video = videos.find(function(item){
    return item.id === id;
  });

  if(!video) return;

  if(getServerNow() < Number(video.unlockAt)){

    showToast(
      "Masih terkunci",
      "Video belum mencapai waktu pembukaan."
    );

    return;
  }

  try{

    var response = await jsonFetch(
      "/api/video/" + encodeURIComponent(id) + "/token"
    );

    var data = await response.json();

    if(!response.ok){
      throw new Error(data.error || "Video belum dapat dibuka");
    }

    videoPlayer.pause();

    videoPlayer.removeAttribute("src");

    videoPlayer.load();

    videoPlayer.src =
      "/media/" +
      encodeURIComponent(id) +
      "?token=" +
      encodeURIComponent(data.token);

    viewerTitle.textContent = video.title;

    viewerModal.classList.add("show");

    videoPlayer.load();

  }catch(error){

    showToast(
      "Gagal membuka video",
      error.message
    );

  }
}


/* ========================================================
   UPLOAD UI
======================================================== */

document.getElementById("uploadOpen").addEventListener(
  "click",
  function(){
    uploadModal.classList.add("show");
  }
);

document.getElementById("uploadClose").addEventListener(
  "click",
  function(){
    if(!uploadBusy){
      uploadModal.classList.remove("show");
    }
  }
);

document.getElementById("viewerClose").addEventListener(
  "click",
  function(){

    videoPlayer.pause();
    videoPlayer.removeAttribute("src");
    videoPlayer.load();

    viewerModal.classList.remove("show");

  }
);

document.getElementById("refreshBtn").addEventListener(
  "click",
  async function(){

    await syncServerTime();
    await loadVideos();

  }
);

fileInput.addEventListener("change",function(){

  var file = fileInput.files[0];

  if(!file){

    fileInfo.textContent = "Belum ada file.";

    return;
  }

  fileInfo.textContent =
    file.name +
    " · " +
    formatBytes(file.size) +
    " · " +
    (file.type || "unknown");

});


/* ========================================================
   UPLOAD PROGRESS
======================================================== */

function setProgress(percent,label){

  percent = Math.max(0,Math.min(100,percent));

  progressWrap.classList.add("show");

  progressBar.style.width = percent + "%";

  progressPercent.textContent =
    Math.round(percent) + "%";

  progressLabel.textContent =
    label || "Processing...";

}


/* ========================================================
   UPLOAD WITH RETRY
======================================================== */

async function uploadPartWithRetry(url,blob,attempts){

  var lastError;

  for(var attempt=1; attempt<=attempts; attempt++){

    try{

      var response = await fetch(url,{
        method:"PUT",
        body:blob,
        cache:"no-store"
      });

      var text = await response.text();

      var data;

      try{
        data = JSON.parse(text);
      }catch(e){
        data = {};
      }

      if(!response.ok){

        throw new Error(
          data.error ||
          data.message ||
          text ||
          "Upload part gagal"
        );

      }

      if(!data.etag){

        throw new Error("Server tidak mengembalikan ETag part.");

      }

      return data;

    }catch(error){

      lastError = error;

      if(attempt < attempts){

        await new Promise(function(resolve){
          setTimeout(resolve,800 * attempt);
        });

      }

    }

  }

  throw lastError || new Error("Upload gagal");

}


/* ========================================================
   CREATE UPLOAD
======================================================== */

uploadForm.addEventListener("submit",async function(event){

  event.preventDefault();

  if(uploadBusy){
    return;
  }

  var password =
    document.getElementById("adminPassword").value;

  var title =
    document.getElementById("videoTitle").value.trim();

  var description =
    document.getElementById("videoDescription").value.trim();

  var unlockInput =
    document.getElementById("unlockAt").value;

  var file =
    fileInput.files[0];

  if(!password){
    showToast("Password kosong","Masukkan password admin.");
    return;
  }

  if(!title){
    showToast("Judul kosong","Masukkan judul video.");
    return;
  }

  if(!unlockInput){
    showToast("Waktu kosong","Tentukan waktu unlock.");
    return;
  }

  if(!file){
    showToast("File kosong","Pilih video terlebih dahulu.");
    return;
  }

  if(file.size <= 0){
    showToast("File tidak valid","Ukuran file tidak valid.");
    return;
  }

  if(file.size > 50 * 1024 * 1024 * 1024){

    showToast(
      "File terlalu besar",
      "Batas sistem adalah 50 GB."
    );

    return;
  }

  var unlockAt =
    new Date(unlockInput).getTime();

  if(!Number.isFinite(unlockAt)){

    showToast(
      "Waktu tidak valid",
      "Periksa tanggal dan jam."
    );

    return;
  }

  if(unlockAt <= getServerNow()){

    showToast(
      "Waktu tidak valid",
      "Waktu unlock harus berada di masa depan."
    );

    return;
  }

  uploadBusy = true;

  uploadSubmit.disabled = true;

  uploadSubmit.textContent =
    "Menyiapkan upload...";

  try{

    /* CREATE SESSION */

    setProgress(1,"Membuat upload session...");

    var createResponse = await jsonFetch(
      "/api/upload/create",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({

          password:password,

          title:title,

          description:description,

          unlockAt:unlockAt,

          fileName:file.name,

          fileSize:file.size,

          contentType:file.type || "video/mp4"

        })

      }
    );

    var createText =
      await createResponse.text();

    var createData;

    try{
      createData = JSON.parse(createText);
    }catch(e){
      createData = {};
    }

    if(!createResponse.ok){

      throw new Error(
        createData.error ||
        createText ||
        "Tidak dapat membuat upload."
      );

    }

    var uploadId =
      createData.uploadId;

    var videoId =
      createData.videoId;

    var token =
      createData.token;

    if(!uploadId || !videoId || !token){

      throw new Error(
        "Server memberikan session upload yang tidak lengkap."
      );

    }

    /* PARTS */

    var partSize = 8 * 1024 * 1024;

    var totalParts =
      Math.ceil(file.size / partSize);

    if(totalParts > 10000){

      throw new Error(
        "File membutuhkan lebih dari 10.000 part."
      );

    }

    var uploadedParts = [];

    for(
      var index=0;
      index<totalParts;
      index++
    ){

      var start =
        index * partSize;

      var end =
        Math.min(
          start + partSize,
          file.size
        );

      var blob =
        file.slice(start,end);

      var percent =
        5 +
        (index / totalParts) * 88;

      setProgress(
        percent,
        "Upload bagian " +
        (index + 1) +
        " / " +
        totalParts
      );

      var partUrl =
        "/api/upload/part" +
        "?uploadId=" +
        encodeURIComponent(uploadId) +
        "&token=" +
        encodeURIComponent(token) +
        "&partNumber=" +
        (index + 1);

      var partResult =
        await uploadPartWithRetry(
          partUrl,
          blob,
          3
        );

      uploadedParts.push({
        partNumber:
          Number(partResult.partNumber),
        etag:
          String(partResult.etag)
      });

    }

    /* COMPLETE */

    setProgress(
      95,
      "Menggabungkan video..."
    );

    var completeResponse =
      await jsonFetch(
        "/api/upload/complete",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({

            uploadId:uploadId,

            token:token,

            videoId:videoId,

            parts:uploadedParts

          })

        }
      );

    var completeText =
      await completeResponse.text();

    var completeData;

    try{
      completeData =
        JSON.parse(completeText);
    }catch(e){
      completeData = {};
    }

    if(!completeResponse.ok){

      throw new Error(
        completeData.error ||
        completeText ||
        "Gagal menyelesaikan upload."
      );

    }

    setProgress(
      100,
      "Upload berhasil."
    );

    showToast(
      "Berhasil",
      "Video sudah tersimpan dan dijadwalkan."
    );

    uploadForm.reset();

    fileInfo.textContent =
      "Belum ada file.";

    setTimeout(function(){

      uploadModal.classList.remove("show");

      progressWrap.classList.remove("show");

    },900);

    await loadVideos();

  }catch(error){

    showToast(
      "Upload gagal",
      error.message
    );

    setProgress(
      0,
      "Upload gagal."
    );

  }finally{

    uploadBusy = false;

    uploadSubmit.disabled = false;

    uploadSubmit.textContent =
      "Upload & Publish";

  }

});


/* ========================================================
   CLOSE MODALS ON BACKDROP
======================================================== */

uploadModal.addEventListener("click",function(event){

  if(
    event.target === uploadModal &&
    !uploadBusy
  ){
    uploadModal.classList.remove("show");
  }

});

viewerModal.addEventListener("click",function(event){

  if(event.target === viewerModal){

    videoPlayer.pause();

    videoPlayer.removeAttribute("src");

    videoPlayer.load();

    viewerModal.classList.remove("show");

  }

});


/* ========================================================
   INITIALIZE
======================================================== */

(async function(){

  await syncServerTime();

  await loadVideos();

  refreshCountdown();

  countdownTimer =
    setInterval(
      refreshCountdown,
      1000
    );

  serverSyncTimer =
    setInterval(
      syncServerTime,
      60000
    );

})();
</script>

</body>
</html>`;


/* ========================================================
   RESPONSE HELPERS
======================================================== */

function json(data, status = 200, extraHeaders = {}) {

  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    ...extraHeaders
  });

  return new Response(JSON.stringify(data), {
    status,
    headers
  });
}


function errorResponse(message, status = 400) {
  return json({ error: message }, status);
}


/* ========================================================
   SECURITY HEADERS
======================================================== */

function securityHeaders() {

  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=()"
  };

}


/* ========================================================
   BASE64URL
======================================================== */

function base64urlEncode(bytes) {

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

}


function base64urlDecode(value) {

  value = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  while (value.length % 4) {
    value += "=";
  }

  const binary = atob(value);

  const bytes =
    new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;

}


function utf8Bytes(value) {

  return new TextEncoder().encode(value);

}


/* ========================================================
   HMAC
======================================================== */

async function getHmacKey(secret) {

  return crypto.subtle.importKey(
    "raw",
    utf8Bytes(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign","verify"]
  );

}


async function signToken(payload, secret) {

  const body =
    base64urlEncode(
      utf8Bytes(
        JSON.stringify(payload)
      )
    );

  const key =
    await getHmacKey(secret);

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      utf8Bytes(body)
    );

  return body + "." + base64urlEncode(
    new Uint8Array(signature)
  );

}


async function verifyToken(token, secret) {

  if(!token || typeof token !== "string"){
    return null;
  }

  const pieces =
    token.split(".");

  if(pieces.length !== 2){
    return null;
  }

  const body =
    pieces[0];

  const signature =
    base64urlDecode(pieces[1]);

  const key =
    await getHmacKey(secret);

  const valid =
    await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      utf8Bytes(body)
    );

  if(!valid){
    return null;
  }

  let payload;

  try{

    payload =
      JSON.parse(
        new TextDecoder().decode(
          base64urlDecode(body)
        )
      );

  }catch(e){

    return null;

  }

  if(
    !payload ||
    !Number.isFinite(payload.exp) ||
    payload.exp < Math.floor(Date.now() / 1000)
  ){

    return null;

  }

  return payload;

}


/* ========================================================
   ADMIN PASSWORD
======================================================== */

async function verifyAdmin(password, env) {

  if(
    typeof password !== "string" ||
    !password ||
    !env.ADMIN_PASSWORD
  ){

    return false;

  }

  const a =
    utf8Bytes(password);

  const b =
    utf8Bytes(env.ADMIN_PASSWORD);

  if(a.length !== b.length){
    return false;
  }

  let diff = 0;

  for(let i=0;i<a.length;i++){
    diff |= a[i] ^ b[i];
  }

  return diff === 0;

}


/* ========================================================
   REQUEST JSON
======================================================== */

async function readJson(request) {

  try{

    return await request.json();

  }catch(e){

    throw new Error("JSON request tidak valid.");

  }

}


/* ========================================================
   BASIC VALIDATION
======================================================== */

function validVideoType(type) {

  if(
    typeof type !== "string" ||
    !type.toLowerCase().startsWith("video/")
  ){

    return false;

  }

  return true;

}


function sanitizeText(value, max) {

  if(typeof value !== "string"){
    return "";
  }

  return value
    .replace(/\u0000/g,"")
    .trim()
    .slice(0,max);

}


function randomId(prefix) {

  return (
    prefix +
    "-" +
    crypto.randomUUID().replaceAll("-","") +
    "-" +
    Date.now().toString(36)
  );

}


/* ========================================================
   UPLOAD CREATE
======================================================== */

async function createUpload(request, env) {

  const body =
    await readJson(request);

  const password =
    String(body.password || "");

  const valid =
    await verifyAdmin(password,env);

  if(!valid){

    return errorResponse(
      "Password admin salah.",
      401
    );

  }

  const title =
    sanitizeText(
      body.title,
      CONFIG.MAX_TITLE
    );

  const description =
    sanitizeText(
      body.description,
      CONFIG.MAX_DESCRIPTION
    );

  const fileName =
    sanitizeText(
      body.fileName,
      240
    );

  const fileSize =
    Number(body.fileSize);

  const contentType =
    String(body.contentType || "");

  const unlockAt =
    Number(body.unlockAt);

  if(!title){

    return errorResponse(
      "Judul video wajib diisi."
    );

  }

  if(
    !Number.isSafeInteger(fileSize) ||
    fileSize <= 0 ||
    fileSize > CONFIG.MAX_FILE_SIZE
  ){

    return errorResponse(
      "Ukuran file tidak valid atau terlalu besar."
    );

  }

  if(!validVideoType(contentType)){

    return errorResponse(
      "File harus berupa video."
    );

  }

  if(
    !Number.isFinite(unlockAt) ||
    unlockAt <= Date.now()
  ){

    return errorResponse(
      "Waktu unlock harus berada di masa depan."
    );

  }

  const partCount =
    Math.ceil(
      fileSize / CONFIG.PART_SIZE
    );

  if(
    partCount <= 0 ||
    partCount > CONFIG.MAX_PARTS
  ){

    return errorResponse(
      "Jumlah part upload tidak valid."
    );

  }

  const videoId =
    randomId("vid");

  const uploadId =
    randomId("up");

  const key =
    CONFIG.VIDEO_PREFIX +
    videoId;

  let multipart;

  try{

    multipart =
      await env.VIDEO_BUCKET.createMultipartUpload(
        key,
        {
          httpMetadata:{
            contentType:contentType,
            cacheControl:"private, no-store"
          },
          customMetadata:{
            videoId:videoId
          }
        }
      );

  }catch(error){

    return errorResponse(
      "R2 gagal membuat multipart upload: " +
      String(error.message || error),
      500
    );

  }

  const now =
    Date.now();

  const session = {

    version:1,

    videoId,

    uploadId:
      multipart.uploadId,

    key,

    fileName,

    fileSize,

    contentType,

    title,

    description,

    unlockAt,

    partCount,

    createdAt:now,

    expiresAt:
      now +
      CONFIG.UPLOAD_SESSION_TTL * 1000

  };

  await env.VIDEO_DB.put(
    CONFIG.UPLOAD_PREFIX + uploadId,
    JSON.stringify(session),
    {
      expirationTtl:
        CONFIG.UPLOAD_SESSION_TTL
    }
  );

  const token =
    await signToken(
      {
        type:"upload",
        uploadId,
        videoId,
        exp:
          Math.floor(now / 1000) +
          CONFIG.UPLOAD_SESSION_TTL
      },
      env.TOKEN_SECRET
    );

  return json({

    ok:true,

    videoId,

    uploadId,

    token,

    partSize:CONFIG.PART_SIZE,

    partCount

  });

}


/* ========================================================
   UPLOAD PART
======================================================== */

async function uploadPart(request, env) {

  const url =
    new URL(request.url);

  const uploadId =
    url.searchParams.get("uploadId");

  const token =
    url.searchParams.get("token");

  const partNumber =
    Number(
      url.searchParams.get("partNumber")
    );

  if(!uploadId || !token){

    return errorResponse(
      "Upload session tidak lengkap.",
      401
    );

  }

  if(
    !Number.isInteger(partNumber) ||
    partNumber < 1 ||
    partNumber > CONFIG.MAX_PARTS
  ){

    return errorResponse(
      "Nomor part tidak valid."
    );

  }

  const payload =
    await verifyToken(
      token,
      env.TOKEN_SECRET
    );

  if(
    !payload ||
    payload.type !== "upload" ||
    payload.uploadId !== uploadId
  ){

    return errorResponse(
      "Upload token tidak valid atau sudah kedaluwarsa.",
      401
    );

  }

  if(!request.body){

    return errorResponse(
      "Part upload kosong."
    );

  }

  const sessionRaw =
    await env.VIDEO_DB.get(
      CONFIG.UPLOAD_PREFIX + uploadId
    );

  if(!sessionRaw){

    return errorResponse(
      "Upload session sudah tidak tersedia.",
      404
    );

  }

  const session =
    JSON.parse(sessionRaw);

  if(
    session.uploadId !==
    payload.uploadId
  ){

    return errorResponse(
      "Upload session tidak cocok.",
      403
    );

  }

  if(
    partNumber >
    session.partCount
  ){

    return errorResponse(
      "Part berada di luar jumlah yang diharapkan."
    );

  }

  try{

    const multipart =
      env.VIDEO_BUCKET.resumeMultipartUpload(
        session.key,
        session.uploadId
      );

    const uploaded =
      await multipart.uploadPart(
        partNumber,
        request.body
      );

    return json({

      ok:true,

      partNumber:
        uploaded.partNumber,

      etag:
        uploaded.etag

    });

  }catch(error){

    return errorResponse(
      "R2 gagal menerima part: " +
      String(error.message || error),
      500
    );

  }

}


/* ========================================================
   UPLOAD COMPLETE
======================================================== */

async function completeUpload(request, env) {

  const body =
    await readJson(request);

  const uploadId =
    String(body.uploadId || "");

  const token =
    String(body.token || "");

  const videoId =
    String(body.videoId || "");

  const parts =
    Array.isArray(body.parts)
      ? body.parts
      : [];

  const payload =
    await verifyToken(
      token,
      env.TOKEN_SECRET
    );

  if(
    !payload ||
    payload.type !== "upload" ||
    payload.uploadId !== uploadId ||
    payload.videoId !== videoId
  ){

    return errorResponse(
      "Upload token tidak valid.",
      401
    );

  }

  const sessionRaw =
    await env.VIDEO_DB.get(
      CONFIG.UPLOAD_PREFIX + uploadId
    );

  if(!sessionRaw){

    return errorResponse(
      "Upload session tidak ditemukan.",
      404
    );

  }

  const session =
    JSON.parse(sessionRaw);

  if(
    session.videoId !== videoId
  ){

    return errorResponse(
      "Video ID tidak cocok.",
      403
    );

  }

  if(
    parts.length !==
    session.partCount
  ){

    return errorResponse(
      "Jumlah part belum lengkap. Diharapkan " +
      session.partCount +
      ", diterima " +
      parts.length +
      "."
    );

  }

  const normalized = [];

  const seen =
    new Set();

  for(const part of parts){

    const partNumber =
      Number(part.partNumber);

    const etag =
      String(part.etag || "");

    if(
      !Number.isInteger(partNumber) ||
      partNumber < 1 ||
      partNumber > session.partCount ||
      !etag
    ){

      return errorResponse(
        "Daftar part tidak valid."
      );

    }

    if(seen.has(partNumber)){

      return errorResponse(
        "Part duplikat terdeteksi."
      );

    }

    seen.add(partNumber);

    normalized.push({
      partNumber,
      etag
    });

  }

  normalized.sort(function(a,b){
    return a.partNumber - b.partNumber;
  });

  for(
    let i=0;
    i<normalized.length;
    i++
  ){

    if(
      normalized[i].partNumber !==
      i + 1
    ){

      return errorResponse(
        "Urutan part tidak lengkap."
      );

    }

  }

  let object;

  try{

    const multipart =
      env.VIDEO_BUCKET.resumeMultipartUpload(
        session.key,
        session.uploadId
      );

    object =
      await multipart.complete(
        normalized
      );

  }catch(error){

    return errorResponse(
      "Gagal menyelesaikan multipart upload: " +
      String(error.message || error),
      500
    );

  }

  if(
    !object ||
    object.size !== session.fileSize
  ){

    try{
      await env.VIDEO_BUCKET.delete(
        session.key
      );
    }catch(e){}

    return errorResponse(
      "Ukuran file hasil upload tidak sesuai.",
      500
    );

  }

  const metadata = {

    version:1,

    id:session.videoId,

    key:session.key,

    title:session.title,

    description:session.description,

    fileName:session.fileName,

    size:object.size,

    type:session.contentType,

    unlockAt:session.unlockAt,

    createdAt:session.createdAt,

    uploadedAt:Date.now(),

    etag:object.httpEtag || null

  };

  await env.VIDEO_DB.put(
    CONFIG.META_PREFIX + session.videoId,
    JSON.stringify(metadata)
  );

  await env.VIDEO_DB.delete(
    CONFIG.UPLOAD_PREFIX + uploadId
  );

  return json({

    ok:true,

    video:metadata

  });

}


/* ========================================================
   LIST VIDEOS
======================================================== */

async function listVideos(env) {

  const results = [];

  let cursor = undefined;

  do{

    const page =
      await env.VIDEO_DB.list({
        prefix:CONFIG.META_PREFIX,
        limit:1000,
        cursor
      });

    for(const item of page.keys){

      const raw =
        await env.VIDEO_DB.get(item.name);

      if(!raw){
        continue;
      }

      try{

        const video =
          JSON.parse(raw);

        results.push({

          id:video.id,

          title:video.title,

          description:video.description,

          size:video.size,

          type:video.type,

          unlockAt:video.unlockAt,

          createdAt:video.createdAt,

          uploadedAt:video.uploadedAt

        });

      }catch(e){}

    }

    cursor =
      page.list_complete
        ? undefined
        : page.cursor;

  }while(cursor);

  results.sort(function(a,b){

    return (
      Number(a.unlockAt) -
      Number(b.unlockAt)
    );

  });

  return json({
    videos:results
  });

}


/* ========================================================
   MEDIA TOKEN
======================================================== */

async function createMediaToken(id, env) {

  const raw =
    await env.VIDEO_DB.get(
      CONFIG.META_PREFIX + id
    );

  if(!raw){

    return errorResponse(
      "Video tidak ditemukan.",
      404
    );

  }

  const video =
    JSON.parse(raw);

  if(
    Date.now() <
    Number(video.unlockAt)
  ){

    return errorResponse(
      "Video belum terbuka.",
      403
    );

  }

  const now =
    Math.floor(Date.now() / 1000);

  const token =
    await signToken(
      {
        type:"media",
        videoId:id,
        exp:
          now +
          CONFIG.MEDIA_TOKEN_TTL
      },
      env.TOKEN_SECRET
    );

  return json({

    ok:true,

    token,

    expiresAt:
      (now + CONFIG.MEDIA_TOKEN_TTL) * 1000

  });

}


/* ========================================================
   RANGE PARSER
======================================================== */

function parseRangeHeader(header,size) {

  if(!header){
    return null;
  }

  if(!header.startsWith("bytes=")){
    return null;
  }

  const value =
    header.slice(6).trim();

  if(value.includes(",")){
    return {
      invalid:true
    };
  }

  const parts =
    value.split("-");

  if(parts.length !== 2){
    return {
      invalid:true
    };
  }

  const startText =
    parts[0].trim();

  const endText =
    parts[1].trim();

  let start;
  let end;

  if(startText === ""){

    const suffix =
      Number(endText);

    if(
      !Number.isInteger(suffix) ||
      suffix <= 0
    ){

      return {
        invalid:true
      };

    }

    start =
      Math.max(
        0,
        size - suffix
      );

    end =
      size - 1;

  }else{

    start =
      Number(startText);

    if(!Number.isInteger(start) || start < 0){

      return {
        invalid:true
      };

    }

    if(endText === ""){

      end =
        size - 1;

    }else{

      end =
        Number(endText);

      if(
        !Number.isInteger(end) ||
        end < start
      ){

        return {
          invalid:true
        };

      }

    }

  }

  if(start >= size){

    return {
      invalid:true
    };

  }

  end =
    Math.min(
      end,
      size - 1
    );

  return {
    start,
    end,
    length:
      end - start + 1
  };

}


/* ========================================================
   MEDIA
======================================================== */

async function serveMedia(request, id, env) {

  const url =
    new URL(request.url);

  const token =
    url.searchParams.get("token");

  const payload =
    await verifyToken(
      token,
      env.TOKEN_SECRET
    );

  if(
    !payload ||
    payload.type !== "media" ||
    payload.videoId !== id
  ){

    return new Response(
      "Unauthorized",
      {
        status:401,
        headers:securityHeaders()
      }
    );

  }

  const raw =
    await env.VIDEO_DB.get(
      CONFIG.META_PREFIX + id
    );

  if(!raw){

    return new Response(
      "Not found",
      {
        status:404,
        headers:securityHeaders()
      }
    );

  }

  const video =
    JSON.parse(raw);

  /* SERVER-SIDE UNLOCK CHECK */

  if(
    Date.now() <
    Number(video.unlockAt)
  ){

    return new Response(
      "Video is still locked.",
      {
        status:403,
        headers:securityHeaders()
      }
    );

  }

  const object =
    await env.VIDEO_BUCKET.head(
      video.key
    );

  if(!object){

    return new Response(
      "Video object not found.",
      {
        status:404,
        headers:securityHeaders()
      }
    );

  }

  const size =
    object.size;

  const rangeHeader =
    request.headers.get("Range");

  const range =
    parseRangeHeader(
      rangeHeader,
      size
    );

  if(
    range &&
    range.invalid
  ){

    return new Response(
      null,
      {
        status:416,
        headers:{
          ...securityHeaders(),
          "Content-Range":
            "bytes */" + size
        }
      }
    );

  }

  const options = {};

  if(range){

    options.range = {
      offset:range.start,
      length:range.length
    };

  }

  const bodyObject =
    await env.VIDEO_BUCKET.get(
      video.key,
      options
    );

  if(!bodyObject){

    return new Response(
      "Video not found.",
      {
        status:404,
        headers:securityHeaders()
      }
    );

  }

  const headers =
    new Headers(
      securityHeaders()
    );

  headers.set(
    "Content-Type",
    object.httpMetadata &&
    object.httpMetadata.contentType
      ? object.httpMetadata.contentType
      : video.type || "video/mp4"
  );

  headers.set(
    "Accept-Ranges",
    "bytes"
  );

  headers.set(
    "Cache-Control",
    "private, no-store, max-age=0"
  );

  headers.set(
    "Content-Disposition",
    'inline; filename="' +
    String(video.fileName || "video.mp4")
      .replace(/["\r\n]/g,"_") +
    '"'
  );

  headers.set(
    "ETag",
    object.httpEtag
  );

  if(range){

    headers.set(
      "Content-Length",
      String(range.length)
    );

    headers.set(
      "Content-Range",
      "bytes " +
      range.start +
      "-" +
      range.end +
      "/" +
      size
    );

  }else{

    headers.set(
      "Content-Length",
      String(size)
    );

  }

  if(request.method === "HEAD"){

    return new Response(
      null,
      {
        status:range ? 206 : 200,
        headers
      }
    );

  }

  return new Response(
    bodyObject.body,
    {
      status:range ? 206 : 200,
      headers
    }
  );

}


/* ========================================================
   ROUTER
======================================================== */

async function handleApi(request, env) {

  const url =
    new URL(request.url);

  const path =
    url.pathname;

  if(path === "/api/time"){

    if(request.method !== "GET"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return json({
      now:Date.now()
    });

  }


  if(path === "/api/videos"){

    if(request.method !== "GET"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return listVideos(env);

  }


  if(path === "/api/upload/create"){

    if(request.method !== "POST"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return createUpload(
      request,
      env
    );

  }


  if(path === "/api/upload/part"){

    if(request.method !== "PUT"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return uploadPart(
      request,
      env
    );

  }


  if(path === "/api/upload/complete"){

    if(request.method !== "POST"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return completeUpload(
      request,
      env
    );

  }


  const tokenMatch =
    path.match(
      /^\/api\/video\/([^/]+)\/token$/
    );

  if(tokenMatch){

    if(request.method !== "GET"){
      return errorResponse(
        "Method not allowed.",
        405
      );
    }

    return createMediaToken(
      decodeURIComponent(tokenMatch[1]),
      env
    );

  }


  return errorResponse(
    "API endpoint not found.",
    404
  );

}


/* ========================================================
   MAIN WORKER
======================================================== */

export default {

  async fetch(request, env) {

    try{

      const url =
        new URL(request.url);

      if(
        !env.VIDEO_BUCKET ||
        !env.VIDEO_DB ||
        !env.ADMIN_PASSWORD ||
        !env.TOKEN_SECRET
      ){

        return new Response(
          "Server configuration incomplete. Configure VIDEO_BUCKET, VIDEO_DB, ADMIN_PASSWORD and TOKEN_SECRET.",
          {
            status:500,
            headers:{
              "Content-Type":
                "text/plain; charset=utf-8",
              ...securityHeaders()
            }
          }
        );

      }


      /* API */

      if(
        url.pathname.startsWith("/api/")
      ){

        return await handleApi(
          request,
          env
        );

      }


      /* MEDIA */

      const mediaMatch =
        url.pathname.match(
          /^\/media\/([^/]+)$/
        );

      if(mediaMatch){

        if(
          request.method !== "GET" &&
          request.method !== "HEAD"
        ){

          return new Response(
            "Method Not Allowed",
            {
              status:405,
              headers:{
                Allow:"GET, HEAD",
                ...securityHeaders()
              }
            }
          );

        }

        return await serveMedia(
          request,
          decodeURIComponent(
            mediaMatch[1]
          ),
          env
        );

      }


      /* WEBSITE */

      if(
        request.method === "GET" &&
        (
          url.pathname === "/" ||
          url.pathname === "/index.html"
        )
      ){

        return new Response(
          HTML,
          {
            status:200,
            headers:{
              "Content-Type":
                "text/html; charset=utf-8",

              "Cache-Control":
                "no-store, max-age=0",

              "Content-Security-Policy":
                "default-src 'self'; " +
                "script-src 'unsafe-inline'; " +
                "style-src 'unsafe-inline'; " +
                "img-src 'self' data:; " +
                "media-src 'self'; " +
                "connect-src 'self'; " +
                "frame-ancestors 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self';",

              ...securityHeaders()
            }
          }
        );

      }


      return new Response(
        "Not Found",
        {
          status:404,
          headers:securityHeaders()
        }
      );

    }catch(error){

      return json(
        {
          error:
            "Internal server error.",
          detail:
            String(
              error &&
              error.message
                ? error.message
                : error
            )
        },
        500
      );

    }

  }

};
