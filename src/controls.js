export let keys = {};

// When the CSS rotate-hack is active (phone held in portrait), the browser still
// reports touch/mouse coordinates in the raw, unrotated viewport frame. We have to
// remap them into the visually-rotated "game space" frame ourselves, or drag
// gestures measure the wrong axis entirely.
function isPortraitHack() {
  return window.matchMedia('(orientation: portrait)').matches;
}

function toGameXY(clientX, clientY) {
  if (isPortraitHack()) {
    // body is rotated -90deg: raw (x,y) -> game (innerHeight - y, x)
    return { x: window.innerHeight - clientY, y: clientX };
  }
  return { x: clientX, y: clientY };
}

export function initControls(onAttack, onJump, onDash, setMoveAxis) {
  const joyZone = document.getElementById('joystick-zone');
  const joyBase = document.getElementById('joy-base');
  const joyStick = document.getElementById('joy-stick');
  const maxRadius = 46;
  let joyTouchId = null;
  let joyStart = { x: 0, y: 0 };

  joyZone.addEventListener('touchstart', e => {
    e.preventDefault();
    if (joyTouchId !== null) return;
    const touch = e.changedTouches[0];
    joyTouchId = touch.identifier;
    const p = toGameXY(touch.clientX, touch.clientY);
    joyStart.x = p.x;
    joyStart.y = p.y;
    joyBase.style.left = joyStart.x + 'px';
    joyBase.style.top = joyStart.y + 'px';
    joyBase.style.display = 'block';
    joyStick.style.transform = 'translate(0px, 0px)';
  }, { passive: false });

  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        const p = toGameXY(touch.clientX, touch.clientY);
        let dx = p.x - joyStart.x;
        let dy = p.y - joyStart.y;
        const dist = Math.hypot(dx, dy);
        if (dist > maxRadius) {
          dx = (dx / dist) * maxRadius;
          dy = (dy / dist) * maxRadius;
        }
        joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
        // Only the horizontal component drives movement (side-scroller).
        setMoveAxis(dx / maxRadius);
      }
    }
  }, { passive: false });

  function resetJoystick(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        joyTouchId = null;
        joyBase.style.display = 'none';
        setMoveAxis(0);
      }
    }
  }
  joyZone.addEventListener('touchend', resetJoystick);
  joyZone.addEventListener('touchcancel', resetJoystick);

  // Mouse fallback (desktop testing): drag from anywhere in the zone.
  let mouseDown = false;
  joyZone.addEventListener('mousedown', e => {
    mouseDown = true;
    const p = toGameXY(e.clientX, e.clientY);
    joyStart.x = p.x; joyStart.y = p.y;
    joyBase.style.left = joyStart.x + 'px';
    joyBase.style.top = joyStart.y + 'px';
    joyBase.style.display = 'block';
  });
  addEventListener('mousemove', e => {
    if (!mouseDown) return;
    const p = toGameXY(e.clientX, e.clientY);
    let dx = p.x - joyStart.x;
    const dist = Math.abs(dx);
    if (dist > maxRadius) dx = (dx / dist) * maxRadius;
    joyStick.style.transform = `translate(${dx}px, 0px)`;
    setMoveAxis(dx / maxRadius);
  });
  addEventListener('mouseup', () => {
    if (!mouseDown) return;
    mouseDown = false;
    joyBase.style.display = 'none';
    setMoveAxis(0);
  });

  function bindTap(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.preventDefault(); fn(); });
  }

  bindTap('jump-btn', onJump);
  bindTap('attack-btn', onAttack);
  bindTap('dash-btn', onDash);

  function updateKeyAxis() {
    let axis = 0;
    if (keys['ArrowLeft'] || keys['a']) axis -= 1;
    if (keys['ArrowRight'] || keys['d']) axis += 1;
    setMoveAxis(axis);
  }

  addEventListener('keydown', e => {
    if (keys[e.key]) return;
    keys[e.key] = true;

    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') {
      updateKeyAxis();
    }
    if (e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') onJump();
    if (e.key === 'j') onAttack();
    if (e.key === 'Shift' || e.key === 'k') onDash();
  });

  addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') {
      updateKeyAxis();
    }
  });
}
