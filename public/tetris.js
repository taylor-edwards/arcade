import config from "./config.js";
import { range, shuffle } from "./util.js";
import {
  shapes,
  flipShape,
  rotateShape,
  shapePositionIsValid,
} from "./shapes.js";
import { createRenderer, createScreens } from "./ui.js";

const initialState = () => ({
  board: range(0, config.boardHeight).map(generateRow),
  pieces: [
    /* { shape, position, settling } */
  ],
  bag: generateBag(),
  nextBag: generateBag(),
  drawIndex: 0,
  deck: [],
  gameSpeed: config.initialSpeed,
  linesCleared: 0,
  tetrises: 0,
  level: 1,
  gameOver: false,
});

const generateRow = () =>
  range(0, config.boardWidth).map(() => ({ value: 0, color: null }));

const generateBag = () => shuffle(Object.values(shapes));

export const createGame = () => {
  let state = initialState();

  const screens = createScreens();
  const renderer = createRenderer(() => {
    screens.board.clearCanvas();
    screens.queue.clearCanvas();
    screens.deck.clearCanvas();

    const curve = [[1]];
    state.board.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (cell.value === 1) {
          screens.board.fillShape({ curve, color: cell.color }, [x, y]);
        }
      })
    );

    state.pieces.forEach(({ shape, position }) =>
      screens.board.fillShape(shape, position)
    );

    const queue = state.bag
      .slice(state.drawIndex, state.drawIndex + config.queueSize)
      .concat(state.nextBag.slice(0, config.queueSize))
      .slice(0, config.queueSize);

    let queueY = 1;
    queue.forEach((shape) => {
      screens.queue.fillShape(shape, [1, queueY]);
      queueY += shape.curve.length + 1;
    });

    state.deck.forEach((piece) => screens.deck.fillShape(piece.shape, [1, 1]));
  });

  /**
   * The following functions (cautiously) mutate the game's state
   */
  const drawNextShape = () => {
    const shape = state.bag[state.drawIndex];
    state.drawIndex = (state.drawIndex + 1) % state.bag.length;
    if (state.drawIndex === 0) {
      state.bag = state.nextBag;
      state.nextBag = generateBag();
    }
    return shape;
  };

  const placePiece = (shape, position) => {
    if (shapePositionIsValid(state.board, shape, position)) {
      const piece = { shape, position, settling: null };
      state.pieces.push(piece);
      return piece;
    }
  };

  const movePiece = (piece, position) => {
    if (shapePositionIsValid(state.board, piece.shape, position)) {
      piece.position = position;
      return true;
    }
    return false;
  };

  const dropPiece = (piece) => {
    let y = piece.position[1];
    while (movePiece(piece, [piece.position[0], y++])) {
      continue;
    }
    return true;
  };

  const rotatePiece = (piece, turns) => {
    const rotatedShape = rotateShape(piece.shape, turns);
    let position;

    // try to fit the rotated piece back onto the board in the same place,
    // otherwise try nudging it one column at a time up until it finds a
    // fitting position. first try leftward up to the shape's width then
    // upward up to the shape's height.
    const width = rotatedShape.curve[0].length;
    for (let x = 0; x < width && typeof position === "undefined"; x++) {
      const nextPosition = [piece.position[0] - x, piece.position[1]];
      if (shapePositionIsValid(state.board, rotatedShape, nextPosition)) {
        position = nextPosition;
      }
    }

    const height = rotatedShape.curve.length;
    for (let y = 0; y < height && typeof position === "undefined"; y++) {
      const nextPosition = [piece.position[0], piece.position[1] - y];
      if (shapePositionIsValid(state.board, rotatedShape, nextPosition)) {
        position = nextPosition;
      }
    }

    if (position) {
      piece.shape = rotatedShape;
      piece.position = position;
      return true;
    }

    return false;
  };

  const swapPieces = () => {
    if (state.deck.length > 0) {
      const restorePieces = state.deck
        .map(({ shape }) => ({
          ...state.pieces[0],
          shape,
        }))
        .filter(({ shape, position }) =>
          shapePositionIsValid(state.board, shape, position)
        );
      if (restorePieces.length > 0) {
        state.deck = state.pieces;
        state.pieces = restorePieces;
      }
    } else {
      state.deck = state.pieces;
      state.pieces = [];
    }
  };

  const provisionPiece = () => {
    if (state.pieces.length === 0) {
      const piece = placePiece(drawNextShape(), config.startingPosition);
      if (typeof piece !== "undefined") {
        // restart auto-advancement to trigger level speed-up
        startAutoAdvance();
      } else {
        // if a new piece can't be placed, the game is over
        state.gameOver = true;
        stopAutoAdvance();
        emit("GAME_OVER", controls.getScore());
      }
    }
  };

  const bakePiece = (piece) => {
    if (
      !shapePositionIsValid(state.board, piece.shape, [
        piece.position[0],
        piece.position[1] + 1,
      ])
    ) {
      piece.shape.curve.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell === 1) {
            state.board[piece.position[1] + y][piece.position[0] + x] = {
              color: piece.shape.color,
              value: 1,
            };
          }
        })
      );

      state.pieces = state.pieces.filter((p) => p !== piece);

      settlePieces();
    }
  };

  const settlePieces = ({ hardDrop = false } = {}) => {
    // transform pieces that bottomed out into board cells
    let piecesSettled = 0;
    state.pieces.forEach((piece) => {
      if (
        !shapePositionIsValid(state.board, piece.shape, [
          piece.position[0],
          piece.position[1] + 1,
        ])
      ) {
        piecesSettled += 1;
        if (piece.settling === null) {
          piece.settling = setTimeout(
            () => bakePiece(piece),
            hardDrop ? config.hardSettleDelay : config.settleDelay
          );
        }
      } else {
        clearTimeout(piece.settling);
        piece.settling = null;
      }
    });

    // check for completed rows, bottom-up
    const rowCount = state.board.length;
    let linesCleared = 0;
    let y = rowCount - 1;
    while (y >= 0) {
      const row = state.board[y];
      const allCellsFilled = row.reduce(
        (priorRowsFilled, cell) => priorRowsFilled && cell.value === 1,
        true
      );
      if (allCellsFilled) {
        state.board = [
          generateRow(),
          ...state.board.slice(0, y).concat(state.board.slice(y + 1)),
        ];
        linesCleared += 1;
      } else {
        y -= 1;
      }
    }
    const tetrises = Math.floor(linesCleared / 4);
    state.linesCleared += linesCleared;
    state.tetrises += tetrises;
    if (linesCleared > 0) {
      emit("LINES_CLEARED", { tetrises, lines: linesCleared });
    }

    provisionPiece();
  };

  let autoAdvance;
  const startAutoAdvance = () => {
    clearInterval(autoAdvance);
    state.level = Math.floor(state.linesCleared / config.linesPerLevel);
    state.gameSpeed =
      config.initialSpeed * Math.pow(config.speedUpPerLevel, state.level);
    autoAdvance = setInterval(
      () => controls.moveDown(false),
      config.autoAdvanceDelay / state.gameSpeed
    );
  };
  const stopAutoAdvance = () => clearInterval(autoAdvance);

  let eventListeners = [];
  const emit = (...eventData) =>
    eventListeners.forEach((fn) => fn(...eventData));

  const controlPieces = (pieceHandler, hardDrop = false) => {
    if (!state.gameOver && !state.paused) {
      state.pieces.forEach((piece) => pieceHandler(piece));
      settlePieces({ hardDrop });
    }
  };

  const controls = {
    screens,
    on: (fn) => eventListeners.push(fn),
    off: (fn) => {
      const i = eventListeners.indexOf(fn);
      if (i >= 0) {
        eventListeners = eventListeners
          .slice(0, i)
          .concat(eventListeners.slice(i + 1));
      }
    },
    start: () => {
      state = initialState();
      renderer.start();
      provisionPiece();
      emit("START");
      startAutoAdvance();
    },
    pause: () => {
      if (state.gameOver) {
        controls.start();
      } else {
        stopAutoAdvance();
        state.paused = true;
        emit("PAUSE");
      }
    },
    resume: () => {
      state.paused = false;
      startAutoAdvance();
      emit("RESUME");
    },
    togglePause: () => {
      if (state.paused) {
        controls.resume();
      } else {
        controls.pause();
      }
    },
    getScore: () => ({
      gameOver: state.gameOver,
      level: state.level + 1,
      lines: state.linesCleared,
      tetrises: state.tetrises,
    }),
    moveLeft: () =>
      controlPieces((piece) =>
        movePiece(piece, [piece.position[0] - 1, piece.position[1]])
      ),
    moveRight: () =>
      controlPieces((piece) =>
        movePiece(piece, [piece.position[0] + 1, piece.position[1]])
      ),
    moveDown: (hardDrop = true) =>
      controlPieces(
        (piece) => movePiece(piece, [piece.position[0], piece.position[1] + 1]),
        hardDrop
      ),
    drop: () => controlPieces((piece) => dropPiece(piece), true),
    rotateLeft: () => controlPieces((piece) => rotatePiece(piece, 3)),
    rotateRight: () => controlPieces((piece) => rotatePiece(piece, 1)),
    swap: () => {
      if (!state.gameOver && !state.paused) {
        swapPieces();
        settlePieces();
      }
    },
  };

  return controls;
};
