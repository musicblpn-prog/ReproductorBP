// ==============================
// Mi Music - motor robusto iPhone/PWA
// Compatible con tu HTML actual
// ==============================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";
const LS_SESSION = "mi_music_playback_session_v2";

const $ = (id) => document.getElementById(id);

// ---------- DOM ----------
const audio = $("audio");
const playBtn = $("playBtn");
const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");
const seek = $("seek");
const vol = $("vol");
const tCur = $("tCur");
const tDur = $("tDur");

const npTitle = $("npTitle");
const npSub = $("npSub");
const coverEl = $("cover");

const listEl = $("list");
const emptyEl = $("empty");
const crumbsEl = $("crumbs");

const navGenres = $("navGenres");
const navAlbums = $("navAlbums");
const navSongs = $("navSongs");
const navCollections = $("navCollections");
const searchInput = $("searchInput");

const modal = $("modal");
const btnAdd = $("btnAdd");
const btnAdd2 = $("btnAdd2");
const closeModal = $("closeModal");
const cancelSong = $("cancelSong");
const saveSong = $("saveSong");
const msg = $("msg");

const inTitle = $("inTitle");
const inArtist = $("inArtist");
const inGenre = $("inGenre");
const inAlbum = $("inAlbum");
const inUrl = $("inUrl");
const inCover = $("inCover");

const nowPlaying = $("nowPlaying");
const closeNowPlaying = $("closeNowPlaying");
const bigTitle = $("bigTitle");
const bigArtist = $("bigArtist");
const bigCover = $("bigCover");

const seekFull = $("seekFull");
const playFull = $("playFull");
const prevFull = $("prevFull");
const nextFull = $("nextFull");
const shuffleFull = $("shuffleFull");
const repeatFull = $("repeatFull");
const speedControl = $("speedControl");
const favFullBtn = $("favFullBtn");

const audioPreload = new Audio();
audioPreload.preload = "auto";

// ---------- Audio base ----------
audio.preload = "auto";
audio.crossOrigin = "anonymous";
audio.playsInline = true;
audio.setAttribute("playsinline", "");
audio.setAttribute("webkit-playsinline", "");
audio.setAttribute("preload", "auto");

// ---------- State ----------
let library = loadLibrary();
let favorites = loadFavorites();

let view = "genres"; // genres | albums | songs | collections | collectionSongs
let previousView = null;
let selectedGenre = null;
let selectedAlbum = null;

let queueContext = { type: "all" };
let queue = [];
let currentIndex = -1;
let currentTrackId = null;

let isShuffle = false;
let repeatMode = "off"; // off | all | one
let shuffleOrder = [];
let shufflePos = 0;

let desiredPlaying = false;
let isLoadingTrack = false;
let isSeeking = false;
let pausedBySystem = false;
let restoringFromSession = false;
let lastInteractionAt = 0;
let restoreAttempts = 0;
let currentLoadToken = 0;

// ---------- Storage ----------
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
    if (!parsed.genres || typeof parsed.genres !== "object") parsed.genres = {};
    if (!parsed.collections || typeof parsed.collections !== "object") parsed.collections = {};
    return parsed;
  } catch {
    return defaultLibrary();
  }
}

function saveLibrary() {
  localStorage.setItem(LS_KEY, JSON.stringify(library));
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_FAV);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem(LS_FAV, JSON.stringify([...favorites]));
}

function persistPlaybackSession() {
  try {
    const payload = {
      currentTrackId,
      currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
      volume: Number.isFinite(audio.volume) ? audio.volume : 0.9,
      speed: Number.isFinite(audio.playbackRate) ? audio.playbackRate : 1,
      isShuffle,
      repeatMode,
      desiredPlaying,
      updatedAt: Date.now()
    };
    localStorage.setItem(LS_SESSION, JSON.stringify(payload));
  } catch {}
}

function loadPlaybackSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------- Helpers ----------
function normalize(str) {
  return (str ?? "").toString().trim();
}

function escapeHtml(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fmtTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setMsg(text) {
  if (!msg) return;
  if (!text) {
    msg.classList.add("hidden");
    msg.textContent = "";
    return;
  }
  msg.classList.remove("hidden");
  msg.textContent = text;
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function markUserInteraction() {
  lastInteractionAt = Date.now();
}

function wasRecentUserInteraction(ms = 1500) {
  return Date.now() - lastInteractionAt <= ms;
}

function convertToDirectUrl(url) {
  const u = normalize(url);
  if (!u) return "";

  // Dropbox
  if (u.includes("dropbox.com")) {
    return u
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("dropbox.com", "dl.dropboxusercontent.com")
      .replace(/[?&]dl=0/, "")
      .replace(/[?&]raw=1/, "")
      .replace(/&st=[^&]+/, "");
  }

  // Google Drive
  if (u.includes("drive.google.com/uc?") && u.includes("id=")) return u;

  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  }

  const openMatch = u.match(/[?&]id=([^&]+)/i);
  if (u.includes("drive.google.com") && openMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  }

  return u;
}

function ensurePath(genre, album) {
  if (!library.genres[genre]) library.genres[genre] = { albums: {} };
  if (!library.genres[genre].albums[album]) {
    library.genres[genre].albums[album] = { cover: "", tracks: [] };
  }
}

function allTracks() {
  const out = [];
  for (const [genreName, genre] of Object.entries(library.genres)) {
    for (const [albumName, album] of Object.entries(genre.albums ?? {})) {
      for (const track of (album.tracks ?? [])) {
        out.push({ ...track, genre: genreName, album: albumName });
      }
    }
  }
  return out;
}

function favoriteTracks() {
  return allTracks().filter((track) => favorites.has(track.id));
}

function findTrackById(trackId) {
  if (!trackId) return null;
  return allTracks().find((track) => track.id === trackId) || null;
}

function cleanFavoritesAndCollections() {
  const existingIds = new Set(allTracks().map((track) => track.id));

  const cleanFav = new Set([...favorites].filter((id) => existingIds.has(id)));
  if (cleanFav.size !== favorites.size) {
    favorites = cleanFav;
    saveFavorites();
  }

  for (const [name, ids] of Object.entries(library.collections || {})) {
    const filtered = Array.isArray(ids) ? ids.filter((id) => existingIds.has(id)) : [];
    library.collections[name] = [...new Set(filtered)];
    if (library.collections[name].length === 0 && name !== "Favoritos") {
      delete library.collections[name];
    }
  }

  saveLibrary();
}

function matchTrack(track, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [track.title, track.artist, track.genre, track.album]
    .some((field) => (field ?? "").toLowerCase().includes(q));
}

function setActiveNav() {
  [navGenres, navAlbums, navSongs, navCollections].forEach((btn) => btn?.classList.remove("active"));
  if (view === "genres") navGenres?.classList.add("active");
  if (view === "albums") navAlbums?.classList.add("active");
  if (view === "songs") navSongs?.classList.add("active");
  if (view === "collections" || view === "collectionSongs") navCollections?.classList.add("active");
}

function setCrumbs() {
  if (!crumbsEl) return;
  crumbsEl.innerHTML = "";

  const parts = [];

  if (view === "collections" || view === "collectionSongs") {
    parts.push({
      label: "Colecciones",
      click: () => {
        view = "collections";
        selectedGenre = null;
        selectedAlbum = null;
        render();
      }
    });

    if (view === "collectionSongs" && selectedAlbum) {
      parts.push({ label: selectedAlbum, click: null });
    }
  } else {
    parts.push({
      label: "Géneros",
      click: () => {
        view = "genres";
        selectedGenre = null;
        selectedAlbum = null;
        render();
      }
    });

    if ((view === "albums" || view === "songs") && selectedGenre) {
      parts.push({
        label: selectedGenre,
        click: () => {
          view = "albums";
          selectedAlbum = null;
          render();
        }
      });
    }

    if (view === "songs" && selectedAlbum) {
      parts.push({ label: selectedAlbum, click: null });
    }
  }

  parts.forEach((part, idx) => {
    const span = document.createElement("span");
    span.className = `crumb${idx === parts.length - 1 ? " strong" : ""}`;
    span.textContent = part.label;
    if (idx !== parts.length - 1 && part.click) {
      span.style.cursor = "pointer";
      span.onclick = part.click;
    }
    crumbsEl.appendChild(span);
  });
}

function card({ title, sub, pill, onClick }) {
  const div = document.createElement("div");
  div.className = "card";
  div.innerHTML = `
    <div class="row">
      <div class="card-title">${escapeHtml(title)}</div>
      ${pill ? `<span class="pill">${escapeHtml(pill)}</span>` : ""}
    </div>
    <div class="card-sub">${escapeHtml(sub)}</div>
  `;
  if (onClick) div.addEventListener("click", onClick);
  return div;
}

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
  if (onClick) div.addEventListener("click", onClick);
  div.querySelector(".album-del")?.addEventListener("click", (e) => {
    e.stopPropagation();
    onDelete?.();
  });
  return div;
}

function songRow(track, idx) {
  const div = document.createElement("div");
  div.className = "card song-card";
  const active = currentTrackId === track.id ? " · Reproduciendo" : "";

  div.innerHTML = `
    <div class="song-left">
      <div class="song-cover">${track.cover ? "" : "♪"}</div>
      <div class="song-info">
        <div class="card-title">${escapeHtml(track.title)}</div>
        <div class="card-sub">
          ${escapeHtml(track.artist)} ·
          ${escapeHtml(track.genre)} ·
          ${escapeHtml(track.album)}${escapeHtml(active)}
        </div>
        <div class="row" style="margin-top:8px;">
          <span class="pill play-btn">▶</span>
          <span class="fav-btn">${favorites.has(track.id) ? "❤️" : "🤍"}</span>
          <span class="delete-btn">🗑</span>
        </div>
      </div>
    </div>
  `;

  if (track.cover) {
    const cover = div.querySelector(".song-cover");
    cover.style.backgroundImage = `url("${track.cover}")`;
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
  }

  const playAction = div.querySelector(".play-btn");
  const favBtn = div.querySelector(".fav-btn");
  const deleteBtn = div.querySelector(".delete-btn");

  playAction?.addEventListener("click", async (e) => {
    e.stopPropagation();
    await playFromQueue(idx, { source: "row" });
  });

  favBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFavorite(track);
  });

  deleteBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteSong(track);
  });

  return div;
}

function buildQueueForCurrentView() {
  const q = normalize(searchInput?.value).toLowerCase();

  if (view === "collectionSongs" && selectedAlbum === "Favoritos") {
    queueContext = { type: "favorites" };
    let tracks = favoriteTracks();
    if (q) tracks = tracks.filter((track) => matchTrack(track, q));
    tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
    return tracks;
  }

  if (view === "collectionSongs" && selectedAlbum && selectedAlbum !== "Favoritos") {
    queueContext = { type: "collection", name: selectedAlbum };
    const ids = library.collections[selectedAlbum] || [];
    let tracks = allTracks().filter((track) => ids.includes(track.id));
    if (q) tracks = tracks.filter((track) => matchTrack(track, q));
    tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
    return tracks;
  }

  if (view === "songs" && selectedGenre && selectedAlbum && !q) {
    queueContext = { type: "album", genre: selectedGenre, album: selectedAlbum };
    const tracks = (library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [])
      .map((track) => ({ ...track, genre: selectedGenre, album: selectedAlbum }));
    tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
    return tracks;
  }

  queueContext = { type: "all" };
  let tracks = allTracks();
  if (q) tracks = tracks.filter((track) => matchTrack(track, q));
  tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
  return tracks;
}

function syncQueueFromCurrentView() {
  queue = buildQueueForCurrentView();
  currentIndex = queue.findIndex((track) => track.id === currentTrackId);
  return queue;
}

function makeShuffleOrder(length) {
  const order = [...Array(length).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  if (currentIndex >= 0 && order.length > 1) {
    const currentPos = order.indexOf(currentIndex);
    if (currentPos > 0) {
      [order[0], order[currentPos]] = [order[currentPos], order[0]];
    }
  }
  return order;
}

function resetShuffle() {
  shuffleOrder = [];
  shufflePos = 0;
}

function render() {
  cleanFavoritesAndCollections();
  setActiveNav();
  setCrumbs();

  const q = normalize(searchInput?.value).toLowerCase();
  listEl.innerHTML = "";

  const hasAny = allTracks().length > 0;
  emptyEl?.classList.toggle("hidden", hasAny);
  if (!hasAny) return;

  if (view === "collections") {
    const names = Object.keys(library.collections || {}).sort((a, b) => a.localeCompare(b));
    if (!names.includes("Favoritos")) names.unshift("Favoritos");

    names.forEach((name) => {
      const count = name === "Favoritos"
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

    syncQueueFromCurrentView();
    return;
  }

  if (view === "collectionSongs") {
    let tracks = selectedAlbum === "Favoritos"
      ? favoriteTracks()
      : allTracks().filter((track) => (library.collections[selectedAlbum] || []).includes(track.id));

    if (q) tracks = tracks.filter((track) => matchTrack(track, q));
    tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));
    queue = tracks;
    currentIndex = queue.findIndex((track) => track.id === currentTrackId);
    tracks.forEach((track, idx) => listEl.appendChild(songRow(track, idx)));
    return;
  }

  if (view === "genres") {
    const genres = Object.keys(library.genres).sort((a, b) => a.localeCompare(b));
    const filtered = q ? genres.filter((genre) => genre.toLowerCase().includes(q)) : genres;

    filtered.forEach((genreName) => {
      const albumsCount = Object.keys(library.genres[genreName].albums ?? {}).length;
      const tracksCount = Object.values(library.genres[genreName].albums ?? {})
        .reduce((acc, album) => acc + (album.tracks?.length ?? 0), 0);

      listEl.appendChild(card({
        title: genreName,
        sub: `${albumsCount} álbum(es) · ${tracksCount} canción(es)`,
        pill: "Abrir",
        onClick: () => {
          selectedGenre = genreName;
          selectedAlbum = null;
          view = "albums";
          render();
        }
      }));
    });

    syncQueueFromCurrentView();
    return;
  }

  if (view === "albums") {
    if (!selectedGenre) {
      const albums = [];
      for (const [genreName, genre] of Object.entries(library.genres)) {
        for (const [albumName, album] of Object.entries(genre.albums ?? {})) {
          albums.push({
            genre: genreName,
            album: albumName,
            cover: album.cover ?? "",
            tracks: album.tracks ?? []
          });
        }
      }

      const filtered = q
        ? albums.filter((item) => `${item.album} ${item.genre}`.toLowerCase().includes(q))
        : albums;

      filtered
        .sort((a, b) => (a.album + a.genre).localeCompare(b.album + b.genre))
        .forEach((item) => {
          listEl.appendChild(cardAlbum({
            title: item.album,
            sub: `${item.genre} · ${item.tracks.length} canción(es)`,
            pill: "Abrir",
            onClick: () => {
              selectedGenre = item.genre;
              selectedAlbum = item.album;
              view = "songs";
              render();
            },
            onDelete: () => deleteAlbum(item.genre, item.album)
          }));
        });

      syncQueueFromCurrentView();
      return;
    }

    const albums = Object.keys(library.genres[selectedGenre]?.albums ?? {}).sort((a, b) => a.localeCompare(b));
    const filtered = q ? albums.filter((albumName) => albumName.toLowerCase().includes(q)) : albums;

    filtered.forEach((albumName) => {
      const album = library.genres[selectedGenre].albums[albumName];
      listEl.appendChild(cardAlbum({
        title: albumName,
        sub: `${album.tracks?.length ?? 0} canción(es)`,
        pill: "Abrir",
        onClick: () => {
          selectedAlbum = albumName;
          view = "songs";
          render();
        },
        onDelete: () => deleteAlbum(selectedGenre, albumName)
      }));
    });

    syncQueueFromCurrentView();
    return;
  }

  if (view === "songs") {
    let tracks = [];
    if (selectedGenre && selectedAlbum && !q) {
      const album = library.genres[selectedGenre]?.albums?.[selectedAlbum];
      tracks = (album?.tracks ?? []).map((track) => ({ ...track, genre: selectedGenre, album: selectedAlbum }));
    } else {
      tracks = allTracks();
    }

    if (q) tracks = tracks.filter((track) => matchTrack(track, q));
    tracks.sort((a, b) => (a.artist + a.album + a.title).localeCompare(b.artist + b.album + b.title));

    queue = tracks;
    currentIndex = queue.findIndex((track) => track.id === currentTrackId);

    tracks.forEach((track, idx) => listEl.appendChild(songRow(track, idx)));
    return;
  }
}

// ---------- Favorites / delete ----------
function toggleFavorite(track) {
  if (!track?.id) return;
  if (favorites.has(track.id)) favorites.delete(track.id);
  else favorites.add(track.id);

  saveFavorites();
  updateFavoriteButton(track);
  render();
}

function updateFavoriteButton(track) {
  if (!favFullBtn || !track?.id) return;
  const active = favorites.has(track.id);
  favFullBtn.classList.toggle("active", active);
  favFullBtn.textContent = active ? "❤️" : "🤍";
}

function deleteSong(track) {
  if (!track) return;
  if (!confirm(`¿Eliminar "${track.title}"?`)) return;

  const albumTracks = library.genres[track.genre]?.albums?.[track.album]?.tracks;
  if (!albumTracks) return;

  library.genres[track.genre].albums[track.album].tracks = albumTracks.filter((item) => item.id !== track.id);

  if (currentTrackId === track.id) {
    hardPause({ clearIntent: true });
    audio.removeAttribute("src");
    audio.load();
    currentTrackId = null;
    currentIndex = -1;
    updateNowPlayingUI(null);
    updatePlayButtons();
  }

  cleanFavoritesAndCollections();
  saveLibrary();
  persistPlaybackSession();
  render();
}

function deleteAlbum(genreName, albumName) {
  if (!genreName || !albumName) return;
  if (!confirm(`¿Eliminar el álbum "${albumName}"?\nSe borrarán todas sus canciones.`)) return;

  const currentTrack = findTrackById(currentTrackId);
  if (currentTrack && currentTrack.genre === genreName && currentTrack.album === albumName) {
    hardPause({ clearIntent: true });
    audio.removeAttribute("src");
    audio.load();
    currentTrackId = null;
    currentIndex = -1;
    updateNowPlayingUI(null);
  }

  delete library.genres?.[genreName]?.albums?.[albumName];

  const leftAlbums = Object.keys(library.genres?.[genreName]?.albums ?? {});
  if (!leftAlbums.length) {
    delete library.genres[genreName];
    if (selectedGenre === genreName) selectedGenre = null;
  }

  if (selectedAlbum === albumName) selectedAlbum = null;
  if (view === "songs") view = "albums";

  cleanFavoritesAndCollections();
  saveLibrary();
  persistPlaybackSession();
  render();
}

// ---------- UI sync ----------
function setCoverElement(el, coverUrl, fallback = "♪") {
  if (!el) return;
  if (coverUrl) {
    el.textContent = "";
    el.style.backgroundImage = `url("${coverUrl}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  } else {
    el.textContent = fallback;
    el.style.backgroundImage = "";
  }
}

function updateNowPlayingUI(track) {
  if (!track) {
    npTitle.textContent = "Nada reproduciendo";
    npSub.textContent = "—";
    bigTitle.textContent = "Título";
    bigArtist.textContent = "Artista";
    setCoverElement(coverEl, "");
    setCoverElement(bigCover, "");
    updateFavoriteButton(null);
    return;
  }

  npTitle.textContent = track.title || "Sin título";
  npSub.textContent = `${track.artist || "Artista"} · ${track.album || "Álbum"}`;
  bigTitle.textContent = track.title || "Sin título";
  bigArtist.textContent = `${track.artist || "Artista"} · ${track.genre || "Género"} · ${track.album || "Álbum"}`;
  setCoverElement(coverEl, track.cover);
  setCoverElement(bigCover, track.cover);
  updateFavoriteButton(track);
}

function updatePlayButtons() {
  const paused = audio.paused || !audio.src;
  const label = paused ? "▶" : "⏸";
  if (playBtn) playBtn.textContent = label;
  if (playFull) playFull.textContent = label;
}

function updateRepeatButtons() {
  const active = repeatMode !== "off";
  if (repeatFull) {
    repeatFull.classList.toggle("active", active);
    repeatFull.textContent = repeatMode === "one" ? "🔂" : "🔁";
  }
}

function updateShuffleButtons() {
  shuffleFull?.classList.toggle("active", isShuffle);
}

function syncSeekUI() {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    const percent = (audio.currentTime / audio.duration) * 100;
    seek.value = String(percent);
    if (seekFull) seekFull.value = String(percent);
    tDur.textContent = fmtTime(audio.duration);
  } else {
    seek.value = "0";
    if (seekFull) seekFull.value = "0";
    tDur.textContent = "0:00";
  }
  tCur.textContent = fmtTime(audio.currentTime);
}

// ---------- Media Session ----------
function updatePositionState() {
  if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") return;
  try {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      navigator.mediaSession.setPositionState({ duration: 0, playbackRate: 1, position: 0 });
      return;
    }
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate || 1,
      position: Math.min(audio.currentTime || 0, audio.duration)
    });
  } catch {}
}

function updateMediaSessionPlaybackState() {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = (!audio.paused && desiredPlaying) ? "playing" : "paused";
    updatePositionState();
  } catch {}
}

function buildArtwork(track) {
  const src = track?.cover || "";
  if (!src) return [];
  return [96, 128, 192, 256, 384, 512].map((size) => ({
    src,
    sizes: `${size}x${size}`,
    type: src.endsWith(".png") ? "image/png" : "image/jpeg"
  }));
}

function updateMediaSessionMetadata(track) {
  if (!("mediaSession" in navigator) || !track) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || "Sin título",
      artist: track.artist || "Artista desconocido",
      album: track.album || "Álbum desconocido",
      artwork: buildArtwork(track)
    });
  } catch {}
}

function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;

  const bind = (action, handler) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch {}
  };

  bind("play", async () => {
    await resumePlayback({ source: "mediaSession", forceRecover: true });
  });

  bind("pause", () => {
    hardPause({ source: "mediaSession", clearIntent: true });
  });

  bind("previoustrack", async () => {
    await goToPreviousTrack({ source: "mediaSession" });
  });

  bind("nexttrack", async () => {
    await goToNextTrack({ source: "mediaSession" });
  });

  bind("seekto", async (details) => {
    if (!Number.isFinite(details.seekTime)) return;
    const target = Math.max(0, Math.min(details.seekTime, audio.duration || details.seekTime));
    audio.currentTime = target;
    syncSeekUI();
    updatePositionState();
  });

  bind("seekbackward", () => {
    audio.currentTime = Math.max(0, (audio.currentTime || 0) - 10);
    syncSeekUI();
    updatePositionState();
  });

  bind("seekforward", () => {
    audio.currentTime = Math.min(audio.duration || Infinity, (audio.currentTime || 0) + 10);
    syncSeekUI();
    updatePositionState();
  });
}

// ---------- Playback core ----------
function getCurrentTrack() {
  if (currentTrackId) {
    const fromQueue = queue.find((track) => track.id === currentTrackId);
    if (fromQueue) return fromQueue;
  }
  return findTrackById(currentTrackId);
}

function preloadNextTrack() {
  const nextTrack = getNextTrackPreview();
  if (!nextTrack) return;
  const nextSrc = convertToDirectUrl(nextTrack.url);
  if (audioPreload.src !== nextSrc) {
    audioPreload.src = nextSrc;
  }
}

function getNextTrackPreview() {
  const currentQueue = syncQueueFromCurrentView();
  if (!currentQueue.length || currentIndex < 0) return null;

  if (repeatMode === "one") return currentQueue[currentIndex];

  if (isShuffle) {
    if (!shuffleOrder.length || shuffleOrder.length !== currentQueue.length) {
      shuffleOrder = makeShuffleOrder(currentQueue.length);
      shufflePos = Math.max(0, shuffleOrder.indexOf(currentIndex));
    }
    const nextPos = shufflePos + 1;
    if (nextPos < shuffleOrder.length) return currentQueue[shuffleOrder[nextPos]];
    return repeatMode === "all" ? currentQueue[shuffleOrder[0]] : null;
  }

  const nextIndex = currentIndex + 1;
  if (nextIndex < currentQueue.length) return currentQueue[nextIndex];
  return repeatMode === "all" ? currentQueue[0] : null;
}

async function resilientPlay({ source = "ui", forceRecover = false } = {}) {
  if (!audio.src) return false;

  desiredPlaying = true;
  updateMediaSessionPlaybackState();

  try {
    await audio.play();
    restoreAttempts = 0;
    return true;
  } catch (err) {
    const shouldRecover = forceRecover || source === "mediaSession" || source === "system" || pausedBySystem;
    if (!shouldRecover || restoreAttempts >= 2) {
      console.warn("Play error:", err);
      return false;
    }

    restoreAttempts += 1;
    const timeToRestore = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const currentSrc = audio.currentSrc || audio.src;

    return new Promise((resolve) => {
      const onCanPlay = async () => {
        audio.removeEventListener("canplay", onCanPlay);
        try {
          if (timeToRestore > 0 && Number.isFinite(timeToRestore)) {
            try { audio.currentTime = timeToRestore; } catch {}
          }
          await audio.play();
          restoreAttempts = 0;
          resolve(true);
        } catch (retryErr) {
          console.warn("Recovery play error:", retryErr);
          resolve(false);
        }
      };

      audio.addEventListener("canplay", onCanPlay, { once: true });
      audio.src = currentSrc;
      audio.load();
    });
  }
}

async function loadTrack(track, { autoplay = true, startTime = 0, source = "ui" } = {}) {
  if (!track) return false;

  currentLoadToken += 1;
  const myToken = currentLoadToken;
  isLoadingTrack = true;
  desiredPlaying = autoplay;
  pausedBySystem = false;
  currentTrackId = track.id;
  syncQueueFromCurrentView();
  if (currentIndex < 0) {
    queue.push(track);
    currentIndex = queue.length - 1;
  }

  updateNowPlayingUI(track);
  updateMediaSessionMetadata(track);
  updateMediaSessionPlaybackState();
  updatePlayButtons();

  const src = convertToDirectUrl(track.url);
  if ((audio.currentSrc || audio.src) !== src) {
    audio.src = src;
  }
  audio.load();

  if (Number.isFinite(startTime) && startTime > 0) {
    const setStartTime = () => {
      try { audio.currentTime = startTime; } catch {}
    };
    audio.addEventListener("loadedmetadata", setStartTime, { once: true });
  }

  let played = true;
  if (autoplay) {
    played = await resilientPlay({ source, forceRecover: source === "mediaSession" || source === "system" });
  } else {
    hardPause({ clearIntent: false });
  }

  if (myToken !== currentLoadToken) return false;

  isLoadingTrack = false;
  updatePlayButtons();
  syncSeekUI();
  updateMediaSessionPlaybackState();
  preloadNextTrack();
  persistPlaybackSession();
  render();
  return played;
}

async function playFromQueue(index, { source = "ui" } = {}) {
  syncQueueFromCurrentView();
  if (index < 0 || index >= queue.length) return false;
  currentIndex = index;
  currentTrackId = queue[index].id;
  if (isShuffle) {
    if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
      shuffleOrder = makeShuffleOrder(queue.length);
    }
    shufflePos = Math.max(0, shuffleOrder.indexOf(index));
  }
  return loadTrack(queue[index], { autoplay: true, source });
}

function hardPause({ source = "ui", clearIntent = true } = {}) {
  if (clearIntent) desiredPlaying = false;
  pausedBySystem = source === "system";
  audio.pause();
  updatePlayButtons();
  updateMediaSessionPlaybackState();
  persistPlaybackSession();
}

async function resumePlayback({ source = "ui", forceRecover = false } = {}) {
  markUserInteraction();

  const currentTrack = getCurrentTrack();
  if (!currentTrack) {
    syncQueueFromCurrentView();
    if (queue.length) {
      return playFromQueue(Math.max(currentIndex, 0), { source });
    }
    return false;
  }

  desiredPlaying = true;

  if (!audio.src) {
    return loadTrack(currentTrack, { autoplay: true, source });
  }

  const ok = await resilientPlay({ source, forceRecover });
  if (ok) {
    pausedBySystem = false;
    updatePlayButtons();
    updateMediaSessionMetadata(currentTrack);
    updateMediaSessionPlaybackState();
    preloadNextTrack();
    persistPlaybackSession();
  }
  return ok;
}

async function togglePlayPause() {
  markUserInteraction();
  if (audio.src && !audio.paused) {
    hardPause({ source: "ui", clearIntent: true });
  } else {
    await resumePlayback({ source: "ui", forceRecover: false });
  }
}

function cycleRepeatMode() {
  if (repeatMode === "off") repeatMode = "all";
  else if (repeatMode === "all") repeatMode = "one";
  else repeatMode = "off";
  updateRepeatButtons();
  persistPlaybackSession();
}

async function goToPreviousTrack({ source = "ui" } = {}) {
  markUserInteraction();
  const currentQueue = syncQueueFromCurrentView();
  if (!currentQueue.length) return;

  if (audio.currentTime > 3 && !isShuffle) {
    audio.currentTime = 0;
    syncSeekUI();
    updatePositionState();
    return;
  }

  if (isShuffle) {
    if (!shuffleOrder.length || shuffleOrder.length !== currentQueue.length) {
      shuffleOrder = makeShuffleOrder(currentQueue.length);
      shufflePos = Math.max(0, shuffleOrder.indexOf(currentIndex));
    }
    shufflePos = Math.max(0, shufflePos - 1);
    await playFromQueue(shuffleOrder[shufflePos], { source });
    return;
  }

  const target = currentIndex > 0 ? currentIndex - 1 : 0;
  await playFromQueue(target, { source });
}

async function goToNextTrack({ source = "ui" } = {}) {
  markUserInteraction();
  const currentQueue = syncQueueFromCurrentView();
  if (!currentQueue.length) return;

  if (repeatMode === "one") {
    await playFromQueue(currentIndex >= 0 ? currentIndex : 0, { source });
    return;
  }

  if (isShuffle) {
    if (!shuffleOrder.length || shuffleOrder.length !== currentQueue.length) {
      shuffleOrder = makeShuffleOrder(currentQueue.length);
      shufflePos = Math.max(0, shuffleOrder.indexOf(currentIndex));
    }

    const nextPos = shufflePos + 1;
    if (nextPos >= shuffleOrder.length) {
      if (repeatMode === "all") {
        shuffleOrder = makeShuffleOrder(currentQueue.length);
        shufflePos = 0;
      } else {
        hardPause({ source, clearIntent: true });
        return;
      }
    } else {
      shufflePos = nextPos;
    }

    await playFromQueue(shuffleOrder[shufflePos], { source });
    return;
  }

  let target = currentIndex + 1;
  if (target >= currentQueue.length) {
    if (repeatMode === "all") target = 0;
    else {
      hardPause({ source, clearIntent: true });
      return;
    }
  }

  await playFromQueue(target, { source });
}

// ---------- Events ----------
function bindUIEvents() {
  playBtn?.addEventListener("click", togglePlayPause);
  playFull?.addEventListener("click", togglePlayPause);
  prevBtn?.addEventListener("click", () => goToPreviousTrack({ source: "ui" }));
  prevFull?.addEventListener("click", () => goToPreviousTrack({ source: "ui" }));
  nextBtn?.addEventListener("click", () => goToNextTrack({ source: "ui" }));
  nextFull?.addEventListener("click", () => goToNextTrack({ source: "ui" }));

  shuffleFull?.addEventListener("click", () => {
    isShuffle = !isShuffle;
    resetShuffle();
    updateShuffleButtons();
    persistPlaybackSession();
  });

  repeatFull?.addEventListener("click", cycleRepeatMode);

  favFullBtn?.addEventListener("click", () => {
    const currentTrack = getCurrentTrack();
    if (currentTrack) toggleFavorite(currentTrack);
  });

  speedControl?.addEventListener("change", () => {
    const speed = Number(speedControl.value) || 1;
    audio.playbackRate = speed;
    updatePositionState();
    persistPlaybackSession();
  });

  seek?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    isSeeking = true;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    syncSeekUI();
    updatePositionState();
  });

  seek?.addEventListener("change", () => {
    isSeeking = false;
    persistPlaybackSession();
  });

  seekFull?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    isSeeking = true;
    audio.currentTime = (Number(seekFull.value) / 100) * audio.duration;
    syncSeekUI();
    updatePositionState();
  });

  seekFull?.addEventListener("change", () => {
    isSeeking = false;
    persistPlaybackSession();
  });

  vol?.addEventListener("input", () => {
    audio.volume = Number(vol.value);
    persistPlaybackSession();
  });

  navGenres?.addEventListener("click", () => {
    view = "genres";
    selectedGenre = null;
    selectedAlbum = null;
    render();
  });

  navAlbums?.addEventListener("click", () => {
    view = "albums";
    selectedAlbum = null;
    render();
  });

  navSongs?.addEventListener("click", () => {
    view = "songs";
    selectedGenre = null;
    selectedAlbum = null;
    render();
  });

  navCollections?.addEventListener("click", () => {
    view = "collections";
    selectedGenre = null;
    selectedAlbum = null;
    render();
  });

  searchInput?.addEventListener("input", () => {
    const q = normalize(searchInput.value);
    if (q.length > 0) {
      if (!previousView) previousView = view;
      view = selectedAlbum && (view === "collectionSongs") ? "collectionSongs" : "songs";
      if (view === "songs") {
        selectedGenre = null;
        selectedAlbum = null;
      }
    } else if (previousView) {
      view = previousView;
      previousView = null;
    }
    render();
  });

  btnAdd?.addEventListener("click", openModal);
  btnAdd2?.addEventListener("click", openModal);
  closeModal?.addEventListener("click", closeModalFn);
  cancelSong?.addEventListener("click", closeModalFn);

  saveSong?.addEventListener("click", () => {
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

    const directUrl = convertToDirectUrl(urlRaw);
    ensurePath(genre, album);

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
    selectedGenre = genre;
    selectedAlbum = album;
    view = "songs";
    closeModalFn();
    render();
  });

  document.querySelector(".player")?.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    const currentTrack = getCurrentTrack();
    if (!currentTrack) return;
    updateNowPlayingUI(currentTrack);
    nowPlaying?.classList.remove("np-hidden");
  });

  closeNowPlaying?.addEventListener("click", () => {
    nowPlaying?.classList.add("np-hidden");
  });
}

function bindAudioEvents() {
  audio.addEventListener("play", () => {
    desiredPlaying = true;
    pausedBySystem = false;
    updatePlayButtons();
    updateMediaSessionPlaybackState();
    persistPlaybackSession();
  });

  audio.addEventListener("playing", () => {
    desiredPlaying = true;
    pausedBySystem = false;
    updatePlayButtons();
    updateMediaSessionPlaybackState();
    preloadNextTrack();
    persistPlaybackSession();
  });

  audio.addEventListener("pause", () => {
    if (!audio.ended && desiredPlaying && !wasRecentUserInteraction() && !isSeeking) {
      pausedBySystem = true;
    }
    updatePlayButtons();
    updateMediaSessionPlaybackState();
    persistPlaybackSession();
  });

  audio.addEventListener("loadedmetadata", () => {
    syncSeekUI();
    updatePositionState();
  });

  audio.addEventListener("timeupdate", () => {
    syncSeekUI();
    updatePositionState();
    if (!isSeeking && Math.floor(audio.currentTime) % 5 === 0) {
      persistPlaybackSession();
    }
  });

  audio.addEventListener("ended", async () => {
    desiredPlaying = false;
    updateMediaSessionPlaybackState();
    await goToNextTrack({ source: "ended" });
  });

  audio.addEventListener("waiting", () => {
    updateMediaSessionPlaybackState();
  });

  audio.addEventListener("error", () => {
    console.warn("Audio error", audio.error);
    updateMediaSessionPlaybackState();
  });

  document.addEventListener("visibilitychange", () => {
    // Nunca auto-play al volver visible. Solo resincroniza estado.
    updatePlayButtons();
    updateMediaSessionPlaybackState();
    if (!document.hidden && desiredPlaying && audio.paused && pausedBySystem) {
      // re-publica metadata/estado para lockscreen sin forzar reproducción
      const track = getCurrentTrack();
      if (track) updateMediaSessionMetadata(track);
    }
  });

  window.addEventListener("pagehide", persistPlaybackSession);
  window.addEventListener("beforeunload", persistPlaybackSession);
}

// ---------- Modal ----------
function openModal() {
  setMsg("");
  inTitle.value = "";
  inArtist.value = "";
  inGenre.value = selectedGenre ?? "";
  inAlbum.value = selectedAlbum ?? "";
  inUrl.value = "";
  inCover.value = "";
  modal?.classList.remove("modal-hidden");
}

function closeModalFn() {
  modal?.classList.add("modal-hidden");
  setMsg("");
}

// ---------- Session restore ----------
async function restoreSessionIfPossible() {
  const session = loadPlaybackSession();
  if (!session) return;

  if (Number.isFinite(session.volume)) {
    audio.volume = session.volume;
    if (vol) vol.value = String(session.volume);
  }

  if (Number.isFinite(session.speed) && speedControl) {
    audio.playbackRate = session.speed;
    speedControl.value = String(session.speed);
  }

  if (typeof session.isShuffle === "boolean") isShuffle = session.isShuffle;
  if (["off", "all", "one"].includes(session.repeatMode)) repeatMode = session.repeatMode;
  updateShuffleButtons();
  updateRepeatButtons();

  const track = findTrackById(session.currentTrackId);
  if (!track) return;

  restoringFromSession = true;
  currentTrackId = track.id;
  syncQueueFromCurrentView();
  await loadTrack(track, {
    autoplay: false,
    startTime: Number.isFinite(session.currentTime) ? session.currentTime : 0,
    source: "restore"
  });
  desiredPlaying = false;
  restoringFromSession = false;
}

// ---------- Init ----------
function init() {
  cleanFavoritesAndCollections();
  updatePlayButtons();
  updateShuffleButtons();
  updateRepeatButtons();
  if (vol) audio.volume = Number(vol.value || 0.9);
  if (speedControl) audio.playbackRate = Number(speedControl.value || 1);

  setupMediaSession();
  bindUIEvents();
  bindAudioEvents();
  render();
  restoreSessionIfPossible();
}

init();
