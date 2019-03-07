## 说明
 * 本项目基于React 16.4.1,使用请参考React官方文档
 * 暂只支持SPA项目
 * CSS预处理器为SCSS
 * node版本 > 8.11.0

## 开始
```
yarn 
yarn start // 起项目
yarn build // 打包
yarn analyzer //查看分析文件
```

## 使用
* 自带react-router，使用见官方文档
* 已封装异步加载组件,使用如下

``` javascript
// 引入异步加载高阶组件
import asyncComponent from 'components/asyncComponent' 
// 包装需要使用的组件
const Main = asyncComponent(() => import('./pages/main'))
// 加入路由
 <Route path="/" component={Main}  />
```

* 无UI组件及状态管理，自行配置

## mock数据
* `yarn start` 启动项目
* 在`mock.js`中加入需要mock的API，有格式要求

``` javascript
const proxy = {
  // key为 'GET/POST + 空格 + api名（get必须加后缀，例如.do）'
  // value 可以为function也可以为一个object，object的话直接返回，function见下示例
  'GET /repos/hello.do': (body, res) => res.json({
    text: 'this is from mock server123'
  }),

  'POST /api/login/account': (body, res) => res.json({
    status: 233,
    code: 0,
    text: "ceshsds",
    data: {
      id: 1,
      username: 'kenny',
      sex: 6
    }
  })
}
```
* `mock.js`文件支持热更新，但不支持模块更新

## 目录结构

```
project
│   
└─── config 配置文件 
│ 
└─── build 打包文件
│ 
└─── src   业务文件
      │ 
      └─── assets 图片等静态资源
      │   
      └─── components 公共组件 
      │ 
      └─── pages  页面
      │ 
      └─── styles 样式文件
      │ 
      └─── app.jsx 入口，这里为第一层路由页
```
