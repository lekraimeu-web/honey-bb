# my dear honey bb — an immersive 3D love letter

A small universe built with React, Vite, Three.js and React Three Fiber.

The journey: an opening screen → a sunset meadow where a white kitten walks up
to her and asks "Do you want to begin, super doudou?" (the "No" button runs
away) → a night sky with a luminous particle heart that releases a line of
light at each touch → a floating Polaroid gallery of your photos → the love
letter → a hidden constellation → the signature, a portal, and an endless
cosmos that ends on the words *Yanis qui t’aime*.

## Run it on your computer

1. Install [Node.js](https://nodejs.org) (version 18 or newer).
2. Open a terminal inside this folder and run:

```bash
npm install
npm run dev
```

3. Open **http://localhost:5173** in your browser.

## Add your photos

Drop your pictures into the **`photos/`** folder (jpg, jpeg, png or webp).
That is all: they appear automatically in the 3D gallery, sorted by file name,
so name them `01.jpg`, `02.jpg`, `03.jpg`, …

Optional captions: open `src/content/photos.js` and write one caption per file.
See `photos/README.txt` for tips (file size, HEIC, etc.).

## Music and sounds

Put an instrumental you are allowed to use at **`public/audio/music.mp3`**.
It starts when she presses "Yes, of course ♡", loops softly, and fades between
scenes. If the file is missing, the site falls back to its own generative
ambient pad, so nothing breaks. Optionally add **`public/audio/meow.mp3`**
for the kitten; otherwise a small synthesized meow is used.
See `public/audio/README.txt`.

## Personalize the words

| What                                | File                       |
| ----------------------------------- | -------------------------- |
| The love letter                     | `src/content/letter.js`    |
| Buttons, titles, hints, final lines | `src/content/texts.js`     |
| The 8 lines of the hidden constellation | `src/content/secret.js` |
| Kitten question, collar tag, heart lines | `src/content/texts.js`    |
| Photo captions                      | `src/content/photos.js`    |

The two required phrases (`my dear honey bb` at the start, `Yanis qui t’aime`
at the very end) live in `src/content/texts.js`. Leave them as they are.

## The secret

When the letter has finished typing, a small star appears and starts to drift
in the upper right of the screen. After a few seconds it whispers. Tapping it
opens the hidden constellation scene. Pressing the main button instead skips
straight to the finale, so the secret is optional.

## Build and publish

```bash
npm run build
```

This creates a `dist/` folder containing the whole website as static files.
Upload that folder to any static host:

- **Netlify Drop** (easiest): go to https://app.netlify.com/drop and drag the
  `dist` folder onto the page. You get a public link in seconds.
- **Vercel**: `npx vercel` inside the project folder and follow the prompts.
- **GitHub Pages**: push the project to GitHub and publish the `dist` folder.

Because `vite.config.js` uses `base: './'`, the site works from any URL or sub-folder.

## Project layout

```
photos/                 ← your pictures go here
src/content/            ← every word on the site (letter, texts, captions, secret)
src/scenes/             ← the HTML overlay of each scene (intro, gallery UI, letter, secret, finale)
src/three/              ← the 3D world (meadow, kitten, stars, nebula, particle heart, polaroids, portal, cosmos, camera, effects)
src/audio/              ← music system (file or generative fallback), ambient pad, meow & whoosh effects
public/audio/           ← put music.mp3 (and optionally meow.mp3) here
src/config/quality.js   ← device-aware quality settings
src/state/              ← journey (scene) state and gallery state
src/styles/global.css   ← design tokens and all CSS
```

Reduced-motion preferences are respected: drifting, bursts and typing are
toned down or made instant when the system asks for less motion.
