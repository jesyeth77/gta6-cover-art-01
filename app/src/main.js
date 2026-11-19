// Neon Coast — wires the editor: photo uploads, layout and grade pickers,
// per-panel crop controls, caption editing and PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for screenshots instead (./shots.js).
import { LAYOUTS, GRADES, SIZES, renderCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

/** The whole editor state: photos, one panel setting per layout slot, text. */
const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'VICE HEIST',
  subtitle: 'one last job under the neon sun',
  photos: [],
  panels: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
  ],
  selectedPanel: 0,
};

let redrawTimer = 0;
/** Renders the preview, debounced so slider drags stay smooth. */
export function redraw() {
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(() => {
    renderCover(canvas, state, SIZES[state.size]);
    renderPanelThumbs();
  }, 30);
}

export function renderNow() {
  renderCover(canvas, state, SIZES[state.size]);
  renderPanelThumbs();
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Builds a row of picker buttons from a {key: {label}} map into a container. */
function buildPicker(containerId, entries, current, onPick) {
  const box = $(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, value]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (key === current ? ' active' : '');
    b.textContent = value.label;
    b.addEventListener('click', () => {
      onPick(key);
      [...box.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
    });
    box.appendChild(b);
  });
}

function refreshPickers() {
  buildPicker('layouts', LAYOUTS, state.layout, (k) => { state.layout = k; redraw(); });
  buildPicker('grades', GRADES, state.grade, (k) => { state.grade = k; redraw(); });
  buildPicker('sizes', SIZES, state.size, (k) => { state.size = k; renderNow(); });
}

/** Thumbnail strip: one button per panel, showing which photo it uses. */
function renderPanelThumbs() {
  const strip = $('panels');
  strip.innerHTML = '';
  const count = (LAYOUTS[state.layout] ?? LAYOUTS.hero).panels(1, 1).length;
  for (let i = 0; i < count; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'panel-thumb' + (i === state.selectedPanel ? ' active' : '');
    const p = state.panels[i];
    const img = state.photos[p.photo];
    b.textContent = `Panel ${i + 1} · ${img ? 'Photo ' + (p.photo + 1) : 'empty'}`;
    b.addEventListener('click', () => { state.selectedPanel = i; syncPanelControls(); redraw(); });
    strip.appendChild(b);
  }
}

/** Syncs the crop sliders + photo select to the selected panel. */
function syncPanelControls() {
  const p = state.panels[state.selectedPanel];
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} — crop & position`;
  $('zoom').value = p.zoom;
  $('panX').value = p.ox;
  $('panY').value = p.oy;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panXVal').textContent = `${Math.round(p.ox * 100)}`;
  $('panYVal').textContent = `${Math.round(p.oy * 100)}`;
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  state.photos.forEach((img, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = `Photo ${i + 1}`;
    sel.appendChild(o);
  });
  sel.value = String(p.photo);
  $('panelPhotoWrap').style.display = state.photos.length ? '' : 'none';
}

/** Adds photos from File objects, keeping at most 6 in the tray. */
async function addFiles(files) {
  for (const file of [...files].slice(0, 6 - state.photos.length)) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      state.photos.push(img);
    } catch { /* a file that will not load is skipped, not fatal */ }
  }
  renderPhotoTray();
  syncPanelControls();
  redraw();
}

function renderPhotoTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((img, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tray-item';
    b.title = `Use Photo ${i + 1} in the selected panel`;
    const thumb = document.createElement('img');
    thumb.src = img.src;
    thumb.alt = `Photo ${i + 1}`;
    b.appendChild(thumb);
    b.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      syncPanelControls();
      redraw();
    });
    tray.appendChild(b);
  });
  $('photoCount').textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — click one to put it in the selected panel`
    : 'No photos yet — add your own, or try a sample below.';
}

/** Fills every panel from one photo, or spreads the loaded photos across panels. */
function fillPanels(mode) {
  const n = (LAYOUTS[state.layout] ?? LAYOUTS.hero).panels(1, 1).length;
  for (let i = 0; i < n; i++) {
    state.panels[i].photo = mode === 'one' ? state.selectedPanelPhoto() : (i % Math.max(1, state.photos.length));
  }
  syncPanelControls();
  redraw();
}
state.selectedPanelPhoto = () => state.panels[state.selectedPanel].photo;

/** Exports the cover at a post size as a PNG download. */
export function exportCover(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  renderCover(off, state, size);
  status.textContent = `Rendering ${size.label}…`;
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-coast-${size.w}x${size.h}.png — share it!`;
  }, 'image/png');
}

export function exportAllSizes() {
  Object.keys(SIZES).forEach((k, i) => setTimeout(() => exportCover(k), i * 450));
}

// ---- Wire the controls ----
$('photos').addEventListener('change', (e) => addFiles(e.target.files));
$('fillOne').addEventListener('click', () => fillPanels('one'));
$('fillAll').addEventListener('click', () => fillPanels('all'));
$('shuffle').addEventListener('click', () => {
  const n = state.photos.length;
  if (!n) return;
  state.panels.forEach((p) => { p.photo = Math.floor(Math.random() * n); });
  syncPanelControls();
  redraw();
});
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('exportOne').addEventListener('click', () => exportCover(state.size));
$('exportAll').addEventListener('click', exportAllSizes);
$('zoom').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
  redraw();
});
$('panX').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].ox = Number(e.target.value);
  $('panXVal').textContent = `${Math.round(Number(e.target.value) * 100)}`;
  redraw();
});
$('panY').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].oy = Number(e.target.value);
  $('panYVal').textContent = `${Math.round(Number(e.target.value) * 100)}`;
  redraw();
});
$('panelPhoto').addEventListener('change', (e) => {
  state.panels[state.selectedPanel].photo = Number(e.target.value);
  redraw();
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    const img = await loadImage(b.dataset.sample);
    if (!state.photos.some((p) => p.src === img.src)) state.photos.push(img);
    renderPhotoTray();
    syncPanelControls();
    redraw();
  });
});

// ---- Boot: load the two sample photos, then paint. ----
refreshPickers();
syncPanelControls();
const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShot(params.get('shot'), params, async (sample, text, opts) => {
    state.layout = opts.layout;
    state.grade = opts.grade;
    state.size = opts.size;
    state.title = text;
    state.subtitle = opts.subtitle;
    const img = await loadImage(sample);
    state.photos = [img];
    const second = await loadImage(opts.second).catch(() => img);
    if (second !== img) state.photos.push(second);
    state.panels.forEach((p, i) => { p.photo = i % state.photos.length; p.zoom = 1; p.ox = 0; p.oy = 0; });
    refreshPickers();
    renderPhotoTray();
    syncPanelControls();
    renderNow();
  });
} else {
  Promise.all([loadImage('samples/boulevard.jpg'), loadImage('samples/pier.jpg')])
    .then(([a, b]) => {
      state.photos = [a, b];
      renderPhotoTray();
      syncPanelControls();
      renderNow();
    })
    .catch(() => { renderPhotoTray(); renderNow(); });
}
