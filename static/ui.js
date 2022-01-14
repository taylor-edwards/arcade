import { selectElements } from "/static/util.js";

export const updateMessage = (msg = "") =>
  selectElements(".message").forEach((div) => {
    div.textContent = msg;
  });

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  return { canvas, context };
};

const clearCanvas = (context, canvas, fillColor) => () => {
  context.fillStyle = fillColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
};

const fillShape = (context, cellSize) => (shape, position) => {
  context.fillStyle = shape.color;
  shape.curve.forEach((row, rowOffset) => {
    row.forEach((cell, colOffset) => {
      if (cell === 1) {
        context.fillRect(
          (position[0] + colOffset) * cellSize,
          (position[1] + rowOffset) * cellSize,
          cellSize,
          cellSize
        );
      }
    });
  });
};

export const createScreens = (cellSize, bgColor, screenDims) =>
  Object.fromEntries(
    Object.entries(screenDims).map(([key, dims]) => {
      const screen = createCanvas(dims[0], dims[1]);
      return [
        key,
        {
          ...screen,
          clearCanvas: clearCanvas(screen.context, screen.canvas, bgColor),
          fillShape: fillShape(screen.context, cellSize),
        },
      ];
    })
  );

export const createRenderer = (render) => {
  let interval = null;
  const stop = () => {
    clearInterval(interval);
    interval = null;
  };
  const start = () => {
    if (interval === null) {
      interval = setInterval(handleRender, 16.6666667);
    }
  };

  let lastFrameID;
  let renderInProgress = false;
  const handleRender = () => {
    if (!renderInProgress) {
      renderInProgress = true;
      cancelAnimationFrame(lastFrameID);
      lastFrameID = requestAnimationFrame(() => {
        render();
        renderInProgress = false;
      });
    }
  };

  return {
    start,
    stop,
  };
};

export const initJoystick = (joystick, onChange = (dir, magnitude) => null) => {
  const state = {
    mouseGrabbing: false,
    mouseOrigin: [0, 0],
    mousePosition: [0, 0],
    touching: false,
    touchOrigin: [0, 0],
    touchPosition: [0, 0],
  };
  const dirs = {
    DOWN: "down",
    LEFT: "left",
    RIGHT: "right",
    UP: "up",
  };
  const moveJoystick = (dir, magnitude) => {
    joystick.dataset.dir = dir;
    onChange(dir, magnitude);
  };
  const render = (() => {
    // renders joystick movement and outputs commands to the game
    const applyState = () => {
      // mouse overrides touch if both are in use (e.g. touchscreen laptops)
      if (state.mouseGrabbing) {
        const mouseDelta = [
          state.mousePosition[0] - state.mouseOrigin[0],
          state.mouseOrigin[1] - state.mousePosition[1],
        ];
        if (Math.abs(mouseDelta[0]) > Math.abs(mouseDelta[1])) {
          if (mouseDelta[0] > 0) {
            moveJoystick(
              dirs.RIGHT,
              Math.abs(mouseDelta[0] / joystick.clientWidth)
            );
          } else if (mouseDelta[0] < 0) {
            moveJoystick(
              dirs.LEFT,
              Math.abs(mouseDelta[0] / joystick.clientWidth)
            );
          }
        } else {
          if (mouseDelta[1] > 0) {
            moveJoystick(
              dirs.UP,
              Math.abs(mouseDelta[1] / joystick.clientHeight)
            );
          } else if (mouseDelta[1] < 0) {
            moveJoystick(
              dirs.DOWN,
              Math.abs(mouseDelta[1] / joystick.clientHeight)
            );
          }
        }
      } else if (state.touching) {
        const touchDelta = [
          state.touchPosition[0] - state.touchOrigin[0],
          state.touchOrigin[1] - state.touchPosition[1],
        ];
        if (Math.abs(touchDelta[0]) > Math.abs(touchDelta[1])) {
          if (touchDelta[0] > 0) {
            moveJoystick(
              dirs.RIGHT,
              Math.abs(touchDelta[0] / joystick.clientWidth)
            );
          } else if (touchDelta[0] < 0) {
            moveJoystick(
              dirs.LEFT,
              Math.abs(touchDelta[0] / joystick.clientWidth)
            );
          }
        } else {
          if (touchDelta[1] > 0) {
            moveJoystick(
              dirs.UP,
              Math.abs(touchDelta[1] / joystick.clientHeight)
            );
          } else if (touchDelta[1] < 0) {
            moveJoystick(
              dirs.DOWN,
              Math.abs(touchDelta[1] / joystick.clientHeight)
            );
          }
        }
      } else {
        delete joystick.dataset.dir;
      }
    };

    // restrict applyState invocations to top out at 60hz call rate
    let timeout = null, renderPending = false;
    return () => {
      if (timeout === null) {
        applyState();
        timeout = setTimeout(() => {
          timeout = null;
          if (renderPending) {
            applyState();
          }
        }, 1000 / 60);
      } else {
        renderPending = true;
      }
    };
  })();

  const handleTouchStart = (e) => {
    if (!state.touching) {
      state.touching = true;
      for (const touch of e.changedTouches) {
        if (touch.target === joystick) {
          e.preventDefault();
          state.touchOrigin = [touch.screenX, touch.screenY];
          state.touchPosition = state.touchOrigin;
          createTouchMoveHandler();
          render();
          break;
        }
      }
    }
  };
  const handleTouchMove = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.target === joystick) {
        e.preventDefault();
        state.touchPosition = [touch.screenX, touch.screenY];
        render();
        break;
      }
    }
  };
  const handleTouchEnd = (e) => {
    for (const touch of e.changedTouches) {
      if (touch.target === joystick) {
        state.touching = false;
        destroyTouchMoveHandler();
        render();
        break;
      }
    }
  };
  const handleMouseDown = (e) => {
    state.mouseGrabbing = true;
    state.mouseOrigin = [e.screenX, e.screenY];
    state.mousePosition = state.mouseOrigin;
    createMouseMoveHandler();
    render();
  };
  const handleMouseMove = (e) => {
    state.mousePosition = [e.screenX, e.screenY];
    render();
  };
  const handleMouseUp = () => {
    state.mouseGrabbing = false;
    destroyMouseMoveHandler();
    render();
  };

  /* Attach and remove event handlers */

  const captureOpts = { passive: false };
  const passiveOpts = { passive: true };

  joystick.addEventListener("touchstart", handleTouchStart, captureOpts);
  window.addEventListener("touchend", handleTouchEnd, passiveOpts);
  joystick.addEventListener("mousedown", handleMouseDown, passiveOpts);
  window.addEventListener("mouseup", handleMouseUp, passiveOpts);

  const createMouseMoveHandler = () =>
    window.addEventListener("mousemove", handleMouseMove, passiveOpts);
  const destroyMouseMoveHandler = () =>
    window.removeEventListener("mousemove", handleMouseMove, passiveOpts);
  const createTouchMoveHandler = () =>
    window.addEventListener("touchmove", handleTouchMove, captureOpts);
  const destroyTouchMoveHandler = () =>
    window.removeEventListener("touchmove", handleTouchMove, captureOpts);

  return () => {
    joystick.removeEventListener("touchstart", handleTouchStart, captureOpts);
    window.removeEventListener("touchend", handleTouchEnd, passiveOpts);
    joystick.removeEventListener("mousedown", handleMouseDown, passiveOpts);
    window.removeEventListener("mouseup", handleMouseUp, passiveOpts);
    destroyMouseMoveHandler();
    destroyTouchMoveHandler();
    delete joystick.dataset.dir;
  };
};
