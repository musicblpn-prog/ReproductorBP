// ==============================
// Mi Music - Reproductor robusto
// Biblioteca personal en localStorage
// Género -> Álbum -> Canciones / Colecciones
// ==============================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";
const LS_PLAYBACK = "mi_music_playback_v2";

// ---------- DOM ----------
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
const navCollections = document.getElementById("navCollections");
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

// ---------- Audio config ----------
audio.preload = "auto";
audio.crossOrigin = "anonymous";
audio.playsInline = true;
audio.setAttribute("playsinline", "");
audio.setAttribute("webkit-playsinline", "");
audio.autoplay = false;
audio.muted = false;
audio.volume = Number(vol?.value ?? 0.9);

const audioPreload = new Audio();
audioPreload.preload = "auto";
audioPreload.crossOrigin = "anonymous";
audioPreload.playsInline = true;

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

const state = {
  isShuffle: false,
  repeatMode: "off", // off | all | one
  userPaused: true,
  isLoading: false,
  interrupted: false,
  pendingResumeAfterLoad: false,
  restoreTime: null,
  playRequestId: 0,
  lastPauseOrigin: "user",
  lastPlaySource: "ui",
};

// ---------- Utils ----------
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
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
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

function setCover(el, url, fallback = "♪") {
  if (!el) return;
  if (url) {
    el.style.backgroundImage = `url("${url}")`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.textContent = fallback;
  }
}

function syncPlayButtons() {
  const icon = audio.paused ? "▶" : "⏸";
  if (playBtn) playBtn.textContent = icon;
  if (playFull) playFull.textContent = icon;
}

function syncRepeatButtons() {
  if (!repeatFull) return;
  repeatFull.classList.toggle("active", state.repeatMode !== "off");
  repeatFull.textContent = state.repeatMode === "one" ? "🔂" : "🔁";
}

function syncShuffleButtons() {
  if (shuffleFull) shuffleFull.classList.toggle("active", state.isShuffle);
}

function updateTimeUI() {
  if (tCur) tCur.textContent = fmtTime(audio.currentTime);
  if (tDur) tDur.textContent = fmtTime(audio.duration);

  const progress = Number.isFinite(audio.duration) && audio.duration > 0
    ? (audio.currentTime / audio.duration) * 100
    : 0;

  if (seek) seek.value = String(progress);
  if (seekFull) seekFull.value = String(progress);

  if ("mediaSession" in navigator && typeof navigator.mediaSession.setPositionState === "function") {
    try {
      navigator.mediaSession.setPositionState({
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime || 0, Number.isFinite(audio.duration) ? audio.duration : 0),
      });
    } catch {
      // Safari / iOS puede fallar si duration aún no es válida.
    }
  }
}

function setMediaPlaybackState() {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
  } catch {
    // noop
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForEvent(target, eventName, timeout = 1200) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      target.removeEventListener(eventName, onEvent);
      resolve(ok);
    };
    const onEvent = () => finish(true);
    const timer = setTimeout(() => finish(false), timeout);
    target.addEventListener(eventName, onEvent, { once: true });
  });
}

async function hardResumeCurrentTrack({ requestId = state.playRequestId, time = audio.currentTime || 0 } = {}) {
  const src = audio.currentSrc || audio.src;
  if (!src) return false;

  try {
    audio.pause();
  } catch {
    // noop
  }

  audio.src = src;
  audio.load();
  await Promise.race([
    waitForEvent(audio, "loadedmetadata", 1500),
    waitForEvent(audio, "canplay", 1500),
    delay(350),
  ]);

  if (requestId !== state.playRequestId) return false;

  if (Number.isFinite(time) && time > 0) {
    try {
      const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : time;
      audio.currentTime = Math.min(time, max);
    } catch {
      // noop
    }
  }

  try {
    await audio.play();
    if (requestId !== state.playRequestId) return false;
    state.userPaused = false;
    state.interrupted = false;
    state.pendingResumeAfterLoad = false;
    state.isLoading = false;
    syncPlayButtons();
    refreshMediaSession(currentTrack());
    preloadNextTrack();
    savePlaybackSession();
    return !audio.paused;
  } catch (error) {
    if (requestId !== state.playRequestId) return false;
    state.isLoading = false;
    state.pendingResumeAfterLoad = true;
    console.debug("Hard resume pendiente:", error);
    return false;
  }
}

function updateNowPlayingUI(track) {
  if (!track) {
    if (npTitle) npTitle.textContent = "Nada reproduciendo";
    if (npSub) npSub.textContent = "—";
    if (bigTitle) bigTitle.textContent = "Título";
    if (bigArtist) bigArtist.textContent = "Artista";
    setCover(coverEl, "");
    setCover(bigCover, "");
    if (favFullBtn) {
      favFullBtn.classList.remove("active");
      favFullBtn.textContent = "🤍";
    }
    return;
  }

  if (npTitle) npTitle.textContent = track.title || "Nada reproduciendo";
  if (npSub) npSub.textContent = [track.artist, track.genre, track.album].filter(Boolean).join(" · ") || "—";
  if (bigTitle) bigTitle.textContent = track.title || "Título";
  if (bigArtist) bigArtist.textContent = [track.artist, track.genre, track.album].filter(Boolean).join(" · ") || "Artista";

  setCover(coverEl, track.cover || "");
  setCover(bigCover, track.cover || "");

  if (favFullBtn) {
    const active = favorites.has(track.id);
    favFullBtn.classList.toggle("active", active);
    favFullBtn.textContent = active ? "❤️" : "🤍";
  }

  if (speedControl) speedControl.value = String(audio.playbackRate || 1);
}

function currentTrack() {
  return currentIndex >= 0 ? queue[currentIndex] ?? null : null;
}

function syncCurrentIndexToQueue() {
  const track = currentTrack();
  if (!track?.id) return;
  const idx = queue.findIndex((t) => t.id === track.id);
  currentIndex = idx;
}

// ---------- URL helpers ----------
function driveToDirect(url) {
  const u = normalize(url);
  if (!u) return "";
  if (u.includes("drive.google.com/uc?") && u.includes("id=")) return u;

  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
  if (fileMatch?.[1]) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;

  const idMatch = u.match(/[?&]id=([^&]+)/i);
  if (u.includes("drive.google.com") && idMatch?.[1]) {
    return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  }

  return u;
}

function fixDropbox(url) {
  const u = normalize(url);
  if (!u) return "";
  if (!u.includes("dropbox.com")) return driveToDirect(u);

  return u
    .replace("www.dropbox.com", "dl.dropboxusercontent.com")
    .replace("dropbox.com", "dl.dropboxusercontent.com")
    .replace(/[?&]dl=0/g, "")
    .replace(/[?&]raw=1/g, "")
    .replace(/&st=[^&]+/g, "");
}

function toPlayableUrl(url) {
  return fixDropbox(driveToDirect(url));
}

// ---------- Storage ----------
function defaultLibrary() {
  return { genres: {}, collections: {} };
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

function savePlaybackSession() {
  const track = currentTrack();
  const payload = {
    trackId: track?.id ?? null,
    currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
    volume: audio.volume,
    playbackRate: audio.playbackRate || 1,
    repeatMode: state.repeatMode,
    isShuffle: state.isShuffle,
    queueContext,
    view,
    selectedGenre,
    selectedAlbum,
    updatedAt: Date.now(),
  };
  localStorage.setItem(LS_PLAYBACK, JSON.stringify(payload));
}

function loadPlaybackSession() {
  try {
    const raw = localStorage.getItem(LS_PLAYBACK);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---------- Library helpers ----------
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
      for (const track of album.tracks ?? []) {
        out.push({ ...track, genre: genreName, album: albumName });
      }
    }
  }
  return out;
}

function favoriteTracks() {
  const existing = allTracks();
  return existing.filter((track) => favorites.has(track.id));
}

function cleanFavorites() {
  const existingIds = new Set(allTracks().map((track) => track.id));
  let changed = false;
  for (const favId of [...favorites]) {
    if (!existingIds.has(favId)) {
      favorites.delete(favId);
      changed = true;
    }
  }
  if (changed) saveFavorites();

  const collections = library.collections || {};
  for (const [name, ids] of Object.entries(collections)) {
    if (!Array.isArray(ids)) {
      collections[name] = [];
      changed = true;
      continue;
    }
    const filtered = ids.filter((id) => existingIds.has(id));
    if (filtered.length !== ids.length) {
      collections[name] = filtered;
      changed = true;
    }
  }
  if (changed) saveLibrary();
}

function matchTrack(track, query) {
  if (!query) return true;
  const q = normalize(query).toLowerCase();
  return [track.title, track.artist, track.genre, track.album]
    .some((field) => normalize(field).toLowerCase().includes(q));
}

// ---------- Queue helpers ----------
function buildQueueForCurrentView() {
  const q = normalize(searchInput?.value).toLowerCase();

  if (view === "collectionSongs" && selectedAlbum === "Favoritos") {
    queueContext = { type: "favorites" };
    let tracks = favoriteTracks();
    if (q) tracks = tracks.filter((t) => matchTrack(t, q));
    tracks.sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));
    return tracks;
  }

  if (view === "collectionSongs" && selectedAlbum && selectedAlbum !== "Favoritos") {
    queueContext = { type: "collection", name: selectedAlbum };
    const trackIds = library.collections[selectedAlbum] || [];
    let tracks = allTracks().filter((t) => trackIds.includes(t.id));
    if (q) tracks = tracks.filter((t) => matchTrack(t, q));
    tracks.sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));
    return tracks;
  }

  if (view === "songs" && selectedGenre && selectedAlbum && !q) {
    queueContext = { type: "album", genre: selectedGenre, album: selectedAlbum };
    const albumTracks = library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [];
    return albumTracks.map((t) => ({ ...t, genre: selectedGenre, album: selectedAlbum }));
  }

  queueContext = { type: "all" };
  let tracks = allTracks();
  if (q) tracks = tracks.filter((t) => matchTrack(t, q));
  tracks.sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));
  return tracks;
}

function rebuildQueue({ preserveCurrent = true } = {}) {
  const currentId = preserveCurrent ? currentTrack()?.id ?? null : null;
  queue = buildQueueForCurrentView();

  shuffleOrder = [];
    shufflePos = -1;
  if (currentId) {
    currentIndex = queue.findIndex((track) => track.id === currentId);
  }
}

function createShuffledOrder(length, current = -1) {
  const arr = [...Array(length).keys()];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (current >= 0 && length > 1) {
    const pos = arr.indexOf(current);
    if (pos > 0) [arr[0], arr[pos]] = [arr[pos], arr[0]];
  }
  return arr;
}

let shuffleOrder = [];
let shufflePos = -1;

function ensureShuffleOrder() {
  if (!state.isShuffle || queue.length === 0) return;
  if (shuffleOrder.length !== queue.length || shufflePos < 0 || !shuffleOrder.includes(currentIndex)) {
    shuffleOrder = createShuffledOrder(queue.length, currentIndex);
    shufflePos = Math.max(0, shuffleOrder.indexOf(currentIndex));
  }
}

function getNextIndex(step = 1) {
  if (!queue.length) return -1;

  if (state.repeatMode === "one" && step > 0) return currentIndex;

  if (state.isShuffle) {
    ensureShuffleOrder();
    if (shuffleOrder.length === 0) return -1;

    let nextPos = shufflePos + step;

    if (nextPos < 0) {
      if (state.repeatMode === "all") {
        shuffleOrder = createShuffledOrder(queue.length, currentIndex);
        shufflePos = shuffleOrder.indexOf(currentIndex);
        nextPos = shufflePos - 1;
      } else {
        nextPos = 0;
      }
    }

    if (nextPos >= shuffleOrder.length) {
      if (state.repeatMode === "all") {
        shuffleOrder = createShuffledOrder(queue.length, currentIndex);
        shufflePos = -1;
        nextPos = 0;
      } else {
        return -1;
      }
    }

    shufflePos = nextPos;
    return shuffleOrder[shufflePos] ?? -1;
  }

  let next = currentIndex + step;

  if (next < 0) next = 0;
  if (next >= queue.length) {
    if (state.repeatMode === "all") return 0;
    return -1;
  }

  return next;
}

function preloadNextTrack() {
  if (!queue.length || currentIndex < 0) return;
  const nextIndex = getNextIndex(1);
  if (nextIndex < 0) return;
  const nextTrack = queue[nextIndex];
  if (!nextTrack?.url) return;
  audioPreload.src = toPlayableUrl(nextTrack.url);
}

// ---------- Media Session ----------
function updateMediaMetadata(track) {
  if (!("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track?.title || "Mi Music",
      artist: track?.artist || "",
      album: track?.album || "",
      artwork: track?.cover
        ? [
            { src: track.cover, sizes: "96x96", type: "image/png" },
            { src: track.cover, sizes: "128x128", type: "image/png" },
            { src: track.cover, sizes: "192x192", type: "image/png" },
            { src: track.cover, sizes: "256x256", type: "image/png" },
            { src: track.cover, sizes: "512x512", type: "image/png" },
          ]
        : [],
    });
  } catch {
    // noop
  }
}

function setupMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const safeHandler = (name, handler) => {
    try {
      navigator.mediaSession.setActionHandler(name, handler);
    } catch {
      // Algunas combinaciones navegador/iOS no soportan todos los handlers.
    }
  };

  safeHandler("play", () => {
    state.lastPlaySource = "mediaSession";
    Promise.resolve(resume({ preferReload: true, source: "mediaSession" })).catch(console.debug);
  });
  safeHandler("pause", () => {
    pause({ byUser: true, fromSystem: true, source: "mediaSession" });
  });
safeHandler("previoustrack", () => {
  prevBtn.click();
});

safeHandler("nexttrack", () => {
  nextBtn.click();
});
  safeHandler("seekbackward", (details) => {
    const delta = Number(details?.seekOffset) || 10;
    audio.currentTime = Math.max(0, audio.currentTime - delta);
    updateTimeUI();
  });
  safeHandler("seekforward", (details) => {
    const delta = Number(details?.seekOffset) || 10;
    const max = Number.isFinite(audio.duration) ? audio.duration : audio.currentTime + delta;
    audio.currentTime = Math.min(max, audio.currentTime + delta);
    updateTimeUI();
  });
  safeHandler("seekto", (details) => {
    if (typeof details?.seekTime !== "number") return;
    if (details.fastSeek && typeof audio.fastSeek === "function") {
      audio.fastSeek(details.seekTime);
    } else {
      audio.currentTime = details.seekTime;
    }
    updateTimeUI();
  });

  // Algunos entornos de iPhone refrescan mejor los controles cuando el estado se vuelve a publicar.
  setMediaPlaybackState();
  updateTimeUI();
}

function refreshMediaSession(track = currentTrack()) {
  setupMediaSession();
  updateMediaMetadata(track);
  setMediaPlaybackState();
  updateTimeUI();
}

// ---------- Player core ----------
async function loadTrackByIndex(index, { autoplay = true, preserveTime = false } = {}) {
  rebuildQueue({ preserveCurrent: false });
  if (index < 0 || index >= queue.length) return false;

  currentIndex = index;
  const track = queue[currentIndex];
  const src = toPlayableUrl(track.url);
  const requestId = ++state.playRequestId;

  state.isLoading = true;
  state.pendingResumeAfterLoad = false;
  state.restoreTime = preserveTime ? audio.currentTime : null;

  audio.pause();
  audio.src = src;
  audio.load();
  audio.currentTime = 0;

  updateNowPlayingUI(track);
  refreshMediaSession(track);
  setMediaPlaybackState();
  syncPlayButtons();
  updateTimeUI();
  savePlaybackSession();

  if (!autoplay) {
    state.userPaused = true;
    state.isLoading = false;
    return true;
  }

  return attemptPlay(requestId);
}

async function attemptPlay(requestId = state.playRequestId) {
  try {
    if (!audio.src) return false;
    if (audio.readyState === 0) {
      state.pendingResumeAfterLoad = true;
      audio.load();
    }

    await audio.play();
    preloadNextTrack();
    setMediaPlaybackState();
    if (requestId !== state.playRequestId) return false;

    state.userPaused = false;
    state.interrupted = false;
    state.pendingResumeAfterLoad = false;
    state.isLoading = false;
    syncPlayButtons();
    setMediaPlaybackState();
    preloadNextTrack();
    savePlaybackSession();
    return true;
  } catch (error) {
    if (requestId !== state.playRequestId) return false;
    state.isLoading = false;
    state.pendingResumeAfterLoad = true;
    console.debug("Play pendiente:", error);
    return false;
  }
}

async function playFromQueue(index) {
  return loadTrackByIndex(index, { autoplay: true });
}

function pause({ byUser = true, fromSystem = false, source = "ui" } = {}) {
  if (!audio.src) return;
  state.userPaused = byUser;
  state.interrupted = !byUser || fromSystem || source === "mediaSession";
  state.lastPauseOrigin = source === "mediaSession" || fromSystem ? "system" : "user";
  state.pendingResumeAfterLoad = false;
  audio.pause();
  syncPlayButtons();
  setMediaPlaybackState();
  savePlaybackSession();
}

async function resume({ preferReload = false, source = "ui" } = {}) {
  if (!audio.src) {
    rebuildQueue({ preserveCurrent: false });
    if (queue.length) {
      const idx = currentIndex >= 0 ? currentIndex : 0;
      return playFromQueue(idx);
    }
    return false;
  }

  state.userPaused = false;
  state.lastPlaySource = source;
  const requestId = ++state.playRequestId;

  if (audio.ended) {
    audio.currentTime = 0;
  }

  const shouldHardResume = preferReload || state.lastPauseOrigin === "system" || document.hidden || state.interrupted;

  if (shouldHardResume) {
    return hardResumeCurrentTrack({ requestId, time: audio.currentTime || 0 });
  }

  if (audio.readyState === 0 || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
    audio.load();
  }

  const ok = await attemptPlay(requestId);

if (ok) {
  state.interrupted = false;
  setMediaPlaybackState();
}

return ok;
}

async function playNext({ source = "ui" } = {}) {
  rebuildQueue();
  if (!queue.length) return false;

  if (currentIndex < 0) {
    return playFromQueue(0);
  }

  const nextIndex = getNextIndex(1);
  if (nextIndex < 0) {
    pause({ byUser: false });
    audio.currentTime = 0;
    updateTimeUI();
    return false;
  }
  preloadNextTrack();

  return playFromQueue(nextIndex);
}

async function playPrevious({ source = "ui" } = {}) {
  rebuildQueue();
  if (!queue.length) return false;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    updateTimeUI();
    return true;
  }

  if (currentIndex < 0) return playFromQueue(0);

  const prevIndex = getNextIndex(-1);
  if (prevIndex < 0) {
    audio.currentTime = 0;
    updateTimeUI();
    return true;
  }

  return playFromQueue(prevIndex);
}

// ---------- Rendering ----------
function setActiveNav() {
  [navGenres, navAlbums, navSongs, navCollections].filter(Boolean).forEach((btn) => btn.classList.remove("active"));
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
    parts.push({ label: "Colecciones", click: () => { view = "collections"; selectedAlbum = null; render(); } });
    if (view === "collectionSongs" && selectedAlbum) {
      parts.push({ label: selectedAlbum, click: () => {} });
    }
  } else {
    parts.push({ label: "Géneros", click: () => { view = "genres"; selectedGenre = null; selectedAlbum = null; render(); } });
    if ((view === "albums" || view === "songs") && selectedGenre) {
      parts.push({ label: selectedGenre, click: () => { view = "albums"; selectedAlbum = null; render(); } });
    }
    if (view === "songs" && selectedAlbum) {
      parts.push({ label: selectedAlbum, click: () => {} });
    }
  }

  parts.forEach((part, idx) => {
    const span = document.createElement("span");
    span.className = `crumb${idx === parts.length - 1 ? " strong" : ""}`;
    span.textContent = part.label;
    if (idx !== parts.length - 1) {
      span.style.cursor = "pointer";
      span.addEventListener("click", part.click);
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

function cardAlbum({ title, sub, pill, cover, onClick, onDelete }) {
  const div = document.createElement("div");
  div.className = "card album-card";
  div.innerHTML = `
    <div class="album-cover">${cover ? "" : "♪"}</div>
    <div class="album-info">
      <div class="row">
        <div class="card-title">${escapeHtml(title)}</div>
        ${pill ? `<span class="pill">${escapeHtml(pill)}</span>` : ""}
      </div>
      <div class="card-sub">${escapeHtml(sub)}</div>
      <div class="album-actions">
        <button type="button" class="album-del">Eliminar álbum</button>
      </div>
    </div>
  `;

  const coverElLocal = div.querySelector(".album-cover");
  setCover(coverElLocal, cover || "");

  if (onClick) div.addEventListener("click", onClick);
  const deleteBtn = div.querySelector(".album-del");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      onDelete?.();
    });
  }
  return div;
}

function songRow(track, idx) {
  const div = document.createElement("div");
  div.className = "card song-card";

  const active = currentTrack()?.id === track.id && !audio.paused ? " · Reproduciendo" : "";
  div.innerHTML = `
    <div class="song-left">
      <div class="song-cover">${track.cover ? "" : "♪"}</div>
      <div class="song-info">
        <div class="card-title">${escapeHtml(track.title)}</div>
        <div class="card-sub">
          ${escapeHtml(track.artist)} · ${escapeHtml(track.genre)} · ${escapeHtml(track.album)}${escapeHtml(active)}
        </div>
        <div class="row" style="margin-top:8px;">
          <span class="pill play-btn">▶</span>
          <span class="fav-btn">${favorites.has(track.id) ? "❤️" : "🤍"}</span>
          <span class="delete-btn">🗑</span>
        </div>
      </div>
    </div>
  `;

  setCover(div.querySelector(".song-cover"), track.cover || "");

  const favBtn = div.querySelector(".fav-btn");
  favBtn.classList.toggle("active", favorites.has(track.id));
  favBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavorite(track);
  });

  div.querySelector(".delete-btn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteSong(track);
  });

  div.querySelector(".play-btn")?.addEventListener("click", async (event) => {
    event.stopPropagation();
    rebuildQueue({ preserveCurrent: false });
    await playFromQueue(idx);
    render();
  });

  return div;
}

function renderCollections(q) {
  const names = Object.keys(library.collections || {});
  if (!names.includes("Favoritos")) names.unshift("Favoritos");

  const filtered = q
    ? names.filter((name) => name.toLowerCase().includes(q))
    : names;

  filtered.forEach((name) => {
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
      },
    }));
  });
}

function renderCollectionSongs(q) {
  let tracks = selectedAlbum === "Favoritos"
    ? favoriteTracks()
    : allTracks().filter((track) => (library.collections[selectedAlbum] || []).includes(track.id));

  if (q) tracks = tracks.filter((track) => matchTrack(track, q));
  tracks.sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));

  queue = tracks;
  syncCurrentIndexToQueue();

  tracks.forEach((track, idx) => listEl.appendChild(songRow(track, idx)));
}

function renderGenres(q) {
  const genres = Object.keys(library.genres).sort((a, b) => a.localeCompare(b));
  const filtered = q ? genres.filter((g) => g.toLowerCase().includes(q)) : genres;

  filtered.forEach((genreName) => {
    const albums = Object.values(library.genres[genreName].albums ?? {});
    const albumsCount = albums.length;
    const tracksCount = albums.reduce((acc, album) => acc + (album.tracks?.length ?? 0), 0);
    listEl.appendChild(card({
      title: genreName,
      sub: `${albumsCount} álbum(es) · ${tracksCount} canción(es)`,
      pill: "Abrir",
      onClick: () => {
        selectedGenre = genreName;
        selectedAlbum = null;
        view = "albums";
        render();
      },
    }));
  });
}

function renderAlbums(q) {
  if (!selectedGenre) {
    const albums = [];
    for (const [genreName, genre] of Object.entries(library.genres)) {
      for (const [albumName, album] of Object.entries(genre.albums ?? {})) {
        albums.push({ genre: genreName, album: albumName, cover: album.cover || "", tracks: album.tracks ?? [] });
      }
    }

    const filtered = q
      ? albums.filter((item) => `${item.album} ${item.genre}`.toLowerCase().includes(q))
      : albums;

    filtered
      .sort((a, b) => `${a.album}${a.genre}`.localeCompare(`${b.album}${b.genre}`))
      .forEach((item) => {
        listEl.appendChild(cardAlbum({
          title: item.album,
          cover: item.cover,
          sub: `${item.genre} · ${item.tracks.length} canción(es)`,
          pill: "Abrir",
          onClick: () => {
            selectedGenre = item.genre;
            selectedAlbum = item.album;
            view = "songs";
            render();
          },
          onDelete: () => deleteAlbum(item.genre, item.album),
        }));
      });
    return;
  }

  const albums = Object.keys(library.genres[selectedGenre]?.albums ?? {}).sort((a, b) => a.localeCompare(b));
  const filtered = q ? albums.filter((albumName) => albumName.toLowerCase().includes(q)) : albums;

  filtered.forEach((albumName) => {
    const album = library.genres[selectedGenre].albums[albumName];
    listEl.appendChild(cardAlbum({
      title: albumName,
      cover: album.cover || "",
      sub: `${album.tracks?.length ?? 0} canción(es)`,
      pill: "Ver",
      onClick: () => {
        selectedAlbum = albumName;
        view = "songs";
        render();
      },
      onDelete: () => deleteAlbum(selectedGenre, albumName),
    }));
  });
}

function renderSongs(q) {
  let tracks;
  if (selectedGenre && selectedAlbum && !q) {
    tracks = (library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [])
      .map((track) => ({ ...track, genre: selectedGenre, album: selectedAlbum }));
  } else {
    tracks = allTracks();
    if (q) tracks = tracks.filter((track) => matchTrack(track, q));
    tracks.sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));
  }

  queue = tracks;
  syncCurrentIndexToQueue();
  tracks.forEach((track, idx) => listEl.appendChild(songRow(track, idx)));
}

function render() {
  cleanFavorites();
  setActiveNav();
  setCrumbs();

  const q = normalize(searchInput?.value).toLowerCase();
  listEl.innerHTML = "";

  const hasAny = allTracks().length > 0;
  emptyEl?.classList.toggle("hidden", hasAny);
  if (!hasAny) return;

  if (view === "collections") {
    renderCollections(q);
    return;
  }

  if (view === "collectionSongs") {
    renderCollectionSongs(q);
    return;
  }

  if (view === "genres") {
    renderGenres(q);
    return;
  }

  if (view === "albums") {
    renderAlbums(q);
    return;
  }

  renderSongs(q);
}

// ---------- Mutations ----------
function toggleFavorite(track) {
  if (!track?.id) return;
  if (favorites.has(track.id)) favorites.delete(track.id);
  else favorites.add(track.id);
  saveFavorites();
  updateNowPlayingUI(currentTrack());
  render();
}

function deleteSong(track) {
  if (!track?.id) return;
  if (!window.confirm(`¿Eliminar "${track.title}"?`)) return;

  const albumTracks = library.genres[track.genre]?.albums?.[track.album]?.tracks;
  if (!albumTracks) return;

  library.genres[track.genre].albums[track.album].tracks = albumTracks.filter((item) => item.id !== track.id);

  favorites.delete(track.id);
  saveFavorites();
  cleanFavorites();
  saveLibrary();

  if (currentTrack()?.id === track.id) {
    pause({ byUser: true });
    audio.removeAttribute("src");
    audio.load();
    currentIndex = -1;
    updateNowPlayingUI(null);
  }

  render();
}

function deleteAlbum(genreName, albumName) {
  if (!genreName || !albumName) return;
  if (!window.confirm(`¿Eliminar el álbum "${albumName}"?\nSe borrarán todas sus canciones.`)) return;

  const current = currentTrack();
  if (current && current.genre === genreName && current.album === albumName) {
    pause({ byUser: true });
    audio.removeAttribute("src");
    audio.load();
    currentIndex = -1;
    updateNowPlayingUI(null);
  }

  if (library.genres?.[genreName]?.albums?.[albumName]) {
    delete library.genres[genreName].albums[albumName];
  }

  if (Object.keys(library.genres?.[genreName]?.albums ?? {}).length === 0) {
    delete library.genres[genreName];
    if (selectedGenre === genreName) selectedGenre = null;
  }

  if (selectedAlbum === albumName) selectedAlbum = null;
  if (view === "songs") view = "albums";

  cleanFavorites();
  saveLibrary();
  render();
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

function saveSongFromForm() {
  const title = normalize(inTitle.value);
  const artist = normalize(inArtist.value);
  const genre = normalize(inGenre.value);
  const album = normalize(inAlbum.value) || "Singles";
  const url = normalize(inUrl.value);
  const cover = normalize(inCover.value);

  if (!title || !artist || !genre || !url) {
    setMsg("Completa: Nombre, Artista, Género y Link del MP3.");
    return;
  }

  const playableUrl = toPlayableUrl(url);
  ensurePath(genre, album);

  if (cover && !library.genres[genre].albums[album].cover) {
    library.genres[genre].albums[album].cover = cover;
  }

  library.genres[genre].albums[album].tracks.push({
    id: cryptoId(),
    title,
    artist,
    url: playableUrl,
    cover: cover || library.genres[genre].albums[album].cover || "",
  });

  saveLibrary();
  selectedGenre = genre;
  selectedAlbum = album;
  view = "songs";
  closeModalFn();
  render();
}

// ---------- Events ----------
function bindUIEvents() {
  playBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (audio.src && !audio.paused) pause({ byUser: true });
    else await resume();
  });

  playFull?.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (audio.src && !audio.paused) pause({ byUser: true });
    else await resume();
  });

  prevBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await playPrevious();
    render();
  });

  nextBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await playNext();
    render();
  });

  prevFull?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await playPrevious();
    render();
  });

  nextFull?.addEventListener("click", async (event) => {
    event.stopPropagation();
    await playNext();
    render();
  });

  shuffleFull?.addEventListener("click", (event) => {
    event.stopPropagation();
    state.isShuffle = !state.isShuffle;
    shuffleOrder = [];
    shufflePos = -1;
    syncShuffleButtons();
    savePlaybackSession();
  });

  repeatFull?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (state.repeatMode === "off") state.repeatMode = "all";
    else if (state.repeatMode === "all") state.repeatMode = "one";
    else state.repeatMode = "off";
    syncRepeatButtons();
    savePlaybackSession();
  });

  favFullBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    const track = currentTrack();
    if (track) toggleFavorite(track);
  });

  seek?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    updateTimeUI();
  });

  seekFull?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(seekFull.value) / 100) * audio.duration;
    updateTimeUI();
  });

  vol?.addEventListener("input", () => {
    audio.volume = Number(vol.value);
    savePlaybackSession();
  });

  speedControl?.addEventListener("change", () => {
    const rate = Number(speedControl.value) || 1;
    audio.playbackRate = rate;
    updateTimeUI();
    savePlaybackSession();
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
    if (q) {
      if (!previousView) previousView = view;
      if (view !== "collectionSongs") {
        view = "songs";
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
  saveSong?.addEventListener("click", saveSongFromForm);

  document.querySelector(".player")?.addEventListener("click", (event) => {
    if (event.target.closest("button") || event.target.closest("input")) return;
    if (!audio.src) return;
    updateNowPlayingUI(currentTrack());
    nowPlaying?.classList.remove("np-hidden");
  });

  closeNowPlaying?.addEventListener("click", () => {
    nowPlaying?.classList.add("np-hidden");
  });
}

function bindAudioEvents() {
  audio.addEventListener("play", () => {
    state.isLoading = false;
    state.interrupted = false;
    state.lastPauseOrigin = "user";
    syncPlayButtons();
    refreshMediaSession(currentTrack());
    setMediaPlaybackState();
    updateTimeUI();
    savePlaybackSession();
  });

  audio.addEventListener("playing", () => {
    state.isLoading = false;
    state.pendingResumeAfterLoad = false;
    state.interrupted = false;
    syncPlayButtons();
    refreshMediaSession(currentTrack());
    preloadNextTrack();
    savePlaybackSession();
  });

      audio.addEventListener("pause", () => {
        syncPlayButtons();
        setMediaPlaybackState();
        savePlaybackSession();
      });

  audio.addEventListener("loadedmetadata", () => {
    if (state.restoreTime != null && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(state.restoreTime, audio.duration || state.restoreTime);
      state.restoreTime = null;
    }
    updateTimeUI();
    savePlaybackSession();
  });

  audio.addEventListener("canplay", async () => {
    if (!state.pendingResumeAfterLoad || state.userPaused) return;
    state.pendingResumeAfterLoad = false;
    await attemptPlay(state.playRequestId);
  });

  audio.addEventListener("timeupdate", () => {
    updateTimeUI();
  });

  audio.addEventListener("ended", async () => {
    state.isLoading = false;
    const nextIndex = getNextIndex(1);
    if (nextIndex < 0) {
      pause({ byUser: false });
      audio.currentTime = 0;
      updateTimeUI();
      return;
    }
    await playFromQueue(nextIndex);
    render();
  });

  audio.addEventListener("error", () => {
    state.isLoading = false;
    syncPlayButtons();
    console.error("Error de audio:", audio.error);
  });



audio.addEventListener("waiting", async () => {
  if (state.userPaused) return;

  console.debug("Audio esperando datos… intentando recuperar");

  const requestId = ++state.playRequestId;

  await hardResumeCurrentTrack({
    requestId,
    time: audio.currentTime || 0
  });
});


audio.addEventListener("stalled", async () => {
  if (state.userPaused) return;

  console.debug("Audio detenido… intentando recuperación");

  const requestId = ++state.playRequestId;

  await hardResumeCurrentTrack({
    requestId,
    time: audio.currentTime || 0
  });
});


  document.addEventListener("visibilitychange", () => {
    // Nunca forzamos autoplay al volver del lockscreen.
    // Solo publicamos de nuevo metadata/estado para ayudar a iPhone a refrescar controles.
    refreshMediaSession(currentTrack());
    syncPlayButtons();
    updateTimeUI();
  });

  window.addEventListener("pagehide", savePlaybackSession);
  window.addEventListener("beforeunload", savePlaybackSession);
}

// ---------- Restore ----------
function restorePlaybackState() {
  const saved = loadPlaybackSession();
  if (!saved) return;

  if (typeof saved.volume === "number" && vol) {
    vol.value = String(saved.volume);
    audio.volume = saved.volume;
  }
  if (saved.playbackRate && speedControl) {
    audio.playbackRate = Number(saved.playbackRate) || 1;
    speedControl.value = String(audio.playbackRate);
  }
  if (["off", "all", "one"].includes(saved.repeatMode)) state.repeatMode = saved.repeatMode;
  state.isShuffle = Boolean(saved.isShuffle);
  syncRepeatButtons();
  syncShuffleButtons();

  const track = allTracks().find((item) => item.id === saved.trackId);
  if (!track) return;

  queue = buildQueueForCurrentView();
  const idxInQueue = queue.findIndex((item) => item.id === track.id);
  if (idxInQueue >= 0) {
    currentIndex = idxInQueue;
  } else {
    queue = allTracks().sort((a, b) => `${a.artist}${a.album}${a.title}`.localeCompare(`${b.artist}${b.album}${b.title}`));
    currentIndex = queue.findIndex((item) => item.id === track.id);
  }

  if (currentIndex >= 0) {
    const current = queue[currentIndex];
    audio.src = toPlayableUrl(current.url);
    state.restoreTime = Number(saved.currentTime) || 0;
    updateNowPlayingUI(current);
    updateMediaMetadata(current);
    audio.load();
  }
}

// ---------- Init ----------
setupMediaSession();
bindUIEvents();
bindAudioEvents();
syncPlayButtons();
syncRepeatButtons();
syncShuffleButtons();
render();
restorePlaybackState();
updateTimeUI();
