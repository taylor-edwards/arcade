import { range, shuffle } from "/util.js";

const boardWidth = 10;
const boardHeight = 18;
const startingPosition = [4, 0];
const framesPerAdvancement = 45;
const settleDelay = 30;
const rowsPerSpeedUp = 10;
const queueSize = 3;

const canvas = document.createElement("canvas");
canvas.width = 400;
canvas.height = canvas.width * (boardHeight / boardWidth);
canvas.style = `
  height: ${canvas.height}px;
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  width: ${canvas.width}px;
`;
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");
const cellSize = canvas.width / boardWidth;

const clearCanvas = () => {
  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const fillShape = (shape, position) => {
  ctx.fillStyle = shape.color;
  shape.curve.forEach((row, rowOffset) => {
    row.forEach((cell, colOffset) => {
      if (cell === 1) {
        ctx.fillRect(
          (position[0] + colOffset) * cellSize,
          (position[1] + rowOffset) * cellSize,
          cellSize,
          cellSize
        );
      }
    });
  });
};

const flipShape = (shape) => {
  /*
   * flip the S block once:
    [0, 1, 1]
    [1, 1, 0]

    [1, 0]
    [1, 1]
    [0, 1]

   * flip the I block once:
    [1,1,1,1]

    [1]
    [1]
    [1]
    [1]

   * flip the J block once:
    [0, 1]
    [0, 1]
    [1, 1]

    [1, 0, 0]
    [1, 1, 1]
  */

  const curve = [];
  // swap the width and height
  const height = shape.curve[0].length;
  const width = shape.curve.length;
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      row.push(shape.curve[j][i]);
    }
    curve.push(row.reverse());
  }
  return {
    ...shape,
    curve,
  };
};

const rotateShape = (shape, turns) => {
  // each turn is one 90deg rotation
  let nextShape = shape;
  let i = 0;
  while (i++ < turns % 4) {
    nextShape = flipShape(nextShape);
  }
  return nextShape;
};

const shapes = {
  s: {
    color: "#e88",
    curve: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  i: {
    color: "#88f",
    curve: [[1, 1, 1, 1]],
  },
  z: {
    color: "#8d8",
    curve: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  t: {
    color: "#e8f",
    curve: [
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  o: {
    color: "#ed8",
    curve: [
      [1, 1],
      [1, 1],
    ],
  },
  l: {
    color: "#8df",
    curve: [
      [1, 0],
      [1, 0],
      [1, 1],
    ],
  },
  j: {
    color: "#e96",
    curve: [
      [0, 1],
      [0, 1],
      [1, 1],
    ],
  },
};

const shapePositionIsValid = (board, shape, position) => {
  const [xOffset, yOffset] = position;
  if (xOffset < 0 || yOffset < 0) {
    return false;
  }
  const width = shape.curve[0].length;
  const height = shape.curve.length;
  if (xOffset + width > boardWidth || yOffset + height > boardHeight) {
    return false;
  }
  // the position is invalid if the curve and the board occupy the same cell
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        shape.curve[y][x] === 1 &&
        board[y + yOffset][x + xOffset].value === 1
      ) {
        return false;
      }
    }
  }
  return true;
};

const generateRow = () =>
  range(0, boardWidth).map(() => ({ value: 0, color: null }));

const generateBag = () => shuffle(Object.values(shapes));

const state = {
  // used to track validity of game state
  board: range(0, boardHeight).map(generateRow),
  // used to control pieces before they settle onto the board
  pieces: [
    /* { shape, position, settleBy } */
  ],
  framesUntilAdvance: framesPerAdvancement,
  framesPerDrop: framesPerAdvancement,
  // contains the most recent user input (reset every frame)
  userInput: [],
  // draw the next piece pseudorandomly and enable queue functionality
  bag: generateBag(),
  nextBag: generateBag(),
  drawIndex: 0,
  heldPieces: [],
  // used to track player progress
  rowsCleared: 0,
  tetrises: 0,
  gameOver: false,
};

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
    const piece = { shape, position, settleBy: null };
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
  // move downwards until finding the last valid position
  let y = piece.position[1];
  piece.settleBy = 10;
  while (movePiece(piece, [piece.position[0], y++])) {
    continue;
  }
  return true;
};

const rotatePiece = (piece, turns) => {
  const rotatedShape = rotateShape(piece.shape, turns);
  let position;

  // try to fit the rotated piece back onto the board in the same place,
  // otherwise try nudging it to  one column at a time up until it finds
  // a fitting position. first try leftward up to the shape's width then
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
  if (state.heldPieces.length > 0) {
    const restorePieces = state.heldPieces
      .map(({ shape }) => ({
        ...state.pieces[0],
        shape,
      }))
      .filter(({ shape, position }) =>
        shapePositionIsValid(state.board, shape, position)
      );
    if (restorePieces.length > 0) {
      state.heldPieces = state.pieces;
      state.pieces = restorePieces;
    }
  } else {
    state.heldPieces = state.pieces;
    state.pieces = [];
  }
};

const actions = {
  DROP: "DROP",
  MOVE_DOWN: "MOVE_DOWN",
  MOVE_LEFT: "MOVE_LEFT",
  MOVE_RIGHT: "MOVE_RIGHT",
  ROTATE: "ROTATE",
  SWAP: "SWAP",
};

// start the game/animation loop
let lastFrameID;
const gameLoop = setInterval(() => {
  try {
    // consume user input
    state.userInput.forEach((input) =>
      state.pieces.forEach((piece) => {
        switch (input) {
          case actions.ROTATE:
            rotatePiece(piece, 1);
            break;
          case actions.MOVE_DOWN:
            const didMove = movePiece(piece, [
              piece.position[0],
              piece.position[1] + 1,
            ]);
            if (!didMove) {
              piece.settleBy = 0;
            }
            break;
          case actions.MOVE_LEFT:
            movePiece(piece, [piece.position[0] - 1, piece.position[1]]);
            break;
          case actions.MOVE_RIGHT:
            movePiece(piece, [piece.position[0] + 1, piece.position[1]]);
            break;
          case actions.DROP:
            dropPiece(piece);
            break;
          case actions.SWAP:
            swapPieces();
            break;
        }
      })
    );

    // auto-advance control pieces 1-block
    if (state.userInput.includes(actions.MOVE_DOWN)) {
      state.framesUntilAdvance = state.framesPerDrop;
    } else {
      if (state.framesUntilAdvance <= 0) {
        state.framesUntilAdvance = Math.floor(
          framesPerAdvancement / (1 + state.rowsCleared / rowsPerSpeedUp)
        );
        state.framesPerDrop = state.framesUntilAdvance;
        state.pieces.forEach((piece) =>
          movePiece(piece, [piece.position[0], piece.position[1] + 1])
        );
      } else {
        state.framesUntilAdvance -= 1;
      }
    }

    // transform pieces that bottomed out into board cells
    state.pieces = state.pieces.filter((piece) => {
      switch (true) {
        case shapePositionIsValid(state.board, piece.shape, [
          piece.position[0],
          piece.position[1] + 1,
        ]):
          piece.settleBy = null;
          return true;

        case piece.settleBy === null:
          piece.settleBy = settleDelay;
          return true;

        case piece.settleBy > 0:
          piece.settleBy -= 1;
          return true;

        default:
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
          return false;
      }
    });

    // clear completed rows, bottom to top
    const rowCount = state.board.length;
    let rowsCleared = 0;
    let y = rowCount - 1;
    while (y >= 0) {
      const row = state.board[y];
      const allCellsFilled = row.reduce(
        (acc, cell) => acc && cell.value === 1,
        true
      );
      if (allCellsFilled) {
        state.board = [
          generateRow(),
          ...state.board.slice(0, y).concat(state.board.slice(y + 1)),
        ];
        rowsCleared += 1;
      } else {
        y -= 1;
      }
    }
    state.rowsCleared += rowsCleared;
    state.tetrises += Math.floor(rowsCleared / 4);

    // provision a new piece if the last one just settled or was held.
    // if the piece can't be placed, the game is over
    if (state.pieces.length === 0) {
      const piece = placePiece(drawNextShape(), startingPosition);
      if (!piece) {
        clearInterval(gameLoop);
        state.gameOver = true;
        console.log(
          `Game over! You cleared ${state.rowsCleared} row${
            state.rowsCleared === 1 ? "" : "s"
          } and ${state.tetrises} tetris${state.tetrises === 1 ? "" : "es"}.`
        );
      }
    }

    // reset consumable state
    state.userInput = [];

    // render the next frame from game state
    cancelAnimationFrame(lastFrameID);
    lastFrameID = requestAnimationFrame(() => {
      clearCanvas();

      // render settled shapes cell by cell
      state.board.forEach((row, y) =>
        row.forEach((cell, x) => {
          if (cell.value === 1) {
            fillShape({ curve: [[1]], color: cell.color }, [x, y]);
          }
        })
      );

      // render active game pieces
      state.pieces.forEach(({ shape, position }) => fillShape(shape, position));

      // render the queue
      // (get the next N pieces, even if it means reaching into the next bag)
      state.bag
        .slice(state.drawIndex, state.drawIndex + queueSize)
        .concat(state.nextBag.slice(0, queueSize))
        .slice(0, queueSize)
        .forEach((shape) => {});

      // render pieces on hold
      state.heldPieces.forEach((piece) => {});
    });
  } catch (err) {
    clearInterval(gameLoop);
    console.error(err);
    console.log("Game state at time of crash", state);
  }
}, 16);

const mapKeyToAction = (input) => {
  switch (input) {
    case "ArrowUp":
    case "k":
    case "K":
      return actions.ROTATE;
    case "ArrowDown":
    case "j":
    case "J":
      return actions.MOVE_DOWN;
    case "ArrowLeft":
    case "h":
    case "H":
      return actions.MOVE_LEFT;
    case "ArrowRight":
    case "l":
    case "L":
      return actions.MOVE_RIGHT;
    case " ":
    case "Enter":
      return actions.DROP;
    case "0":
    case "Shift":
      return actions.SWAP;
  }
};

window.addEventListener("keydown", (e) => {
  const input = mapKeyToAction(e.key);
  if (input) {
    state.userInput.push(input);
  }
});
