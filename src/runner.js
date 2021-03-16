const fs = require("fs");
const { dirname } = require("path");
const chokidar = require("chokidar");
const term = require("terminal-kit").terminal;
const execa = require("execa");
const { startService } = require("esbuild");

const { store } = require("./store");
// const ora = require("ora");

const powerConsole = `
const isNil =
  x => (x === undefined || x === null)

const when =
  (pred, f) => x => !!pred(x) ? f(x) : x

const hasInspect =
  x => !isNil(x) && typeof x.inspect === 'function'

const inspect =
  when(hasInspect, x => x.inspect())

console = ((clog) => {

  return {
    ...clog,
    log(...args) {
        const writeLog = (arg) => {
          if (typeof arg === 'string') {
            return '\x1b[1;33m' + arg + '\x1b[0m';
          } else if (typeof arg === 'number') {
            return '\x1b[1;34m' + arg + '\x1b[0m';
          } else if (typeof arg === 'boolean') {
            return '\x1b[1;36m' + arg + '\x1b[0m';
          } else if (hasInspect(arg)) {
            return '\x1b[1;35m' + inspect(arg) + '\x1b[0m';
          } else if (typeof args === 'object') {
            return JSON.stringify(arg, null, 2)
          } else {
            return args;
          }
        }
        if(!args.length) {
          clog.log(undefined);
        }
        else if(args.length > 1) {
          clog.log(args.reduce((acc, curr) => acc.concat(writeLog(curr)), []).join(' '));
        } else {
          clog.log(writeLog(args[0]))
        }
    }
  }
})(console)
`;

const installMissingDeps = async (err) =>
  new Promise((res) => {
    const m = err.match(/Cannot find module '(.+)'/);
    if (m && m.length > 1) {
      const missingModuleName = m[1].replace(/\/.*$/, "");
      term(`Do you want install `).bold(missingModuleName)("'? [Y|n]\n");
      term.yesOrNo({ yes: ["y", "ENTER"], no: ["n"] }, (error, result) => {
        if (result) {
          // const spinner = ora("Installing missing dependency...\n").start();
          term("Installing missing dependency...\n\n");
          const subprocess = execa("npm", [
            "install",
            store.getState().npmInstallNoSave && "--no-save", // https://github.com/npm/cli/issues/1460
            missingModuleName,
          ]);
          // subprocess.stdout.on("data", term);
          subprocess.stdout.on("end", () => {
            // spinner.succeed();
            term("📦 Installed, run file again!\n");
            res(true);
          });
        } else {
          term.red("Fix dependecy manually and save file again!\n");
          res(false);
        }
      });
    } else {
      res(false);
    }
  });

function createInnerRunner() {
  let subprocess;
  return {
    async run(path, screen, code) {
      if (subprocess) {
        subprocess.cancel();
      }
      let reRun = false;
      do {
        reRun = false;
        let result = "";
        let err = "";
        try {
          screen({ running: true, path });
          subprocess = execa("node", ["-e", code], {
            cwd: dirname(path),
          });
          subprocess.stdout.on("data", (str) => {
            term(str);
            result += str;
          });
          subprocess.stdout.on("end", () => {
            screen({ running: false, path });
            term(`${result}\n`);
          });
          subprocess.stderr.on("data", (str) => {
            err += str;
          });
          // eslint-disable-next-line no-await-in-loop
          await subprocess;
        } catch (error) {
          screen({ running: false, path });
          if (error.isCanceled === false) {
            term.red.bold("--Error:\n\n");
            term.red(`- ${err}\n\n`);
            // eslint-disable-next-line no-await-in-loop
            reRun = await installMissingDeps(err);
          }
        }
      } while (reRun);
    },
  };
}

const createRunner = async () => {
  const service = await startService();
  const runner = createInnerRunner();

  let watcher;

  process.on("SIGTERM", () => service.stop());

  const executeFile = (screen) => (path) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        term.red(err);
        return;
      }
      service
        .transform(data.toString(), {
          target: "node12",
          format: "cjs",
          loader: "ts",
        })
        .then((value) =>
          runner.run(path, screen, `${powerConsole}\n\n${value.code}`)
        )
        .catch((e) => {
          term.red(e.message);
        });
    });
  };

  return (screen, paths) => {
    if (watcher) {
      watcher.close();
    }

    if (fs.statSync(paths).isFile()) {
      executeFile(screen)(paths);
    }

    watcher = chokidar.watch(paths);

    try {
      // Call transform() many times without the overhead of starting a service
      watcher.on("change", executeFile(screen));
      // console.log([a.js, b.js, c.js]);
    } finally {
      // The child process can be explicitly killed when it's no longer needed
      // service.stop();
    }
    return () => {};
  };
};

module.exports = createRunner;
