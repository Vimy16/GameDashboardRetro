# GDR

A retro game library dashboard built with React, Material UI, TanStack Query,
React Intl, and SQLite.

The sidebar and Electron window use the cropped GDR icon. Windows uses the
multi-resolution `assets/game-dash-retro.ico`; other platforms use
`src/assets/game-dash-retro-icon.png`.

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
close a menu, and **Start** to toggle fullscreen. Opening a GameCube card
launches its ROM in Dolphin fullscreen; this works with mouse clicks and
controller **A**.

### Dolphin setup

Dolphin is a separate application and is not included in this repository.
Install Dolphin for your platform, then open **Dolphin settings** from the
sidebar and select its executable. GDR can also detect common installations;
`DOLPHIN_PATH` can be set to a custom executable path. Keep Dolphin's companion
files and folders, such as `Sys`, alongside its executable. Dolphin is not
included or tracked; local `Dolphin-x64/` installations are ignored by Git.

GDR stores Dolphin's generated emulator configuration in the ignored
`dolphin-user/` folder and passes it to Dolphin as its user directory. The
selected executable and GDR setting choices are persisted in the project
database. GDR does not change Dolphin's normal user configuration. Tracked
defaults in `dolphin-defaults/Config/` provide fullscreen, disabled analytics,
skipped NKit warnings, 6× internal resolution, and GameCube controller
profiles for an 8BitDo Ultimate 2 Wireless 2.4 GHz receiver (XInput) and
keyboard/mouse. GDR seeds missing defaults and applies the chosen profile and
internal resolution at launch.

The Dolphin settings panel lets you choose native, 2×, 3×, 4× or 6× internal
resolution, and the active controller profile. 6× is a 4K-class render scale,
not a guarantee of native 4K display output or smooth performance; output size
depends on the connected display and performance depends on the PC's graphics
hardware.

GameCube `.iso`, `.gcm`, `.gcz`, and `.rvz` files are supported. Because `.iso`
does not identify a console by itself, GDR currently categorizes `.iso` as
GameCube; use `.cue` or `.bin` for PlayStation games added through the file
picker.

## Games folder

Choose one games folder anywhere on your computer or external drive using the
folder button beside **Platforms** in the sidebar. GDR remembers the selected
path, displays it there, and recursively scans all files in that folder and
its subfolders. You can keep games together in one directory; GDR does not move
or rename them. Use the scan button beside the folder button to sync changes
while the app is running.

GDR assigns a platform based on the file extension: known ROM extensions are
categorized as NES, SNES, Game Boy, GBC, GBA, Nintendo 64, Genesis, PlayStation,
or GameCube. Unrecognized file types and archives are listed under **Other**.
Extensions such as `.iso` can be used by multiple consoles, so GDR currently
classifies `.iso` as GameCube; use `.cue` or `.bin` for PlayStation games.
GameCube cards launch through Dolphin; other platforms are indexed and shown
but need an emulator configured before they can launch.

Files discovered in the selected folder are synced into SQLite. Removing a
file from that folder removes its database entry the next time you scan; files
added through the file picker from outside that folder are not pruned by scans.
Changing the selected folder removes entries managed by the previous folder
that are not present in the new one. The database stores each file's original
path and never moves or copies game files.

## OpenVGDB metadata

GDR can use the OpenVGDB v29.0 database in `game-assets/openvgdb.sqlite`.
Place the `openvgdb.sqlite` file from the official release archive in that
folder. The archive and database are local-only and excluded from Git. When
adding or scanning a ROM, GDR matches its filename and console against
OpenVGDB, ignoring letter case and an optional `.nkit` suffix. A match can
enrich the title, genre, release year, developer, publisher, and front-cover
URL reference in GDR's SQLite database.

OpenVGDB stores cover-image URLs, not the image files. GDR does not download
those images; its cards continue to use the built-in artwork until local cover
art is provided.

## Local cover art

For offline cover art, put the Libretro thumbnail system folders under
`game-assets/Libretro-Thumbnails/`, keeping each `Named_Boxarts` folder inside
its console folder. GameCube art goes under:

```text
game-assets/
  Libretro-Thumbnails/
    Nintendo_-_GameCube/
      Named_Boxarts/
        Mario Kart - Double Dash!! (USA).png
```

Other console packs can be placed beside `Nintendo_-_GameCube`. For example:

```text
game-assets/
  Libretro-Thumbnails/
    Nintendo - Super Nintendo Entertainment System/
      Named_Boxarts/
        Super Mario World (USA).png
```

`game-assets/Libretro-Thumbnails/` is local user data and is entirely ignored
by Git. Put the downloaded console folders there. GDR refreshes its index on
every games-folder scan and checks for matching PNG, JPEG, or WebP files in
`Named_Titles` and `Named_Boxarts`. A matching title image filename supplies
the displayed game title; if there is no match, the ROM filename is used.
Matching box art is shown when available; when no local cover is found, GDR
uses its built-in card artwork. New, changed, or removed images are applied on
the next scan without restarting. No artwork is fetched over the network.

The database and GDR's Dolphin settings can move with the project. The selected
games folder, Dolphin executable, and each ROM path are absolute, so if an
external drive's letter changes, select the corresponding paths again.

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
dolphinLauncher.cjs            Dolphin detection and GameCube launch
dolphin-defaults/               GDR-owned Dolphin configuration templates
dolphin-user/                   Ignored local Dolphin configuration and settings
platformGames.cjs               Recursive games-folder scanner
database/
  gameStore.cjs                SQLite schema and game storage operations
  gameStore.test.cjs           SQLite persistence tests
  migrateDatabase.cjs          One-time PixelVault-to-GDR database migration
  migrateDatabase.test.cjs     Database migration tests
  localArtwork.cjs             Local Libretro-style box-art lookup
  localArtwork.test.cjs        Local artwork matching tests
  openvgdb.cjs                 Optional ROM filename metadata lookup
game-assets/                   Local-only metadata and artwork
src/
  App.jsx                      App state and page composition
  main.jsx                     React entry point, MUI theme, and providers
  components/
    Sidebar.jsx                 Navigation, platform filters, language, and data folder
    Topbar.jsx                  Breadcrumbs, search, and notifications
    GameLibrary.jsx             Library page, stats, and collection controls
    GameCard.jsx                Individual game tile and cover art
    GameOptionsMenu.jsx         Game actions and status notifications
    DolphinSettingsDialog.jsx     Dolphin executable and GDR configuration
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
