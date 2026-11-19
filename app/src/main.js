// Neon Coast v2 — wires the editor: photo uploads, layout and grade pickers,
// title styles, per-panel crop + rotation, finish effects, undo/redo with a
// Surprise Me randomiser, caption editing and PNG export in three post sizes.
// A `?shot=` query sets up a fixed scene for screenshots instead (./shots.js).
import { LAYOUTS, GRADES, SIZES, TITLE_STYLES, FRAMES, renderCover } from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('cover');
const status = $('status');

const PANEL_COUNT = 9;
/** One blank panel setting; every layout slot gets one, so switching between
 *  a 2-panel and a 9-panel layout never loses a panel's crop. */
function blankPanel() {
  return { photo: 0, zoom: 1, ox: 0, oy: 0, rot: 0 };
}

/** The whole editor state: photos, one panel setting per layout slot, text
 *  and finish effects. Photos themselves are never snapshotted (see history). */
const state = {
  layout: 'hero',
  grade: 'sunset',
  size: 'square',
  title: 'VICE HEIST',
  subtitle: 'one last job under the neon sun',
  titleStyle: 'sunset',
  frame: 'white',
  grain: 0.5,
  halftone: false,
  flare: false,
  photos: [],
  panels: Array.from({ length: PANEL_COUNT }, (_, i) => ({ ...blankPanel(), photo: i % 2 })),
  selectedPanel: 0,
};

/** --- Undo / redo ------------------------------------------------------- */
/* History snapshots hold everything except the photos (HTMLImageElements
 * cannot be cloned cheaply); undo/redo restore the design, photos stay. */
let past = [];
let future = [];
function snapshot() {
  return JSON.stringify({
    layout: state.layout, grade: state.grade, size: state.size,
    title: state.title, subtitle: state.subtitle, titleStyle: state.titleStyle,
    frame: state.frame, grain: state.grain, halftone: state.halftone,
    flare: state.flare, panels: state.panels, selectedPanel: state.selectedPanel,
  });
}
function applySnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  state.panels = s.panels.map((p) => ({ ...blankPanel(), ...p }));
}
function pushHistory() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future = [];
  syncHistoryButtons();
}
/* Sliders / text inputs / checkboxes only fire `change` AFTER the value
 * moved, so a snapshot taken there is already the new state — undoing it
 * would be a no-op. Arm the pre-edit snapshot on focus / pointer-down
 * instead, and commit it on `change` only if the state actually moved. */
let pendingBefore = null;
function armBeforeEdit(el) {
  ['pointerdown', 'focus'].forEach((ev) => el.addEventListener(ev, () => {
    if (pendingBefore === null) pendingBefore = snapshot();
  }));
}
function commitEdit() {
  if (pendingBefore !== null && pendingBefore !== snapshot()) {
    past.push(pendingBefore);
    if (past.length > 60) past.shift();
    future = [];
    syncHistoryButtons();
  }
  pendingBefore = null;
}
function syncHistoryButtons() {
  $('undo').disabled = past.length === 0;
  $('redo').disabled = future.length === 0;
}
export function undo() {
  if (!past.length) return;
  future.push(snapshot());
  applySnapshot(past.pop());
  refreshAll();
  syncHistoryButtons();
}
export function redo() {
  if (!future.length) return;
  past.push(snapshot());
  applySnapshot(future.pop());
  refreshAll();
  syncHistoryButtons();
}
/** Randomises layout, grade, title style, frame and effects in one go —
 *  the fastest way to a fresh poster from the same photos. */
export function surpriseMe() {
  pushHistory();
  const pick = (obj) => {
    const keys = Object.keys(obj);
    return keys[Math.floor(Math.random() * keys.length)];
  };
  state.layout = pick(LAYOUTS);
  state.grade = pick(GRADES);
  state.titleStyle = pick(TITLE_STYLES);
  state.frame = pick(FRAMES);
  state.grain = Math.round(Math.random() * 10) / 10;
  state.halftone = Math.random() < 0.4;
  state.flare = Math.random() < 0.5;
  refreshAll();
}

/** --- Rendering --------------------------------------------------------- */
let redrawTimer = 0;
/** Renders the preview, debounced so slider drags stay smooth. */
export function redraw() {
  clearTimeout(redrawTimer);
  redrawTimer = setTimeout(renderNow, 30);
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
      pushHistory();
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
  buildPicker('titleStyles', TITLE_STYLES, state.titleStyle, (k) => { state.titleStyle = k; redraw(); });
  buildPicker('frames', FRAMES, state.frame, (k) => { state.frame = k; redraw(); });
  buildPicker('sizes', SIZES, state.size, (k) => { state.size = k; renderNow(); });
}

function refreshAll() {
  refreshPickers();
  syncPanelControls();
  syncEffectControls();
  renderNow();
}

/** Thumbnail strip: one button per panel, showing which photo it uses. */
function renderPanelThumbs() {
  const strip = $('panels');
  strip.innerHTML = '';
  const count = (LAYOUTS[state.layout] ?? LAYOUTS.hero).panels().length;
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
  $('rot').value = p.rot;
  $('zoomVal').textContent = `${Math.round(p.zoom * 100)}%`;
  $('panXVal').textContent = `${Math.round(p.ox * 100)}`;
  $('panYVal').textContent = `${Math.round(p.oy * 100)}`;
  $('rotVal').textContent = `${Math.round(p.rot)}°`;
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

/** Syncs the finish-effect controls to the state (used by undo/redo). */
function syncEffectControls() {
  $('grain').value = state.grain;
  $('grainVal').textContent = `${Math.round(state.grain * 100)}%`;
  $('halftone').checked = state.halftone;
  $('flare').checked = state.flare;
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
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
      pushHistory();
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

/** Fills every panel from the selected panel's photo, or spreads the loaded
 *  photos across panels. */
function fillPanels(mode) {
  pushHistory();
  const n = (LAYOUTS[state.layout] ?? LAYOUTS.hero).panels().length;
  for (let i = 0; i < n; i++) {
    state.panels[i].photo = mode === 'one'
      ? state.panels[state.selectedPanel].photo
      : (i % Math.max(1, state.photos.length));
  }
  syncPanelControls();
  redraw();
}

/** A safe file name from the title, e.g. "vice-heist". */
export function titleSlug() {
  return (state.title || 'neon-coast').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'neon-coast';
}

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
    a.download = `${titleSlug()}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved ${titleSlug()}-${size.w}x${size.h}.png — share it!`;
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
  pushHistory();
  state.panels.forEach((p) => { p.photo = Math.floor(Math.random() * n); });
  syncPanelControls();
  redraw();
});
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
$('surprise').addEventListener('click', surpriseMe);
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
  }
});
$('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
['title', 'subtitle', 'zoom', 'panX', 'panY', 'rot', 'grain'].forEach((id) => {
  armBeforeEdit($(id));
  $(id).addEventListener('change', commitEdit);
});
armBeforeEdit($('halftone'));
armBeforeEdit($('flare'));
$('halftone').addEventListener('change', (e) => { state.halftone = e.target.checked; commitEdit(); redraw(); });
$('flare').addEventListener('change', (e) => { state.flare = e.target.checked; commitEdit(); redraw(); });
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
$('rot').addEventListener('input', (e) => {
  state.panels[state.selectedPanel].rot = Number(e.target.value);
  $('rotVal').textContent = `${Math.round(Number(e.target.value))}°`;
  redraw();
});
$('grain').addEventListener('input', (e) => {
  state.grain = Number(e.target.value);
  $('grainVal').textContent = `${Math.round(Number(e.target.value) * 100)}%`;
  redraw();
});
$('panelPhoto').addEventListener('change', (e) => {
  pushHistory();
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
syncEffectControls();
syncHistoryButtons();
const params = new URLSearchParams(location.search);
if (params.get('shot')) {
  runShot(params.get('shot'), params, async (sample, text, opts) => {
    state.layout = opts.layout;
    state.grade = opts.grade;
    state.size = opts.size;
    state.title = text;
    state.subtitle = opts.subtitle;
    state.titleStyle = opts.titleStyle ?? 'sunset';
    state.frame = opts.frame ?? 'white';
    state.grain = opts.grain ?? 0.5;
    state.halftone = opts.halftone ?? false;
    state.flare = opts.flare ?? false;
    const img = await loadImage(sample);
    state.photos = [img];
    const second = await loadImage(opts.second).catch(() => img);
    if (second !== img) state.photos.push(second);
    state.panels.forEach((p, i) => {
      p.photo = i % state.photos.length;
      p.zoom = 1; p.ox = 0; p.oy = 0; p.rot = 0;
    });
    refreshAll();
    renderPhotoTray();
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
