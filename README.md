# MCU Recap & Timeline (Vue 3 + Vite)

A fast, mobile-friendly, filterable MCU recap + timeline viewer:

-  Films + Disney+ series + specials
-  Optional One-Shots + Defenders Saga
-  Search across titles, stories, characters, synopsis
-  Filters for Type / Phase / Storylines / Characters
-  Timeline view (story order) + Release view

## Requirements

-  Node.js 20+

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages (Repo Site)

This repo includes a GitHub Actions workflow that builds and deploys automatically.

1. Push this project to a GitHub repository (default branch: `main`)
2. In **Settings → Pages**:
   -  Source: **GitHub Actions**
3. Push to `main` → GitHub Pages will publish.

### Notes about `base` path

`vite.config.ts` uses the repo name automatically during GitHub Actions build:

-  Locally it assumes `/MarvelMatrix/`
-  On GitHub Pages it becomes `/<your-repo-name>/` automatically

If you ever want to hardcode the base path, edit:

-  `vite.config.ts`

## Dataset

Edit the MCU dataset here:

-  `src/data/mcu.ts`

Each item includes:

-  `title`, `kind`, `phase`
-  `releaseYear`, `releaseDate`
-  `timeline` (story placement label) + `timelineSort`
-  `stories` (multi-tag storyline categories)
-  `characters` (major characters for the title)
-  `infinityStones` (colors appear in Timeline view)
