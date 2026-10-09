# GDR

A retro game library dashboard built with React, Material UI, TanStack Query,
React Intl, and SQLite.

## Run the desktop app

Install the dependencies once:

```sh
npm install
```

Start the Vite development server in one terminal:

```sh
npm run dev
```

Then launch Electron in a second terminal:

```sh
npm run electron
```

The desktop window opens fullscreen. Connect a controller before or after
launching: use the D-pad or left stick to focus game cards and controls, **A**
to select a card or activate a control, the **right stick** to scroll the
library, **X / Square** to open the focused game's options, **B** to go back or
close a menu, and **Start** to toggle fullscreen. The dashboard does not launch
ROMs or run an emulator.

The game database is stored with the project so it moves with the external drive:

```text
gamedashboardretro/database/gdr.sqlite
```

Use **Open database folder** at the bottom of the sidebar to open the project
database folder. The database stores game metadata and each selected ROM's
original file path; ROM files themselves are not copied or moved. Favorites,
removals, and newly added games persist across restarts. SQLite database and
journal files are excluded from Git.

On first launch, GDR migrates an existing database from
`%APPDATA%\GDR\database\gdr.sqlite` or the older
`%APPDATA%\PixelVault\database\pixelvault.sqlite` into the project folder. The
old database files are left untouched.

The app seeds its sample library only on the first run. Removing sample games
does not cause them to be added again.

## Languages

Choose **EN** or **FR** at the bottom of the sidebar. The interface language is
remembered on this device. Translation catalogs are in `src/i18n/messages/`.

## Project structure

```text
main.cjs                       Electron window, SQLite setup, and IPC handlers
preload.cjs                    Narrow, isolated renderer-to-main API
database/
  gameStore.cjs                SQLite schema and game storage operations
  gameStore.test.cjs           SQLite persistence tests
  migrateDatabase.cjs          One-time PixelVault-to-GDR database migration
  migrateDatabase.test.cjs     Database migration tests
src/
  App.jsx                      App state and page composition
  main.jsx                     React entry point, MUI theme, and providers
  components/
    Sidebar.jsx                 Navigation, platform filters, language, and data folder
    Topbar.jsx                  Breadcrumbs, search, and notifications
    GameLibrary.jsx             Library page, stats, and collection controls
    GameCard.jsx                Individual game tile and cover art
    GameOptionsMenu.jsx         Game actions and status notifications
  data/
    games.js                    Navigation and platform options
  i18n/
    LocaleProvider.jsx          React Intl locale state and provider
    messages/
      en.json                   English interface strings
      fr.json                   French interface strings
  services/
    gameLibrary.js              Renderer-side SQLite IPC client
  hooks/
    useGamepadNavigation.js     Gamepad API navigation and button mapping
  styles/                       Styles grouped by dashboard area
```
