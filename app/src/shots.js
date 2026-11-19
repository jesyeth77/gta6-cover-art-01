// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows one exported cover full-frame at its export size.
// Query keys: photo (sample name), second (second sample), caption, subtitle,
// layout (hero|grid|strip|full), grade, size (square|portrait|wide).
// window.__shotReady is set once the cover has been painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const layout = query.get('layout') ?? 'hero';
  const grade = query.get('grade') ?? 'sunset';
  const size = query.get('size') ?? 'square';
  const photo = query.get('photo') ?? 'boulevard';
  const second = query.get('second') ?? 'pier';
  await load(
    `samples/${photo}.jpg`,
    query.get('caption') ?? 'Vice Heist',
    {
      layout,
      grade,
      size,
      subtitle: query.get('subtitle') ?? 'one last job under the neon sun',
      second: `samples/${second}.jpg`,
    },
  );
  requestAnimationFrame(() => requestAnimationFrame(() => {
    // Give the gradient-map pass a beat to finish before the screenshot.
    setTimeout(() => { window.__shotReady = true; }, 120);
  }));
}
