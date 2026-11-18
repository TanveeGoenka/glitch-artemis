// All the ways to control the experience:
//  - Bluetooth VR remote in GAME mode   -> Gamepad API (joystick + buttons)
//  - Bluetooth remote in KEY/MUSIC mode -> keyboard / media keys
//  - Bluetooth remote in MOUSE mode     -> any click = select
//  - Keyboard on a laptop for testing
// Button numbers differ between remotes, so SELECT and BACK can be "learned" from the menu.

const DEFAULT_MAP = { select: [0], back: [1], next: [2], music: [3], zoomOut: [4, 6], zoomIn: [5, 7], menu: [8, 9] };
const STORE = 'artemis.buttonmap.v1';

export class Input {
  constructor() {
    this.listeners = {};
    this.axis = { x: 0, y: 0 };
    this.keys = new Set();
    this.prev = {};
    this.lastEvent = 'nothing yet';
    this.learning = null;
    try { this.map = { ...DEFAULT_MAP, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; } catch { this.map = { ...DEFAULT_MAP }; }

    addEventListener('keydown', e => this.onKey(e, true));
    addEventListener('keyup', e => this.onKey(e, false));
    addEventListener('gamepadconnected', e => this.log(`Remote connected: ${e.gamepad.id}`));
  }

  on(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name) { (this.listeners[name] || []).forEach(fn => fn()); }
  log(s) { this.lastEvent = s; this.emit('debug'); }

  learn(action) { this.learning = action; this.log(`Press the button you want for ${action.toUpperCase()}…`); }
  saveMap() { try { localStorage.setItem(STORE, JSON.stringify(this.map)); } catch { /* private mode */ } }
  resetMap() { this.map = { ...DEFAULT_MAP }; this.saveMap(); this.log('Button map reset to defaults'); }

  onKey(e, down) {
    const k = e.key;
    if (down) {
      if (!e.repeat) this.log(`Key: ${k === ' ' ? 'Space' : k}`);
      if (this.learning && !e.repeat) {
        this.map[this.learning + 'Key'] = k; this.saveMap();
        this.log(`${this.learning.toUpperCase()} = key ${k}`); this.learning = null; e.preventDefault(); return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd', 'w', 's', 'A', 'D', 'W', 'S'].includes(k)) { this.keys.add(k.toLowerCase()); e.preventDefault(); }
      if (e.repeat) return;
      if (k === this.map.selectKey || ['Enter', ' ', 'MediaPlayPause', 'NumpadEnter'].includes(k)) { this.emit('select'); e.preventDefault(); }
      else if (k === this.map.backKey || ['Escape', 'Backspace', 'BrowserBack', 'MediaStop'].includes(k)) { this.emit('back'); e.preventDefault(); }
      else if (['n', 'N', 'MediaTrackNext', 'Tab'].includes(k)) { this.emit('next'); e.preventDefault(); }
      else if (['p', 'P', 'MediaTrackPrevious'].includes(k)) this.emit('prev');
      else if (['m', 'M'].includes(k)) this.emit('music');
      else if (['+', '=', 'AudioVolumeUp'].includes(k)) this.emit('zoomIn');
      else if (['-', '_', 'AudioVolumeDown'].includes(k)) this.emit('zoomOut');
      else if (['r', 'R'].includes(k)) this.emit('recenter');
    } else {
      this.keys.delete(k.toLowerCase());
    }
  }

  // call every frame
  poll() {
    let x = 0, y = 0;
    const has = k => this.keys.has(k);
    if (has('arrowleft') || has('a')) x -= 1;
    if (has('arrowright') || has('d')) x += 1;
    if (has('arrowup') || has('w')) y -= 1;
    if (has('arrowdown') || has('s')) y += 1;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      // joystick: take whichever stick is pushed the most
      for (let a = 0; a + 1 < gp.axes.length; a += 2) {
        const ax = gp.axes[a], ay = gp.axes[a + 1];
        if (Math.abs(ax) > Math.abs(x) && Math.abs(ax) > 0.25) x = ax;
        if (Math.abs(ay) > Math.abs(y) && Math.abs(ay) > 0.25) y = ay;
      }
      // d-pad buttons
      const b = i => gp.buttons[i]?.pressed;
      if (b(14)) x = -1; if (b(15)) x = 1; if (b(12)) y = -1; if (b(13)) y = 1;
      const prev = this.prev[gp.index] || [];
      gp.buttons.forEach((btn, i) => {
        if (btn.pressed && !prev[i]) this.onButton(i);
      });
      this.prev[gp.index] = gp.buttons.map(btn => btn.pressed);
    }
    // soft dead-zone curve
    const dz = v => (Math.abs(v) < 0.25 ? 0 : Math.sign(v) * ((Math.abs(v) - 0.25) / 0.75));
    this.axis.x = dz(x); this.axis.y = dz(y);
  }

  onButton(i) {
    this.log(`Remote button ${i}`);
    if (this.learning) {
      const action = this.learning; this.learning = null;
      for (const k of Object.keys(this.map)) if (Array.isArray(this.map[k])) this.map[k] = this.map[k].filter(n => n !== i);
      this.map[action] = [i]; this.saveMap();
      this.log(`${action.toUpperCase()} = button ${i} ✓`);
      return;
    }
    if (i >= 12 && i <= 15) return; // d-pad handled as joystick
    for (const [action, list] of Object.entries(this.map)) {
      if (Array.isArray(list) && list.includes(i)) { this.emit(action); return; }
    }
    this.emit('select'); // unknown button: treat as select so the remote always "does something"
  }

  get remoteName() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    return pads.length ? pads[0].id : '';
  }
}
