const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  return {canvas, context};
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
          cellSize,
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
    }),
  );

export const createRenderer = render => {
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
