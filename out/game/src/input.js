// Keyboard and mouse: the keeper follows the pointer or the arrow keys,
// 1-3 relight a lantern, Space or click starts, P pauses, R restarts.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let pointerX = null;
  let relightLane = -1;

  function keyDown(event) {
    if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') actions |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACTION_PAUSE;
    if (event.code === 'KeyR') actions |= ACTION_RESTART;
    if (event.code === 'Digit1') relightLane = 0;
    if (event.code === 'Digit2') relightLane = 1;
    if (event.code === 'Digit3') relightLane = 2;
  }

  function keyUp(event) {
    keys.delete(event.code);
  }

  function pointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width) * 1280;
  }

  function pointerDown(event) {
    pointerMove(event);
    actions |= ACTION_CONFIRM;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerdown', pointerDown);

  return {
    /** -1, 0 or 1: arrow keys, or steering toward the pointer. */
    direction(keeperCentre) {
      if (pointerX !== null) {
        if (pointerX > keeperCentre + 10) return 1;
        if (pointerX < keeperCentre - 10) return -1;
        return 0;
      }
      const left = keys.has('ArrowLeft') || keys.has('KeyA');
      const right = keys.has('ArrowRight') || keys.has('KeyD');
      if (left && !right) return -1;
      if (right && !left) return 1;
      return 0;
    },
    /** Consume the queued one-shot actions. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Consume a queued relight request, -1 when none. */
    takeRelight() {
      const lane = relightLane;
      relightLane = -1;
      return lane;
    },
    clearPointer() {
      pointerX = null;
    },
  };
}
