# 源码解析二十一 事件绑定

`React`中的事件绑定基于事件代理，将所有声明的事件都挂载在根节点，避免了在各个`DOM`上频繁绑定卸载事件，减少了内存开销，那么，它是如何将事件绑定在根节点上的呢？

前面提到过，在注入`eventPlugin`时，全局的3个存储对象就有了值

在遍历`DOM`的`props`时，根据`registrationNameModules`判断，如果当前 prop 是个事件，则会调用`ensureListeningTo`进行绑定

```javaScript
 if (registrationNameModules.hasOwnProperty(propKey)) {
          if (nextProp != null) {
            ensureListeningTo(rootContainerElement, propKey)
          }
          ...
  }        
```

### `listenTo`

️而在`ensureListeningTo`中，调用了`listenTo`函数，在这个函数中，为了确保每个事件只绑定一次，会在全局中配置一个`alreadyListeningTo`对象用来做缓存，记录那些已经绑定过的事件

在`listenTo`中，根据缓存值先做校验，确保每个事件只绑定一次。随后，通过`registrationNameDependencies`拿到相应的原生事件名用于绑定。对于不同的事件，调用`trapCapTureEvent`和`trapBubbledEvent`，从名字就可以看出，这两个函数一个用于事件捕获，一个用于事件冒泡

```javaScript

function getListeningForDocument(mountAt: Document | Element): any {
  if (!Object.prototype.hasOwnProperty.call(mountAt, topListenersIDKey)) {
    mountAt[topListenersIDKey] = reactTopListenersCounter++
    alreadyListeningTo[mountAt[topListenersIDKey]] = {}
  }

  return alreadyListeningTo[mountAt[topListenersIDKey]]
}

function listenTo(registrationName: string, mountAt: Document | Element) {
  const isListening: any = getListeningForDocument(mountAt)

  const dependencies: TopLevelType[] = registrationNameDependencies[registrationName]

  dependencies.forEach((dependency: TopLevelType) => {
    // 确保只有一次
    if (!isListening[dependency]) {
      switch (dependency) {
        case TOP_SCROLL:
          trapCaptureEvent(TOP_SCROLL, mountAt)
          break
        case TOP_FOCUS:
        case TOP_BLUR:
          trapCaptureEvent(TOP_FOCUS, mountAt)
          trapCaptureEvent(TOP_BLUR, mountAt)

          isListening[TOP_FOCUS] = true
          isListening[TOP_BLUR] = true
          break
        case TOP_CANCEL:
        case TOP_CLOSE:
          if (isEventSupported(dependency)) {
            trapCaptureEvent(dependency, mountAt)
          }
          break
        case TOP_INVALID:
        case TOP_SUBMIT:
        case TOP_RESET:
          break
        default:
          const isMediaEvent = mediaEventTypes.indexOf(dependency) !== -1
          if (!isMediaEvent) {
            trapBubbledEvent(dependency, mountAt)
          }
          break
      }
    }

    // 打上标记
    isListening[dependency] = true
  })
}
```

### `trapCaptureEvent`和`trapBubbledEvent`
这两个函数基本一样，拿到`topLevelType`的类型（也就是原生事件名）。根据事件的优先级，绑定不同的`dispatch`，最后通过`addEventListener`绑定到根节点上。所有的事件都通过根节点来触发。也就是所谓的事件代理

```javaScript
function trapCaptureEvent(topLevelType: TopLevelType, element: Document | Element) {
  if (!element) {
    return null
  }

  const dispatch = isInteractiveTopLevelEventType(topLevelType) ? dispatchInteractiveEvent : dispatchEvent
  addEventCaptureListener(element, topLevelType, dispatch.bind(null, topLevelType))
}

function addEventCaptureListener(element: Document | Element, eventType: string, listener: any) {
  element.addEventListener(eventType, listener, true)
}
```



