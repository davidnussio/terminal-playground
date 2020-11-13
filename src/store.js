const { createStore, createEvent } = require("effector");

const CHOOSE_FILE = Symbol("CHOOSE_FILE");
const RUNNING = Symbol("RUNNING");

const choseFileOperation = createEvent();
const runningFile = createEvent();

const store = createStore({
  current: CHOOSE_FILE,
  running: { file: undefined },
});

store
  // Add reducer
  .on(choseFileOperation, (state) => ({
    ...state,
    current: CHOOSE_FILE,
  }))
  .on(runningFile, (state, file) => ({
    ...state,
    current: RUNNING,
    running: { file },
  }));

store.watch((state) => {
  console.log("state ... → ", state);
});

module.exports = {
  store,
  actions: { choseFileOperation, runningFile },
  types: { CHOOSE_FILE, RUNNING },
};
