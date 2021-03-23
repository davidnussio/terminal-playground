const isNil = (x) => x === undefined || x === null;

const when = (pred, f) => (x) => (pred(x) ? f(x) : x);

const hasInspect = (x) => !isNil(x) && typeof x.inspect === "function";

const inspect = when(hasInspect, (x) => x.inspect());

// eslint-disable-next-line no-global-assign
console = ((clog) => ({
  ...clog,
  log(...args) {
    const writeLog = (arg) => {
      if (typeof arg === "string") {
        return `\x1b[1;33m${arg}\x1b[0m`;
      }
      if (typeof arg === "number") {
        return `\x1b[1;34m${arg}\x1b[0m`;
      }
      if (typeof arg === "boolean") {
        return `\x1b[1;36m${arg}\x1b[0m`;
      }
      if (hasInspect(arg)) {
        return `\x1b[1;35m${inspect(arg)}\x1b[0m`;
      }
      if (typeof args === "object") {
        return JSON.stringify(arg, null, 2);
      }
      return args;
    };
    if (!args.length) {
      clog.log(undefined);
    } else if (args.length > 1) {
      clog.log(
        args.reduce((acc, curr) => acc.concat(writeLog(curr)), []).join(" ")
      );
    } else {
      clog.log(writeLog(args[0]));
    }
  },
}))(console);
