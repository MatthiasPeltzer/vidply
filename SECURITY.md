# Security Policy

## Supported Versions

VidPly is a single-track project. Security fixes target the most recent published `1.x.y` version on npm.

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

If you believe you have found a security vulnerability in VidPly, **please do not open a public GitHub issue**. Instead, report it privately so we have time to release a coordinated fix.

- **Email:** `vidply@mpeltzer.de` (subject prefix `[VidPly Security]`)
- **GitHub Security Advisory:** https://github.com/MatthiasPeltzer/vidply/security/advisories/new

Please include:

1. A description of the vulnerability and its impact (XSS, RCE, info-disclosure, etc.).
2. Reproduction steps or a proof-of-concept (`.html` snippet that triggers the issue).
3. The affected version (`package.json` `version` field).
4. Any suggested remediation, if you have one.

You will receive an acknowledgement within **5 business days**. We aim to publish a fix within **30 days** for high/critical issues. We will credit you in the release notes unless you ask to remain anonymous.

## What is in scope

- The published npm package `vidply` and the source under `libs/vidply/src/**`.
- The bundled assets in `libs/vidply/dist/**`.
- The dev servers `libs/vidply/server.js` / `libs/vidply/server.cjs` if you have built and run them.

## What is out of scope

- Third-party CDN scripts loaded at runtime (`hls.js`, `dash.js`, the YouTube/Vimeo/SoundCloud SDK iframes). Report to those projects directly.
- Bugs that require an attacker who already controls the embedding page (the embedding page is the trust boundary).
- Issues in demo pages or documentation that do not affect the published library.

## Recommended deployment hardening

- Serve VidPly under a strict Content Security Policy. The minimum directives the library expects:
  - `script-src 'self' https://w.soundcloud.com https://www.youtube.com https://player.vimeo.com https://cdn.jsdelivr.net;`
  - `frame-src 'self' https://w.soundcloud.com https://www.youtube.com https://player.vimeo.com;`
  - `style-src 'self' 'unsafe-inline';` (the player uses inline `style.setProperty` for theme variables).
  - `connect-src 'self' <your-CDN>;`
- If you do not need YouTube/Vimeo/SoundCloud playback, omit those origins.
- Pin the loaded versions of `hls.js` / `dash.js` via the `hlsScriptUrl` / `dashScriptUrl` options and add Subresource Integrity hashes (the library adds them automatically when the URL ends in `.js`).
- Treat captions, transcripts, playlist titles, and any data attribute from third-party content management systems as untrusted. VidPly never uses `innerHTML` for cue rendering, but the embedding page should still validate inputs.

## Coordinated disclosure

We follow [CERT/CC's 45-day model](https://vuls.cert.org/confluence/display/Wiki/Vulnerability+Disclosure+Policy). If a fix is not feasible within that window we will work with you on a longer embargo.
