# 源码解析十二 `childFiber`
在开始这节之前，首先要理清下`ReactElement`和`Fiber`的区别：
- `ReactElement`：通过`createElement()`生成的元素节点，仅包含一些节点的基本信息（props,state）
- `Fiber`：`fiber reconciler`的工作单元，既包含元素节点的基本信息，还要保存一些用于任务调度的信息，以及跟周围节点的关系信息

整个`schedule`系统围绕的核心就是`Fiber`及其他们的关系和调度，所以在拿到`ReactElment`后，都会将其转化为`Fiber`

为了更好的示意，这节的`ReactElement`，全部用`element`代替

在`beginWork`中，每种类型的节点都有自己的调和函数，这些函数做的事情也都一样，更新自身，再生成对应的子节点，并且返回其子节点


