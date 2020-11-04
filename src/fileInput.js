/*
	Terminal Kit

	Copyright (c) 2009 - 2020 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/
const termkit = require("terminal-kit");

const { autoComplete } = termkit;
const term = termkit.terminal;
const fs = require("fs");
const path = require("path");

/*
	/!\ Document that!!! /!\
*/
function fileInput(options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (!options || typeof options !== "object") {
    options = {};
  }

  let baseDir;
  const promise = Promise.resolve();

  if (options.baseDir) {
    baseDir = path.resolve(options.baseDir);

    if (!path.isAbsolute(baseDir)) {
      fs.realpath(options.baseDir, (error, resolvedPath) => {
        if (error) {
          if (callback) {
            callback(error);
          } else {
            Promise.reject(error);
          }
          return;
        }

        options.baseDir = resolvedPath;

        term.inputField(options).then(
          (input) => {
            if (callback) {
              callback(input);
            } else {
              Promise.resolve(input);
            }
          },
          (error_) => {
            if (callback) {
              callback(error_);
            } else {
              Promise.reject(error_);
            }
          }
        );
      });

      return promise;
    }
  } else {
    baseDir = process.cwd();
  }

  if (baseDir[baseDir.length - 1] !== "/") {
    baseDir += "/";
  }

  const autoCompleter = async function autoCompleter(inputString) {
    let inputDir;
    let inputFile;
    let currentDir;
    let files;
    let completion;

    if (inputString[inputString.length - 1] === "/") {
      inputDir = inputString;
      inputFile = "";
    } else {
      inputDir = path.dirname(inputString);
      inputDir = inputDir === "." ? "" : `${inputDir}/`;
      inputFile = path.basename(inputString);
    }

    // If the input start with a '/', then forget about the baseDir
    if (path.isAbsolute(inputString)) {
      currentDir = inputDir;
    } else {
      currentDir = baseDir + inputDir;
    }

    // console.error( "### '" + inputDir +"' '"+ inputFile +"' '"+ currentDir + "'" ) ;
    try {
      files = await readdir(currentDir, options);
    } catch (error) {
      return inputString;
    }

    if (!Array.isArray(files) || !files.length) {
      return inputString;
    }

    completion = autoComplete(files, inputFile, true);

    // force inputField() to prefix that *AFTER* singleLineMenu()
    if (Array.isArray(completion)) {
      completion.prefix = inputDir;
    } else {
      completion = path.normalize(inputDir + completion);
    }

    return completion;
  };

  // Transmit options to inputField()
  options = {
    ...options,
    autoComplete: autoCompleter,
    autoCompleteMenu: true,
    minLength: 1,
  };

  term.inputField(options).promise.then(
    (input) => {
      if (!input && typeof input !== "string") {
        input = undefined;
      } else {
        input = path.resolve(path.isAbsolute(input) ? input : baseDir + input);
      }

      if (callback) {
        callback(undefined, input);
      } else {
        promise.resolve(input);
      }
    },
    (error) => {
      if (callback) {
        callback(error);
      } else {
        promise.reject(error);
      }
    }
  );

  return promise;
}

// Like fs.readdir(), but performs fs.stat() for each file in order to add a '/' to directories
function readdir(dir, options) {
  if (dir[dir.length - 1] !== "/") {
    dir += "/";
  }

  return new Promise((resolve, reject) => {
    fs.readdir(dir, { withFileTypes: true }, (error, files) => {
      if (error) {
        return reject(error);
      }

      const filteredDirs =
        files.filter((f) => f.isDirectory()).map((f) => `${f.name}/`) || [];

      const filteredFiles =
        files
          .filter(
            (f) =>
              f.isFile() &&
              (options.files ? f.name.search(options.files) !== -1 : true)
          )
          .map((f) => f.name) || [];

      return resolve(filteredDirs.concat(filteredFiles));
    });
  });
}

module.exports = fileInput;
