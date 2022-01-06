import { selectElements } from "/static/util.js";
import { updateMessage } from "/static/ui.js";
import config from "/static/tetris/config.js";
import { createGame } from "/static/tetris/tetris.js";

const bindUI = (game) => {
  selectElements(".game").forEach((div) =>
    div.appendChild(game.screens.board.canvas)
  );
  selectElements(".queue").forEach((div) =>
    div.appendChild(game.screens.queue.canvas)
  );
  selectElements(".deck").forEach((div) =>
    div.appendChild(game.screens.deck.canvas)
  );
};

/**
 * The following keys are redundant for ease of use in
 * explicit mapping and reference:
 *     [Space, " "]
 *     [Zero, 0]
 *     [Period, "."]
 */
const inputKeys = {
  ArrowUp: "ArrowUp",
  w: "w",
  W: "W",
  k: "k",
  K: "K",
  Period: ".",
  ".": ".",
  i: "i",
  I: "I",
  ArrowDown: "ArrowDown",
  s: "s",
  S: "S",
  j: "j",
  J: "J",
  ArrowLeft: "ArrowLeft",
  a: "a",
  A: "A",
  h: "h",
  H: "H",
  ArrowRight: "ArrowRight",
  d: "d",
  D: "D",
  l: "l",
  L: "L",
  Space: " ",
  Enter: "Enter",
  Zero: "0",
  0: "0",
  " ": " ",
  Shift: "Shift",
  Escape: "Escape",
  p: "p",
  P: "P",
  Backspace: "Backspace",
  Delete: "Delete",
};

const noop = () => {};
const stopAndPrevent = (e, andFn = noop) => {
  if (
    !(e instanceof KeyboardEvent) ||
    typeof inputKeys[e.key] !== "undefined"
  ) {
    e.stopPropagation();
    e.preventDefault();
    andFn();
  }
};

const handleInput = (game, input) => {
  switch (input) {
    case inputKeys.ArrowUp:
    case inputKeys.w:
    case inputKeys.W:
    case inputKeys.k:
    case inputKeys.K:
      return game.rotateRight();
    case inputKeys.Period:
    case inputKeys.i:
    case inputKeys.I:
      return game.rotateLeft();
    case inputKeys.ArrowDown:
    case inputKeys.s:
    case inputKeys.S:
    case inputKeys.j:
    case inputKeys.J:
      return game.moveDown();
    case inputKeys.ArrowLeft:
    case inputKeys.a:
    case inputKeys.A:
    case inputKeys.h:
    case inputKeys.H:
      return game.moveLeft();
    case inputKeys.ArrowRight:
    case inputKeys.d:
    case inputKeys.D:
    case inputKeys.l:
    case inputKeys.L:
      return game.moveRight();
    case inputKeys.Space:
    case inputKeys.Enter:
      return game.drop();
    case inputKeys.Zero:
    case inputKeys.Shift:
      return game.swap();
    case inputKeys.Escape:
    case inputKeys.p:
    case inputKeys.P:
      return game.togglePause();
    case inputKeys.Backspace:
    case inputKeys.Delete:
      return game.start();
  }
};

// TODO: add return fn to cancel interval, clear timeouts,
// and remove event listeners
const bindControls = (game) => {
  const heldKeys = new Set();
  const heldButtons = new Set();
  const inputHoldTimeouts = {
    /* [event.key]: timeout id */
  };

  const queueInput = (queue, input) => {
    handleInput(game, input);
    inputHoldTimeouts[input] =
      inputHoldTimeouts[input] ??
      setTimeout(() => queue.add(input), config.keyRepeatDelay);
  };

  const releaseInput = (queue, input) => {
    clearTimeout(inputHoldTimeouts[input]);
    queue.delete(input);
    delete inputHoldTimeouts[input];
  };

  const releaseButtons = () =>
    [...heldButtons].forEach((btn) => heldButtons.delete(btn));

  window.addEventListener("keydown", (e) =>
    stopAndPrevent(e, () => queueInput(heldKeys, e.key))
  );
  window.addEventListener("keyup", (e) =>
    stopAndPrevent(e, () => releaseInput(heldKeys, e.key))
  );

  [
    [".move-left", inputKeys.ArrowLeft],
    [".move-right", inputKeys.ArrowRight],
    [".drop", inputKeys.Space],
    [".rotate-left", inputKeys.Period],
    [".rotate-right", inputKeys.ArrowUp],
    [".hold", inputKeys.Zero],
    [".pause", inputKeys.Escape],
  ].forEach(([selector, input]) =>
    selectElements(selector).forEach((el) => {
      el.addEventListener("mousedown", (e) =>
        stopAndPrevent(e, () => queueInput(heldButtons, input))
      );
      el.addEventListener("touchstart", (e) =>
        stopAndPrevent(e, () => queueInput(heldButtons, input))
      );
      el.addEventListener("mouseup", (e) =>
        stopAndPrevent(e, releaseInput(heldButtons, input))
      );
      el.addEventListener("touchend", (e) =>
        stopAndPrevent(e, releaseInput(heldButtons, input))
      );
    })
  );

  window.addEventListener("mouseup", releaseButtons);
  window.addEventListener("touchend", releaseButtons);

  // poll for user inputs at the configured frequency
  setInterval(
    () =>
      [...heldButtons, ...heldKeys].forEach((input) =>
        handleInput(game, input)
      ),
    (1 / config.keyRepeatRate) * 1000
  );
};

const updateScore = (score) => {
  selectElements(".score-lines").forEach((div) => {
    div.textContent = `${score.lines} line${score.lines === 1 ? "" : "s"}`;
  });
  selectElements(".score-tetrises").forEach((div) => {
    div.textContent = `${score.tetrises} tetris${
      score.tetrises === 1 ? "" : "es"
    }`;
  });
  selectElements("[data-level]").forEach((div) =>
    div.setAttribute("data-level", `Level ${score.level}`)
  );
};

const bindEvents = (game) =>
  game.on((eventName) => {
    switch (eventName) {
      case "START":
        updateScore(game.getScore());
        updateMessage();
        break;

      case "PAUSE":
        updateMessage("PAUSED");
        break;

      case "RESUME":
        updateMessage();
        break;

      case "LINES_CLEARED":
        updateScore(game.getScore());
        break;

      case "GAME_OVER":
        updateMessage("GAME OVER");
        break;
    }
  });

const bootstrap = () => {
  const game = createGame();
  bindUI(game);
  bindControls(game);
  bindEvents(game);
  game.start();
};

bootstrap();
