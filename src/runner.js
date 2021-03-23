const fs = require("fs");
const path = require("path");
const { dirname } = require("path");
const chokidar = require("chokidar");
const term = require("terminal-kit").terminal;
const execa = require("execa");
const { startService } = require("esbuild");

const { store } = require("./store");
// const ora = require("ora");

const powerConsole = fs.readFileSync(path.join(__dirname, "log.js"));

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
          subprocess = execa(
            "node",
            [
              // "--experimental-modules", "--input-type=module",
              "-e",
              code,
            ],
            {
              cwd: dirname(path),
            }
          );
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
        .then((value) => {
          console.log(value.code);
          runner.run(path, screen, `${powerConsole}\n\n${value.code}`);
        })
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
    } finally {
      // The child process can be explicitly killed when it's no longer needed
      service.stop();
    }
    return () => {};
  };
};

module.exports = createRunner;
