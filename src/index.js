/* eslint-disable no-case-declarations */
const path = require("path");
const termkit = require("terminal-kit");
const compose = require("crocks/helpers/compose");

const tap = require("crocks/helpers/tap");
const { statSync, existsSync } = require("fs");
const fileInput = require("./fileInput");
const createRunner = require("./runner");

const { store, actions, types } = require("./store");

const term = termkit.terminal;

const baseDir = path.resolve(process.argv[2] || process.cwd());

const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Layout
 * @param {*} opts
 */
const menu = (opts) => {
  term.bold("Usage\n");

  term.brightBlack(" 🏃 Press").white(" r ").brightBlack("to run file\n");
  term
    .brightBlack(" 📦 Press")
    .white(" s ")
    .brightBlack("Toggle npm install no save option: ")
    .white(`npm install${opts.npmInstallNoSave ? " --no-save" : ""}\n`);
  if (opts.npmInstallNoSave) {
    term
      .red(
        "    ⚠️  with --no-save you can import only one package at time not included in package.json\n"
      )
      .brightBlack("       More https://github.com/npm/cli/issues/1460\n");
  }
  term.brightBlack(" 🚪 Press").white(" CTRL + C ").brightBlack("to exit\n\n");
  return opts;
};

/**
 * Layout
 * @param {*} opts
 */
const header = (opts) => {
  term.moveTo(1, 1);
  term.bgRed("🔥 Terminal playground 🔥\n\n");
  return opts;
};

/**
 *
 * @param {*} baseDirPath
 * @param {*} currentFilePath
 * @param {*} isFile
 */
const currentFile = (baseDirPath, currentFilePath, isFile) => (
  opts = { running: false, path: undefined }
) => {
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

/**
 *
 * @param {{
 *  baseDir: import("fs").PathLike
 * }} options
 */
const main = async (options) => {
  term.clear();
  const runner = await createRunner();

  const chooseFile = () => {
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
          actions.runningFile(input);
        } else {
          term("\n\n");
          term.red
            .bold("File or directory does not exist:\n")
            .bold(`💔 ${input}\n`);
          await sleep(1000);
          actions.choseFileOperation();
        }
      }
    );
  };

  const loop = (state) => {
    term.clear();
    switch (true) {
      case state.current === types.RUNNING:
        const isFile = statSync(state.running.file).isFile();
        const runningScreen = compose(
          currentFile(options.baseDir, state.running.file, isFile),
          menu,
          header,
          tap(term.clear)
        );
        runningScreen(state);
        runner(runningScreen, state.running.file);
        return;

      case state.current === types.CHOOSE_FILE:
        compose(chooseFile, header, term.clear)();
        return;

      default:
        compose(menu, header, term.clear)();
    }
  };

  term.on("key", (key /*  matches, data */) => {
    // Running file in watch mode
    const notChoosingFile = store.getState().current !== types.CHOOSE_FILE;
    if (["r", "R"].includes(key) && notChoosingFile) {
      actions.choseFileOperation();
      // guard({})
    }

    if (["s", "S"].includes(key) && notChoosingFile) {
      actions.toggleNpmInstallSaveOpt();
    }

    // Detect CTRL-C and exit 'manually'
    if (key === "CTRL_C") {
      term.green("\n😅 Bye bye\n");
      process.exit();
    }
  });

  // term.grabInput(true);
  store.watch(loop);
};

main({ baseDir });
