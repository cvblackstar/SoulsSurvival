export let keys = {};

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
    joyStart.x = touch.clientX;
    joyStart.y = touch.clientY;
    joyBase.style.left = joyStart.x + 'px';
    joyBase.style.top = joyStart.y + 'px';
    joyBase.style.display = 'block';
    joyStick.style.transform = 'translate(0px, 0px)';
  }, { passive: false });

  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        let dx = touch.clientX - joyStart.x;
        let dy = touch.clientY - joyStart.y;
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
    joyStart.x = e.clientX; joyStart.y = e.clientY;
    joyBase.style.left = joyStart.x + 'px';
    joyBase.style.top = joyStart.y + 'px';
    joyBase.style.display = 'block';
  });
  addEventListener('mousemove', e => {
    if (!mouseDown) return;
    let dx = e.clientX - joyStart.x;
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
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.preventDefault(); fn(); });
  }

  bindTap('jump-btn', onJump);
  bindTap('attack-btn', onAttack);
  bindTap('dash-btn', onDash);

  addEventListener('keydown', e => {
    if (keys[e.key]) return;
    keys[e.key] = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') setMoveAxis(-1);
    if (e.key === 'ArrowRight' || e.key === 'd') setMoveAxis(1);
    if (e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') onJump();
    if (e.key === 'j') onAttack();
    if (e.key === 'Shift' || e.key === 'k') onDash();
  });

  addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') setMoveAxis(0);
  });
}
