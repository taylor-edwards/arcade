import config from "/static/tetris/config.js";

export const shapes = {
  s: {
    type: "s",
    color: config.theme.green,
    curve: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  i: {
    type: "i",
    color: config.theme.cyan,
    curve: [[1, 1, 1, 1]],
  },
  z: {
    type: "z",
    color: config.theme.red,
    curve: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  t: {
    type: "t",
    color: config.theme.purple,
    curve: [
      [1, 1, 1],
      [0, 1, 0],
    ],
  },
  o: {
    type: "o",
    color: config.theme.yellow,
    curve: [
      [1, 1],
      [1, 1],
    ],
  },
  l: {
    type: "l",
    color: config.theme.orange,
    curve: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
  j: {
    type: "j",
    color: config.theme.blue,
    curve: [
      [1, 1, 1],
      [0, 0, 1],
    ],
  },
};

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
export const flipShape = (shape) => {
  const curve = [];
  // swap the width and height
  const height = shape.curve[0].length;
  const width = shape.curve.length;
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      row.unshift(shape.curve[j][i]);
    }
    curve.push(row);
  }
  return {
    ...shape,
    curve,
  };
};

export const rotateShape = (shape, turns) => {
  let nextShape = shape;
  let i = 0;
  while (i++ < turns % 4) {
    nextShape = flipShape(nextShape);
  }
  return nextShape;
};

export const shapePositionIsValid = (board, shape, position) => {
  // the position anchors the top left corner of the shape
  const [xOffset, yOffset] = position;

  // invalid if offscreen
  if (xOffset < 0 || yOffset < 0) {
    return false;
  }
  const width = shape.curve[0].length;
  const height = shape.curve.length;
  if (
    xOffset + width > config.boardWidth ||
    yOffset + height > config.boardHeight
  ) {
    return false;
  }

  // invalid if the shape overlaps an existing cell on the board
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
