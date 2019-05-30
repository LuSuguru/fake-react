# 源码解析三  创建元素
在`React`中，创建元素使用`jsx`，而`jsx`是`createElement()`的语法糖，这个函数非常的简单，无非就是对传入的属性做一下处理，然后返回一个`ReactElement`

``` javascript
/**
 * @param type 标签名
 * @param config jsx 元素上的属性
 * @param children 子元素
 */
function createElement(type: any, config: any = {}, ...children: any[]): ReactElement {
  const {
    key = null,
    ref = null,
    __self: self = null,
    __source = null,
    ...props
  } = config

  if (children.length === 1) {
    props.children = children[0]
  } else if (children.length > 1) {
    props.children = children
  }


  if (type && type.defaultProps) {
    const { defaultProps } = type

    Object.keys(defaultProps).forEach((name) => {
      if (props[name] === undefined) {
        props[name] = defaultProps[name]
      }
    })
  }

  return {
    $$typeof: REACT_ELEMENT_TYPE,
    key,
    props,
    ref,
    type,
  }
}
```

一般我们创建元素会使用三种类型：
1. 继承 `Component or pureComponent e.g. class HelloWorld extend Component`
2. `function e.g.`function HelloWorld { }`
3. 原生标签，`html`元素 `e.g. `div、span`

所以，`createElment()`的type 也会有三种，下面重点看下继承式的一些原理，从源码中可以看出，在`Component`上，包含了 `setState`和`forceUpdate`方法，而`PureComponent`，无非就是在`Component`的基础上加了个`isPureReactComponent` 标记位

``` javascript
class Component {
  props: any
  context: any
  refs: any
  updater: ReactUpdateQueue
  state: any
  isReactComponent: boolean
  _reactInternalFiber: Fiber = null

  constructor(props: any, context: any, updater: ReactUpdateQueue) {
    this.props = props
    this.context = context
    this.refs = {}
    this.updater = updater || ReactNoopUpdateQueue
  }

  setState(partialState: any, callback: any) {
    this.updater.enqueueSetState(this, partialState, callback, 'setState')
  }

  forceUpdate(callback: any) {
    this.updater.enqueueForceUpdate(this, callback, 'forceUpdate')
  }
}

Component.prototype.isReactComponent = true

class PureComponent extends Component {
  isPureReactComponent: boolean

  constructor(props: any, context: any, updater: ReactUpdateQueue) {
    super(props, context, updater)
  }
}

PureComponent.prototype.isPureReactComponent = true

export { Component, PureComponent }
```





