# MoveX

User app (`/`) and Admin panel (`/admin/`) in one project, sharing one Firebase config.
Design, colors and features are unchanged from the original single-file versions.

## Structure

```
movex/
├── index.html                      ← user app shell (splash + includes)
├── pages/                          ← user pages (home, search, categories, notifications,
│                                     category-movies, profile, movie-details, comments, watch)
├── partials/                       ← auth, header, bottom-nav, custom modal
├── admin/
│   ├── index.html                  ← admin shell
│   ├── pages/                      ← dashboard, movies, all-movies, broken-links,
│   │                                 categories, banners, users, settings
│   └── partials/                   ← login, sidebar, header, bottom-nav
├── assets/
│   ├── css/
│   │   ├── user/                   ← one file per section (theme.css loads last)
│   │   └── admin/
│   └── js/
│       ├── shared/firebase-config.js   ← the ONLY place for the Firebase config
│       ├── user/   bootstrap.js, core/, features/, pages/
│       └── admin/  bootstrap.js, core/, pages/
└── firebase.json
```

## Run
Must be served over HTTP (not file://):
- Local: `python3 -m http.server 8000` → `http://localhost:8000/` and `http://localhost:8000/admin/`
- Firebase Hosting: `firebase deploy --only hosting`

## How it loads
`bootstrap.js` (one per panel) injects every `<div data-include="...">` (pages/partials), then loads the
scripts listed in `SCRIPTS` one by one, in order. All scripts share one global scope, exactly like the old
single file, so **order matters**. `theme-boot.js` and `splash-boot.js` stay synchronous in the user
`index.html` (zero-delay theme/splash).

## Ad system removed (v1.4)

The Smart Ad system was removed in v1.4: the recurring popup modal, ad timers, banner iframes,
ad-network scripts, and the admin "Smart Ad Configuration" panel are all gone. No ad URLs or ad
DOM remain in the codebase. Old ad keys (`smartAdEnabled`, `adTimer`, `smartAdWatchSeconds`,
`adUrl`) can be cleared from the Realtime Database with `tools/cleanup-old-data.js`.

## Add a page
1. Create `pages/<name>.html` (user) or `admin/pages/<name>.html` (admin); keep the root element id.
2. Add `<div data-include="pages/<name>.html"></div>` in the matching `index.html`.
3. Add its script under `assets/js/.../pages/` and list it in `SCRIPTS` in that panel's `bootstrap.js`.
4. Add a nav button (`data-page="..."`) in `bottom-nav.html`.
