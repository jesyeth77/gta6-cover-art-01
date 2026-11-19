// Neon Coast — the cover engine. Draws a multi-panel GTA-style poster onto any
// 2D canvas: panel layouts, a gradient-map Vice City grade per panel, bold
// caption lettering with a neon script subtitle, grain and a vignette.
// Everything is drawn from the photos the user loaded; nothing is fetched.

/** The four poster layouts. Each returns panel rects as fractions of the canvas. */
export const LAYOUTS = {
  hero: {
    label: 'Hero + Three',
    panels(w, h) {
      const g = 0.012; // white gutter, fraction of width
      const heroW = 0.62;
      return [
        { x: 0, y: 0, w: heroW, h: 1 },
        { x: heroW + g, y: 0, w: 1 - heroW - g, h: (1 - 2 * g) / 3 },
        { x: heroW + g, y: (1 + g) / 3, w: 1 - heroW - g, h: (1 - 2 * g) / 3 },
        { x: heroW + g, y: (2 + 2 * g) / 3, w: 1 - heroW - g, h: (1 - 2 * g) / 3 },
      ];
    },
  },
  grid: {
    label: 'Four Panel Grid',
    panels(w, h) {
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
    panels(w, h) {
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
  full: {
    label: 'Full Bleed',
    panels(w, h) {
      return [{ x: 0, y: 0, w: 1, h: 1 }];
    },
  },
};

/** Gradient-map grades: luminance (0..1) is remapped through these colour stops. */
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

/** Applies a gradient-map grade to the pixels of `src` canvas, blended by strength. */
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
 * Draws one photo into a panel rect with cover-fit, a zoom and a pan offset.
 * `pan` is { zoom, ox, oy } where ox/oy are fractions of the panel (-0.5..0.5).
 */
export function drawPanelPhoto(ctx, img, rect, pan) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * (pan?.zoom ?? 1);
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + (pan?.ox ?? 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (pan?.oy ?? 0) * rect.h;
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
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

/** Draws the bold title + neon script subtitle across the foot of the cover. */
export function drawTitleBlock(ctx, w, h, title, subtitle) {
  const bandH = h * 0.22;
  const bandY = h - bandH;
  const shade = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  shade.addColorStop(0, 'rgba(10, 4, 24, 0)');
  shade.addColorStop(1, 'rgba(10, 4, 24, 0.82)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, bandY - h * 0.06, w, bandH + h * 0.06);

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
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
  const ty = h - h * 0.075;
  // Sunset gradient fill with a dark outline, GTA-poster style lettering.
  const grad = ctx.createLinearGradient(0, ty - size, 0, ty);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.45, '#ffd23e');
  grad.addColorStop(0.75, '#ff6a3d');
  grad.addColorStop(1, '#ff2e88');
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(12, 2, 24, 0.9)';
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeText(text, w / 2, ty);
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, ty);

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

/**
 * Renders the whole cover. `state` holds layout, grade, title, subtitle,
 * photos (HTMLImageElement list) and panels [{photo, zoom, ox, oy}].
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
    const panel = state.panels?.[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
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
    ctx.drawImage(scratch, px, py, pw, ph);
    // Thin white frame around every panel, the poster look.
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
  });

  drawTitleBlock(ctx, w, h, state.title, state.subtitle);

  // Vignette + grain over the finished poster.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(8,2,20,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  const tile = getGrainTile();
  const pat = ctx.createPattern(tile, 'repeat');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  return canvas;
}
