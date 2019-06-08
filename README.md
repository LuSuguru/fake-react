# fake-react

基于官方 React 16.8.6 的源码并使用 TypeScript 实现的 React

## 源码解析系列
- [源码解析一  `fiberRoot`和`fiber`](./doc/fiber-and-fiberRoot.md)
- [源码解析二  `expirationTime`优先级与过期时间](./doc/expirationTime.md)
- [源码解析三  创建元素](./doc/create-element.md)
- [源码解析四  `ReactDOM.render()`从入口说起](./doc/render.md)
- [源码解析五  `schedule`内的获取优先级](./doc/schdule-global-value.md)
- [源码解析六  `schedule`的整体流程]()
- [源码解析七  `schedule`调度前准备](./doc/schedule-prepare.md)
- [源码解析八  `schedule`执行调度](./doc/schedule-work.md)
- [源码解析九  `render`阶段](./doc/schedule-render.md)
- [源码解析十  `beginWork`](./doc/begin-work.md)
- [源码解析十一 `updateClassComponent`](./doc/update-class-component.md)
- [源码解析十二 `reconciler childFiber`](./doc/child-fiber.md)
- [源码解析十三 `completeUnitOfWork`](./doc/completeUnitOfWork.md)
- [源码解析十四 `completeWork`](./doc/completeWork.md)
- [源码解析十五 `commitRoot`](./doc/commitWork.md)
- [源码解析十六 `requestIdleCallback`的`polyfill`](./doc/requestIdleCallback.md)
- [源码解析十七 异步渲染](./doc/async-render.md)

## 实现部分

- [x] Fiber
- [x] DOM render
- [x] Fiber Reconciler
- [x] class component and setState
- [x] 事件机制
- [x] function component and hook
- [x] 一些常用的api，如memo,fragment等
- [x] context 未测试

## 使用

### build

``` sh
  git clone https://github.com/LuSuguru/fake-react.git

  yarn watch 
  yarn link 
````

### test
```sh
  cd example

  yarn link fake-react
  yarn start
```

### class component
``` javascript
import { React, ReactDOM } from 'fake-react'

const { PureComponent } = React

class Test extends PureComponent {
  state = {
    test: ''
  }

  onChange = (e) => {
    this.setState({ test: e.target.value })
  }

  componentDidMount() {
    console.log('componentDidMount')
  }

  render() {
    const { test } = this.state
    const { onChange } = this

    return (
      <input type="text" value={test} onChange={onChange} />
    )
  }
}

ReactDOM.render(<Test />, document.getElementById('root'))
```

### function component
``` javascript
import { React, ReactDOM } from 'fake-react'

const { memo, useCallback, useState } = React

function Component() {
  const [test, setTest] = useState('')

  const onChange = useCallback((e) => {
    setTest(e.target.value)
  }, [])

  return (
    <input type="text" value={test} onChange={onChange} />
  )
}

const Test = memo(Component)

ReactDOM.render(<Test />, document.getElementById('root'))
```

## 为什么写这个

在工作中自己平时一直使用 React 开发业务，使用的过程中经常会有困惑，然后便去看博客，查文档。照着别人的分析文写一个简易版的，貌似已经掌握它了？

渐渐地，我发现自己只懂了那套皮毛概念和很零散的原理，哦！它使用了vDOM，有diff算法，列表渲染使用key的原因，setState是异步的，有自己实现的一套事件机制等。但是它是如何实现事件机制的，setState的过程，异步的原因等，依然不知。

索性，就看它源码吧！相信有了一个系统的研究后，疑问会少很多。嗯，fork仓库，clone下来，刷。磕磕绊绊了1个半月，虽然很多地方啃起来都无比艰辛，但总算是全部啃完。

开这个项目的初衷也是为了记录自己的源码阅读过程，现在基本实现了 React 16.8的90%功能（部分未测），便于自己学习研究和掌握其原理

## 接下来要做

输出自己的看源码过程中的心得和理解，然后，继续变强

