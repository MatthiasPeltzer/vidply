# VidPly — disabled-user test plan

**Version:** 1.1 · **Phase:** feature freeze · **Owner:** project maintainer  
**Goal:** Find out whether people with disabilities can complete essential media tasks with VidPly, and what stops them.

**Demo base URL:** https://matthiaspeltzer.github.io/vidply/demo/

---

## 1. Scope and test pages

| Phase | Where | When |
|--------|--------|------|
| **A (required)** | Published demo pages below | First sprint |
| **B (optional)** | One TYPO3 page with **mpc-vidply** and **privacy layer** on staging | After phase A, if consent/privacy flow matters for go-live |

### Canonical test pages

| Page | URL | Use in testing |
|------|-----|----------------|
| **Single audio (minimal)** | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html) | Baseline controls only — no captions, transcript, or extra buttons |
| **Single video (full)** | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | WWA sample: multi-language captions, chapters, transcript, sign-language inset, audio description (described-video swap), optional floating player (desktop) |
| **VTT speech AD** | [single-player-vtt-speech.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-vtt-speech.html) | Descriptions via WebVTT + browser speech synthesis |
| **Audio playlist** | [playlist-audio.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html) | Playlist navigation, per-track captions/chapters |
| **Video playlist** | [playlist-video.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html) | Video playlist, thumbnails, per-video captions |
| **Single playlist** | [single-playlist.html](https://matthiaspeltzer.github.io/vidply/demo/single-playlist.html) | Compact 3-item video playlist (lighter alternative to T8) |
| **Mixed media playlist** | [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html) | HTML5, HLS, YouTube, Vimeo, SoundCloud in one list — **optional** sprint only |
| **HLS** | [single-player-hls.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-hls.html) | Adaptive streaming — **optional** |
| **DASH** | [single-player-dash.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-dash.html) | MPEG-DASH — **optional** |

**Out of scope for round 1 (required tasks):** Third-party embed tracks on [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html) (YouTube, Vimeo, SoundCloud); floating-player scroll behaviour on [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) (≥768 px desktop); TYPO3 **mpc-vidply** (phase B).

**Sprint success:** For each role, **must-have** tasks are completed without abandoning **or** a clear blocker is recorded (severity 1–3). The aim is documented reality, not a WCAG certificate.

---

## 2. Who to recruit (target 6–8 people, paid)

| Role | Experience needed | Min. n | Must-have tasks |
|------|-------------------|--------|------------------|
| **Blind / screen reader** | Daily use of NVDA, JAWS, or VoiceOver on desktop (note browser) | 2 | T1, T2, T4, T6, T7 |
| **Deaf / hard of hearing** | Relies on **captions and/or transcripts** (note if sign language user) | 2 | T2, T3, T4, T7 |
| **Motor / keyboard-only** | No mouse; keyboard or **switch** (specify) | 1–2 | T1, T5, T6, T8 |
| **Low vision** | Zoom 200%+ and/or high contrast / Windows HCM | 1 | T2, T5, T7 |
| **Cognitive / learning** (optional) | Willing to try the short task set | 1 | T1, T2, T7 |

Prefer **varied AT and browser pairs** (not only NVDA + Chrome). Demo pages use **English** UI labels; note if that limits any participant.

**Honorarium:** Fixed fee per 60-minute session plus reasonable prep time; pay even when tasks are not finished.

---

## 3. Tasks (moderated, ~45–60 minutes)

Participants use **their own environment** (remote). Screen share optional. Read tasks aloud. Do not show where controls are unless they are stuck **after 3–5 minutes** (then log “needed hint”).

| ID | Task | Page | Observe |
|----|------|------|---------|
| **T1** | Play, pause, volume/mute, seek ~30 s — **keyboard only** (keyboard help allowed). | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html) | Focus, shortcuts, screen reader announcements, lost focus on **minimal** chrome |
| **T2** | Turn **captions on**, switch **language**, open **caption styling**, change one setting, return to readable defaults. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Menu roving, `aria-checked`, readability/contrast |
| **T3** | Open **transcript**, jump to a later line to move playback, **close** transcript and return to controls. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Focus trap exit, click-to-seek, scroll |
| **T4** | With captions/transcript as preferred: follow **~2 minutes** of content; comment on timing and readability. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | DHH-specific issues (size, placement, lag) |
| **T5** | Enable **sign language inset**: reposition/resize **as they usually would**; dismiss or minimize if available. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Drag vs keyboard resize, overlap with captions |
| **T6** | Enable **audio description** (AD button / described video); say whether AD is usable. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Track swap, pause behaviour, conflict with screen reader |
| **T7** | Open **keyboard help**, find play and caption shortcuts; use **one** shortcut from the dialog. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Dialog size on **video** player |
| **T7b** (optional) | Same as T7 on **audio-only** player (help dialog height). | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html) | Dialog not clipped on short audio layout |
| **T8** | In **playlist**: play item 2, **previous/next**, open playlist panel, select another item. | [playlist-audio.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html) or [playlist-video.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html) | Announcements, focus, auto-advance |
| **T9** (optional) | **VTT speech AD**: enable AD, follow one spoken description cue; try transcript if useful. | [single-player-vtt-speech.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-vtt-speech.html) | Speech quality, pause/resume, screen reader interference |
| **T10** (optional) | **HLS**: play stream, change quality if offered, turn captions on if available. | [single-player-hls.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-hls.html) | Streaming menus, caption sync |
| **T11** (optional) | **DASH**: same as T10 for DASH. | [single-player-dash.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-dash.html) | As T10 |
| **T12** (optional) | **Mixed playlist**: switch from one **HTML5** track to another (avoid embed items unless participant agrees). | [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html) | Renderer swap, focus, unified controls |
| **T13** (optional) | **Compact playlist**: next/previous across three videos. | [single-playlist.html](https://matthiaspeltzer.github.io/vidply/demo/single-playlist.html) | Simpler playlist UX |
| **T14** (optional, desktop ≥768 px) | **Floating player**: start playback, scroll until video leaves viewport, use floating window, dock again. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) | Keyboard access to float chrome, captions in float |

**Closing (5 min):** “What would make you **stop using** this player?” “Anything **easier than YouTube or the native player**?” “One change for **your** community?”

---

## 4. Session script and consent

### Introduction (~2 min)

“We are testing an **open-source** media player, not you. There are no wrong answers. Please **think aloud** if that works for you. You can **stop at any time**.”

### Consent (before starting)

- Recording (**audio and/or screen**) only with **explicit consent**; offer **notes-only** sessions.
- Findings may appear in **GitHub issues** and the public accessibility statement; **no named publication** without separate consent.
- **GDPR:** name and email for payment only; store session notes **anonymized** (e.g. “Role 2, NVDA, Firefox”).
- You are not their assistive technology trainer; scope is **player** issues, not configuring their system.

### During the session

- One facilitator; avoid defending design choices.
- Log per task: pass / struggle / fail, **quote** if possible, severity (**1** = blocker, **2** = major, **3** = minor).

### Close

Thank you, honorarium, optional paid **30-minute retest** after fixes.

---

## 5. README — suggested “Accessibility status” section

Use or adapt this in `README.md` after a test round (update dates and counts).

```markdown
## Accessibility status

VidPly is built for **disabled audiences first**: keyboard use, screen reader labels,
captions and transcripts, audio description, sign-language inset, and reduced-motion support
are core features—not add-ons.

### What we verify in development

- Manual checks against [WCAG 2.2](https://www.w3.org/TR/WCAG22/) success criteria relevant to media players
- Automated checks in CI (including axe) on demo pages
- Keyboard and caption behaviour covered by automated browser tests

### What we do **not** claim

- **Formal WCAG 2.2 AA certification** or independent third-party audit
- Coverage of **every** assistive technology and browser combination

### Testing with disabled people

| Round | Date | Participants | Scope |
|-------|------|--------------|--------|
| 1 | _TBD_ | _n_ screen reader / DHH / keyboard / low vision | Public demos ([test plan](./accessibility-user-testing.md)) |
| Retest | _TBD_ | _subset_ | Fixes from round 1 |

**Help wanted:** Assistive technology users interested in a **paid** remote session (~60 minutes):
_[contact email]_.

### Known limitations

- Standalone demos and **TYPO3** integration (mpc-vidply) may differ; privacy/consent is tested on TYPO3 separately.
- Embedded providers (YouTube, Vimeo, SoundCloud) partly depend on third-party embed behaviour.
- _[Link to GitHub issues labeled `a11y-user-report`]_

Feature development is in **feature freeze**; **maintenance**, bug fixes, and accessibility improvements continue based on user research.
```

Until round 1 is complete, avoid claiming “complete WCAG 2.2 AA compliance” in marketing copy; prefer **“designed to meet WCAG 2.2 AA requirements; user validation in progress.”**

---

## 6. Maintainer checklist

- [ ] Stable demo URLs (GitHub Pages) and fallback if hosting fails
- [ ] GitHub issue label `a11y-user-report` (task, AT, browser, severity, steps)
- [ ] Recruitment via organizations/networks; written confirmation of payment
- [ ] Phase B: one mpc-vidply page with privacy layer (adapt T1/T2)
- [ ] Within ~4 weeks of the last session: publish **fixed / planned / won’t fix**

---

**German version:** [accessibility-user-testing.de.md](./accessibility-user-testing.de.md)
