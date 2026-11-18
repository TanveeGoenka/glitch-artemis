# GLITCH · Night Sky VR

A phone-in-headset VR experience of the real night sky. It runs as a **website**, so you don't need to install an app or use a game engine.

- **5,044 real stars** (Hipparcos catalogue, everything the naked eye can see), shown in their true colours and brightness, with a gentle twinkle
- A **painted Milky Way** with dust lanes, plus 26,000 faint background stars
- **All 88 constellations** can be selected. 23 of them, plus 19 famous stars, have hand-written short facts
- Constellations with stories **glow brighter now and then** so people know they can look at them
- **Shooting stars** every 6–16 seconds
- **Ambient space music** generated live in the browser, so there are no music files and no copyright issues
- Constellation title in a sci-fi style (reference image 1). The info card is semi-transparent black with softly glowing white text (reference image 2)

The star data comes from the public catalogues bundled with d3-celestial (BSD licence, see `data/LICENSE-d3-celestial.txt`). No live API is needed: the stars don't move in a human lifetime, so the data ships with the site and **works offline**.

---

## 1. How the interaction works

| You do | What happens |
|---|---|
| Turn your head | Look around the sky. The phone's gyroscope tracks you |
| Joystick ← → | Rotate the night sky around you to reach other areas |
| Joystick ↑ ↓ | Zoom in / out |
| Look at a constellation | Its lines faintly appear and its name floats up. The centre dot grows |
| **A / trigger** | Select it: zoom in, lines draw on, stars brighten, and the title appears |
| **A again** | Open the info card with short facts |
| **B** | Back: close the card, then zoom out |
| **X** | Guided tour: jump to the next featured constellation |
| **Y** | Music on/off |

Your original plan used hand gestures for projection mapping: move your hand to rotate the sky, pinch to zoom. In the headset these become **head movement + joystick** (rotate) and **A button** (zoom in on the chosen constellation). The phone camera is covered inside the headset, so hand tracking isn't reliable there. In **"Explore on screen"** mode on a phone, **pinch-to-zoom** and drag both work.

No remote? Turn on **Settings → Gaze to select**. Look at something for about 2 seconds and a red ring fills up, then it selects.

---

## 2. Put it online (needed for the phone)

Phones only let websites use the **motion sensors and the game remote over HTTPS**. The easiest free option:

1. Go to **https://app.netlify.com/drop** (free account)
2. Drag this whole folder (`glitch Artemis`) onto the page
3. You get a link like `https://something.netlify.app`. Open it on the phone in **Chrome**

(GitHub Pages also works. Any static hosting does, because there is no server code.)

### Test on your computer first
```bash
node tools/serve.js
```
Then open http://localhost:8080. Use the mouse to drag and look, the scroll wheel to zoom, and click to select. Keyboard: arrows = joystick, Enter = A, Esc = B, N = next, M = music.

---

## 3. Using the Irusu headset + remote

1. **Pair the remote** with the phone over Bluetooth (phone Settings → Bluetooth).
2. Set the remote to **Game / Gamepad mode**. That gives the joystick. Most of these remotes switch modes with a button combination (often holding `@` with A/B/C/D). Check the leaflet in the box.
3. Open the site → **Remote check & button setup**. Press buttons on the remote:
   - "Last input" shows what the phone receives
   - The red dot moves when you push the joystick
   - If your A/B buttons do the wrong thing, tap **Set SELECT button** and press the button you want, then do the same for BACK
   - Unknown buttons act as SELECT by default, so the remote always does something
   - If the joystick dot doesn't move, try the remote's other mode. Arrow keys, media keys and mouse clicks are supported too
4. Press **Enter VR · headset**. The phone goes fullscreen and landscape and shows two images.
5. Put the phone in the headset with the **screen's centre line on the headset's nose divider**.
6. If the picture looks doubled or strains your eyes, go back to the menu and adjust **Settings → Lens spacing**. **VR field of view** changes how zoomed-in the sky looks.

> **Use an Android phone if you can.** iPhones only connect "official" game controllers (Xbox/PlayStation/MFi) to websites, so a generic VR remote may not work in Game mode on iOS. Mouse mode or Gaze-to-select still work.

Tips for an exhibition: plug the phone in, turn screen brightness up, and turn off auto-rotate lock and battery saver. To return to the menu, press the remote's Start/Menu button or the phone's back gesture.

---

## 4. Changing things

| What | Where |
|---|---|
| Facts, constellation titles, which ones glow | `js/facts.js` (plain text, easy to edit) |
| Music feel, sound effects | `js/audio.js` |
| Star brightness, Milky Way look | `js/sky.js` (`magSize`, `magBright`, `MILKY_BAKE_FRAG`) |
| Title / info card design | `js/hud.js` |
| Remote button mapping defaults | `js/input.js` → `DEFAULT_MAP` |
| Your latitude (sky tilt), default 20°N | `js/main.js` → `settings.latitude` |

### Files
```
index.html          menu + page
css/style.css       menu styling
js/main.js          VR rendering, head tracking, selection flow
js/sky.js           stars, Milky Way, constellation lines
js/hud.js           title + info card drawing
js/input.js         remote / keyboard / mouse
js/audio.js         generative music + effects
js/facts.js         all the text content
data/sky.json       star + constellation data (compact)
lib/                three.js (3D library), bundled so it works offline
tools/              local test server + data builder (not needed online)
```

The fonts (Orbitron, Barlow Condensed) load from Google Fonts. Offline, the site falls back to system fonts.
