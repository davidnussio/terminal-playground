/* eslint-disable no-case-declarations */
const path = require("path");
const termkit = require("terminal-kit");
const compose = require("crocks/helpers/compose");
const tap = require("crocks/helpers/tap");
const { statSync, existsSync } = require("fs");
const fileInput = require("./fileInput");
const createRunner = require("./runner");

const term = termkit.terminal;

const baseDir = path.resolve(process.argv[2] || process.cwd());

const CHOOSE_FILE = Symbol("CHOOSE_FILE");
const RUNNING = Symbol("RUNNING");

const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));

const main = async (options) => {
  const runner = await createRunner();
  let currentRunner;

  const state = { current: CHOOSE_FILE, running: { file: undefined } };

  const header = (opts) => {
    term.moveTo(1, 1);
    term.bgRed("🔥 Terminal playground 🔥\n\n");
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

  const currentFile = (baseDirPath, currentFilePath, isFile) => (
    opts = { running: false, path: undefined }
  ) => {
    // if (opts === true) {
    //   term.spinner("dotSpinner");
    // }
    term(isFile ? "Running file: " : "Watching directory: ").bold(
      `${currentFilePath.replace(`${baseDirPath}/`, "")}\n\n`
    );

    if (isFile === false && opts.path) {
      term("Executed '").bold(opts.path.replace(`${baseDirPath}/`, ""))(
        "' file.\n\n"
      );
    }

    return opts;
  };

  const chooseFile = (callback) => () => {
    term("Choose a file or directory: ");

    fileInput(
      {
        baseDir: options.baseDir,
        files: /\.(js|jsx|ts|tsx)$/,
        autoCompleteMenu: true,
        autoCompleteHint: true,
        minLength: 1,
      },
      async (error, input) => {
        if (error) {
          term.red.bold(`An error occurs: ${error}\n`);
        } else if (existsSync(input)) {
          state.current = RUNNING;
          state.running.file = input;
          callback();
        } else {
          term("\n\n");
          term.red
            .bold("File or directory does not exist:\n")
            .bold(`💔 ${input}\n`);
          await sleep(1000);
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
        const isFile = statSync(state.running.file).isFile();
        const runningScreen = compose(
          currentFile(options.baseDir, state.running.file, isFile),
          menu,
          header,
          tap(term.clear)
        );
        runningScreen();
        currentRunner = runner(runningScreen, state.running.file);
        return;

      case state.current === CHOOSE_FILE:
        compose(chooseFile(loop), header, term.clear)();
        return;

      default:
        compose(menu, header, term.clear)();
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
