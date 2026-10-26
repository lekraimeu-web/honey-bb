// ─────────────────────────────────────────────────────────────────────────────
//  PHOTO CAPTIONS  –  optional
//  Put your photos in the  /photos  folder (see photos/README.txt).
//  Then write a caption for each file name below. Files without a caption
//  get `defaultCaption`. Leave a caption as '' for no text at all.
// ─────────────────────────────────────────────────────────────────────────────

export const captions = {
  '01.jpg': 'you, crowned with flowers',
  '02.jpg': 'the kiss we sent the camera',
  '03.jpg': 'peace sign, pure joy',
  '04.jpg': 'your hand in mine',
  '05.webp': 'a wall of wishes',
}

export const defaultCaption = 'you & me'

// ── Automatic photo discovery (no need to touch this) ───────────────────────
// Vite scans the /photos folder at build time. Any image dropped there is
// included, sorted alphabetically by file name.
const files = import.meta.glob('/photos/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const photos = Object.entries(files)
  .map(([path, url]) => {
    const name = path.split('/').pop()
    const key = Object.keys(captions).find((k) => k.toLowerCase() === name.toLowerCase())
    const caption = key !== undefined ? captions[key] : defaultCaption
    return { name, url, caption }
  })
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
