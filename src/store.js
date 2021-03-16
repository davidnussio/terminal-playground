const { createStore, createEvent } = require("effector");

const CHOOSE_FILE = Symbol("CHOOSE_FILE");
const RUNNING = Symbol("RUNNING");

const choseFileOperation = createEvent();
const runningFile = createEvent();
const toggleNpmInstallSaveOpt = createEvent();

const store = createStore({
  current: CHOOSE_FILE,
  running: { file: undefined },
  npmInstallNoSave: false,
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
  }))
  .on(toggleNpmInstallSaveOpt, (state) => ({
    ...state,
    npmInstallNoSave: !state.npmInstallNoSave,
  }));

module.exports = {
  store,
  actions: { choseFileOperation, runningFile, toggleNpmInstallSaveOpt },
  types: { CHOOSE_FILE, RUNNING },
};
