# 源码解析二十 事件对象`SyntheticEvent`及事件池
前面提到过，`react`自己合成了事件对象，那么它是怎么做的呢？

### `SyntheticEvent`
`SyntheticEvent`是整个`event`类的抽象基类，其余的具体`event`类都继承这个类实现。所以先看下基类的代码，通过遍历静态的`InterFace`，在构造方法中遍历静态的`Interface`，拿到`nativeEvent`里这些属性真实的值，注入到实例上：

```javaScript
class SyntheticEvent {
  static Interface = {
    type: null,
    target: null,
    currentTarget() {
      return null
    },
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp(event: any) {
      return event.timeStamp || Date.now()
    },
    defaultPrevented: null,
    isTrusted: null,
  }

    init(dispatchConfig: DispatchConfig, targetInst: Fiber, nativeEvent: Event, nativeEventTarget: EventTarget) {
    this.dispatchConfig = dispatchConfig
    this.nativeEvent = nativeEvent
    this._targetInst = targetInst

    const { Interface } = this.constructor as any
    Object.keys(Interface).forEach((propName) => {
      const normalize = Interface[propName]

      if (normalize) {
        this[propName] = normalize(nativeEvent)
      } else if (propName === 'target') {
        this.target = nativeEventTarget
      } else {
        this[propName] = nativeEvent[propName]
      }
    })

    const defaultPrevented = (nativeEvent as any).defaultPrevented != null ? (nativeEvent as any).defaultPrevented : (nativeEvent as any).returnValue === false
    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse
    }
    this.isPropagationStopped = functionThatReturnsFalse
  }
  ...
}
```

在看看具体的`event`子类实现，这里拿`focusEvent`举例，由于在`SyntheticEvent`中已经抽象出了了整个对象的属性注入工作，所以子类只要在`Interface`上加上当前类需要的属性就好

```javaScript
class SyntheticFocusEvent extends SyntheticEvent {
  static Interface = {
    ...SyntheticUiEvent.Interface,
    relatedTarget: null,
  }
}
```

### 事件池

