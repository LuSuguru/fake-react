const path = require('path')
const typescript = require('rollup-plugin-typescript')

module.exports = {
  input: path.resolve(__dirname, './src/index.ts'),
  output: {
    file: path.resolve(__dirname, './dist/react.js'),
    format: 'es'
  },
  watch: {
    include: 'src/**'
  },
  plugins: [
    typescript({
      lib: ['es2017', 'dom'],
      target: 'es5',
      include: 'src/**/*'
    })
  ]
}