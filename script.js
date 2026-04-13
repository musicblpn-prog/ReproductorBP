// =====================================================
// MI MUSIC PLAYER
// =====================================================
//=====================================================
// HECHO CON AMOR ATT JAZUS
// =====================================================
// CONFIG / STORAGE KEYS
// =====================================================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";
const LS_DAY = "mi_music_day_v1";
const LS_PLAYER = "mi_music_player_state_v1";

// =====================================================
// DOM ELEMENTS
// =====================================================

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

const npContext = document.getElementById("npContext");

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const crumbsEl = document.getElementById("crumbs");

const navGenres = document.getElementById("navGenres");
const navAlbums = document.getElementById("navAlbums");
const navSongs = document.getElementById("navSongs");

const searchInput = document.getElementById("searchInput");

const modal = document.getElementById("modal");

const collectionModal =
    document.getElementById("collectionModal");

const collectionList =
    document.getElementById("collectionList");

const newCollectionName =
    document.getElementById("newCollectionName");

const createCollectionBtn =
    document.getElementById("createCollectionBtn");

const closeCollectionModal =
    document.getElementById("closeCollectionModal");

const btnAdd = document.getElementById("btnAdd");
const btnAdd2 = document.getElementById("btnAdd2");
const btnExport = document.getElementById("btnExport");
const btnImport = document.getElementById("btnImport");
const fileImport = document.getElementById("fileImport");

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




// FULL PLAYER

const nowPlaying = document.getElementById("nowPlaying");
//
nowPlaying?.addEventListener("click", (e) => {

    if (!e.target.closest(".np-body")) {

        nowPlaying.classList.add("np-hidden");

    }

});
//
const closeNowPlaying = document.getElementById("closeNowPlaying");
const npBg = document.getElementById("npBg");

const bigTitle = document.getElementById("bigTitle");
const bigArtist = document.getElementById("bigArtist");
const bigCover = document.getElementById("bigCover");
const bigContext = document.getElementById("bigContext");

const seekFull = document.getElementById("seekFull");

const playFull = document.getElementById("playFull");
const prevFull = document.getElementById("prevFull");
const nextFull = document.getElementById("nextFull");

const shuffleFull = document.getElementById("shuffleFull");
const repeatFull = document.getElementById("repeatFull");

const speedControl = document.getElementById("speedControl");
const favFullBtn = document.getElementById("favFullBtn");
const addToCollectionBtn =
    document.getElementById("addToCollectionBtn");


const shuffleBtn = document.getElementById("shuffleBtn");
const repeatBtn = document.getElementById("repeatBtn");



// PRELOAD AUDIO

const audioPreload = new Audio();
audioPreload.preload = "auto";


// =====================================================
// STATE GLOBAL
// =====================================================

let library = loadLibrary();
library.collections ??= {};

library.collections["Music Day"] ??= [];
library.collections["Favoritos"] ??= [];

let favorites = loadFavorites();

let view = "genres";

// 
let collectionTrackTemp = null;

let selectedGenre = null;
let selectedAlbum = null;

let queue = [];
let currentIndex = -1;
let currentQueueId = 0;
let isPlaying = false;

let isShuffle = false;
let repeatMode = "off";

let shuffleOrder = [];
let shufflePos = 0;

let previousView = null;

let queueContext = { type: "all" };
let isUserSeeking = false;
let isInternalSwitch = false;


let clickingNext = false;
let clickingPrev = false;

let switchingTrack = false;

let lastStateSave = 0;
let isCrossfading = false;
const CROSSFADE_TIME = 2.5; // segundos (puedes ajustar)

// =====================================================
// INIT
// =====================================================

audio.volume = Number(vol.value);

render();
restorePlayerState();


// =====================================================
// STORAGE
// =====================================================

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

function createCollection(name) {

    name = normalize(name);

    if (!name) return;

    library.collections ??= {};

    if (!library.collections[name]) {

        library.collections[name] = [];

        saveLibrary();

    }

}


function addTrackToCollection(collectionName, trackId) {

    if (!collectionName || !trackId) return;

    library.collections ??= {};
    library.collections[collectionName] ??= [];

    const arr = library.collections[collectionName];

    if (!arr.includes(trackId)) {

        arr.push(trackId);

        saveLibrary();

    }

}

function chooseCollectionAndAdd(track) {

    if (!track?.id) return;

    collectionTrackTemp = track;

    renderCollectionModal();

    collectionModal.classList.remove(
        "modal-hidden"
    );

}

function renderCollectionModal() {

    collectionList.innerHTML = "";

    const names =
        Object.keys(
            library.collections ?? {}
        ).sort();

    names.forEach(name => {

        const div =
            document.createElement("div");

        div.className = "card";

        div.textContent = name;

        div.onclick = () => {

            addTrackToCollection(
                name,
                collectionTrackTemp.id
            );

            collectionModal.classList.add(
                "modal-hidden"
            );

            render();

        };

        collectionList.appendChild(div);

    });

}

createCollectionBtn.onclick = () => {

    const name =
        normalize(
            newCollectionName.value
        );

    if (!name) return;

    createCollection(name);

    addTrackToCollection(
        name,
        collectionTrackTemp.id
    );

    newCollectionName.value = "";

    collectionModal.classList.add(
        "modal-hidden"
    );

    render();

};


// FAVORITES

function loadFavorites() {

    try {

        const raw = localStorage.getItem(LS_FAV);

        const arr = raw ? JSON.parse(raw) : [];

        return new Set(arr);

    } catch {

        return new Set();

    }

}

// MUSIC DAY 

function saveMusicDay() {
  localStorage.setItem(
    LS_DAY,
    JSON.stringify(library.collections["Music Day"] ?? [])
  );
}


function saveFavorites() {

    localStorage.setItem(LS_FAV, JSON.stringify([...favorites]));

}

function savePlayerState() {

    const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

    const data = {
        trackId: currentTrack?.id ?? null,
        currentTime: Number.isFinite(audio.currentTime) ? audio.currentTime : 0,
        wasPlaying: !!audio.src && !audio.paused && !audio.ended,
        volume: Number(vol?.value ?? audio.volume ?? 1),
        shuffle: isShuffle,
        repeat: repeatMode
    };

    localStorage.setItem(LS_PLAYER, JSON.stringify(data));
}

function loadPlayerState() {

    try {

        const raw = localStorage.getItem(LS_PLAYER);
        if (!raw) return null;

        return JSON.parse(raw);

    } catch {
        return null;
    }
}

async function restorePlayerState() {

    const saved = loadPlayerState();
    if (!saved) return;

    if (typeof saved.volume === "number" && vol) {
        vol.value = saved.volume;
        audio.volume = saved.volume;
    }

    isShuffle = !!saved.shuffle;
    repeatMode = saved.repeat || "off";

    syncShuffleButtons();
    syncRepeatButtons();

    if (!saved.trackId) return;

    queue = allTracks();
queueContext = { type: "all" };
currentQueueId++;

const foundIndex = queue.findIndex(t => t.id === saved.trackId);

    if (foundIndex < 0) return;

    
    currentIndex = foundIndex;

    const track = queue[currentIndex];
    if (!track) return;

    setAudioSource(track);
    updateNowPlayingUI(track);
    setupMediaSession(track);

    const applySavedTime = () => {
        if (
            Number.isFinite(saved.currentTime) &&
            saved.currentTime > 0 &&
            Number.isFinite(audio.duration)
        ) {
            audio.currentTime = Math.min(saved.currentTime, audio.duration || saved.currentTime);
        }
    };

    audio.addEventListener("loadedmetadata", applySavedTime, { once: true });

    if (saved.wasPlaying) {
    try {
        await resume();
    } catch {}
} else {
    pause(false);
        syncPlayPauseButtons();
        syncMediaSessionState();
    }
}


// =====================================================
// HELPERS
// =====================================================

//
function vibrateShort() {

    if (navigator.vibrate) {
        navigator.vibrate([5, 10]);
    }

}
//
function normalize(str) {

    return (str ?? "").toString().trim();

}


function fmtTime(sec) {

    if (!Number.isFinite(sec)) return "0:00";

    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);

    return `${m}:${String(s).padStart(2, "0")}`;

}


function escapeHtml(str) {

    return (str ?? "")
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function cryptoId() {

    if (crypto.randomUUID) return crypto.randomUUID();

    return "id_" + Math.random().toString(16).slice(2);

}


// =====================================================
// DROPBOX FIX
// =====================================================

function fixDropbox(url) {

    if (!url.includes("dropbox.com")) return url;

    return url
        .replace("www.dropbox.com", "dl.dropboxusercontent.com")
        .replace("&raw=1", "")
        .replace(/&st=[^&]+/, "");

}


// =====================================================
// SHUFFLE
// =====================================================

function resetShuffle() {

    shuffleOrder = [];
    shufflePos = 0;

}


function makeShuffleOrder(n) {

    const arr = [...Array(n).keys()];

    for (let i = arr.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];

    }

    return arr;

}


// =====================================================
// TRACK HELPERS
// =====================================================

function ensurePath(genre, album) {

    if (!library.genres[genre]) {

        library.genres[genre] = { albums: {} };

    }

    if (!library.genres[genre].albums[album]) {

        library.genres[genre].albums[album] = {

            cover: "",
            tracks: []

        };

    }

}


function allTracks() {

    const out = [];

    for (const [gName, g] of Object.entries(library.genres)) {

        for (const [aName, a] of Object.entries(g.albums ?? {})) {

            for (const t of a.tracks ?? []) {

                out.push({
                    ...t,
                    genre: gName,
                    album: aName
                });

            }

        }

    }

    return out;

}


function favoriteTracks() {

    return allTracks().filter(t => favorites.has(t.id));

}


function getQueueContextLabel() {

    if (!queueContext || !queueContext.type) {
        return "Sin cola activa";
    }

    if (queueContext.type === "favorites") {
        return "Reproduciendo desde Favoritos";
    }

    if (queueContext.type === "collection") {
        return `Reproduciendo desde ${queueContext.name || "Colección"}`;
    }

    if (queueContext.type === "album") {
        return `Reproduciendo desde ${queueContext.album || "Álbum"}`;
    }

    if (queueContext.type === "all") {
        return "Reproduciendo desde Todas las canciones";
    }

    return "Sin cola activa";
}


// =====================================================
// BUILD QUEUE
// =====================================================

function buildQueueForCurrentView() {
    const q = normalize(searchInput.value).toLowerCase();

    // Favoritos
    if (view === "collectionSongs" && selectedAlbum === "Favoritos") {
        queueContext = { type: "favorites" };

        let tracks = favoriteTracks();

        if (q) tracks = tracks.filter(t => matchTrack(t, q));

        tracks = sortTracksForPlayback(tracks);
        return tracks;
    }

    // Otras colecciones
    if (view === "collectionSongs" && selectedAlbum !== "Favoritos") {
        queueContext = { type: "collection", name: selectedAlbum };

        const trackIds = library.collections[selectedAlbum] || [];

        let tracks = trackIds
            .map(id => allTracks().find(t => t.id === id))
            .filter(Boolean);

        if (q) tracks = tracks.filter(t => matchTrack(t, q));

        // Si quieres respetar el orden manual de la colección, NO ordenar aquí.
        // Si quieres que se vea igual y se reproduzca igual, déjalo así:
        tracks = sortTracksForPlayback(tracks);

        return tracks;
    }

    // Álbum específico
    if (view === "songs" && selectedGenre && selectedAlbum && !q) {
        queueContext = { type: "album", genre: selectedGenre, album: selectedAlbum };

        let tracks = (library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [])
            .map(t => ({ ...t, genre: selectedGenre, album: selectedAlbum }));

        tracks = sortTracksForPlayback(tracks);
        return tracks;
    }

    // General
    queueContext = { type: "all" };

    let tracks = allTracks();

    if (q) tracks = tracks.filter(t => matchTrack(t, q));

    tracks = sortTracksForPlayback(tracks);
    return tracks;
}


// =====================================================
// RENDER / NAV / BREADCRUMBS
// Parte 2 / 3
// =====================================================

function setActiveNav() {
    [navGenres, navAlbums, navSongs].forEach(btn => btn.classList.remove("active"));

    if (view === "genres") navGenres.classList.add("active");
    if (view === "albums") navAlbums.classList.add("active");
    if (view === "songs") navSongs.classList.add("active");
}


function setCrumbs() {
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
            parts.push({
                label: selectedAlbum,
                click: null
            });
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
            parts.push({
                label: selectedAlbum,
                click: null
            });
        }
    }

parts.forEach((part, index) => {

    const span = document.createElement("span");

    span.className = "crumb" + (index === parts.length - 1 ? " strong" : "");

    span.textContent = part.label;

    if (part.click && index !== parts.length - 1) {
        span.style.cursor = "pointer";
        span.onclick = part.click;
    }

    crumbsEl.appendChild(span);


    //  SEPARADOR VISUAL
    if (index < parts.length - 1) {

        const sep = document.createElement("span");

        sep.className = "crumb-sep";

        sep.textContent = " / ";

        crumbsEl.appendChild(sep);

    }

});
}


// =====================================================
// HELPERS DE FILTRADO
// =====================================================

function matchTrack(track, query) {
    if (!query) return true;

    const q = query.toLowerCase();

    return [
        track.title,
        track.artist,
        track.genre,
        track.album
    ].some(value => (value ?? "").toLowerCase().includes(q));
}

function sortTracksForPlayback(tracks) {
    return [...tracks].sort((a, b) =>
        `${a.artist || ""}${a.album || ""}${a.title || ""}`
            .localeCompare(`${b.artist || ""}${b.album || ""}${b.title || ""}`)
    );
}


function cleanFavorites() {

    const existingIds = new Set(allTracks().map(t => t.id));

    favorites.forEach(id => {

        if (!existingIds.has(id)) {

            favorites.delete(id);

        }

    });

    saveFavorites();

}


function cleanCollections() {

    const existingIds = new Set(allTracks().map(t => t.id));

    for (const name in library.collections) {

        const arr = library.collections[name] ?? [];

        library.collections[name] = arr.filter(id => existingIds.has(id));

    }

    saveLibrary();

}


// =====================================================
// RENDER PRINCIPAL
// =====================================================

function render() {
    setActiveNav();
    setCrumbs();
    cleanFavorites();
    cleanCollections();

    const q = normalize(searchInput.value).toLowerCase();

    listEl.innerHTML = "";

    const hasAny = allTracks().length > 0;
    emptyEl.classList.toggle("hidden", hasAny);

    if (!hasAny) return;

    // =================================================
    // VISTA: COLECCIONES
    // =================================================
    if (view === "collections") {
        const collections = Object.keys(library.collections ?? {}).sort((a, b) => a.localeCompare(b));

        collections.forEach(name => {
            let count = 0;

if (name === "Favoritos") {

    count = favoriteTracks().length;

} else {

    const ids = library.collections[name] ?? [];

    count = ids.filter(id =>
        allTracks().some(t => t.id === id)
    ).length;

}

          const div = card({
    title: name,
    sub: `${count} canción(es)`,
    pill: "Abrir",
    onClick: () => {
        selectedAlbum = name;
        view = "collectionSongs";
        render();
    }
});

if(name !== "Music Day" && name !== "Favoritos"){

    const del = document.createElement("button");

    del.textContent = "Eliminar";

    del.className = "album-del";

    del.onclick = (e)=>{
        e.stopPropagation();
        deleteCollection(name);
    };

    div.appendChild(del);

}

listEl.appendChild(div);
        });

        return;
    }

    // =================================================
    // VISTA: CANCIONES DE COLECCIÓN
    // =================================================
  if (view === "collectionSongs") {
    let tracks = [];

    if (selectedAlbum === "Favoritos") {
        tracks = favoriteTracks();
    } else {
        const trackIds = library.collections[selectedAlbum] ?? [];
        tracks = allTracks().filter(t => trackIds.includes(t.id));
    }

    if (q) {
        tracks = tracks.filter(t => matchTrack(t, q));
    }

    //  SIEMPRE ordenar (clave para estabilidad)
    tracks = sortTracksForPlayback(tracks);

    tracks.forEach((track, idx) => {
        listEl.appendChild(songRow(track, idx));
    });

    return;
}

    // =================================================
    // VISTA: GÉNEROS
    // =================================================
    if (view === "genres") {
        const genres = Object.keys(library.genres).sort((a, b) => a.localeCompare(b));
        const filtered = q ? genres.filter(name => name.toLowerCase().includes(q)) : genres;

        filtered.forEach(genreName => {
            const genreObj = library.genres[genreName];
            const albumsCount = Object.keys(genreObj.albums ?? {}).length;
            const tracksCount = Object.values(genreObj.albums ?? {})
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

        return;
    }

    // =================================================
    // VISTA: ÁLBUMES
    // =================================================
    if (view === "albums") {
        // ---------- Todos los álbumes ----------
        if (!selectedGenre) {
            const albums = [];

            for (const [genreName, genreObj] of Object.entries(library.genres)) {
                for (const [albumName, albumObj] of Object.entries(genreObj.albums ?? {})) {
                    albums.push({
                        genre: genreName,
                        album: albumName,
                        cover: albumObj.cover ?? "",
                        tracks: albumObj.tracks ?? []
                    });
                }
            }

            const filtered = q
                ? albums.filter(item => `${item.album} ${item.genre}`.toLowerCase().includes(q))
                : albums;

            filtered.sort((a, b) =>
                (a.album + a.genre).localeCompare(b.album + b.genre)
            );

            filtered.forEach(item => {
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
                    onDelete: () => deleteAlbum(item.genre, item.album)
                }));
            });

            return;
        }

        // ---------- Álbumes del género seleccionado ----------
        const genreObj = library.genres[selectedGenre];
        const albumEntries = Object.entries(genreObj.albums ?? {});

        let filteredAlbums = albumEntries;

        if (q) {
            filteredAlbums = filteredAlbums.filter(([albumName]) =>
                albumName.toLowerCase().includes(q)
            );
        }

        filteredAlbums.sort((a, b) => a[0].localeCompare(b[0]));

        filteredAlbums.forEach(([albumName, albumObj]) => {
            listEl.appendChild(cardAlbum({
                title: albumName,
                cover: albumObj.cover ?? "",
                sub: `${selectedGenre} · ${(albumObj.tracks?.length ?? 0)} canción(es)`,
                pill: "Ver",
                onClick: () => {
                    selectedAlbum = albumName;
                    view = "songs";
                    render();
                },
                onDelete: () => deleteAlbum(selectedGenre, albumName)
            }));
        });

        return;
    }

    // =================================================
    // VISTA: CANCIONES
    // =================================================
    if (view === "songs") {
        let tracks = [];

        if (selectedGenre && selectedAlbum && !normalize(searchInput.value)) {
            const albumObj = library.genres[selectedGenre]?.albums?.[selectedAlbum];

            tracks = (albumObj?.tracks ?? []).map(track => ({
                ...track,
                genre: selectedGenre,
                album: selectedAlbum
            }));
        } else {
            tracks = allTracks();
        }

        if (q) {
            tracks = tracks.filter(track => matchTrack(track, q));
        }

       tracks = sortTracksForPlayback(tracks);

        

        tracks.forEach((track, idx) => {
            listEl.appendChild(songRow(track, idx));
        });

        return;
    }
}


// =====================================================
// CARDS
// =====================================================

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

    div.onclick = onClick;
    return div;
}


function cardAlbum({ title, cover, sub, pill, onClick, onDelete }) {
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

    const coverNode = div.querySelector(".album-cover");

    if (cover) {
        coverNode.style.backgroundImage = `url("${cover}")`;
        coverNode.style.backgroundSize = "cover";
        coverNode.style.backgroundPosition = "center";
        coverNode.textContent = "";
    }

    div.addEventListener("click", onClick);

    const delBtn = div.querySelector(".album-del");

    if (delBtn) {
        delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            onDelete?.();
        });
    }

    return div;
}


// =====================================================
// FILA DE CANCIÓN
// =====================================================

function songRow(track, idx) {
    const div = document.createElement("div");
    div.className = "card song-card";

    const isCurrentTrack =
        currentIndex >= 0 &&
        queue[currentIndex] &&
        queue[currentIndex].id === track.id;

    const activeText = isCurrentTrack ? " · Reproduciendo" : "";

    div.innerHTML = `
        <div class="song-left">
            <div class="song-cover">${track.cover ? "" : "♪"}</div>

            <div class="song-info">
                <div class="card-title">${escapeHtml(track.title)}</div>

                <div class="card-sub">
                    ${escapeHtml(track.artist)} ·
                    ${escapeHtml(track.genre)} ·
                    ${escapeHtml(track.album)}${escapeHtml(activeText)}
                </div>

                <div class="row" style="margin-top:8px;">
                    <span class="pill play-btn">▶</span>
                    <span class="fav-btn">${favorites.has(track.id) ? "❤️" : "🤍"}</span>
                    <span class="day-btn">
        ${(library.collections["Music Day"] ?? []).includes(track.id) ? "🌞" : "☀️"}
    </span>
                    <span class="delete-btn">🗑</span>
                </div>
            </div>
        </div>
    `;

    const coverNode = div.querySelector(".song-cover");

    if (track.cover) {
        coverNode.style.backgroundImage = `url("${track.cover}")`;
        coverNode.style.backgroundSize = "cover";
        coverNode.style.backgroundPosition = "center";
        coverNode.textContent = "";
    }

    const favBtn = div.querySelector(".fav-btn");
    const dayBtn = div.querySelector(".day-btn");

    // Music Day
    dayBtn.onclick = (e) => {
        e.stopPropagation();

        const arr = library.collections["Music Day"] ?? [];
        const i = arr.indexOf(track.id);

        if (i >= 0) {
            arr.splice(i, 1);
        } else {
            arr.push(track.id);
        }

        library.collections["Music Day"] = arr;

        saveLibrary();
        render();
    };

    // Favoritos
    favBtn.classList.toggle("active", favorites.has(track.id));

    favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(track);
    };

    // Eliminar
    div.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        deleteSong(track);
    };

    // Play
    let clickingSong = false;

    div.querySelector(".play-btn").onclick = async (e) => {
        e.stopPropagation();

        if (clickingSong) return;
        clickingSong = true;

        try {
            const newQueue = buildQueueForCurrentView();
            const realIndex = newQueue.findIndex(t => t.id === track.id);

            if (realIndex >= 0) {
                queue = newQueue;
                currentQueueId++;
                await playFromQueue(realIndex);
            }
        } finally {
            setTimeout(() => clickingSong = false, 200);
        }
    };

    return div; //  ESTA ERA LA CLAVE
}


// =====================================================
// DELETE SONG / DELETE ALBUM
// =====================================================

function deleteSong(track) {
    if (!confirm(`¿Eliminar "${track.title}"?`)) return;

    const genre = track.genre;
    const album = track.album;

    const albumTracks = library.genres[genre]?.albums?.[album]?.tracks;
    if (!albumTracks) return;

    library.genres[genre].albums[album].tracks =
        albumTracks.filter(t => t.id !== track.id);

    favorites.delete(track.id);
    saveFavorites();

    if (currentIndex >= 0 && queue[currentIndex]?.id === track.id) {
        pause();
        currentIndex = -1;
        audio.src = "";
    }

    saveLibrary();
    render();
}


function deleteAlbum(genreName, albumName) {
    if (!genreName || !albumName) return;

    const ok = confirm(
        `¿Eliminar el álbum "${albumName}"?\nSe borrarán todas sus canciones.`
    );

    if (!ok) return;

    const albumTracks = library.genres?.[genreName]?.albums?.[albumName]?.tracks ?? [];
    const albumTrackIds = new Set(albumTracks.map(t => t.id));

    const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

    if (
        currentTrack &&
        currentTrack.genre === genreName &&
        currentTrack.album === albumName
    ) {
        pause();
        currentIndex = -1;
        audio.src = "";
    }

    albumTrackIds.forEach(id => favorites.delete(id));
    saveFavorites();

    if (library.genres?.[genreName]?.albums?.[albumName]) {
        delete library.genres[genreName].albums[albumName];
    }

    const remainingAlbums = Object.keys(library.genres?.[genreName]?.albums ?? {});
    if (remainingAlbums.length === 0) {
        delete library.genres[genreName];
        if (selectedGenre === genreName) selectedGenre = null;
    }

    if (selectedAlbum === albumName) selectedAlbum = null;
    if (view === "songs") view = "albums";

    saveLibrary();
    render();
}


//deletealbum personalizado

function deleteCollection(name){

    if (!name) return;

    if (name === "Music Day") return;
    if (name === "Favoritos") return;

    const ok = confirm(
        "Eliminar colección: " + name + " ?"
    );

    if (!ok) return;

    delete library.collections[name];

    saveLibrary();

    view = "collections";

    render();

}


// =====================================================
// NOW PLAYING UI
// =====================================================

function updateNowPlayingUI(track) {

    if (!track) return;


    // =========================
    // MINI PLAYER
    // =========================

    npTitle.textContent = track.title || "Nada reproduciendo";

    npSub.textContent =
        `${track.artist || ""} · ${track.genre || ""} · ${track.album || ""}`;




        if (npContext) {
    npContext.textContent = getQueueContextLabel();
}


    if (track.cover) {

        coverEl.style.backgroundImage = `url("${track.cover}")`;
        coverEl.style.backgroundSize = "cover";
        coverEl.style.backgroundPosition = "center";
        coverEl.textContent = "";

    } else {

        coverEl.style.backgroundImage = "";
        coverEl.textContent = "♪";

    }



    // =========================
    // FULL PLAYER
    // =========================

    bigTitle.textContent = track.title || "—";

    bigArtist.textContent =
        `${track.artist || "—"} · ${track.genre || "—"} · ${track.album || "—"}`;

        if (bigContext) {
    bigContext.textContent = getQueueContextLabel();
}


    if (track.cover) {

        // animación suave
        bigCover.classList.add("change");

        bigCover.style.transform = "scale(0.92)";
bigCover.style.opacity = "0.7";

setTimeout(() => {

    bigCover.style.transform = "scale(1)";
    bigCover.style.opacity = "1";

}, 80);

        setTimeout(() => {
            bigCover.classList.remove("change");
        }, 200);


        bigCover.style.backgroundImage = `url("${track.cover}")`;
        bigCover.style.backgroundSize = "cover";
        bigCover.style.backgroundPosition = "center";
        bigCover.textContent = "";

    } else {

        bigCover.style.backgroundImage = "";
        bigCover.textContent = "♪";

    }



    // =========================
    // FAVORITOS
    // =========================

    if (favFullBtn) {

        const isFav = favorites.has(track.id);

        favFullBtn.textContent = isFav ? "❤️" : "🤍";

        favFullBtn.classList.toggle("active", isFav);

    }



    // =========================
    // SPEED
    // =========================

    if (speedControl) {

        speedControl.value = String(audio.playbackRate || 1);

    }



    // =========================
    // FONDO DINÁMICO
    // =========================

    if (npBg && track.cover) {

        npBg.style.backgroundImage = `url("${track.cover}")`;

    }

}


// =====================================================
// SYNC VISUAL DE BOTONES
// =====================================================

let lastPlayState = null;

function syncPlayPauseButtons() {

    const playing =
        isPlaying &&
        !!audio.src &&
        !audio.ended;

    if (playing === lastPlayState) return;

    lastPlayState = playing;

    if (playBtn) playBtn.textContent = playing ? "⏸" : "▶";
    if (playFull) playFull.textContent = playing ? "⏸" : "▶";

    syncMediaSessionState();
}


function syncMediaSessionState() {

    if (!("mediaSession" in navigator)) return;

    const playing =
        !!audio.src &&
        !audio.paused &&
        !audio.ended;

    try {

        navigator.mediaSession.playbackState =
            playing ? "playing" : "paused";

    } catch {}

}



function syncRepeatButtons() {
    const isActive = repeatMode !== "off";

    if (repeatFull) {
        repeatFull.classList.toggle("active", isActive);
        repeatFull.textContent = repeatMode === "one" ? "🔂" : "🔁";
    }

    if (repeatBtn) {
        repeatBtn.classList.toggle("active", isActive);
        repeatBtn.textContent = repeatMode === "one" ? "🔂" : "🔁";
    }
}


function syncShuffleButtons() {
    if (shuffleFull) shuffleFull.classList.toggle("active", isShuffle);
    if (shuffleBtn) shuffleBtn.classList.toggle("active", isShuffle);
}

// =====================================================
// PLAYER / REPRODUCCIÓN
// Parte 3 / 3
// =====================================================

let playRequestId = 0;
let currentTrackToken = 0;
let recoveringAudio = false;
let wasPlayingBeforeHide = false;
let userPaused = false;
let lastAudioCheck = 0;


// =====================================================
// REPEAT / SHUFFLE HELPERS
// =====================================================

function cycleRepeatMode() {
    if (repeatMode === "off") {
        repeatMode = "all";
    } else if (repeatMode === "all") {
        repeatMode = "one";
    } else {
        repeatMode = "off";
    }

    syncRepeatButtons();
    savePlayerState();
}


function rebuildShuffleKeepingCurrent() {
    if (!queue.length) {
        resetShuffle();
        return;
    }

    const indices = [...Array(queue.length).keys()].filter(i => i !== currentIndex);

    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    if (currentIndex >= 0) {
        shuffleOrder = [currentIndex, ...indices];
        shufflePos = 0;
    } else {
        shuffleOrder = indices;
        shufflePos = 0;
    }
}

function getNextIndexFrom(index) {

    if (!queue.length) return -1;

    if (isShuffle) {

        const pos = shuffleOrder.indexOf(index);

        const nextPos = pos + 1;

        if (nextPos >= shuffleOrder.length) {
            return repeatMode === "all" ? shuffleOrder[0] : -1;
        }

        return shuffleOrder[nextPos];
    }

    const next = index + 1;

    if (next >= queue.length) {
        return repeatMode === "all" ? 0 : -1;
    }

    return next;
}


function getNextIndex() {
    if (!queue.length) return -1;

    if (isShuffle) {
        if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
            rebuildShuffleKeepingCurrent();
        }

        const nextPos = shufflePos + 1;

        if (nextPos >= shuffleOrder.length) {
            if (repeatMode === "all") {
                rebuildShuffleKeepingCurrent();
                return shuffleOrder[0] ?? -1;
            }
            return -1;
        }

        return shuffleOrder[nextPos];
    }

    const next = currentIndex + 1;

    if (next >= queue.length) {
        return repeatMode === "all" ? 0 : -1;
    }

    return next;
}


function getPrevIndex() {
    if (!queue.length) return -1;

    if (isShuffle) {
        if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
            rebuildShuffleKeepingCurrent();
        }

        const prevPos = shufflePos - 1;
        if (prevPos < 0) return shuffleOrder[0] ?? -1;

        return shuffleOrder[prevPos];
    }

    return currentIndex <= 0 ? 0 : currentIndex - 1;
}


function advanceShufflePosToIndex(index) {
    if (!isShuffle) return;

    if (!shuffleOrder.length || shuffleOrder.length !== queue.length) {
        rebuildShuffleKeepingCurrent();
    }

    const pos = shuffleOrder.indexOf(index);

    if (pos >= 0) {
        shufflePos = pos;
    } else {
        rebuildShuffleKeepingCurrent();
        shufflePos = Math.max(0, shuffleOrder.indexOf(index));
    }
}


// =====================================================
// PRELOAD INTELIGENTE
// =====================================================

function preloadSpecificIndex(index) {
    if (index < 0 || index >= queue.length) return;

    const nextTrack = queue[index];
    if (!nextTrack?.url) return;

    const preloadQueueId = currentQueueId;

    audioPreload.src = fixDropbox(nextTrack.url);
    audioPreload.preload = "auto";
    audioPreload.load();

    audioPreload.oncanplaythrough = () => {
        if (preloadQueueId !== currentQueueId) {
            audioPreload.src = "";
        }
    };
}


function preloadUpcomingTrack() {

    if (!queue.length) return;

    const nextIndex = getNextIndex();
    if (nextIndex < 0) return;

    const track = queue[nextIndex];
    if (!track?.url) return;

    const preloadQueueId = currentQueueId;

    audioPreload.src = fixDropbox(track.url);
    audioPreload.preload = "auto";
    audioPreload.load();

    audioPreload.oncanplaythrough = () => {
        if (preloadQueueId !== currentQueueId) {
            audioPreload.src = "";
        }
    };
}

// =====================================================
// MEDIA SESSION
// =====================================================

function setupMediaSession(track) {
    if (!("mediaSession" in navigator) || !track) return;

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title || "",
            artist: track.artist || "",
            album: track.album || "",
            artwork: track.cover
                ? [
                    { src: track.cover, sizes: "96x96", type: "image/png" },
                    { src: track.cover, sizes: "128x128", type: "image/png" },
                    { src: track.cover, sizes: "192x192", type: "image/png" },
                    { src: track.cover, sizes: "256x256", type: "image/png" },
                    { src: track.cover, sizes: "384x384", type: "image/png" },
                    { src: track.cover, sizes: "512x512", type: "image/png" }
                ]
                : []
        });

   navigator.mediaSession.setActionHandler("play", async () => {

    userPaused = false;

    await resume();

    if (audio.paused && currentIndex >= 0 && queue[currentIndex]) {

        try {

            const track = queue[currentIndex];

            audio.src = fixDropbox(track.url);

            audio.load();

            await safePlayAudio();

        } catch {}

    }

    setTimeout(async () => {

        if (audio.paused) {

            await recoverPlaybackIfNeeded();

        }

    }, 300);

});

        navigator.mediaSession.setActionHandler("pause", () => {
            pause(true);
        });

        navigator.mediaSession.setActionHandler("previoustrack", () => {
            prevBtn?.click();
        });

        navigator.mediaSession.setActionHandler("nexttrack", () => {
            nextBtn?.click();
        });


        try {
            navigator.mediaSession.setActionHandler("seekto", (details) => {
                if (details?.seekTime != null && Number.isFinite(details.seekTime)) {
                    audio.currentTime = details.seekTime;
                    updatePositionState();
                }
            });
        } catch {}

    } catch (e) {
        console.log("MediaSession error:", e);
    }
}


function updatePositionState() {
    if (!("mediaSession" in navigator)) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

    try {
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate || 1,
            position: Math.min(audio.currentTime || 0, audio.duration)
        });
    } catch {}
}


// =====================================================
// CARGAR TRACK EN AUDIO
// =====================================================

function setAudioSource(track) {

    const src = fixDropbox(track.url || "");
    if (!src) return false;

    if (audio.src === src) {
        return true;
    }

    audio.src = src;

    return true;
}


// =====================================================
// BLINDAJE DE PLAY / RESUME
// =====================================================

async function safePlayAudio() {

    const token = currentTrackToken;

    const myRequest = ++playRequestId;

    try {
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            await playPromise;
        }
        
        if (token !== currentTrackToken) return false;
        if (myRequest !== playRequestId) return false;
        if (audio.paused) return false;

        syncPlayPauseButtons();
        syncMediaSessionState();

        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
        }
        
        return true;

    } catch (err) {
        try {
            audio.pause();
        } catch {}
        return false;
    }
}

//
async function fadeOutAudio() {

    if (audio.paused) return;

    const steps = 10;
    const stepTime = 15;

    const startVol = audio.volume;

    for (let i = steps; i >= 0; i--) {

        audio.volume = startVol * (i / steps);

        await new Promise(r => setTimeout(r, stepTime));

    }

    audio.pause();

    audio.volume = startVol;

}
//
async function fadeInAudio() {

    const steps = 10;
    const stepTime = 15;

    const targetVol = Number(vol.value) || 1;

    audio.volume = 0;

    for (let i = 0; i <= steps; i++) {

        audio.volume = targetVol * (i / steps);

        await new Promise(r => setTimeout(r, stepTime));

    }

}
//


async function forceResumePlayback() {

    if (!audio.src && currentIndex >= 0 && queue[currentIndex]) {
        setAudioSource(queue[currentIndex]);
    }

    if (!audio.src) return false;

    try {

        await audio.play();

        return true;

    } catch {

        return false;

    }
}



async function recoverPlaybackIfNeeded() {
    const token = currentTrackToken;

    if (recoveringAudio) return false;
    if (!audio.src) return false;
    if (userPaused) return false;
    if (isInternalSwitch) return false;
    if (switchingTrack) return false;
    if (document.hidden && !wasPlayingBeforeHide) return false;
    if (!audio.paused) return true;

    recoveringAudio = true;

    try {
        let ok = await forceResumePlayback();

        if (token !== currentTrackToken) return false;

        if (ok && !audio.paused) {
            syncPlayPauseButtons();
            syncMediaSessionState();
            return true;
        }

        if (currentIndex >= 0 && queue[currentIndex]) {
            const track = queue[currentIndex];

            if (audio.readyState === 0) {
    audio.load();
}

            ok = await safePlayAudio();

            if (token !== currentTrackToken) return false;

            if (ok && !audio.paused) {
                syncPlayPauseButtons();
                syncMediaSessionState();
                return true;
            }
        }

        syncPlayPauseButtons();
        syncMediaSessionState();
        return false;

    } finally {
        recoveringAudio = false;
    }
}



// =====================================================
// PLAY FROM QUEUE
// =====================================================

async function playFromQueue(index) {
    if (index < 0 || index >= queue.length) return;
    if (switchingTrack) return;

    switchingTrack = true;
    isInternalSwitch = true;

    const token = ++currentTrackToken;
    currentIndex = index;

    const track = queue[currentIndex];
    if (!track || !track.url) {
        switchingTrack = false;
        isInternalSwitch = false;
        return;
    }

    try {
       fadeOutAudio(); // sin await

        vibrateShort();
        updateNowPlayingUI(track);
        
        setupMediaSession(track);

        const okSrc = setAudioSource(track);
        if (!okSrc || token !== currentTrackToken) return;

        //  Validación extra importante
        if (!audio.src) return;

//  SOLO recargar si es necesario
if (audio.readyState === 0) {
    audio.load();
}

//  SIEMPRE limpiar estado
if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "none";
}
        if (token !== currentTrackToken) return;

        if (isShuffle) {
            advanceShufflePosToIndex(index);
        }

// PRIMERO intento rápido
let played = await forceResumePlayback();

//  fallback seguro
if (!played) {
    played = await safePlayAudio();
}

if (token !== currentTrackToken) return;

if (played) {

    // 🔥 FORZAR estado inmediato (clave del fix)
    isPlaying = true;

    if (playBtn) playBtn.textContent = "⏸";
    if (playFull) playFull.textContent = "⏸";

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }

    fadeInAudio();
    preloadUpcomingTrack();
}

        if (token !== currentTrackToken) return;

        syncPlayPauseButtons();
        syncMediaSessionState();
        savePlayerState();

        //  IMPORTANTE: NO render aquí

    } finally {
        if (token === currentTrackToken) {
            isInternalSwitch = false;
        }
        switchingTrack = false;
    }
}

async function startCrossfade() {
    return;
}

// =====================================================
// PAUSE / RESUME
// =====================================================

function pause(userInitiated = false) {

    audio.pause();

    isPlaying = false;

    syncPlayPauseButtons();
    syncMediaSessionState();
    savePlayerState();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }

    if (userInitiated) {
        wasPlayingBeforeHide = false;
        userPaused = true;
    }


if (currentIndex < 0) {
    if (npContext) npContext.textContent = "Sin cola activa";
    if (bigContext) bigContext.textContent = "Sin cola activa";
}

}


async function resume() {
    userPaused = false;

    if (!audio.src && currentIndex >= 0 && queue[currentIndex]) {
        setAudioSource(queue[currentIndex]);
        audio.load();
    }

    let ok = await safePlayAudio();

    if (!ok && currentIndex >= 0 && queue[currentIndex]) {
        setAudioSource(queue[currentIndex]);
        audio.load();
        ok = await safePlayAudio();
    }

    isPlaying = ok;
    syncPlayPauseButtons();
    syncMediaSessionState();
    savePlayerState();
}


// =====================================================
// EVENTOS PRINCIPALES DE PLAYER
// =====================================================

let clickingPlay = false;

playBtn.onclick = async () => {

    if (clickingPlay) return;
    clickingPlay = true;

    vibrateShort(); 

    if (audio.src && !audio.paused) {
        pause(true);
    } else {
        await resume();
    }

    

    setTimeout(() => clickingPlay = false, 200);
};



prevBtn.onclick = async () => {
    if (clickingPrev) return;
    clickingPrev = true;

    try {
        vibrateShort();

        if (!queue.length) return;

        const prevIndex = getPrevIndex();
        if (prevIndex < 0) return;

        if (isShuffle) {
            const pos = shuffleOrder.indexOf(prevIndex);
            if (pos >= 0) shufflePos = pos;
        }

        await playFromQueue(prevIndex);
    } finally {
        setTimeout(() => clickingPrev = false, 180);
    }
};


nextBtn.onclick = async () => {
    if (clickingNext) return;
    clickingNext = true;

    try {
        vibrateShort();

        if (!queue.length) return;

        const nextIndex = getNextIndex();
        if (nextIndex < 0) {
            pause();
            return;
        }

        if (isShuffle) {
            const pos = shuffleOrder.indexOf(nextIndex);
            if (pos >= 0) shufflePos = pos;
        }

        await playFromQueue(nextIndex);

    } finally {
        setTimeout(() => clickingNext = false, 180);
    }
};


// =====================================================
// FULL PLAYER / MINI PLAYER
// =====================================================

document.querySelector(".player")?.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest("input")) return;
    if (!audio.src) return;

    if (currentIndex >= 0 && queue[currentIndex]) {
        updateNowPlayingUI(queue[currentIndex]);
    }

    nowPlaying?.classList.remove("np-hidden");
});


closeNowPlaying?.addEventListener("click", () => {
    nowPlaying?.classList.add("np-hidden");
});


playFull?.addEventListener("click", () => playBtn?.click());
prevFull?.addEventListener("click", () => prevBtn?.click());
nextFull?.addEventListener("click", () => nextBtn?.click());

shuffleFull?.addEventListener("click", () => {
    isShuffle = !isShuffle;

    if (isShuffle) {
        rebuildShuffleKeepingCurrent();
    } else {
        resetShuffle();
    }

    syncShuffleButtons();
    preloadUpcomingTrack();
    savePlayerState();
});

shuffleBtn?.addEventListener("click", () => {
    isShuffle = !isShuffle;

    if (isShuffle) {
        rebuildShuffleKeepingCurrent();
    } else {
        resetShuffle();
    }

    syncShuffleButtons();
    preloadUpcomingTrack();
    savePlayerState();
});

repeatFull?.addEventListener("click", () => cycleRepeatMode());
repeatBtn?.addEventListener("click", () => cycleRepeatMode());

favFullBtn?.addEventListener("click", () => {
    if (currentIndex < 0 || !queue[currentIndex]) return;
    toggleFavorite(queue[currentIndex]);
});


addToCollectionBtn?.addEventListener("click", () => {

    if (currentIndex < 0) return;

    const track = queue[currentIndex];

    if (!track) return;

    chooseCollectionAndAdd(track);

});


// =====================================================
// SEEK / VOLUMEN / SPEED
// =====================================================
if (vol) {
    vol.addEventListener("input", () => {
        audio.volume = Number(vol.value);
        savePlayerState();
    });
}


seek?.addEventListener("input", () => {
    isUserSeeking = true;
});

seek?.addEventListener("change", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        isUserSeeking = false;
        return;
    }

    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    updatePositionState();

    setTimeout(() => {
        isUserSeeking = false;
    }, 150);
});

seekFull?.addEventListener("input", () => {
    isUserSeeking = true;
});

seekFull?.addEventListener("change", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
        isUserSeeking = false;
        return;
    }

    audio.currentTime = (Number(seekFull.value) / 100) * audio.duration;
    updatePositionState();

    setTimeout(() => {
        isUserSeeking = false;
    }, 150);
});



// =====================================================
// EVENTOS NATIVOS DEL AUDIO
// =====================================================

audio.addEventListener("loadedmetadata", () => {
    tDur.textContent = fmtTime(audio.duration);

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
        if (seek) seek.value = 0;
        if (seekFull) seekFull.value = 0;
    }

    updatePositionState();
});


audio.addEventListener("timeupdate", () => {
    tCur.textContent = fmtTime(audio.currentTime);

    if (!isUserSeeking && Number.isFinite(audio.duration) && audio.duration > 0) {
        const percent = (audio.currentTime / audio.duration) * 100;
        if (seek) seek.value = percent;
        if (seekFull) seekFull.value = percent;
    }

    updatePositionState();

    const now = Date.now();
    if (now - lastStateSave > 3000) {
        lastStateSave = now;
        savePlayerState();
    }
});



audio.addEventListener("playing", () => {
    isPlaying = true;
    syncPlayPauseButtons();
    updatePositionState();
});


audio.addEventListener("play", () => {
    isPlaying = true;
    syncPlayPauseButtons();
});


audio.addEventListener("pause", () => {
    isPlaying = false;
    syncPlayPauseButtons();

    if (userPaused) return;
    if (isInternalSwitch) return;
    if (switchingTrack) return;

    setTimeout(async () => {
        if (userPaused) return;
        if (isInternalSwitch) return;
        if (switchingTrack) return;

        if (audio.paused) {
            await recoverPlaybackIfNeeded();
        }
    }, 1000);
});


audio.addEventListener("ended", async () => {

    if (!queue.length) return;
    if (isCrossfading) return;

    if (repeatMode === "one") {

        await playFromQueue(currentIndex);

        syncMediaSessionState();

        return;
    }


    const nextIndex = getNextIndex();


    if (nextIndex < 0) {

        pause();

        syncMediaSessionState();

        return;
    }


    if (isShuffle) {

        const pos = shuffleOrder.indexOf(nextIndex);

        if (pos >= 0) shufflePos = pos;

    }


    await playFromQueue(nextIndex);


    // ✅ solo una vez
    syncPlayPauseButtons();
    syncMediaSessionState();

});


audio.addEventListener("error", async () => {
    console.log("Error al cargar audio");

    setTimeout(async () => {
        if (currentIndex >= 0 && queue[currentIndex]) {
            await playFromQueue(currentIndex);
        }
    }, 500);
});


audio.addEventListener("stalled", async () => {

    if (userPaused) return;

    await recoverPlaybackIfNeeded();

});


audio.addEventListener("waiting", async () => {

    if (userPaused) return;

    setTimeout(async () => {

        if (!audio.paused) return;

        await recoverPlaybackIfNeeded();

    }, 1500);

});




// =====================================================
// VISIBILITY / INTERRUPCIONES DE OTRAS APPS
// =====================================================

document.addEventListener("visibilitychange", async () => {

    if (document.hidden) {

        wasPlayingBeforeHide = !audio.paused;
        return;

    }

    if (userPaused) return;

    if (wasPlayingBeforeHide) {

        await recoverPlaybackIfNeeded();

    }

});


window.addEventListener("online", async () => {

    if (userPaused) return;

    if (currentIndex < 0) return;

    await recoverPlaybackIfNeeded();

});

window.addEventListener("connectionchange", async () => {

    if (userPaused) return;

    await recoverPlaybackIfNeeded();

});


// =====================================================
// FIX EXTRA iOS BACKGROUND / PWA / SAFARI
// =====================================================

// cuando la página vuelve desde background
window.addEventListener("pageshow", async () => {

    if (userPaused) return;

    if (wasPlayingBeforeHide) {

        await recoverPlaybackIfNeeded();

    }

});


// cuando iOS congela la página
window.addEventListener("pagehide", () => {

    wasPlayingBeforeHide = !audio.paused;

});


// cuando vuelve el foco real (Safari / PWA)
window.addEventListener("blur", () => {

    wasPlayingBeforeHide = !audio.paused;

});


// cuando cambia conexión (muy importante en iPhone)
window.addEventListener("offline", () => {

    wasPlayingBeforeHide = !audio.paused;

});

window.addEventListener("focus", async () => {

    if (userPaused) return;

    if (wasPlayingBeforeHide && audio.paused) {

        await recoverPlaybackIfNeeded();

    }

});


//

// =====================================================
// AUDIO WATCHDOG (estabilidad iPhone / Safari / PWA)
// =====================================================

setInterval(async () => {
    if (userPaused) return;
    if (!audio.src) return;
    if (isInternalSwitch) return;
    if (switchingTrack) return;
    if (recoveringAudio) return;
    if (document.hidden && !wasPlayingBeforeHide) return;

    const now = Date.now();
    if (now - lastAudioCheck < 4000) return;
    lastAudioCheck = now;

    if (audio.paused && !audio.ended) {
        await recoverPlaybackIfNeeded();
    }
}, 4000);


// =====================================================
// NAV
// =====================================================

navGenres.onclick = () => {
    view = "genres";
    selectedGenre = null;
    selectedAlbum = null;
    render();
};

navAlbums.onclick = () => {
    view = "albums";
    selectedGenre = null;
    selectedAlbum = null;
    render();
};

navSongs.onclick = () => {
    view = "songs";
    selectedGenre = null;
    selectedAlbum = null;
    render();
};

const navCollections = document.getElementById("navCollections");

if (navCollections) {
    navCollections.onclick = () => {
        view = "collections";
        selectedGenre = null;
        selectedAlbum = null;
        render();
    };
}


// =====================================================
// SEARCH
// =====================================================

searchInput.addEventListener("input", () => {
    const q = normalize(searchInput.value);

    if (q.length > 0) {
        if (!previousView) previousView = view;

        view = "songs";
        selectedGenre = null;
        selectedAlbum = null;
    } else {
        if (previousView) {
            view = previousView;
            previousView = null;
        }
    }

    render();
});





// =====================================================
// EXPORTAR BIBLIOTECA (FIX iPhone / Safari)
// =====================================================

btnExport?.addEventListener("click", () => {

    const data = {
        library: library,
        favorites: [...favorites]
    };

    const json = JSON.stringify(data, null, 2);

    const blob = new Blob([json], {
        type: "application/json"
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = "mi_music_backup.json";

    document.body.appendChild(a);

    a.click();

    setTimeout(() => {

        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    }, 100);

});

// =====================================================
// IMPORTAR BIBLIOTECA (FIX iPhone / Safari / PWA)
// =====================================================

btnImport?.addEventListener("click", () => {

    if (!fileImport) return;

    fileImport.value = ""; // IMPORTANTE
    fileImport.click();

});


fileImport?.addEventListener("change", (e) => {

    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(event) {

        try {

            const data = JSON.parse(event.target.result);


            // ---------- LIBRARY ----------

          if (data.library) {

    const newLib = data.library;

    // asegurar estructura
    library.genres ??= {};
    library.collections ??= {};

    newLib.genres ??= {};
    newLib.collections ??= {};

    // ===== MERGE GENRES =====

    for (const g in newLib.genres) {

        library.genres[g] ??= { albums: {} };

        for (const a in newLib.genres[g].albums) {

           library.genres[g].albums[a] ??= {
    cover: "",
    tracks: []
};

if (!library.genres[g].albums[a].cover) {
    library.genres[g].albums[a].cover =
        newLib.genres[g].albums[a].cover || "";
}

            const existingTracks =
                library.genres[g].albums[a].tracks ?? [];

            const newTracks =
                newLib.genres[g].albums[a].tracks ?? [];

            const existingIds =
                new Set(existingTracks.map(t => t.id));

            newTracks.forEach(t => {

                if (!existingIds.has(t.id)) {
                    existingTracks.push(t);
                }

            });

            library.genres[g].albums[a].tracks = existingTracks;

        }

    }

    // ===== MERGE COLLECTIONS =====

    for (const name in newLib.collections) {

        library.collections[name] ??= [];

        const set = new Set(library.collections[name]);

        newLib.collections[name].forEach(id => {
            set.add(id);
        });

        library.collections[name] = [...set];

    }

    saveLibrary();

}


            // ---------- FAVORITES ----------

            if (data.favorites) {

                favorites = new Set(data.favorites);

                saveFavorites();

            }


            alert("Biblioteca importada correctamente");

            render();

        } catch (err) {

            console.error(err);

            alert("Error al importar archivo");

        }

    };

    reader.readAsText(file);

});

//-----


// =====================================================
// MODAL
// =====================================================

btnAdd.onclick = openModal;
if (btnAdd2) btnAdd2.onclick = openModal;

closeModal.onclick = closeModalFn;
cancelSong.onclick = closeModalFn;

// ===== NUEVO MODAL DE COLECCIONES =====
closeCollectionModal.onclick = () => {

    collectionModal.classList.add(
        "modal-hidden"
    );

};

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


function setMsg(text) {
    if (!text) {
        msg.classList.add("hidden");
        msg.textContent = "";
        return;
    }

    msg.classList.remove("hidden");
    msg.textContent = text;
}


// =====================================================
// DRIVE URL FIX
// =====================================================

function driveToDirect(url) {
    const u = normalize(url);
    if (!u) return "";

    if (u.includes("drive.google.com/uc?") && u.includes("id=")) return u;

    const m = u.match(/drive\.google\.com\/file\/d\/([^/]+)\//i);
    if (m?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    }

    const m2 = u.match(/[?&]id=([^&]+)/i);
    if (u.includes("drive.google.com") && m2?.[1]) {
        return `https://drive.google.com/uc?export=download&id=${m2[1]}`;
    }

    return u;
}


// =====================================================
// SAVE SONG
// =====================================================

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
};



// =====================================================
// ESTADO INICIAL DE BOTONES
// =====================================================

syncPlayPauseButtons();
syncRepeatButtons();
syncShuffleButtons();


