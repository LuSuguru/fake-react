# 源码解析十九 事件插件注入
这里的插件更相当于一套事件的配置，通过插件，我们可以确定 React 在当前环境下可以执行的事件，事件的优先级，以及不同事件如何获取合成事件对象
先看看`plugin`的结构，每个插件由两部分组成，`eventTypes`与`extractEvents`：

- `eventTypes`：`eventTypes`里是该`plugin`的作用范围对象，即该插件所能够处理的事件，它的类型为 `DispatchConfig`，主要有两个配置： registrationNames 和 dependencies
  - registrationNames：我们写在 jsx 上的事件名，一个事件可以被多个原生事件触发
  - dependencies：该事件依赖的原生事件

```ts
export interface EventTypes {
  [key: string]: DispatchConfig
}

export interface DispatchConfig {
  phasedRegistrationNames?: { // props名，区分冒泡和捕获，与 registrationName 互斥
    bubbled: string,
    captured: string,
  },
  dependencies: TopLevelType[], // 依赖的原生事件名，需要注册
  registrationName?: string, // props名，不区分冒泡和捕获，与 phasedRegistrationNames 互斥
  isInteractive?: boolean, // 是否高优先级反馈
}
```
- `extractEvents`：创建`event`对象并返回

```javaScript
export type TopLevelType = string

export interface PluginModule<NativeEvent> {
  eventTypes: EventTypes,
  extractEvents: (
    topLevelType: string,
    targetInst: Fiber,
    nativeTarget: NativeEvent,
    nativeEventTarget: EventTarget,
  ) => SyntheticEvent | SyntheticEvent[],
  tapMoveThreshold?: number,
}
```

### `plugin`注入
- 注入插件后，我们会遍历插件的 eventTypes ，将 `registrationNames` 与 `dependencies` 存储起来，这样子，我们的 `React` 就可以通过 `registrationNames` 解析 jsx 上我们写入的事件 props，并映射到原生的事件，将原生事件注册到根 DOM 节点
- 不同的事件是有优先级的，比如在一个表单上既有 onClick 又有 onChange ，onClick 会先触发，那么这是怎么实现的呢，通过插件的注入顺序，我们会按照存储顺序存储在 `plugins` 中，优先插入的插件中的事件，优先级更高
- 在`ReactDOM`中引入了`dom-client-inject`,在该文件中完成了插件的注入，可以看到，整个插件注入有两步，这两个函数的代码就不贴了，无非就是把这些插件按照特定的规则顺序存储到`EventPluginRegistry`中，便于在`PluginHub`使用：

```javaScript
// 保证插件的执行顺序
EventPluginHubInjection.injectEventPluginOrder([
  'SimpleEventPlugin',
  'EnterLeaveEventPlugin',
  'ChangeEventPlugin',
  'SelectEventPlugin',
  'BeforeInputEventPlugin',
])

// 注入插件
EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin,
  EnterLeaveEventPlugin,
  ChangeEventPlugin,
  SelectEventPlugin,
  BeforeInputEventPlugin,
})
```

注入完后，`PluginRegistry`中3个特定规则存储对象就有了值：

```javaScript
// 映射 registrationNames
export const registrationNameModules = {} // 存储 包含phasedRegistrationNames或者registrationName 的 plugin
export const registrationNameDependencies = {} // 存储 包含phasedRegistrationNames或者registrationName 的 Plugin 中 eventTypes.dependencies
export const plugins: Array<PluginModule<AnyNativeEvent>> = [] // 按照eventPluginOrder顺序存储的pluginModule[]
```





