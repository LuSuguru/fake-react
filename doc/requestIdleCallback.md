# 源码解析十六 `requestIdleCallback`的`polyfill`

整个`Fiber`的异步，可中断都依赖于`expirationTime`，那么整个`render`阶段如果被中断了，异步又是如何调用呢，是否可中断又是如何判断的？

这一切都跟`requestIdleCallback`这个`API`有关，该函数接受一个回调，只在浏览器的空闲时间才会调用。这样子就可以把任务分开，按照优先级高低，高优先级的先执行，低优先级的等有空闲时间在执行，另外，如果浏览器一直处于繁忙状态，也会触发回调。此时在这个函数会给回调一个参数，告诉当前执行时是否已经超时，我们可以根据这个参数来判断是否可中断

<img src="./schedule/requestIdleCallback.png" width="358" height="155" />

### `requestIdleCallback`的问题
原生的`requestIdleCallback`有两个重要的问题，首先，它的兼容性很差，`IOS`上全军覆没

<img src="./schedule/compatible.png" width="1268" height="473" />

更致命的是，`requestIdleCallback`1秒只能调用20次，这个完全满足不了`react`的需求，综上，`react`自己试


