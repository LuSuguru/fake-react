const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
  entry: require.resolve('./src/main.js'),

  output: {
    filename: 'dist/bundle.js'
  },

  externals: {
    jquery: 'jQuery'
  },

  resolve: {
    extensions: ['.js']
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['babel-loader', 'eslint-loader'],
        include: path.resolve(__dirname, './src')
      }
    ]
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: require.resolve('./public/index.html')
    })
  ]
}
