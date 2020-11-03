/* eslint-disable no-case-declarations */
const path = require("path");
const termkit = require("terminal-kit");
const compose = require("crocks/helpers/compose");
const tap = require("crocks/helpers/tap");
const fileInput = require("./fileInput");
const createRunner = require("./runner");

const term = termkit.terminal;

const baseDir = path.resolve(process.argv[2] || process.cwd());

const CHOOSE_FILE = Symbol("CHOOSE_FILE");
const RUNNING = Symbol("RUNNING");

const main = async (options) => {
  const runner = await createRunner();
  let currentRunner;

  const state = { current: CHOOSE_FILE, running: { file: undefined } };

  const header = (opts) => {
    term.moveTo(1, 1);
    term.bgRed("🔥 Fast terminal playground 🔥\n\n");
    return opts;
  };

  const menu = (opts) => {
    term.bold("Usage\n");

    term.brightBlack(" 🏃 Press").white(" r ").brightBlack("to run file\n");
    // term.brightBlack(" 📑 Press").white(" ESC ").brightBlack("back to menu\n");
    term
      .brightBlack(" 🚪 Press")
      .white(" CTRL + C ")
      .brightBlack("to exit\n\n");
    return opts;
  };

  const currentFile = (baseDirPath, currentFilePath) => (opts) => {
    // if (opts === true) {
    //   term.spinner("dotSpinner");
    // }
    term("Running file: ").bold(
      `${currentFilePath.replace(`${baseDirPath}/`, "")}\n\n`
    );
    return opts;
  };

  const chooseFile = (callback) => () => {
    term("Choose a file: ");

    fileInput(
      {
        baseDir: options.baseDir,
        files: /\.(js|jsx|ts|tsx)$/,
        autoCompleteMenu: true,
        autoCompleteHint: true,
        minLength: 1,
      },
      (error, input) => {
        if (error) {
          term.red.bold(`\nAn error occurs: ${error}\n`);
        } else {
          state.current = RUNNING;
          state.running.file = input;
          callback();
        }
      }
    );
  };

  const loop = () => {
    if (typeof currentRunner === "function") {
      currentRunner();
    }
    switch (true) {
      case state.current === RUNNING:
        const runningScreen = compose(
          currentFile(options.baseDir, state.running.file),
          menu,
          header,
          tap(term.clear)
        );
        currentRunner = runner(runningScreen, state.running.file);
        return;

      case state.current === CHOOSE_FILE:
        return compose(chooseFile(loop), header, term.clear)();

      default:
        return compose(menu, header, term.clear)();
    }
  };

  term.on("key", (key /*  matches, data */) => {
    // Running file in watch mode
    if (state.current !== CHOOSE_FILE && (key === "r" || key === "R")) {
      state.current = CHOOSE_FILE;
      loop();
    }

    // Detect ESCAPE a
    // if (key === "ESCAPE") {
    //   state.current = MENU;
    //   loop();
    // }

    // Detect CTRL-C and exit 'manually'
    if (key === "CTRL_C") {
      term.green("\n😅 Bye bye\n");
      process.exit();
    }
  });

  // term.grabInput(true);

  // Start
  loop();
};

main({ baseDir });
