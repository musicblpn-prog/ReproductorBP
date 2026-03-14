// =====================================================
// MI MUSIC PLAYER
// Base reorganizada y comentada
// Parte 1 / 3
// =====================================================


// =====================================================
// CONFIG / STORAGE KEYS
// =====================================================

const LS_KEY = "mi_music_library_v1";
const LS_FAV = "mi_music_favorites_v1";
const LS_DAY = "mi_music_day_v1";


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
const closeNowPlaying = document.getElementById("closeNowPlaying");
const npBg = document.getElementById("npBg");

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



// PRELOAD AUDIO

const audioPreload = new Audio();
audioPreload.preload = "auto";


// =====================================================
// STATE GLOBAL
// =====================================================

let library = loadLibrary();
library.collections ??= {};

library.collections["Music Day"] ??= [];

let favorites = loadFavorites();

let view = "genres";

let selectedGenre = null;
let selectedAlbum = null;

let queue = [];
let currentIndex = -1;

let isPlaying = false;

let isShuffle = false;
let repeatMode = "off";

let shuffleOrder = [];
let shufflePos = 0;

let previousView = null;

let queueContext = { type: "all" };


// =====================================================
// INIT
// =====================================================

audio.volume = Number(vol.value);

render();


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
    JSON.stringify([...musicDay])
  );
}


function saveFavorites() {

    localStorage.setItem(LS_FAV, JSON.stringify([...favorites]));

}


// =====================================================
// HELPERS
// =====================================================

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
// PRELOAD NEXT TRACK
// =====================================================

function preloadNextTrack() {

    if (!queue.length) return;

    let nextIndex;

    if (isShuffle) {

        nextIndex = Math.floor(Math.random() * queue.length);

    } else {

        nextIndex = currentIndex + 1;

        if (nextIndex >= queue.length) nextIndex = 0;

    }

    const nextTrack = queue[nextIndex];

    if (!nextTrack) return;

    audioPreload.src = fixDropbox(nextTrack.url);

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

        tracks.sort((a, b) =>
            (a.artist + a.album + a.title)
                .localeCompare(b.artist + b.album + b.title)
        );

        return tracks;
    }

    // Otras colecciones
    if (view === "collectionSongs" && selectedAlbum !== "Favoritos") {
        queueContext = { type: "collection", name: selectedAlbum };

        const trackIds = library.collections[selectedAlbum] || [];
        let tracks = allTracks().filter(t => trackIds.includes(t.id));

        if (q) tracks = tracks.filter(t => matchTrack(t, q));

        tracks.sort((a, b) =>
            (a.artist + a.album + a.title)
                .localeCompare(b.artist + b.album + b.title)
        );

        return tracks;
    }

    // Álbum específico
    if (view === "songs" && selectedGenre && selectedAlbum && !q) {
        queueContext = { type: "album", genre: selectedGenre, album: selectedAlbum };

        let tracks = (library.genres[selectedGenre]?.albums?.[selectedAlbum]?.tracks ?? [])
            .map(t => ({ ...t, genre: selectedGenre, album: selectedAlbum }));

        tracks.sort((a, b) =>
            (a.artist + a.album + a.title)
                .localeCompare(b.artist + b.album + b.title)
        );

        return tracks;
    }

    // General
    queueContext = { type: "all" };

    let tracks = allTracks();

    if (q) tracks = tracks.filter(t => matchTrack(t, q));

    tracks.sort((a, b) =>
        (a.artist + a.album + a.title)
            .localeCompare(b.artist + b.album + b.title)
    );

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


function cleanFavorites() {
    const existingIds = new Set(allTracks().map(t => t.id));

    favorites.forEach(id => {
        if (!existingIds.has(id)) {
            favorites.delete(id);
        }
    });

    saveFavorites();
}


// =====================================================
// RENDER PRINCIPAL
// =====================================================

function render() {
    setActiveNav();
    setCrumbs();
    cleanFavorites();

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
            const count = name === "Favoritos"
                ? favoriteTracks().length
                : (library.collections[name] ?? []).length;

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

        tracks.sort((a, b) =>
            (a.artist + a.album + a.title)
                .localeCompare(b.artist + b.album + b.title)
        );

        queue = tracks;

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

        tracks.sort((a, b) =>
            (a.artist + a.album + a.title)
                .localeCompare(b.artist + b.album + b.title)
        );

        queue = tracks;

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
    
//Music Day

const dayBtn = div.querySelector(".day-btn");

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

//
    favBtn.classList.toggle("active", favorites.has(track.id));

    
    favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(track);
    };

    div.querySelector(".delete-btn").onclick = (e) => {
        e.stopPropagation();
        deleteSong(track);
    };

    div.querySelector(".play-btn").onclick = (e) => {
        e.stopPropagation();

        queue = buildQueueForCurrentView();

        const realIndex = queue.findIndex(t => t.id === track.id);

        if (realIndex >= 0) {
            playFromQueue(realIndex);
        }
    };

    return div;
}


// =====================================================
// FAVORITOS
// =====================================================

function toggleFavorite(track) {
    if (!track?.id) return;

    if (favorites.has(track.id)) {
        favorites.delete(track.id);
    } else {
        favorites.add(track.id);
    }

    saveFavorites();

    if (favFullBtn && currentIndex >= 0 && queue[currentIndex]?.id === track.id) {
        favFullBtn.textContent = favorites.has(track.id) ? "❤️" : "🤍";
        favFullBtn.classList.toggle("active", favorites.has(track.id));
    }

    render();
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


    if (track.cover) {

        // animación suave
        bigCover.classList.add("change");

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

function syncPlayPauseButtons() {
    const playing = !!audio.src && !audio.paused && !audio.ended;

    isPlaying = playing;

    if (playBtn) playBtn.textContent = playing ? "⏸" : "▶";
    if (playFull) playFull.textContent = playing ? "⏸" : "▶";
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
let recoveringAudio = false;
let wasPlayingBeforeHide = false;


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

    audioPreload.src = fixDropbox(nextTrack.url);
    audioPreload.load();
}


function preloadUpcomingTrack() {
    const nextIndex = getNextIndex();
    if (nextIndex >= 0) {
        preloadSpecificIndex(nextIndex);
    }
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
            await forceResumePlayback();
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

    audio.pause();
    audio.src = src;
    audio.load();

    return true;
}


// =====================================================
// BLINDAJE DE PLAY / RESUME
// =====================================================

async function safePlayAudio() {
    const myRequest = ++playRequestId;

    try {
        await audio.play();

        if (myRequest !== playRequestId) return false;

        syncPlayPauseButtons();

        if ("mediaSession" in navigator) {
            navigator.mediaSession.playbackState = "playing";
        }

        return true;
    } catch (err) {
        return false;
    }
}


async function forceResumePlayback() {
    if (!audio.src && currentIndex >= 0 && queue[currentIndex]) {
        setAudioSource(queue[currentIndex]);
    }

    if (!audio.src) return false;

    let ok = await safePlayAudio();
    if (ok) return true;

    try {
        audio.load();
    } catch {}

    ok = await safePlayAudio();
    if (ok) return true;

    return new Promise((resolve) => {
        const onCanPlay = async () => {
            audio.removeEventListener("canplay", onCanPlay);
            const played = await safePlayAudio();
            resolve(played);
        };

        audio.addEventListener("canplay", onCanPlay, { once: true });

        setTimeout(async () => {
            audio.removeEventListener("canplay", onCanPlay);
            const played = await safePlayAudio();
            resolve(played);
        }, 700);
    });
}


async function recoverPlaybackIfNeeded() {
    if (recoveringAudio) return false;
    if (!audio.src) return false;
    if (!audio.paused) return true;

    recoveringAudio = true;

    try {
        const ok = await forceResumePlayback();
        return ok;
    } finally {
        recoveringAudio = false;
    }
}


// =====================================================
// PLAY FROM QUEUE
// =====================================================

async function playFromQueue(index) {
    queue = buildQueueForCurrentView();

    if (index < 0 || index >= queue.length) return;

    currentIndex = index;

    const track = queue[currentIndex];
    if (!track) return;

    setAudioSource(track);
    updateNowPlayingUI(track);
    setupMediaSession(track);

    if (isShuffle) {
        advanceShufflePosToIndex(index);
    }

    preloadUpcomingTrack();

    const played = await forceResumePlayback();

    if (!played) {
        const retry = async () => {
            audio.removeEventListener("canplay", retry);
            await forceResumePlayback();
        };
        audio.addEventListener("canplay", retry, { once: true });
    }

    render();
}


// =====================================================
// PAUSE / RESUME
// =====================================================

function pause(userInitiated = false) {
    audio.pause();
    isPlaying = false;
    syncPlayPauseButtons();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }

    if (userInitiated) {
        wasPlayingBeforeHide = false;
    }
}


async function resume() {
    const ok = await forceResumePlayback();

    isPlaying = ok;
    syncPlayPauseButtons();

    if (!ok) {
        console.log("No se pudo reanudar el audio.");
    }
}


// =====================================================
// EVENTOS PRINCIPALES DE PLAYER
// =====================================================

playBtn.onclick = async () => {
    if (audio.src && !audio.paused) {
        pause(true);
    } else {
        await resume();
    }
};


prevBtn.onclick = async () => {
    queue = buildQueueForCurrentView();
    if (!queue.length) return;

    const prevIndex = getPrevIndex();
    if (prevIndex < 0) return;

    if (isShuffle) {
        const pos = shuffleOrder.indexOf(prevIndex);
        if (pos >= 0) shufflePos = pos;
    }

    await playFromQueue(prevIndex);
};


nextBtn.onclick = async () => {
    queue = buildQueueForCurrentView();
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
});

repeatFull?.addEventListener("click", () => cycleRepeatMode());
repeatBtn?.addEventListener("click", () => cycleRepeatMode());

favFullBtn?.addEventListener("click", () => {
    if (currentIndex < 0 || !queue[currentIndex]) return;
    toggleFavorite(queue[currentIndex]);
});


// =====================================================
// SEEK / VOLUMEN / SPEED
// =====================================================

seek?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    updatePositionState();
});

seekFull?.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = (Number(seekFull.value) / 100) * audio.duration;
    updatePositionState();
});

vol?.addEventListener("input", () => {
    audio.volume = Number(vol.value);
});

speedControl?.addEventListener("change", () => {
    audio.playbackRate = parseFloat(speedControl.value || "1");
    updatePositionState();
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

    if (Number.isFinite(audio.duration) && audio.duration > 0) {
        const percent = (audio.currentTime / audio.duration) * 100;
        if (seek) seek.value = percent;
        if (seekFull) seekFull.value = percent;
    }

    updatePositionState();
});


audio.addEventListener("playing", () => {
    isPlaying = true;
    syncPlayPauseButtons();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }

    updatePositionState();
});


audio.addEventListener("play", () => {
    isPlaying = true;
    syncPlayPauseButtons();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
    }
});


audio.addEventListener("pause", () => {
    isPlaying = false;
    syncPlayPauseButtons();

    if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
    }
});


audio.addEventListener("ended", async () => {
    queue = buildQueueForCurrentView();
    if (!queue.length) return;

    if (repeatMode === "one") {
        await playFromQueue(currentIndex);
        return;
    }

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
});


audio.addEventListener("error", async () => {
    console.log("Error al cargar audio");

    setTimeout(async () => {
        if (currentIndex >= 0 && queue[currentIndex]) {
            await playFromQueue(currentIndex);
        }
    }, 500);
});


audio.addEventListener("stalled", () => {
    console.log("Audio stalled");
});

audio.addEventListener("suspend", () => {
    console.log("Audio suspend");
});

audio.addEventListener("waiting", () => {
    console.log("Audio waiting");
});


// =====================================================
// VISIBILITY / INTERRUPCIONES DE OTRAS APPS
// =====================================================

document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
        wasPlayingBeforeHide = !audio.paused;
        return;
    }

    if (wasPlayingBeforeHide && audio.paused) {
        await recoverPlaybackIfNeeded();
    }
});


window.addEventListener("focus", async () => {
    if (wasPlayingBeforeHide && audio.paused) {
        await recoverPlaybackIfNeeded();
    }
});


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

                library = data.library;

                if (!library.collections) {
                    library.collections = {};
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


