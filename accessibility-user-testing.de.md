# VidPly — Testplan mit Menschen mit Behinderungen

**Version:** 1.1 · **Phase:** Feature Freeze · **Verantwortlich:** Projektbetreuung  
**Ziel:** Herausfinden, ob Menschen mit Behinderungen zentrale Medienaufgaben mit VidPly erledigen können — und was sie daran hindert.

**Demo-Basis-URL:** https://matthiaspeltzer.github.io/vidply/demo/

---

## 1. Umfang und Testseiten

| Phase            | Ort                                                                   | Wann                                                                |
| ---------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **A (Pflicht)**  | Veröffentlichte Demo-Seiten unten                                     | Erster Testdurchlauf                                                |
| **B (optional)** | Eine TYPO3-Seite mit **mpc-vidply** und **Privacy Layer** auf Staging | Nach Phase A, wenn Datenschutz/Consent für den Go-live relevant ist |

### Offizielle Testseiten

| Seite                         | URL                                                                                                          | Einsatz im Test                                                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Einzelnes Audio (minimal)** | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html)           | Nur Basisteuerung — ohne Untertitel, Transkript, Zusatzbuttons                                                                                    |
| **Einzelnes Video (voll)**    | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)           | WWA-Beispiel: mehrsprachige UT, Kapitel, Transkript, Gebärdensprach-Inset, Audiodeskription (Video-Tausch), optional schwebender Player (Desktop) |
| **VTT-Sprach-AD**             | [single-player-vtt-speech.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-vtt-speech.html) | Descriptions per WebVTT + Browser-Sprachausgabe                                                                                                   |
| **Audio-Playlist**            | [playlist-audio.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html)                     | Playlist-Navigation, UT/Kapitel pro Titel                                                                                                         |
| **Video-Playlist**            | [playlist-video.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html)                     | Video-Playlist, Vorschaubilder, UT pro Video                                                                                                      |
| **Single Playlist**           | [single-playlist.html](https://matthiaspeltzer.github.io/vidply/demo/single-playlist.html)                   | Kompakte 3-Video-Playlist (leichtere Alternative zu T8)                                                                                           |
| **Mixed-Media-Playlist**      | [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html)                     | HTML5, HLS, YouTube, Vimeo, SoundCloud — **optional**                                                                                             |
| **HLS**                       | [single-player-hls.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-hls.html)               | Adaptive Streams — **optional**                                                                                                                   |
| **DASH**                      | [single-player-dash.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-dash.html)             | MPEG-DASH — **optional**                                                                                                                          |

**Nicht in Runde 1 (Pflichtaufgaben):** Embed-Titel in [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html) (YouTube, Vimeo, SoundCloud); Scroll-Verhalten des **Floating Players** auf [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html) (Desktop ≥768 px); TYPO3 **mpc-vidply** (Phase B).

**Erfolg des Durchlaufs:** Pro Rolle sind **Pflichtaufgaben** ohne Abbruch erledigt **oder** ein klarer Blocker ist dokumentiert (Schweregrad 1–3). Ziel ist die **realen Erfahrungen**, kein WCAG-Zertifikat.

---

## 2. Rekrutierung (Ziel 6–8 Personen, **honoriert**)

| Rolle                            | Erfahrung                                                               | Min. n | Pflichtaufgaben    |
| -------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------ |
| **Blind / Screenreader**         | Täglich NVDA, JAWS oder VoiceOver am Desktop (Browser notieren)         | 2      | T1, T2, T4, T6, T7 |
| **Gehörlos / Schwerhörig**       | Nutzt **Untertitel und/oder Transkript** (ggf. Gebärdensprache angeben) | 2      | T2, T3, T4, T7     |
| **Motorisch / nur Tastatur**     | Keine Maus; Tastatur oder **Schaltersteuerung** (angeben)               | 1–2    | T1, T5, T6, T8     |
| **Sehbehinderung / Low Vision**  | Zoom 200 %+ und/oder Hoher Kontrast / Windows HCM                       | 1      | T2, T5, T7         |
| **Kognitiv / Lernen** (optional) | Kurzer Aufgabensatz                                                     | 1      | T1, T2, T7         |

Möglichst **unterschiedliche AT- und Browser-Kombinationen** (nicht nur NVDA + Chrome). Demo-Seiten nutzen **englische** UI-Labels; notieren, falls das jemanden einschränkt.

**Honorar:** Pauschale pro 60-Minuten-Sitzung plus angemessene Vorbereitung; zahlen auch bei unvollständigen Aufgaben.

---

## 3. Aufgaben (moderiert, ~45–60 Minuten)

Teilnehmende nutzen **ihre eigene Umgebung** (remote). Bildschirmfreigabe optional. Aufgaben vorlesen. Steuerung **nicht** zeigen, außer nach **3–5 Minuten** ohne Fortschritt (dann „Hinweis nötig“ protokollieren).

| ID                                  | Aufgabe                                                                                                                         | Seite                                                                                                                                                                                  | Beobachten                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **T1**                              | Abspielen, Pause, Lautstärke/Stummschaltung, ~30 s springen — **nur Tastatur** (Tastaturhilfe erlaubt).                         | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html)                                                                                     | Fokus, Kurzbefehle, Screenreader-Ansagen auf **minimalem** Player |
| **T2**                              | **Untertitel ein**, **Sprache wechseln**, **Untertitel-Styling** öffnen, eine Einstellung ändern, wieder gut lesbar machen.     | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Menü-Fokus, `aria-checked`, Lesbarkeit/Kontrast                   |
| **T3**                              | **Transkript** öffnen, zu späterer Zeile springen (Wiedergabe mitbewegen), Transkript **schließen**, zurück zu den Steuerungen. | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Fokus-Falle verlassen, Klick-zum-Springen, Scrollen               |
| **T4**                              | Mit UT/Transkript wie gewohnt: **~2 Minuten** mitverfolgen; Timing und Lesbarkeit bewerten.                                     | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | DHH-spezifisch (Größe, Platzierung, Verzögerung)                  |
| **T5**                              | **Gebärdensprach-Inset** aktivieren: verschieben/größenändern **wie gewohnt**; schließen/minimieren falls möglich.              | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Drag vs. Tastatur, Überlagerung mit Untertiteln                   |
| **T6**                              | **Audiodeskription** (AD-Button / beschriebenes Video); Nutzbarkeit beschreiben.                                                | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Track-/Video-Tausch, Pause, Konflikt mit Screenreader             |
| **T7**                              | **Tastaturhilfe** öffnen, Play- und UT-Kurzbefehle finden; **einen** Kurzbefehl aus dem Dialog nutzen.                          | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Dialoggröße beim **Video**-Player                                 |
| **T7b** (optional)                  | Wie T7 am **Audio-only**-Player (Dialoghöhe).                                                                                   | [single-player-audio.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-audio.html)                                                                                     | Dialog nicht abgeschnitten bei flacher Audio-Leiste               |
| **T8**                              | In der **Playlist**: Titel 2 abspielen, **vor/zurück**, Playlist-Panel öffnen, anderen Titel wählen.                            | [playlist-audio.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-audio.html) oder [playlist-video.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-video.html) | Ansagen, Fokus, Auto-Weiter                                       |
| **T9** (optional)                   | **VTT-Sprach-AD**: AD ein, ein gesprochenes Description-Cue verfolgen; ggf. Transkript.                                         | [single-player-vtt-speech.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-vtt-speech.html)                                                                           | Sprachqualität, Pause/Fortsetzen, Screenreader                    |
| **T10** (optional)                  | **HLS**: Stream abspielen, Qualität wechseln falls angeboten, UT ein falls vorhanden.                                           | [single-player-hls.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-hls.html)                                                                                         | Streaming-Menüs, UT-Sync                                          |
| **T11** (optional)                  | **DASH**: wie T10.                                                                                                              | [single-player-dash.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-dash.html)                                                                                       | wie T10                                                           |
| **T12** (optional)                  | **Mixed Playlist**: von einem **HTML5**-Titel zum nächsten wechseln (Embeds nur mit Einwilligung).                              | [playlist-mixed.html](https://matthiaspeltzer.github.io/vidply/demo/playlist-mixed.html)                                                                                               | Renderer-Wechsel, Fokus, einheitliche Steuerung                   |
| **T13** (optional)                  | **Kompakte Playlist**: vor/zurück über drei Videos.                                                                             | [single-playlist.html](https://matthiaspeltzer.github.io/vidply/demo/single-playlist.html)                                                                                             | Einfacheres Playlist-UX                                           |
| **T14** (optional, Desktop ≥768 px) | **Floating Player**: Wiedergabe starten, scrollen bis Video aus dem Viewport ist, Floating-Fenster nutzen, wieder andocken.     | [single-player-video.html](https://matthiaspeltzer.github.io/vidply/demo/single-player-video.html)                                                                                     | Tastatur am Float, UT im Float                                    |

**Abschluss (5 Min.):** „Was würde Sie **aufhören lassen**, diesen Player zu nutzen?“ „**Einfacher als YouTube/Native-Player**?“ „**Eine** Änderung für **Ihre** Community?“

---

## 4. Ablauf und Einwilligung

### Einstieg (~2 Min.)

„Wir testen einen **Open-Source**-Medienplayer, **nicht** Sie. Es gibt keine falschen Antworten. Bitte **laut denken**, wenn das für Sie passt. Sie können **jederzeit abbrechen**.”

### Einwilligung (vor Start)

- Aufzeichnung (**Ton und/oder Bild**) nur mit **ausdrücklicher Einwilligung**; Alternative **nur Notizen**.
- Erkenntnisse können in **GitHub-Issues** und der öffentlichen Barrierefreiheits-Erklärung landen; **keine Nennung mit Namen** ohne separate Einwilligung.
- **DSGVO:** Name/E-Mail nur für Zahlung; Notizen **anonymisiert** speichern (z. B. „Rolle 2, NVDA, Firefox“).
- Sie sind kein AT-Support für deren System; Gegenstand sind **Player**-Probleme.

### Während der Sitzung

- Eine moderierende Person; Design nicht rechtfertigen.
- Pro Aufgabe protokollieren: bestanden / schwierig / gescheitert, **Zitat** wenn möglich, Schweregrad (**1** = Blocker, **2** = gravierend, **3** = gering).

### Ende

Dank, Honorar, optional bezahlter **30-Minuten-Retest** nach Fixes.

---

## 5. README — Vorschlag „Accessibility status“ / Barrierefreiheit

Nach einem Testdurchlauf in `README.md` einfügen oder anpassen (Daten und Zahlen aktualisieren).

```markdown
## Accessibility status / Barrierefreiheit

VidPly ist für **Menschen mit Behinderungen** gedacht: Tastaturbedienung, Screenreader-Labels,
Untertitel und Transkripte, Audiodeskription, Gebärdensprach-Inset und Reduced Motion sind
Kernfunktionen — keine Add-ons.

### Was wir in der Entwicklung prüfen

- Manuelle Prüfung relevanter [WCAG 2.2](https://www.w3.org/TR/WCAG22/)-Kriterien für Medienplayer
- Automatisierte Tests in CI (inkl. axe) auf Demo-Seiten
- Tastatur- und Untertitel-Verhalten in automatisierten Browser-Tests

### Was wir **nicht** behaupten

- **Formale WCAG-2.2-AA-Zertifizierung** oder unabhängiges Audit
- Abdeckung **jeder** Assistiven Technologie und Browser-Kombination

### Tests mit Menschen mit Behinderungen

| Runde  | Datum | Teilnehmende                                   | Umfang                                                                |
| ------ | ----- | ---------------------------------------------- | --------------------------------------------------------------------- |
| 1      | _TBD_ | _n_ Screenreader / DHH / Tastatur / Low Vision | Öffentliche Demos ([Testplan DE](./accessibility-user-testing.de.md)) |
| Retest | _TBD_ | Teilmenge                                      | Fixes aus Runde 1                                                     |

**Mitmachen:** AT-Nutzende für eine **honorierte** Remote-Sitzung (~60 Min.): _[Kontakt-E-Mail]_.

### Bekannte Grenzen

- Standalone-Demos und **TYPO3** (mpc-vidply) können abweichen; Privacy/Consent wird auf TYPO3 separat getestet.
- Einbettungen (YouTube, Vimeo, SoundCloud) hängen teilweise von Drittanbietern ab.
- _[Link zu GitHub-Issues mit Label `a11y-user-report`]_

Die **Feature-Entwicklung** ist eingefroren; **Wartung**, Bugfixes und Barrierefreiheit auf Basis der Nutzerforschung laufen weiter.
```

Bis Runde 1 abgeschlossen ist, in Werbetexten nicht „vollständige WCAG-2.2-AA-Konformität“ behaupten; besser: **„orientiert an WCAG 2.2 AA; Nutzertests laufen.“**

---

## 6. Checkliste Betreuung

- [ ] Stabile Demo-URLs (GitHub Pages) und Fallback bei Ausfall
- [ ] GitHub-Label `a11y-user-report` (Aufgabe, AT, Browser, Schweregrad, Schritte)
- [ ] Rekrutierung über Organisationen/Netzwerke; schriftliche Zahlungsbestätigung
- [ ] Phase B: eine mpc-vidply-Seite mit Privacy Layer (T1/T2 anpassen)
- [ ] Innerhalb von ~4 Wochen nach letzter Sitzung: **behoben / geplant / won't fix** veröffentlichen

---

**English version:** [accessibility-user-testing.md](./accessibility-user-testing.md)
