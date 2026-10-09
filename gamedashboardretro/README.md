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
Dolphin can be bundled by placing its complete extracted Windows `Dolphin-x64`
folder beside `main.cjs`, so the executable is at
`Dolphin-x64/Dolphin.exe`. GDR detects this layout, as well as
`dolphin/Dolphin-x64/Dolphin.exe` and `dolphin/Dolphin.exe`, before checking
common install locations. Set `DOLPHIN_PATH` to override automatic detection.
Keep Dolphin's companion files and folders such as `Sys` alongside its
executable. Portable mode is enabled with `Dolphin-x64/portable.txt`, so
Dolphin stores controller configuration and other user settings in
`Dolphin-x64/User/` instead of the Windows user profile. The `User/` folder is
kept local and excluded from Git. GDR also enables Dolphin's `SkipNKitWarning`
option, denies usage analytics, and marks the analytics choice as answered in
that portable configuration before launching games.
GameCube launches set `Main.Display.Fullscreen=True` for Dolphin and configure
the portable `GFX.ini` to render at 6x native internal resolution for 4K-class
output. Fullscreen output still follows the connected display's resolution;
actual performance at this scale depends on the PC's graphics hardware.
The bundled config maps GameCube controller port 1 to the XInput controller
used by the 8BitDo Ultimate 2 Wireless 2.4 GHz receiver. Its named profile is
available in Dolphin under the GameCube controller profile controls; the
previous keyboard mapping is preserved as the `Keyboard Mouse` profile.
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

GDR indexes PNG, JPEG, and WebP files in `Named_Boxarts` and `Named_Titles`
folders at startup. A matching filename in `Named_Titles` supplies the
displayed game title; if no title image matches, GDR uses the ROM filename.
Box art matches by ROM filename or OpenVGDB title and console. Restart GDR
after adding or replacing artwork so the local index is refreshed. These files
stay local and excluded from Git; no artwork is fetched over the network at
runtime.

The database and bundled Dolphin can move with the project. The selected games
folder path and each ROM path are absolute, so if an external drive's letter
changes, select the games folder again. When redistributing Dolphin, include
its license and comply with the licenses provided in its distribution.

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
platformGames.cjs              Recursive games-folder scanner
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
