const path = require('path')
import typescript from 'rollup-plugin-typescript'


module.exports = {
  input: path.resolve(__dirname, './src/index.ts'),
  output: {
    file: path.resolve(__dirname, './dist/react.js'),
    format: 'es'
  },
  plugins: [
    typescript({
      lib: ['es2017', 'dom'],
      target: 'es5',
      include: 'src/**/*'
    })
  ],
}