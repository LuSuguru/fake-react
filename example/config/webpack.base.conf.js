const path = require('path')
const autoprefixer = require('autoprefixer')

module.exports = {
  entry: {
    app: [
      require.resolve('./polyfill'),
      require.resolve('../src/main.js')
    ]
  },

  output: {
    // 热加载不能使用chunkhash
    filename: 'dist/bundle.js',
    chunkFilename: 'dist/[name]_[hash:8].js',
    // path: path.resolve(__dirname, 'dist')
  },

  resolve: {
    alias: {
      assets: path.resolve(__dirname, '../src/assets'),
      components: path.resolve(__dirname, '../src/components'),
      pages: path.resolve(__dirname, '../src/pages'),
      ajax: path.resolve(__dirname, '../src/ajax'),
      utils: path.resolve(__dirname, '../src/utils')
    },
    extensions: ['.js', '.jsx']
  },

  mode: 'none',

  module: {
    rules: [
      {
        oneOf: [
          {
            test: /\.(js|jsx)$/,
            use: [{
              loader: 'babel-loader',
              options: {
                // 将 babel 编译过的模块缓存在 webpack_cache 目录下，下次优先复用
                cacheDirectory: './webpack_cache/',
              },
            }],
            include: path.resolve(__dirname, '../src')
          },
          {
            test: /\.(c|le)ss$/,
            use: ['style-loader', 'css-loader',
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  ident: 'postcss',
                  plugins: () => [
                    require('postcss-flexbugs-fixes'),
                    autoprefixer({
                      browsers: [
                        '>1%',
                        'last 4 versions',
                        'Firefox ESR',
                        'not ie < 9',
                      ],
                      flexbox: 'no-2009',
                    }),
                  ],
                },
              }, 'less-loader']
          },
          {
            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
            loader: 'url-loader',
            options: {
              limit: 10000,
              name: './dist/[name].[hash:8].[ext]',
            },
          },
          {
            exclude: [/\.js$/, /\.html$/, /\.json$/, /\.less$/],
            loader: 'file-loader',
            options: {
              name: './dist/[name].[hash:8].[ext]',
            }
          }
        ]
      }
    ]
  }
}
