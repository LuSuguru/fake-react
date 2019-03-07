const path = require('path')
const chokidar = require('chokidar')

module.exports = function (watchFile, app) {
  if (!watchFile) {
    throw new Error('Mocker file does not exist!.')
  }

  let mocks = require(watchFile)

  if (!mocks) {
    return ''
  }

  // 释放老模块的资源
  function cleanCache(modulePath) {
    const module = require.cache[modulePath]

    if (module.parent) {
      module.parent.children.splice(module.parent.children.indexOf(module), 1)
    }

    delete require.cache[modulePath]
  }

  // 监听文件修改重新加载代码
  // 配置热更新
  chokidar.watch(path.resolve(watchFile)).on('all', () => {
    try {
      require(watchFile) // 热更新先引用，冒烟，实时编辑报错，错误语法避免 crash
      cleanCache(watchFile) // 确认没有问题进行热更新
      mocks = require(watchFile)

      console.log(` Done: Hot Mocker ${watchFile.replace(process.cwd(), '')} file replacement success!`)
    } catch (ex) {
      console.error('Failed: Hot Mocker  file replacement failed!!')
    }
  })

  app.all('/*', (req, res, next) => {
    const proxyURL = `${req.method} ${req.path}`

    let body = '' // 获取参数
    if (req.method === 'GET') {
      body = req.query
    } else if (req.method === 'POST') {
      ({ body } = req)
    }

    if (mocks[proxyURL]) {
      const result = mocks[proxyURL]
      if (typeof result === 'function') {
        result(body, res)
      } else {
        res.json(result)
      }
    } else {
      next()
    }
  })
}
