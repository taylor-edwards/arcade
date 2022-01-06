import {rand, range} from '/static/util.js';
import {createRenderer, createScreens} from '/static/ui.js';
import config from '/static/snake/config.js';

const initialState = () => ({
  board: range(0, config.rowCount).map(() =>
    range(0, config.columnCount).map(() => 0),
  ),
  tail: [[9, 9]],
  direction: null,
  paused: false,
  gameOver: false,
});

const CELL = {curve: [[1]], color: config.snakeColor};
const PARTICLE = {curve: [[1]], color: config.foodColor};

export const createGame = () => {
  let state = initialState();
  const cellSize = config.canvasWidth / config.columnCount;
  const {screen} = createScreens(cellSize, config.bgColor, {
    screen: [config.canvasWidth, config.rowCount * cellSize],
  });

  const renderer = createRenderer(() => {
    screen.clearCanvas();
    state.board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell === 1) {
          screen.fillShape(PARTICLE, [x, y]);
        }
      }),
    );
    state.tail.forEach(pos => screen.fillShape(CELL, pos));
  });

  const addParticle = () => {
    const particle = generateParticle(state.tail);
    if (particle) {
      state.board[particle[1]][particle[0]] = 1;
    } else {
      // particle can't be placed because the board is full of snake cells
      emit('GAME_OVER', controls.getScore());
    }
  };

  const eatParticles = () => {
    const particles = state.tail.filter(
      pos => state.board[pos[1]][pos[0]] === 1,
    );
    particles.forEach(pos => {
      state.board[pos[1]][pos[0]] = 0;
    });
    if (particles.length > 0) {
      addParticle();
    }
    return particles.length;
  };

  const moveSnake = dir => {
    if (!state.gameOver) {
      const tail = move(state.tail, dir);
      if (tail) {
        const didEat = eatParticles() > 0;
        if (didEat) {
          state.tail = [...tail, ...state.tail.slice(-1)];
          emit('SCORE', controls.getScore());
        } else {
          state.tail = tail;
        }
      } else {
        // couldn't move the snake forward
        state.gameOver = true;
        emit('GAME_OVER', controls.getScore());
      }
    }
  };

  let autoMove;
  const handleMove = dir => {
    if (!state.paused && !state.gameOver) {
      // don't allow moving backwards 
      if (!moveIsComplement(dir, state.direction)) {
        clearInterval(autoMove);
        state.direction = dir;
        const doMove = () => moveSnake(state.direction);
        // ignore repeated inputs
        if (dir !== state.direction) {
          doMove();
        }
        autoMove = setInterval(doMove, 1000 / config.movesPerSecond);
      }
    }
  };

  let eventListeners = [];
  const emit = (...eventData) => eventListeners.forEach(fn => fn(...eventData));

  const controls = {
    on: fn => eventListeners.push(fn),
    off: fn => {
      const i = eventListeners.indexOf(fn);
      if (i >= 0) {
        eventListeners = eventListeners
          .slice(0, i)
          .concat(eventListeners.slice(i + 1));
      }
    },
    start: () => {
      clearInterval(autoMove);
      state = initialState();
      addParticle();
      renderer.start();
      emit('START');
    },
    stop: () => {
      clearInterval(autoMove);
      renderer.stop();
      emit('STOP');
    },
    pause: () => {
      // only pause if the game has started
      if (state.direction !== null) {
        clearInterval(autoMove);
        state.paused = true;
        emit('PAUSE');
      }
    },
    resume: () => {
      state.paused = false;
      handleMove(state.direction);
      emit('RESUME');
    },
    togglePause: () => {
      if (state.gameOver) {
        controls.start();
      } else {
        if (state.paused) {
          controls.resume();
        } else {
          controls.pause();
        }
      }
    },
    getScore: () => ({points: state.tail.length - 1}),
    moveUp: () => handleMove(directions.UP),
    moveDown: () => handleMove(directions.DOWN),
    moveLeft: () => handleMove(directions.LEFT),
    moveRight: () => handleMove(directions.RIGHT),
  };

  return {
    screen,
    ...controls,
  };
};

const directions = {
  UP: 'UP',
  DOWN: 'DOWN',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
};

const positionIsValid = (pos, tail) =>
  Array.isArray(pos) &&
  pos[0] >= 0 &&
  pos[0] < config.columnCount &&
  pos[1] >= 0 &&
  pos[1] < config.rowCount &&
  typeof tail.find(([x, y]) => pos[0] === x && pos[1] === y) === 'undefined';

const generateParticle = tail => {
  const maxTries = config.rowCount * config.columnCount;
  let tries = 0;
  while (tries < maxTries) {
    tries++;
    const pos = [rand(0, config.columnCount), rand(0, config.rowCount)];
    if (positionIsValid(pos, tail)) {
      return pos;
    }
  }
};

const move = (tail, direction) => {
  let newPosition;
  const head = tail[0];
  switch (direction) {
    case directions.UP:
      newPosition = [head[0], head[1] - 1];
      break;
    case directions.DOWN:
      newPosition = [head[0], head[1] + 1];
      break;
    case directions.LEFT:
      newPosition = [head[0] - 1, head[1]];
      break;
    case directions.RIGHT:
      newPosition = [head[0] + 1, head[1]];
      break;
  }
  const newTail = tail.slice(0, tail.length - 1);
  if (positionIsValid(newPosition, newTail)) {
    return [newPosition, ...newTail];
  }
};

const moveIsComplement = (a, b) =>
  (a === directions.UP && b === directions.DOWN) ||
  (a === directions.DOWN && b === directions.UP) ||
  (a === directions.LEFT && b === directions.RIGHT) ||
  (a === directions.RIGHT && b === directions.LEFT);
