# 事件绑定
前面提到过，在注入`eventPlugin`时，全局的3个存储对象就有了值
在遍历`DOM`的`props`时，根据`registrationNameModules`判断，若是个事件，则会调用`ensureListeningTo`进行绑定

```typescript
 if (registrationNameModules.hasOwnProperty(propKey)) {
          if (nextProp != null) {
            ensureListeningTo(rootContainerElement, propKey)
          }
          ...
  }        
```

️而在`ensureListeningTo`中，调用了`listenTo`函数，在


