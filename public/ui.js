import config from "./config.js";

const cellSize = config.canvasWidth / config.boardWidth;

const createCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  return { canvas, context };
};

export const createScreens = () => {
  const board = createCanvas(
    config.canvasWidth,
    config.canvasWidth * (config.boardHeight / config.boardWidth)
  );

  const queue = createCanvas(
    cellSize * 6,
    cellSize * config.queueSize * 3 + cellSize
  );

  const deck = createCanvas(cellSize * 6, cellSize * 6);

  const bgColor = config.theme.bgColor;

  return {
    board: {
      ...board,
      clearCanvas: clearCanvas(board.context, board.canvas, bgColor),
      fillShape: fillShape(board.context),
    },
    queue: {
      ...queue,
      clearCanvas: clearCanvas(queue.context, queue.canvas, bgColor),
      fillShape: fillShape(queue.context),
    },
    deck: {
      ...deck,
      clearCanvas: clearCanvas(deck.context, deck.canvas, bgColor),
      fillShape: fillShape(deck.context),
    },
  };
};

export const clearCanvas = (context, canvas, fillColor) => () => {
  context.fillStyle = fillColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
};

export const fillShape = (context) => (shape, position) => {
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
    if (!renderInProgress && typeof state !== undefined) {
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
