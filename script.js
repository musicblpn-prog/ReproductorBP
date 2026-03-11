// ==============================
// Mi Music - Drive Library
// Género -> Álbum -> Canciones
// Persistencia: localStorage
// ==============================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";

const audio = document.getElementById("audio");
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







// --------- State ----------
let library = loadLibrary(); // {genres:{[name]:{albums:{[name]:{cover, tracks:[]}}}}}
let view = "genres"; // genres | albums | songs | collections
let selectedGenre = null;
let selectedAlbum = null;

let queue = []; // lista de tracks visibles (para siguiente/anterior)
let currentIndex = -1;
let isPlaying = false;
let favorites = loadFavorites();
let isShuffle = false;
let repeatMode = "off";// puede ser: "off" | "all" | "one"
let previousView = null;
// --------- Init ----------
audio.volume = Number(vol.value);
render();

if (!library.collections["Favoritos"]) {
  library.collections["Favoritos"] = [];
}

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

  const q = normalize(searchInput.value).toLowerCase();
  listEl.innerHTML = "";

  const hasAny = allTracks().length > 0;
  emptyEl.classList.toggle("hidden", hasAny);

  if (!hasAny) {
    // solo mostramos vacío
    return;
  }

if (view === "collections") {

  const collections = Object.keys(library.collections);

  collections.forEach(name => {
    const trackIds = library.collections[name] || [];

    listEl.appendChild(card({
      title: name,
      sub: `${trackIds.length} canción(es)`,
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


if (view === "collectionSongs") {

  const trackIds = library.collections[selectedAlbum] || [];
  const tracks = allTracks().filter(t => trackIds.includes(t.id));

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

  // Si tiene portada la aplicamos
  if (t.cover) {
    const cover = div.querySelector(".song-cover");
    cover.style.backgroundImage = `url("${t.cover}")`;
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
  }

  div.querySelector(".play-btn").onclick = (e) => {
    e.stopPropagation();
    playFromQueue(idx);
  };

  div.querySelector(".delete-btn").onclick = (e) => {
    e.stopPropagation();
    deleteSong(t);
  };

div.querySelector(".fav-btn").onclick = (e) => {
  e.stopPropagation();

  if (favorites.has(t.id)) {
    favorites.delete(t.id);

    // quitar de colección Favoritos
    library.collections["Favoritos"] =
      library.collections["Favoritos"].filter(id => id !== t.id);

  } else {
    favorites.add(t.id);

    // agregar a colección Favoritos
    if (!library.collections["Favoritos"].includes(t.id)) {
      library.collections["Favoritos"].push(t.id);
    }
  }

  saveFavorites();
  saveLibrary();
  render();
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
  if (index < 0 || index >= queue.length) return;

  currentIndex = index;
  const t = queue[currentIndex];

  audio.src = t.url;
  
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

      navigator.mediaSession.setActionHandler("play", () => audio.play());
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => prevBtn.click());
      navigator.mediaSession.setActionHandler("nexttrack", () => nextBtn.click());
    } catch (e) {
      console.log("MediaSession error:", e);
    }
  }

  try {
    await audio.play();
    isPlaying = true;
    playBtn.textContent = "⏸";
  } catch (err) {
    console.log("Audio play error:", err);
    isPlaying = false;
    playBtn.textContent = "▶";
  }

  render();
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
  });



function pause() {
  audio.pause();
  isPlaying = false;
  playBtn.textContent = "▶";
  if (playFull) playFull.textContent = "▶";
}

async function resume() {
  try {
    await audio.play();
    isPlaying = true;
    playBtn.textContent = "⏸";
    if (playFull) playFull.textContent = "⏸";
  } catch {
    isPlaying = false;
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

    if (favorites.has(t.id)) {
      favorites.delete(t.id);

      library.collections["Favoritos"] =
        library.collections["Favoritos"].filter(id => id !== t.id);

    } else {
      favorites.add(t.id);

      if (!library.collections["Favoritos"].includes(t.id)) {
        library.collections["Favoritos"].push(t.id);
      }
    }

    saveFavorites();
    saveLibrary();
    updateNowPlayingUI(t);
    render();
  });
}


seekFull.addEventListener("input", () => {
  if (!audio.duration) return;
  audio.currentTime = (seekFull.value / 100) * audio.duration;
});

audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    seekFull.value = (audio.currentTime / audio.duration) * 100;
  }
});

speedControl.addEventListener("change", () => {
  audio.playbackRate = parseFloat(speedControl.value);
});




prevBtn.onclick = () => {
  if (!queue.length) return;
  const next = currentIndex <= 0 ? 0 : currentIndex - 1;
  playFromQueue(next);
};

nextBtn.onclick = () => {
  if (!queue.length) return;
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

audio.addEventListener("ended", () => {

  if (!queue.length) return;

  // 🔁 Repetir una sola canción
  if (repeatMode === "one") {
    playFromQueue(currentIndex);
    return;
  }

  let next;

  // 🔀 Si shuffle está activo
  if (isShuffle) {
    next = Math.floor(Math.random() * queue.length);
  } 
  else {
    // Normal secuencial
    next = currentIndex >= queue.length - 1
      ? 0
      : currentIndex + 1;
  }

  // 🚫 Si repeat está apagado y estamos en la última
  if (repeatMode === "off" && currentIndex >= queue.length - 1 && !isShuffle) {
    pause();
    return;
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



