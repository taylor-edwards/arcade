export const range = (min, max) => {
  const arr = [];
  const delta = min > max ? -1 : 1;
  let i = min;
  while (i !== max) {
    arr.push(i);
    i += delta;
  }
  return arr;
};

export const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);

export const shuffle = (list) => {
  const newList = [];
  while (list.length > 0) {
    const i = rand(0, list.length);
    newList.push(list[i]);
    list = list.slice(0, i).concat(list.slice(i + 1));
  }
  return newList;
};
