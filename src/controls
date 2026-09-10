export let joyMove = { x: 0, y: 0 };
export let keys = {};

let joyTouchId = null;
let joyStart = { x: 0, y: 0 };

export function initControls(onAttack, onDodge) {
  const joyZone = document.getElementById('joystick-zone');
  const joyBase = document.getElementById('joy-base');
  const joyStick = document.getElementById('joy-stick');

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
    for (let touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        let dx = touch.clientX - joyStart.x;
        let dy = touch.clientY - joyStart.y;
        let distance = Math.hypot(dx, dy);
        let maxRadius = 45;

        if (distance > maxRadius) {
          dx = (dx / distance) * maxRadius;
          dy = (dy / distance) * maxRadius;
        }

        joyStick.style.transform = `translate(${dx}px, ${dy}px)`;
        joyMove.x = dx / maxRadius;
        joyMove.y = dy / maxRadius;
      }
    }
  }, { passive: false });

  function resetJoystick(e) {
    for (let touch of e.changedTouches) {
      if (touch.identifier === joyTouchId) {
        joyTouchId = null;
        joyMove.x = 0;
        joyMove.y = 0;
        joyBase.style.display = 'none';
      }
    }
  }

  joyZone.addEventListener('touchend', resetJoystick);
  joyZone.addEventListener('touchcancel', resetJoystick);

  function bindTouch(id, fn) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.preventDefault(); fn(); });
  }

  bindTouch('attack', onAttack);
  bindTouch('dodge', onDodge);

  addEventListener('keydown', e => {
    keys[e.key] = true;
    if (e.key === ' ' || e.key === 'j') onAttack();
    if (e.key === 'Shift' || e.key === 'k') onDodge();
  });
  
  addEventListener('keyup', e => keys[e.key] = false);
}
