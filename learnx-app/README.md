# LearnX

A local-first learning platform that runs entirely in your browser — no server, no account, no uploads.  
Import a folder of videos or PDFs from your filesystem and get a structured course with progress tracking, bookmarks, and notes, all persisted in IndexedDB.

## How it works

- **Folder import** — pick any directory via the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API). Top-level subfolders become modules; media files anywhere inside them (at any depth) become lessons.
- **Local media streaming** — file handles are stored in IndexedDB and resolved to `blob:` URLs on demand. No files are ever copied or uploaded.
- **Persistence** — all course data, progress, bookmarks, and notes live in IndexedDB via [idb](https://github.com/jakearchibald/idb). Nothing leaves the device.
- **TS / HLS playback** — `.ts` files are played through [mpegts.js](https://github.com/xqq/mpegts.js) with MSE; all other formats use the native `<video>` element.

## Tech stack

| Layer | Library |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 |
| Storage | IndexedDB via `idb` |
| ID generation | `nanoid` |
| Icons | `lucide-react` |
| TS playback | `mpegts.js` |

> **Note:** The `/api/*` routes in `src/app/api/` return `410 Gone` and are never called. All data access goes through `src/lib/service.ts` directly in the browser.

## Getting started

```bash
cd learnx-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click **Import Course Folder**, and pick a directory of videos.

## Supported file types

`mp4` · `mkv` · `webm` · `avi` · `mov` · `ts` · `pdf`

## Known limitations

- Requires a Chromium-based browser (File System Access API is not available in Firefox/Safari).
- File handles need re-permission after a browser restart — you'll be prompted automatically.
- `typescript: { ignoreBuildErrors: true }` is set in `next.config.ts` for active development; remove it before shipping.
