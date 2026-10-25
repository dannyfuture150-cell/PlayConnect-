/** Long-press helper: spread onto any element. Fires after ~500ms of holding, and cancels if the finger moves (scrolling). */
let timer: ReturnType<typeof setTimeout> | null = null;
let fired = false;
let sx = 0;
let sy = 0;

function clear() {
  if (timer) clearTimeout(timer);
  timer = null;
}

export function longPress(cb: () => void, ms = 500) {
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired = false;
      sx = e.clientX;
      sy = e.clientY;
      clear();
      timer = setTimeout(() => {
        fired = true;
        timer = null;
        try { navigator.vibrate?.(15); } catch {}
        cb();
      }, ms);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // stops the phone's own long-press menu, and swallows the tap that follows a long press
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClickCapture: (e: React.MouseEvent) => {
      if (fired) {
        e.preventDefault();
        e.stopPropagation();
        fired = false;
      }
    },
  };
}
