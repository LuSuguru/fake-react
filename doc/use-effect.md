# 源码解析二十六 `useEffect`与`useLayoutEffect`

`useEffect`与`useLayoutEffect`都用于我们在`FunctionComponent`中处理副作用，当我们依赖项发生变化时，注册的函数就会触发，那么，它是如何实现的呢，``