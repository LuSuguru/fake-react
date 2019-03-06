const path = require('path')
const buble = require('rollup-plugin-buble')


module.exports = {
  input: path.resolve(__dirname, './src/index.js'),
  output: {
    file: path.resolve(__dirname, './dist/react.js'),
    format: 'iife'
  },
  plugins: [
    buble()
  ],
}