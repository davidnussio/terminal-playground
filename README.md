# terminal-playground

Zero config transpile Javascript and Typescript on the fly with super performant [esbuild tool](https://github.com/evanw/esbuild)

## How it is work

Run `npx terminal-playground` and choose a file or directory and starting save TS or JS files.

![Demo](https://raw.githubusercontent.com/davidnussio/terminal-playground/master/images/multifiles-js-ts.gif)

![Demo](https://raw.githubusercontent.com/davidnussio/terminal-playground/master/images/terminal-playground.gif)

## Getting Started

### npx

`npx terminal-playground`

### Install global

`npm install -g terminal-playground`

### devDependencies

```sh
npm install --save-dev terminal-playground
./node_modules/.bin/terminal-playground

# package.json
# ...
# "scripts": {
#   "playground": "terminal-playground"
# ...
# }
```

## Inspired

I was inspired by [hopa](https://github.com/krasimir/hopa) would be a zero conf runner for javascript and typescript.
