// Neon Coast v2 — the cover engine.
// Draws a multi-panel GTA-style poster onto any 2D canvas: seven layouts
// (including a nine-panel grid and a tilted snapshot spread), seven
// gradient-map Vice City grades, three title styles, three frame styles,
// halftone dots, a sun flare, film grain and a vignette. Every pixel is
// drawn from the photos the user loaded; nothing is fetched, ever.

/** Poster layouts. Each returns panel rects as fractions of the canvas.
 *  A rect may carry `rot` (degrees) for a tilted, snapshot-style panel. */
export const LAYOUTS = {
  hero: {
    label: 'Hero + Three',
    panels() {
      const g = 0.012;
      const heroW = 0.62;
      const sideH = (1 - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: heroW, h: 1 },
        { x: heroW + g, y: 0, w: 1 - heroW - g, h: sideH },
        { x: heroW + g, y: sideH + g, w: 1 - heroW - g, h: sideH },
        { x: heroW + g, y: 2 * sideH + 2 * g, w: 1 - heroW - g, h: sideH },
      ];
    },
  },
  grid: {
    label: 'Four Panel Grid',
    panels() {
      const g = 0.012;
      const cw = (1 - g) / 2, ch = (1 - g) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + g, y: 0, w: cw, h: ch },
        { x: 0, y: ch + g, w: cw, h: ch },
        { x: cw + g, y: ch + g, w: cw, h: ch },
      ];
    },
  },
  strip: {
    label: 'Hero Strip',
    panels() {
      const g = 0.012;
      const topH = 0.62;
      const bw = (1 - 2 * g) / 3;
      return [
        { x: 0, y: 0, w: 1, h: topH },
        { x: 0, y: topH + g, w: bw, h: 1 - topH - g },
        { x: bw + g, y: topH + g, w: bw, h: 1 - topH - g },
        { x: 2 * bw + 2 * g, y: topH + g, w: bw, h: 1 - topH - g },
      ];
    },
  },
  duo: {
    label: 'Duo Split',
    panels() {
      const g = 0.012;
      const cw = (1 - g) / 2;
      return [
        { x: 0, y: 0, w: cw, h: 1 },
        { x: cw + g, y: 0, w: cw, h: 1 },
      ];
    },
  },
  nine: {
    label: 'Nine Panel Grid',
    panels() {
      const g = 0.01;
      const cw = (1 - 2 * g) / 3, ch = (1 - 2 * g) / 3;
      const out = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          out.push({ x: col * (cw + g), y: row * (ch + g), w: cw, h: ch });
        }
      }
      return out;
    },
  },
  tilt: {
    label: 'Tilted Snapshots',
    panels() {
      const g = 0.014;
      return [
        { x: 0.02, y: 0.015, w: 0.60, h: 0.66, rot: -2.5 },
        { x: 0.66, y: 0.03, w: 0.32, h: 0.40, rot: 3 },
        { x: 0.60, y: 0.47, w: 0.38, h: 0.50, rot: -1.5 },
        { x: 0.02, y: 0.70, w: 0.55, h: 0.285, rot: 1.5 },
      ];
    },
  },
  full: {
    label: 'Full Bleed',
    panels() {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
};

/** Gradient-map grades: pixel luminance (0..1) is remapped through the stops. */
export const GRADES = {
  sunset: {
    label: 'Vice Sunset',
    stops: [[0, '#160a2e'], [0.25, '#5b1a5e'], [0.5, '#c2337f'], [0.75, '#ff7a3d'], [1, '#ffd97a']],
    strength: 0.55,
  },
  neon: {
    label: 'Neon Nights',
    stops: [[0, '#050914'], [0.3, '#0e2a5e'], [0.55, '#c2188b'], [0.8, '#22e6d2'], [1, '#f4fff9']],
    strength: 0.6,
  },
  gold: {
    label: 'Palm Gold',
    stops: [[0, '#1c0f02'], [0.3, '#6b3a08'], [0.55, '#c97b1e'], [0.8, '#ffb347'], [1, '#fff3c4']],
    strength: 0.5,
  },
  ocean: {
    label: 'Ocean Drive',
    stops: [[0, '#02131f'], [0.3, '#0a4a6b'], [0.55, '#0fa3a3'], [0.8, '#7fe3c8'], [1, '#eafff5']],
    strength: 0.5,
  },
  midnight: {
    label: 'Midnight Pink',
    stops: [[0, '#0d0218'], [0.3, '#3d0a54'], [0.55, '#a4137a'], [0.8, '#ff5e8a'], [1, '#ffd0e0']],
    strength: 0.6,
  },
  bubblegum: {
    label: 'Bubblegum Pop',
    stops: [[0, '#12041f'], [0.3, '#5b0a6e'], [0.55, '#ff2e88'], [0.8, '#7df9ff'], [1, '#fff6ff']],
    strength: 0.55,
  },
  heatwave: {
    label: 'Heatwave Ember',
    stops: [[0, '#140202'], [0.3, '#57100a'], [0.55, '#c22e12'], [0.8, '#ff8a2a'], [1, '#ffe9a8']],
    strength: 0.55,
  },
};

/** Title lettering styles for the big caption. */
export const TITLE_STYLES = {
  sunset: { label: 'Sunset Gradient', kind: 'gradient' },
  white: { label: 'White Block', kind: 'solid' },
  neon: { label: 'Neon Outline', kind: 'outline' },
};

/** Panel frame styles. */
export const FRAMES = {
  white: { label: 'White Frame', kind: 'white' },
  ink: { label: 'Inked Black', kind: 'ink' },
  none: { label: 'No Frame', kind: 'none' },
};

/** Post sizes the app exports. */
export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

/** Builds a 256-entry lookup table from a grade's colour stops. */
export function gradeLookup(stops) {
  const table = new Uint8Array(256 * 3);
  const parsed = stops.map(([t, hex]) => [t, [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = parsed[0], b = parsed[parsed.length - 1];
    for (let k = 0; k < parsed.length - 1; k++) {
      if (t >= parsed[k][0] && t <= parsed[k + 1][0]) { a = parsed[k]; b = parsed[k + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) table[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return table;
}

/** Applies a gradient-map grade to the pixels of `src`, blended by strength. */
export function applyGrade(src, grade) {
  const w = src.width, h = src.height;
  const ctx = src.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const table = gradeLookup(grade.stops);
  const s = grade.strength;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const li = Math.min(255, Math.max(0, Math.round(lum))) * 3;
    d[i] = d[i] * (1 - s) + table[li] * s;
    d[i + 1] = d[i + 1] * (1 - s) + table[li + 1] * s;
    d[i + 2] = d[i + 2] * (1 - s) + table[li + 2] * s;
  }
  ctx.putImageData(img, 0, 0);
  return src;
}

/**
 * Draws one photo into a rect with cover-fit, zoom, pan and an optional
 * in-panel rotation. `pan` is { zoom, ox, oy, rot } with ox/oy as fractions
 * of the rect (-0.5..0.5) and rot in degrees.
 */
export function drawPanelPhoto(ctx, img, rect, pan) {
  const zoom = pan?.zoom ?? 1;
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (pan?.ox ?? 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (pan?.oy ?? 0) * rect.h;
  const rot = ((pan?.rot ?? 0) * Math.PI) / 180;
  if (rot) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    // Oversize a touch so the corners never show the panel behind them.
    ctx.drawImage(img, -pw / 2, -ph / 2, pw * 1.06, ph * 1.06);
    ctx.restore();
  } else {
    ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  }
}

/** A tileable film-grain pattern, generated once per page load. */
let grainTile = null;
export function getGrainTile() {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = 128; grainTile.height = 128;
  const g = grainTile.getContext('2d');
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
    img.data[i + 3] = Math.random() < 0.5 ? 0 : 28;
  }
  g.putImageData(img, 0, 0);
  return grainTile;
}

/** Halftone dot field, for the comic-print look in the title band. */
export function drawHalftone(ctx, x, y, w, h, color) {
  const step = Math.max(10, w * 0.014);
  ctx.save();
  ctx.fillStyle = color;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    const row = Math.round((yy - y) / step);
    for (let xx = x + step / 2 + (row % 2 ? step / 2 : 0); xx < x + w; xx += step) {
      const r = step * 0.16 * (1 + 0.5 * Math.sin(xx * 0.05 + yy * 0.03));
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Fills the big title text in the active title style. */
export function paintTitleText(ctx, text, cx, ty, size, styleKey, w) {
  const style = TITLE_STYLES[styleKey] ?? TITLE_STYLES.sunset;
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
  ctx.lineJoin = 'round';
  if (style.kind === 'gradient') {
    const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
    grad.addColorStop(0, '#fff7d6');
    grad.addColorStop(0.45, '#ffd23e');
    grad.addColorStop(0.75, '#ff6a3d');
    grad.addColorStop(1, '#ff2e88');
    ctx.strokeStyle = 'rgba(12, 2, 24, 0.9)';
    ctx.lineWidth = Math.max(3, size * 0.09);
    ctx.strokeText(text, cx, ty);
    ctx.fillStyle = grad;
    ctx.fillText(text, cx, ty);
  } else if (style.kind === 'solid') {
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = Math.max(2, size * 0.05);
    ctx.strokeText(text, cx, ty);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx, ty);
  } else {
    // Neon outline: hollow letters with a hot pink glow.
    ctx.strokeStyle = '#7df9ff';
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = size * 0.25;
    ctx.strokeText(text, cx, ty);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fillText(text, cx, ty);
  }
}

/** Draws the bold title + neon script subtitle across the foot of the cover. */
export function drawTitleBlock(ctx, w, h, title, subtitle, opts) {
  const bandH = h * 0.22;
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 24, 0.82)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

  if (opts?.halftone) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    drawHalftone(ctx, 0, bandY - h * 0.06, w, bandH + h * 0.06, '#ffffff');
    ctx.restore();
  }

  const text = (title || 'VICE HEIST').trim().toUpperCase();
  // Size is driven by width, but capped by height so wide posters never
  // clip the lettering at the foot of the canvas.
  let size = Math.min(w * 0.115, h * 0.17);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fit = (s) => {
    ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", sans-serif`;
    return ctx.measureText(text).width <= w * 0.94;
  };
  while (size > 20 && !fit(size)) size -= 4;
  const ty = h - h * 0.075;
  paintTitleText(ctx, text, w / 2, ty, size, opts?.titleStyle ?? 'sunset', w);

  const sub = (subtitle || '').trim();
  if (sub) {
    const ss = Math.max(18, w * 0.032);
    ctx.font = `italic 700 ${ss}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#7df9ff';
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = ss * 0.7;
    ctx.fillText(sub, w / 2, ty - size - ss * 0.35);
    ctx.shadowBlur = 0;
  }
  // Small badge ribbon, top-left of the title band.
  const badge = 'VICE CITY  •  EST. 2026';
  const bs = Math.max(13, w * 0.016);
  ctx.font = `700 ${bs}px "Arial Narrow", Arial, sans-serif`;
  ctx.textAlign = 'left';
  const bw = ctx.measureText(badge).width + bs * 1.6;
  const bx = w * 0.03, by = bandY + bs * 0.4;
  ctx.fillStyle = '#ff2e88';
  ctx.fillRect(bx, by, bw, bs * 1.9);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(badge, bx + bs * 0.8, by + bs * 1.38);
  ctx.textAlign = 'center';
}

/** Draws one panel's frame in the active frame style. */
export function strokePanelFrame(ctx, px, py, pw, ph, w, frameKey) {
  const frame = FRAMES[frameKey] ?? FRAMES.white;
  if (frame.kind === 'none') return;
  if (frame.kind === 'ink') {
    ctx.strokeStyle = 'rgba(10, 4, 24, 0.95)';
    ctx.lineWidth = Math.max(4, w * 0.008);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(2, w * 0.004);
  }
  ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
}

/**
 * Renders the whole cover. `state` holds layout, grade, title, subtitle,
 * titleStyle, frame, grain (0..1), halftone, flare, photos
 * (HTMLImageElement list) and panels [{photo, zoom, ox, oy, rot}].
 * `size` is one of SIZES. Returns the canvas it drew on.
 */
export function renderCover(canvas, state, size) {
  const w = size.w, h = size.h;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  const layout = LAYOUTS[state.layout] ?? LAYOUTS.hero;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const rects = layout.panels(w, h);
  const photos = state.photos || [];

  rects.forEach((r, i) => {
    const px = r.x * w, py = r.y * h, pw = r.w * w, ph = r.h * h;
    const panel = state.panels?.[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0, rot: 0 };
    const img = photos[panel.photo] ?? photos[0] ?? null;
    if (!img) {
      // Empty panel: a painted sunset placeholder so the poster never looks blank.
      const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
      g.addColorStop(0, '#2a1052'); g.addColorStop(0.6, '#c2337f'); g.addColorStop(1, '#ff7a3d');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.max(14, pw * 0.05)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', px + pw / 2, py + ph / 2);
      return;
    }
    // Draw the panel to a scratch canvas, grade it, then composite it in.
    const cap = Math.min(900, Math.max(320, Math.round(Math.max(pw, ph))));
    const scratch = document.createElement('canvas');
    scratch.width = Math.round(pw / Math.max(pw, ph) * cap) || cap;
    scratch.height = Math.round(ph / Math.max(pw, ph) * cap) || cap;
    const sctx = scratch.getContext('2d');
    drawPanelPhoto(sctx, img, { x: 0, y: 0, w: scratch.width, h: scratch.height }, panel);
    applyGrade(scratch, grade);
    // Warm sun wash from the top of each panel.
    const wash = sctx.createLinearGradient(0, 0, scratch.width, scratch.height);
    wash.addColorStop(0, 'rgba(255, 190, 90, 0.10)');
    wash.addColorStop(1, 'rgba(255, 46, 136, 0.12)');
    sctx.fillStyle = wash;
    sctx.fillRect(0, 0, scratch.width, scratch.height);
    if (r.rot) {
      // Tilted panel: paint the graded scratch rotated about its own centre,
      // with a white polaroid-style edge showing underneath.
      ctx.save();
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((r.rot * Math.PI) / 180);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12);
      ctx.drawImage(scratch, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
    } else {
      ctx.drawImage(scratch, px, py, pw, ph);
      strokePanelFrame(ctx, px, py, pw, ph, w, state.frame);
    }
  });

  if (state.flare) {
    // Sun flare: a warm radial glow in the top-right corner.
    const fx = w * 0.86, fy = h * 0.1;
    const flare = ctx.createRadialGradient(fx, fy, 0, fx, fy, Math.max(w, h) * 0.42);
    flare.addColorStop(0, 'rgba(255, 214, 120, 0.55)');
    flare.addColorStop(0.4, 'rgba(255, 122, 61, 0.18)');
    flare.addColorStop(1, 'rgba(255, 122, 61, 0)');
    ctx.fillStyle = flare;
    ctx.fillRect(0, 0, w, h);
  }

  drawTitleBlock(ctx, w, h, state.title, state.subtitle, {
    titleStyle: state.titleStyle,
    halftone: state.halftone,
  });

  // Vignette + grain over the finished poster.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const grainAmt = state.grain == null ? 0.5 : state.grain;
  if (grainAmt > 0) {
    const tile = getGrainTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.globalAlpha = grainAmt;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  return canvas;
}
