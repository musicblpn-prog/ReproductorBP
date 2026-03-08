// ==============================
// Mi Music - Drive Library
// Género -> Álbum -> Canciones
// Persistencia: localStorage
// ==============================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";


const audio = document.getElementById("audio");

audio.preload = "auto";
audio.crossOrigin = "anonymous";
audio.playsInline = true;
const playBtn = document.getElementById("playBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const seek = document.getElementById("seek");
const vol = document.getElementById("vol");
const tCur = document.getElementById("tCur");
const tDur = document.getElementById("tDur");

const npTitle = document.getElementById("npTitle");
const npSub = document.getElementById("npSub");
const coverEl = document.getElementById("cover");

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const crumbsEl = document.getElementById("crumbs");

const navGenres = document.getElementById("navGenres");
const navAlbums = document.getElementById("navAlbums");
const navSongs = document.getElementById("navSongs");
const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("modal");
const btnAdd = document.getElementById("btnAdd");
const btnAdd2 = document.getElementById("btnAdd2");
const closeModal = document.getElementById("closeModal");
const cancelSong = document.getElementById("cancelSong");
const saveSong = document.getElementById("saveSong");
const msg = document.getElementById("msg");

const inTitle = document.getElementById("inTitle");
const inArtist = document.getElementById("inArtist");
const inGenre = document.getElementById("inGenre");
const inAlbum = document.getElementById("inAlbum");
const inUrl = document.getElementById("inUrl");
const inCover = document.getElementById("inCover");

const nowPlaying = document.getElementById("nowPlaying");
const closeNowPlaying = document.getElementById("closeNowPlaying");
const bigTitle = document.getElementById("bigTitle");
const bigArtist = document.getElementById("bigArtist");
const bigCover = document.getElementById("bigCover");

const seekFull = document.getElementById("seekFull");
const playFull = document.getElementById("playFull");
const prevFull = document.getElementById("prevFull");
const nextFull = document.getElementById("nextFull");
const shuffleFull = document.getElementById("shuffleFull");
const repeatFull = document.getElementById("repeatFull");

const speedControl = document.getElementById("speedControl");
const favFullBtn = document.getElementById("favFullBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");
const audioPreload = new Audio();
audioPreload.preload = "auto";

audio.addEventListener("play", updatePlayButtons);
audio.addEventListener("pause", updatePlayButtons);





// --------- State ----------
let library = loadLibrary(); // {genres:{[name]:{albums:{[name]:{cover, tracks:[]}}}}}
let view = "genres"; // genres | albums | songs | collections
let queueContext = { type: "all" };
// type: "all" | "genre" | "album" | "favorites" | "collectionSongs"
let selectedGenre = null;
let selectedAlbum = null;

let queue = []; // lista de tracks visibles (para siguiente/anterior)
let currentIndex = -1;
let isPlaying = false;

let isShuffle = false;
let repeatMode = "off";// puede ser: "off" | "all" | "one"
let previousView = null;

let shuffleOrder = [];  // array de índices
let shufflePos = 0;

let pausedBySystem = false;

/*audio.addEventListener("pause", () => {

  if (!audio.ended && !document.hidden) {
    pausedBySystem = true;
  }

});*/

audio.addEventListener("pause", () => {

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }

});


document.addEventListener("visibilitychange", () => {

  if (!document.hidden) {

    if (audio.paused && isPlaying) {

      audio.play().catch(()=>{});

    }

  }

});

audio.addEventListener("pause", () => {

  // si la pausa fue por otra app
  if (!audio.ended) {

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "paused";
    }

  }

});

audio.addEventListener("playing", () => {

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "playing";
  }

});



// --------- Init ----------
audio.volume = Number(vol.value);
audio.preload = "auto";
audio.crossOrigin = "anonymous";
render();



if (repeatFull) {
  repeatFull.addEventListener("click", () => {

    // Cambiar modo
    if (repeatMode === "off") {
      repeatMode = "all";
    } else if (repeatMode === "all") {
      repeatMode = "one";
    } else {
      repeatMode = "off";
    }

    // Apariencia visual
    repeatFull.classList.toggle("active", repeatMode !== "off");

    // Cambiar icono si quieres diferenciar
    if (repeatMode === "one") {
      repeatFull.textContent = "🔂";
    } else {
      repeatFull.textContent = "🔁";
    }

    console.log("Repeat mode:", repeatMode);
  });
}





let favorites = loadFavorites(); // Set(trackId)

function preloadNextTrack(){

  if(!queue.length) return;

  let nextIndex;

  if(isShuffle){
    nextIndex = Math.floor(Math.random() * queue.length);
  } else {
    nextIndex = currentIndex + 1;
    if(nextIndex >= queue.length) nextIndex = 0;
  }

  const nextTrack = queue[nextIndex];
  if(!nextTrack) return;

  audioPreload.src = fixDropbox(nextTrack.url);
}

function fixDropbox(url){

  if(!url.includes("dropbox.com")) return url;

  return url
    .replace("www.dropbox.com","dl.dropboxusercontent.com")
    .replace("&raw=1","")
    .replace(/&st=[^&]+/,"");
}

function loadFavorites(){
  try{
    const raw = localStorage.getItem(LS_FAV);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  }catch{
    return new Set();
  }
}

function saveFavorites(){
  localStorage.setItem(LS_FAV, JSON.stringify([...favorites]));
}


// 
function resetShuffle(){
  shuffleOrder = [];
  shufflePos = 0;
}

function makeShuffleOrder(n){

  const arr = [...Array(n).keys()];

  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}
//


function buildQueueForCurrentView(){
  const q = normalize(searchInput.value).toLowerCase();

  // 1) Favoritos (inteligente)
  if (view === "collectionSongs" && selectedAlbum === "Favoritos") {
    queueContext = { type: "favorites" };
    let tracks = favoriteTracks();
    if (q) tracks = tracks.filter(t => (t.title+" "+t.artist+" "+t.genre+" "+t.album).toLowerCase().includes(q));
    tracks.sort((a,b)=> (a.artist+a.album+a.title).localeCompare(b.artist+b.album+b.title));
    return tracks;
  }

// 1.5) Otras colecciones personalizadas
if (view === "collectionSongs" && selectedAlbum !== "Favoritos") {

  queueContext = { type: "collection", name: selectedAlbum };

  const trackIds = library.collections[selectedAlbum] || [];
  let tracks = allTracks().filter(t => trackIds.includes(t.id));

  if (q) tracks = tracks.filter(t => matchTrack(t, q));

  tracks.sort((a,b)=>
    (a.artist+a.album+a.title)
      .localeCompare(b.artist+b.album+b.title)
  );

  return tracks;
}



  // 2) Songs dentro de un álbum específico
  if (view === "songs" && selectedGenre && selectedAlbum) {
    queueContext = { type: "album", genre: selectedGenre, album: selectedAlbum };
    let tracks = (library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [])
      .map(t => ({...t, genre: selectedGenre, album: selectedAlbum}));
    if (q) tracks = tracks.filter(t => (t.title+" "+t.artist+" "+t.genre+" "+t.album).toLowerCase().includes(q));
    tracks.sort((a,b)=> (a.artist+a.album+a.title).localeCompare(b.artist+b.album+b.title));
    return tracks;
  }

  // 3) Songs global
  if (view === "songs") {
    queueContext = { type: "all" };
    let tracks = allTracks();
    if (q) tracks = tracks.filter(t => (t.title+" "+t.artist+" "+t.genre+" "+t.album).toLowerCase().includes(q));
    tracks.sort((a,b)=> (a.artist+a.album+a.title).localeCompare(b.artist+b.album+b.title));
    return tracks;
  }

  // Por defecto
  queueContext = { type: "all" };
  return allTracks();
}


// --------- Library storage ----------
function defaultLibrary() {
  return { 
    genres: {},
    collections: {}
  };
}

function loadLibrary() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultLibrary();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaultLibrary();
    if (!parsed.genres) parsed.genres = {};
    if (!parsed.collections) parsed.collections = {};
    return parsed;
  } catch {
    return defaultLibrary();
  }
}

function saveLibrary() {
  localStorage.setItem(LS_KEY, JSON.stringify(library));
}


function matchTrack(t, query) {
  if (!query) return true;

  const q = query.toLowerCase();

  const fields = [
    t.title,
    t.artist,
    t.genre,
    t.album
  ];

  return fields.some(field =>
    (field ?? "").toLowerCase().includes(q)
  );
}

// --------- Helpers ----------
function fmtTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}


function updatePlayButtons() {

  if (audio.paused) {
    playBtn.textContent = "▶";
    if (playFull) playFull.textContent = "▶";
  } else {
    playBtn.textContent = "⏸";
    if (playFull) playFull.textContent = "⏸";
  }

}




function normalize(str) {
  return (str ?? "").toString().trim();
}

function setMsg(text) {
  if (!text) {
    msg.classList.add("hidden");
    msg.textContent = "";
    return;
  }
  msg.classList.remove("hidden");
  msg.textContent = text;
}

// Convierte:
// https://drive.google.com/file/d/ID/view?usp=sharing
// -> https://drive.google.com/uc?export=download&id=ID
function driveToDirect(url) {
  const u = normalize(url);
  if (!u) return "";
  // si ya es uc?export=download&id=
  if (u.includes("drive.google.com/uc?") && u.includes("id=")) return u;

  const m = u.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (m && m[1]) return `https://drive.google.com/uc?export=download&id=${m[1]}`;

  // alternativa: open?id=ID
  const m2 = u.match(/[?&]id=([^&]+)/i);
  if (u.includes("drive.google.com") && m2 && m2[1]) {
    return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
  }
  return u; // si es otro hosting, lo dejamos igual
}

function ensurePath(genre, album) {
  if (!library.genres[genre]) library.genres[genre] = { albums: {} };
  if (!library.genres[genre].albums[album]) {
    library.genres[genre].albums[album] = { cover: "", tracks: [] };
  }
}

function allTracks() {
  const out = [];
  for (const [gName, g] of Object.entries(library.genres)) {
    for (const [aName, a] of Object.entries(g.albums ?? {})) {
      for (const t of (a.tracks ?? [])) {
        out.push({ ...t, genre: gName, album: aName });
      }
    }
  }
  return out;
}

function favoriteTracks(){
  const all = allTracks();
  return all.filter(t => favorites.has(t.id));
}

function cleanFavorites() {
  if (!library.collections) return;


  const existingIds = new Set(allTracks().map(t => t.id));


  saveLibrary();
}

// --------- Rendering ----------
function setActiveNav() {
  [navGenres, navAlbums, navSongs].forEach(b => b.classList.remove("active"));
  if (view === "genres") navGenres.classList.add("active");
  if (view === "albums") navAlbums.classList.add("active");
  if (view === "songs") navSongs.classList.add("active");
}

function setCrumbs() {
  crumbsEl.innerHTML = "";
  const parts = [];
  parts.push({ label: "Géneros", click: () => { view = "genres"; selectedGenre = null; selectedAlbum = null; render(); } });

  if (view === "albums" || view === "songs") {
    if (selectedGenre) parts.push({ label: selectedGenre, click: () => { view = "albums"; selectedAlbum = null; render(); } });
  }
  if (view === "songs") {
    if (selectedAlbum) parts.push({ label: selectedAlbum, click: () => {} });
  }

  parts.forEach((p, idx) => {
    const span = document.createElement("span");
    span.className = "crumb" + (idx === parts.length - 1 ? " strong" : "");
    span.textContent = p.label;
    if (idx !== parts.length - 1) span.style.cursor = "pointer";
    span.onclick = () => { if (idx !== parts.length - 1) p.click(); };
    crumbsEl.appendChild(span);
  });
}

function render() {
  setActiveNav();
  setCrumbs();
  cleanFavorites();

  const q = normalize(searchInput.value).toLowerCase();
  listEl.innerHTML = "";

  const hasAny = allTracks().length > 0;
  emptyEl.classList.toggle("hidden", hasAny);

  if (!hasAny) {
    // solo mostramos vacío
    return;
  }


  if (view === "collectionSongs" && selectedAlbum === "Favoritos") {

  let tracks = favoriteTracks();

  if (q) tracks = tracks.filter(t => matchTrack(t, q));

  tracks.sort((a,b)=> (a.artist+a.album+a.title).localeCompare(b.artist+b.album+b.title));

  queue = tracks;

  tracks.forEach((t, idx) => listEl.appendChild(songRow(t, idx)));

  return;
}



if (view === "collections") {

  // 1) nombres de colecciones personalizadas (playlists)
  const names = Object.keys(library.collections || {});

  // 2) forzar "Favoritos" siempre visible
  if (!names.includes("Favoritos")) names.unshift("Favoritos");

  names.forEach(name => {

    // Favoritos: conteo inteligente
    const count = (name === "Favoritos")
      ? favoriteTracks().length
      : (library.collections[name] || []).length;

    listEl.appendChild(card({
      title: name,
      sub: `${count} canción(es)`,
      pill: "Abrir",
      onClick: () => {
        selectedAlbum = name;
        view = "collectionSongs";
        render();
      }
    }));
  });

  return;
}


if (view === "collectionSongs" && selectedAlbum === "Favoritos") {

  let tracks = favoriteTracks();

  if (q) {
    tracks = tracks.filter(t => matchTrack(t, q));
  }

  tracks.sort((a,b)=>
    (a.artist+a.album+a.title)
      .localeCompare(b.artist+b.album+b.title)
  );

  queue = tracks;

  tracks.forEach((t, idx) => {
    listEl.appendChild(songRow(t, idx));
  });

  return;
}


  if (view === "genres") {
    const genres = Object.keys(library.genres).sort((a,b)=>a.localeCompare(b));
    const filtered = q ? genres.filter(g => g.toLowerCase().includes(q)) : genres;

    filtered.forEach(gName => {
      const albumsCount = Object.keys(library.genres[gName].albums ?? {}).length;
      const tracksCount = Object.values(library.genres[gName].albums ?? {}).reduce((acc,a)=>acc + (a.tracks?.length ?? 0), 0);

      listEl.appendChild(card({
        title: gName,
        sub: `${albumsCount} álbum(es) · ${tracksCount} canción(es)`,
        pill: "Abrir",
        onClick: () => {
          selectedGenre = gName;
          selectedAlbum = null;
          view = "albums";
          render();
        }
      }));
    });

    return;
  }

  if (view === "albums") {
    if (!selectedGenre) {
      // si el usuario no eligió género, mostramos todos los álbumes
      const albums = [];
      for (const [gName, g] of Object.entries(library.genres)) {
        for (const [aName, a] of Object.entries(g.albums ?? {})) {
          albums.push({ genre: gName, album: aName, cover: a.cover ?? "", tracks: a.tracks ?? [] });
        }
      }
      const filtered = q
        ? albums.filter(x => (x.album + " " + x.genre).toLowerCase().includes(q))
        : albums;

      filtered.sort((a,b)=> (a.album+b.genre).localeCompare(b.album+a.genre));

filtered.forEach(x => {
  listEl.appendChild(cardAlbum({
    title: x.album,
    sub: `${x.genre} · ${x.tracks.length} canción(es)`,
    pill: "Abrir",
    onClick: () => {
      selectedGenre = x.genre;
      selectedAlbum = x.album;
      view = "songs";
      render();
    },
    onDelete: () => deleteAlbum(x.genre, x.album)
  }));
});
      return;
    }

    const g = library.genres[selectedGenre];
    const albums = Object.keys(g.albums ?? {}).sort((a,b)=>a.localeCompare(b));
    const filtered = q ? albums.filter(a => a.toLowerCase().includes(q)) : albums;

    filtered.forEach(aName => {
      const a = g.albums[aName];
      listEl.appendChild(card({
        title: aName,
        sub: `${(a.tracks?.length ?? 0)} canción(es)`,
        pill: "Ver",
        onClick: () => {
          selectedAlbum = aName;
          view = "songs";
          render();
        }
      }));
    });
    return;
  }

  if (view === "songs") {
    // construir queue según contexto
    let tracks = [];
    if (selectedGenre && selectedAlbum && !normalize(searchInput.value)) {
      const a = library.genres[selectedGenre]?.albums?.[selectedAlbum];
      tracks = (a?.tracks ?? []).map(t => ({ ...t, genre: selectedGenre, album: selectedAlbum }));
    } else {
      tracks = allTracks();
    }

    // buscar
    if (q) {
  tracks = tracks.filter(t => matchTrack(t, q));
  } 

    // orden suave
    tracks.sort((a,b)=> (a.artist+a.album+a.title).localeCompare(b.artist+b.album+b.title));

    queue = tracks;

    tracks.forEach((t, idx) => {
      listEl.appendChild(songRow(t, idx));
    });

    return;
  }
}


function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAV);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(LS_FAV, JSON.stringify([...favorites]));
}




function card({title, sub, pill, onClick}) {
  const div = document.createElement("div");
  div.className = "card";

  div.innerHTML = `
    <div class="row">
      <div class="card-title">${escapeHtml(title)}</div>
      ${pill ? `<span class="pill">${escapeHtml(pill)}</span>` : ""}
    </div>
    <div class="card-sub">${escapeHtml(sub)}</div>
  `;

  div.onclick = onClick;
  return div;
}

//
function cardAlbum({ title, sub, pill, onClick, onDelete }) {
  const div = document.createElement("div");
  div.className = "card album-card";

  div.innerHTML = `
    <div class="row">
      <div class="card-title">${escapeHtml(title)}</div>
      <span class="pill">${escapeHtml(pill)}</span>
    </div>
    <div class="card-sub">${escapeHtml(sub)}</div>

    <div class="album-actions">
      <button type="button" class="album-del">Eliminar álbum</button>
    </div>
  `;

  // click principal abre
  div.addEventListener("click", onClick);

  // botón eliminar NO debe abrir
  div.querySelector(".album-del").addEventListener("click", (e) => {
    e.stopPropagation();
    onDelete?.();
  });

  return div;
}


// 





function albumCard({title, cover, sub, onClick}) {
  const div = document.createElement("div");
  div.className = "card album-card";

  div.innerHTML = `
    <div class="album-cover">
      ${cover ? "" : "♪"}
    </div>

    <div class="album-info">
      <div class="card-title">${escapeHtml(title)}</div>
      <div class="card-sub">${escapeHtml(sub)}</div>
    </div>
  `;

  if (cover) {
    const c = div.querySelector(".album-cover");
    c.style.backgroundImage = `url("${cover}")`;
    c.style.backgroundSize = "cover";
    c.style.backgroundPosition = "center";
  }

  div.onclick = onClick;
  return div;
}

function songRow(t, idx) {
  const div = document.createElement("div");
  div.className = "card song-card";

  const active = idx === currentIndex ? " · Reproduciendo" : "";

  div.innerHTML = `
    <div class="song-left">
      <div class="song-cover">
        ${t.cover ? "" : "♪"}
      </div>

      <div class="song-info">
        <div class="card-title">${escapeHtml(t.title)}</div>
        <div class="card-sub">
          ${escapeHtml(t.artist)} · 
          ${escapeHtml(t.genre)} · 
          ${escapeHtml(t.album)}${escapeHtml(active)}
        </div>

        <div class="row" style="margin-top:8px;">
          <span class="pill play-btn">▶</span>
          <span class="fav-btn">${favorites.has(t.id) ? "❤️" : "🤍"}</span>
          <span class="delete-btn">🗑</span>
        </div>
      </div>
    </div>
  `;

  if (t.cover) {
    const cover = div.querySelector(".song-cover");
    cover.style.backgroundImage = `url("${t.cover}")`;
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
  }

  const favBtn = div.querySelector(".fav-btn");

  if (favorites.has(t.id)) {
    favBtn.classList.add("active");
  } else {
    favBtn.classList.remove("active");
  }

  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(t);
    favBtn.classList.toggle("active");
  };

  div.querySelector(".delete-btn").onclick = (e) => {
    e.stopPropagation();
    deleteSong(t);
  };

  // 🔥 AQUÍ ESTÁ LO QUE FALTABA
  div.querySelector(".play-btn").onclick = (e) => {
    e.stopPropagation();
    queue = buildQueueForCurrentView();
    playFromQueue(idx);
  };

  return div;
}


function deleteSong(track) {
  if (!confirm(`¿Eliminar "${track.title}"?`)) return;

  const genre = track.genre;
  const album = track.album;

  const albumTracks = library.genres[genre]?.albums[album]?.tracks;
  if (!albumTracks) return;

  library.genres[genre].albums[album].tracks =
    albumTracks.filter(t => t.id !== track.id);

    
// quitar de favoritos si existía

  cleanFavorites();
  saveLibrary();

  if (currentIndex !== -1) {
    pause();
    currentIndex = -1;
  }

  render();
}


function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function toggleFavorite(track){
  if (!track?.id) return;

  if (favorites.has(track.id)) {
    favorites.delete(track.id);
  } else {
    favorites.add(track.id);
  }

  saveFavorites();
  render();
}




// 
function deleteAlbum(genreName, albumName) {
  if (!genreName || !albumName) return;

  if (!confirm(`¿Eliminar el álbum "${albumName}"?\nSe borrarán todas sus canciones.`)) return;

  // Si está sonando una canción de ese álbum -> parar
  const current = (currentIndex >= 0 && queue[currentIndex]) ? queue[currentIndex] : null;
  if (current && current.genre === genreName && current.album === albumName) {
    pause();
    currentIndex = -1;
    audio.src = "";
  }

  // Borrar el álbum
  if (library.genres?.[genreName]?.albums?.[albumName]) {
    delete library.genres[genreName].albums[albumName];
  }

  // Si el género quedó vacío -> borrar género
  const leftAlbums = Object.keys(library.genres?.[genreName]?.albums ?? {});
  if (leftAlbums.length === 0) {
    delete library.genres[genreName];
    if (selectedGenre === genreName) selectedGenre = null;
  }

  // Si estabas viendo ese álbum -> volver a álbumes
  if (selectedAlbum === albumName) selectedAlbum = null;
  if (view === "songs") view = "albums";

  saveLibrary();
  render();
}

//






// --------- Player ----------
async function playFromQueue(index) {

  queue = buildQueueForCurrentView();

  if (index < 0 || index >= queue.length) return;

  currentIndex = index;
  const t = queue[currentIndex];

  // 🔥 ORDEN CORRECTO
  audio.src = fixDropbox(t.url);
  preloadNextTrack();
  audio.load();

  updateNowPlayingUI(t);

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: t.album,
        artwork: t.cover
          ? [{ src: t.cover, sizes: "512x512", type: "image/png" }]
          : []
      });

      navigator.mediaSession.setActionHandler("play", () => resume());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prevBtn.click());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextBtn.click());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.fastSeek && "fastSeek" in audio) {
          audio.fastSeek(details.seekTime);
        } else {
          audio.currentTime = details.seekTime;
        }
      });

audio.addEventListener("playing", () => {

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "playing";
  }

});

audio.addEventListener("pause", () => {

  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }

});



    } catch (e) {
      console.log("MediaSession error:", e);
    }
  }

  /*try {
    await audio.play();
    isPlaying = true;
    updatePlayButtons();
    if (playFull) playFull.textContent = "⏸";
  } catch {
    const once = () => {
      audio.removeEventListener("canplay", once);
      audio.play().catch(()=>{});
    };
    audio.addEventListener("canplay", once);
  }*/


    try {

  await audio.play();
    isPlaying = true;
    updatePlayButtons();
    if (playFull) playFull.textContent = "⏸";
} catch (err) {

  // iPhone a veces necesita esperar a que cargue
  const once = () => {
    audio.removeEventListener("canplay", once);
    audio.play().catch(()=>{});
  };

  audio.addEventListener("canplay", once);

}






  // 🚫 NO render() aquí
}




function updateNowPlayingUI(t) {
  if (!t) return;

  // 🎵 FULL PLAYER
  bigTitle.textContent = t.title || "—";
  bigArtist.textContent = `${t.artist || "—"} · ${t.genre || "—"} · ${t.album || "—"}`;

  if (t.cover) {
    bigCover.style.backgroundImage = `url("${t.cover}")`;
    bigCover.style.backgroundSize = "cover";
    bigCover.style.backgroundPosition = "center";
    bigCover.textContent = "";
  } else {
    bigCover.style.backgroundImage = "";
    bigCover.textContent = "♪";
  }

  // 🎵 MINI PLAYER (barra inferior)
  npTitle.textContent = t.title || "Nada reproduciendo";
  npSub.textContent = `${t.artist || ""} · ${t.genre || ""} · ${t.album || ""}`;

  if (t.cover) {
    coverEl.style.backgroundImage = `url("${t.cover}")`;
    coverEl.style.backgroundSize = "cover";
    coverEl.style.backgroundPosition = "center";
    coverEl.textContent = "";
  } else {
    coverEl.style.backgroundImage = "";
    coverEl.textContent = "♪";
  }


// Sincronizar corazón del full player

if (favFullBtn) {
  favFullBtn.textContent = favorites.has(t.id) ? "❤️" : "🤍";
}


if (favFullBtn) {
  if (favorites.has(t.id)) {
    favFullBtn.classList.add("active");
  } else {
    favFullBtn.classList.remove("active");
  }
}



  speedControl.value = String(audio.playbackRate || 1);
}

  navigator.mediaSession.setActionHandler("play", async () => {
    await audio.play();
  });

  navigator.mediaSession.setActionHandler("pause", () => {
    audio.pause();
  });

  navigator.mediaSession.setActionHandler("previoustrack", () => {
    prevBtn.click();






  }






);



function pause() {
  audio.pause();
  isPlaying = false;
  updatePlayButtons();
  if (playFull) playFull.textContent = "▶";

  if ("mediaSession" in navigator) {
  navigator.mediaSession.playbackState = "paused";
}
}

/*async function resume() {
  try {
    await audio.play();
    isPlaying = true;
    updatePlayButtons();
    if (playFull) playFull.textContent = "⏸";
  } catch {
    isPlaying = false;
  }

  if ("mediaSession" in navigator) {
  navigator.mediaSession.playbackState = "playing";
}

}*/


/*async function resume() {

  try {

    if (!audio.src) return;

    // si el audio fue suspendido por iOS
    if (audio.readyState === 0) {
      audio.load();
    }

    await audio.play();

    isPlaying = true;

    updatePlayButtons();

    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = "playing";
    }

  } catch (err) {

    console.log("Resume error:", err);

    // iOS a veces necesita esperar a que cargue
    const once = () => {
      audio.removeEventListener("canplay", once);
      audio.play().catch(()=>{});
    };

    audio.addEventListener("canplay", once);

  }

}*/

async function resume() {

  try {

    if (!audio.src) return;

    // Si iPhone suspendió el audio
    if (audio.readyState === 0) {
      audio.load();
    }

    await audio.play();

    isPlaying = true;

    playBtn.textContent = "⏸";
    if (playFull) playFull.textContent = "⏸";

  } catch (err) {

    console.log("Resume error:", err);

    // Safari necesita esperar a que cargue
    const once = () => {
      audio.removeEventListener("canplay", once);
      audio.play().catch(()=>{});
    };

    audio.addEventListener("canplay", once);

  }

}


// --------- Events ----------
playBtn.onclick = () => {
  if (audio.src && !audio.paused) pause();
  else resume();

};

// 🎵 ABRIR NOW PLAYING AL TOCAR PLAYER

document.querySelector(".player").addEventListener("click", (e) => {

  // Evita que botones internos disparen apertura
  if (e.target.closest("button") || e.target.closest("input")) return;

  if (!audio.src) return;

  if (currentIndex >= 0) {
    const t = queue[currentIndex];
    updateNowPlayingUI(t);
  }

  nowPlaying.classList.remove("np-hidden");
});

// 🔽 CERRAR NOW PLAYING
closeNowPlaying.addEventListener("click", () => {
  nowPlaying.classList.add("np-hidden");
});


// 🎛 SINCRONIZAR CONTROLES FULL PLAYER

if (playFull && playBtn) {
  playFull.addEventListener("click", () => {
    playBtn.click();
  });
}

if (prevFull && prevBtn) {
  prevFull.addEventListener("click", () => {
    prevBtn.click();
  });
}

if (nextFull && nextBtn) {
  nextFull.addEventListener("click", () => {
    nextBtn.click();
  });
}

if (shuffleFull) {
  shuffleFull.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleFull.classList.toggle("active", isShuffle);
  });
}




if (favFullBtn) {
  favFullBtn.addEventListener("click", () => {

    if (currentIndex < 0) return;

    const t = queue[currentIndex];

    toggleFavorite(t);

    // 🔥 actualizar visual inmediatamente
    if (favorites.has(t.id)) {
      favFullBtn.classList.add("active");
      favFullBtn.textContent = "❤️";
    } else {
      favFullBtn.classList.remove("active");
      favFullBtn.textContent = "🤍";
    }

  });
}


seekFull.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (seekFull.value / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {

  if (audio.duration) {
    seekFull.value = (audio.currentTime / audio.duration) * 100;
    seek.value = (audio.currentTime / audio.duration) * 100;
  }

  if ("mediaSession" in navigator && navigator.mediaSession.setPositionState) {
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration || 0,
        playbackRate: audio.playbackRate || 1,
        position: audio.currentTime || 0,
      });
    } catch {}
  }
});




prevBtn.onclick = () => {
  queue = buildQueueForCurrentView();
  if (!queue.length) return;

 if (isShuffle) {

  if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
    shuffleOrder = makeShuffleOrder(queue.length);
    shufflePos = 0;
  }

  shufflePos++;

  if (shufflePos >= shuffleOrder.length) {
    shuffleOrder = makeShuffleOrder(queue.length);
    shufflePos = 0;
  }

  playFromQueue(shuffleOrder[shufflePos]);
  return;
}

  const next = currentIndex <= 0 ? 0 : currentIndex - 1;
  playFromQueue(next);
};

nextBtn.onclick = () => {
  queue = buildQueueForCurrentView();
  if (!queue.length) return;

  if (isShuffle) {
    if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
      shuffleOrder = makeShuffleOrder(queue.length);
      shufflePos = 0;
    }
    shufflePos++;

    // si se acabó, genera nuevo orden (sin repetir hasta terminar)
    if (shufflePos >= shuffleOrder.length) {
      shuffleOrder = makeShuffleOrder(queue.length);
      shufflePos = 0;
    }

    playFromQueue(shuffleOrder[shufflePos]);
    return;
  }

  const next = currentIndex >= queue.length - 1 ? currentIndex : currentIndex + 1;
  playFromQueue(next);
};

audio.addEventListener("loadedmetadata", () => {
  tDur.textContent = fmtTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  tCur.textContent = fmtTime(audio.currentTime);
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    seek.value = (audio.currentTime / audio.duration) * 100;
  }
});

seek.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
  audio.currentTime = (Number(seek.value) / 100) * audio.duration;
});

/*audio.addEventListener("ended", async () => {

  if (!queue.length) return;

  let next;

  if (repeatMode === "one") {
    next = currentIndex;
  }
  else if (isShuffle) {
    next = Math.floor(Math.random() * queue.length);
  }
  else {
    next = currentIndex + 1;
    if (next >= queue.length) {
      if (repeatMode === "all") next = 0;
      else {
        pause();
        return;
      }
    }
  }

  await playFromQueue(next);

});*/

audio.addEventListener("ended", () => {

  if (!queue.length) return;

  // repetir una canción
  if (repeatMode === "one") {
    playFromQueue(currentIndex);
    return;
  }

  // shuffle inteligente
  if (isShuffle) {

    if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
      shuffleOrder = makeShuffleOrder(queue.length);
      shufflePos = 0;
    }

    shufflePos++;

    if (shufflePos >= shuffleOrder.length) {

      if (repeatMode === "all") {
        shuffleOrder = makeShuffleOrder(queue.length);
        shufflePos = 0;
      } else {
        pause();
        return;
      }

    }

    playFromQueue(shuffleOrder[shufflePos]);
    return;

  }

  // modo normal
  let next = currentIndex + 1;

  if (next >= queue.length) {

    if (repeatMode === "all") next = 0;
    else {
      pause();
      return;
    }

  }

  playFromQueue(next);

});

vol.addEventListener("input", () => {
  const v = Number(vol.value);
  audio.volume = v;
 
});

// Nav
navGenres.onclick = () => { view = "genres"; selectedGenre = null; selectedAlbum = null; render(); };
navAlbums.onclick = () => { view = "albums"; selectedAlbum = null; render(); };
navSongs.onclick = () => { view = "songs"; render(); };


const navCollections = document.getElementById("navCollections");

if (navCollections) {
  navCollections.onclick = () => {
    view = "collections";
    selectedGenre = null;
    selectedAlbum = null;
    render();
  };
}




// Search
searchInput.addEventListener("input", () => {

  const q = normalize(searchInput.value);

  // Si empieza a escribir
  if (q.length > 0) {

    // Guardamos vista anterior solo una vez
    if (!previousView) {
      previousView = view;
    }

    view = "songs";
    selectedGenre = null;
    selectedAlbum = null;

  } else {

    // Si borra búsqueda
    if (previousView) {
      view = previousView;
      previousView = null;
    }

  }

  render();
});

// Modal open/close
btnAdd.onclick = openModal;
if (btnAdd2) btnAdd2.onclick = openModal;
closeModal.onclick = closeModalFn;
cancelSong.onclick = closeModalFn;

function openModal() {
  setMsg("");
  inTitle.value = "";
  inArtist.value = "";
  inGenre.value = selectedGenre ?? "";
  inAlbum.value = selectedAlbum ?? "";
  inUrl.value = "";
  inCover.value = "";

  modal.classList.remove("modal-hidden");
}

function closeModalFn() {
  modal.classList.add("modal-hidden");
  setMsg("");
}

// Save song
saveSong.onclick = () => {
  const title = normalize(inTitle.value);
  const artist = normalize(inArtist.value);
  const genre = normalize(inGenre.value);
  const album = normalize(inAlbum.value) || "Singles";
  const urlRaw = normalize(inUrl.value);
  const cover = normalize(inCover.value);

  if (!title || !artist || !genre || !urlRaw) {
    setMsg("Completa: Nombre, Artista, Género y Link del MP3.");
    return;
  }

  const directUrl = driveToDirect(urlRaw);

  ensurePath(genre, album);

  // guardamos cover de álbum si no existía y el usuario envió una
  if (cover && !library.genres[genre].albums[album].cover) {
    library.genres[genre].albums[album].cover = cover;
  }

  library.genres[genre].albums[album].tracks.push({
    id: cryptoId(),
    title,
    artist,
    url: directUrl,
    cover: cover || library.genres[genre].albums[album].cover || ""
  });

  saveLibrary();

  // actualizamos selección para que el usuario lo vea
  selectedGenre = genre;
  selectedAlbum = album;
  view = "songs";
  closeModalFn();
  render();
};

// --------- ID helper ----------
function cryptoId() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return "id_" + Math.random().toString(16).slice(2) + Date.now().toString(16);
}



