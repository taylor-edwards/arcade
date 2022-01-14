import { selectElements } from '/static/util.js';
import { initJoystick, updateMessage } from '/static/ui.js';
import { createGame } from '/static/snake/snake.js';

const bindUI = game =>
  selectElements('.game').forEach(div => div.appendChild(game.screen.canvas));

const bindControls = game => {
  [
    ['.move-left', game.turnLeft],
    ['.move-right', game.turnRight],
    ['.move-up', game.turnUp],
    ['.move-down', game.turnDown],
    ['.pause', game.togglePause],
  ].forEach(([selector, handler]) =>
    selectElements(selector).forEach(div =>
      div.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        handler();
      }),
    ),
  );

  const keys = {
    ArrowLeft: game.turnLeft,
    h: game.turnLeft,
    H: game.turnLeft,

    ArrowRight: game.turnRight,
    l: game.turnRight,
    L: game.turnRight,

    ArrowUp: game.turnUp,
    k: game.turnUp,
    K: game.turnUp,

    ArrowDown: game.turnDown,
    j: game.turnDown,
    J: game.turnDown,

    Delete: game.start,
    Backspace: game.start,

    Escape: game.togglePause,
  };

  window.addEventListener('keydown', e => {
    const handler = keys[e.key];
    if (handler) {
      e.preventDefault();
      e.stopPropagation();
      handler();
    }
  });

  const joystick = document.getElementById('joystick');
  if (joystick) {
    initJoystick(joystick, dir => {
      switch (dir) {
        case 'up':
          game.turnUp();
          break;
        case 'down':
          game.turnDown();
          break;
        case 'left':
          game.turnLeft();
          break;
        case 'right':
          game.turnRight();
          break;
      }
    });
  }
};

const updateScore = score =>
  selectElements('.score-points').forEach(div => {
    div.textContent = `${score.points} point${score.points === 1 ? '' : 's'}`;
  });

const bindEvents = game =>
  game.on((eventName, ...eventData) => {
    switch (eventName) {
      case 'START':
        updateScore(game.getScore());
        updateMessage();
        break;

      case 'PAUSE':
        updateMessage('PAUSED');
        break;

      case 'RESUME':
        updateMessage();
        break;

      case 'SCORE':
        updateScore(eventData[0]);
        break;

      case 'GAME_OVER':
        updateScore(eventData[0]);
        updateMessage('GAME OVER');
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
