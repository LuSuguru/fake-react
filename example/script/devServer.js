const path = require('path')
const express = require('express')
const webpack = require('webpack')

const webpackConfig = require('../config/webpack.dev.conf')
const apiMocker = require('../config/apiMocker')

webpackConfig.mode = 'none'

const app = express()
const compiler = webpack(webpackConfig)

// 端口
const port = 1111

const devMiddleware = require('webpack-dev-middleware')(compiler, {
  publicPath: webpackConfig.output.publicPath,
  quiet: true
})

const hotMiddleware = require('webpack-hot-middleware')(compiler, { log: () => { } })

// html5 router
app.use(require('connect-history-api-fallback')())

app.use(devMiddleware)
app.use(hotMiddleware)

apiMocker(path.join(__dirname, '../mock.js'), app)

const uri = `http://localhost:${port}`

devMiddleware.waitUntilValid(function () {
  console.log(`> Listening at ${uri} \n`)
})

module.exports = app.listen(port, function (err) {
  if (err) {
    console.log(err)
    return
  }
})
