export let keys = {};

export function initControls(onAttack, onJump, onDash, setMoveLeft, setMoveRight) {
  function bindHold(id, onDown, onUp) {
    const el = document.getElementById(id);
    const down = e => { e.preventDefault(); onDown(); };
    const up = e => { e.preventDefault(); onUp(); };
    el.addEventListener('touchstart', down, { passive: false });
    el.addEventListener('touchend', up, { passive: false });
    el.addEventListener('touchcancel', up, { passive: false });
    el.addEventListener('mousedown', down);
    el.addEventListener('mouseup', up);
    el.addEventListener('mouseleave', up);
  }

  function bindTap(id, fn) {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown', e => { e.preventDefault(); fn(); });
  }

  bindHold('dpad-left', () => setMoveLeft(true), () => setMoveLeft(false));
  bindHold('dpad-right', () => setMoveRight(true), () => setMoveRight(false));
  bindTap('jump-btn', onJump);
  bindTap('attack-btn', onAttack);
  bindTap('dash-btn', onDash);

  addEventListener('keydown', e => {
    if (keys[e.key]) return;
    keys[e.key] = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') setMoveLeft(true);
    if (e.key === 'ArrowRight' || e.key === 'd') setMoveRight(true);
    if (e.key === ' ' || e.key === 'w' || e.key === 'ArrowUp') onJump();
    if (e.key === 'j') onAttack();
    if (e.key === 'Shift' || e.key === 'k') onDash();
  });

  addEventListener('keyup', e => {
    keys[e.key] = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') setMoveLeft(false);
    if (e.key === 'ArrowRight' || e.key === 'd') setMoveRight(false);
  });
}
