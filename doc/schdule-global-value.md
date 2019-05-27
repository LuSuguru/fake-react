# 源码解析四`schedule`内的获取优先级
无论是`ReactDOM.render()`还是setState，或者Hook，发起任务的方式都分为三步：
1. 获取优先级
2. 根据优先级，更新内容创建一个`update`，将`update`插入当前`Fiber`的任务队列中
3. 调用`scheduleWork`调度一个任务

其中的1、2都与`schedule`有关，所以，`schedule`是整个`fiber reconciler`最为核心的部分。由于整个`schedule`模块特别地复杂和庞大，为了理清思路，先从整个`schedule`中的关键全局变量开始


