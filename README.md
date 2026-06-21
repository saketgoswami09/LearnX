<div align="center">
  <img src="./public/logo.png" alt="LearnX logo" width="280" />

  <h3>Your local-first learning OS</h3>
  <p>Turn a folder of downloaded courses into a real learning experience — no backend, no uploads, no cloud.</p>
</div>

---

## What is this?

LearnX is a browser-based course player I built for myself after getting tired of tracking my own progress through downloaded course folders using a plain file browser and a mental list of "what have I actually watched."

Point it at a folder. It scans the structure, turns sub-folders into modules and video/PDF files into lessons, and gives you a real UI for watching, reading, taking notes, and picking up exactly where you left off — all running entirely in your browser.

There is no server. Nothing is uploaded anywhere. Your course files never leave your disk.

## How it works

LearnX uses the **File System Access API** to ask for permission to read a folder you choose. It stores a reference to each file (not the file itself) in **IndexedDB**, so it can come back later, re-request permission, and stream the video or PDF straight from disk via a blob URL — no copying, no re-importing every time you reopen the app.

```
Pick a folder
   └── Course/
        ├── Module 1/
        │     ├── lesson-1.mp4
        │     └── lesson-2.pdf
        └── Module 2/
              └── Week 1/
                    └── lesson-3.mp4   ← nested folders are scanned recursively
```

All app data — courses, modules, lessons, progress, notes, bookmarks — lives in IndexedDB. Nothing is ever sent over the network.

## Features

- **Automatic folder → course conversion** — sub-folders become modules, recognized files become lessons, recursively at any depth
- **Local video & PDF playback** — no upload step, plays directly from your file system
- **`.ts` (MPEG-TS) support** — most browsers can't play raw `.ts` files natively; LearnX uses `mpegts.js` to handle this in-browser
- **Progress tracking** — resume any lesson exactly where you left off
- **Timestamped notes** — jot down a note tied to the exact moment in a video
- **Bookmarks** — mark and jump back to key timestamps
- **Dashboard stats** — streaks, time learned, continue-watching, recent activity
- **Search** — across courses, lessons, and notes
- **100% local** — everything persists in IndexedDB; no account, no server, no sync

## Tech stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, Radix UI primitives, Lucide icons |
| State | Zustand (UI state), IndexedDB (all app data, via a custom wrapper) |
| Media | `mpegts.js` for `.ts` video playback |
| Utilities | `date-fns`, `nanoid` |

## Browser support

LearnX relies on the **File System Access API**, which is currently only available in **Chromium-based browsers** — Chrome, Edge, and Opera. Firefox and Safari aren't supported yet, since they haven't implemented this API.

## Getting started

```bash
git clone https://github.com/saketgoswami09/LearnX.git
cd LearnX
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), head to **Import**, and pick a folder.

## Why I built this

I had a backlog of downloaded courses and no good way to track what I'd actually finished. Every existing option I found either wanted me to self-host a server or didn't fit this specific use case. So I built the smallest thing that could solve it — entirely client-side, entirely private — and have been using it ever since.

## License

MIT
