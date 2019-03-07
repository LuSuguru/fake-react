const path = require('path')
const express = require('express')
const webpack = require('webpack')
const bodyParser = require('body-parser')
// const proxyMiddleware = require('http-proxy-middleware')

const webpackConfig = require('../config/webpack.dev.conf')
const apiMocker = require('../config/apiMocker')

webpackConfig.mode = 'none'

const app = express()
const compiler = webpack(webpackConfig)

// 端口
const port = 9999

const devMiddleware = require('webpack-dev-middleware')(compiler, {
  publicPath: webpackConfig.output.publicPath,
  quiet: true
})

const hotMiddleware = require('webpack-hot-middleware')(compiler, { log: () => { } })

// 设置代理
// app.use(proxyMiddleware('', {}))

// html5 router
app.use(require('connect-history-api-fallback')())

app.use(devMiddleware)
app.use(hotMiddleware)

app.use(bodyParser.json()) // 解析application/json
app.use(bodyParser.urlencoded({ extended: false })) // 解析 application/x-www-form-urlencoded

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
