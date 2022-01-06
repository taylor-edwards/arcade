import {selectElements} from '/static/util.js';
import {updateMessage} from '/static/ui.js';
import {createGame} from '/static/snake/snake.js';

const bindUI = game =>
  selectElements('.game').forEach(div => div.appendChild(game.screen.canvas));

const bindControls = game => {
  [
    ['.move-left', game.moveLeft],
    ['.move-right', game.moveRight],
    ['.move-up', game.moveUp],
    ['.move-down', game.moveDown],
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
    ArrowLeft: game.moveLeft,
    h: game.moveLeft,
    H: game.moveLeft,

    ArrowRight: game.moveRight,
    l: game.moveRight,
    L: game.moveRight,

    ArrowUp: game.moveUp,
    k: game.moveUp,
    K: game.moveUp,

    ArrowDown: game.moveDown,
    j: game.moveDown,
    J: game.moveDown,

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
