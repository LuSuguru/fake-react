# 源码解析十九 事件插件注入

先看看`plugin`的结构，它由两部分组成，`eventTypes`与`extractEvents`：
- `eventTypes`：`eventTypes`里是该`plugin`的作用范围对象
- `extractEvents`：创建`event`对象并返回

```javaScript
export type TopLevelType = string

export interface DispatchConfig {
  phasedRegistrationNames?: { // props名，区分冒泡和捕获，与 registrationName 互斥
    bubbled: string,
    captured: string,
  },
  dependencies: TopLevelType[], // 依赖的原生事件名，需要注册
  registrationName?: string, // props名，不区分冒泡和捕获，与 phasedRegistrationNames 互斥
  isInteractive?: boolean, // 是否高优先级反馈
}

export interface EventTypes {
  [key: string]: DispatchConfig
}

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
在`ReactDOM`中引入了`dom-client-inject`,在该文件中完成了插件的注入，可以看到，整个插件注入有两步，这两个方法的代码就不贴了，无非就是把这些插件按照特定的规则存储到`EventPluginRegistry`中，便于`PluginHub`使用：

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
export const registrationNameModules = {} // 存储有phasedRegistrationNames或者registrationName的插件的事件对应的pluginModule
export const registrationNameDependencies = {} // 存储有phasedRegistrationNames或者registrationName的插件的事件对应的dependencies
export const plugins: Array<PluginModule<AnyNativeEvent>> = [] // 按照eventPluginOrder顺序存储的pluginModule[]
```





