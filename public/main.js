import { selectElements } from "./util.js";
import { createGame } from "./tetris.js";

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

const stopAndPrevent = (e) => {
  e.stopPropagation();
  e.preventDefault();
};

const bindControls = (game) => {
  window.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "k":
      case "K":
        stopAndPrevent(e);
        return game.rotateRight();
      case "ArrowDown":
      case "j":
      case "J":
        stopAndPrevent(e);
        return game.moveDown();
      case "ArrowLeft":
      case "h":
      case "H":
        stopAndPrevent(e);
        return game.moveLeft();
      case "ArrowRight":
      case "l":
      case "L":
        stopAndPrevent(e);
        return game.moveRight();
      case " ":
      case "Enter":
        stopAndPrevent(e);
        return game.drop();
      case "0":
      case "Shift":
        stopAndPrevent(e);
        return game.swap();
      case "Escape":
      case "p":
      case "P":
        stopAndPrevent(e);
        return game.togglePause();
      case "Backspace":
      case "Delete":
        stopAndPrevent(e);
        return game.start();
    }
  });

  [
    [".move-left", () => game.moveLeft()],
    [".move-right", () => game.moveRight()],
    [".drop", () => game.drop()],
    [".rotate-left", () => game.rotateLeft()],
    [".rotate-right", () => game.rotateRight()],
    [".hold", () => game.swap()],
    [".pause", () => game.togglePause()],
  ].forEach(([selector, action]) =>
    selectElements(selector).forEach((el) => {
      el.addEventListener("click", (e) => {
        stopAndPrevent(e);
        action(e);
      });
      el.addEventListener("keydown", (e) => {
        e.stopPropagation();
      });
    })
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
};

const updateMessage = (msg = "\u00A0") =>
  selectElements(".message").forEach((div) => {
    div.textContent = msg;
  });

const bindEvents = (game) =>
  game.on((eventName) => {
    switch (eventName) {
      case "START":
        updateScore({ lines: 0, tetrises: 0 });
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
