# Neon Coast — GTA 6-Style Cover Art Maker

An offline web app that turns any photo and a caption into GTA 6-style cover
art, exported as a PNG to share. Built for the make.fun bounty
`gta6-cover-art-01`.

## What it does

- **Multi-panel posters** — four layouts: Hero + Three, Four Panel Grid,
  Hero Strip, and Full Bleed, with white gutters and panel frames.
- **Any photo** — upload up to 6 of your own photos, or use the two bundled
  samples. Fill every panel with one photo, spread photos across panels, or
  shuffle. Each panel has its own photo, zoom, and pan (crop + position).
- **Vice City grades** — five gradient-map colour grades (Vice Sunset, Neon
  Nights, Palm Gold, Ocean Drive, Midnight Pink) applied per panel.
- **Bold caption lettering** — a sunset-gradient title with dark outline and a
  neon script subtitle, plus a badge ribbon. Edit both live.
- **Fast export** — one click exports PNG in 1080×1080, 1080×1350, or
  1920×1080; "Export all 3 sizes" does all three at once.
- **Polish** — live preview, film grain, vignette, warm sun wash per panel.
- **Fully offline** — no network requests, no external libraries or fonts,
  photos never leave the machine. No Rockstar Games logo, artwork, or fonts
  are used anywhere; all lettering and art are original.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library.

## Screenshots

`shots.json` lists the four screenshots; `shot.mjs` takes them with
Playwright against the local server (`?shot=cover` for a full-frame exported
cover, `?shot=editor` for the editor with photos loaded).

## License

MIT — see LICENSE. Sample photos under `app/samples/` were made for make.fun
with an image model and are free to use.
