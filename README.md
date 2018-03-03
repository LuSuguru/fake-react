### fake-react

###### react的粗略实现，包含
###### 1.渲染，更新，组件生命周期
###### 2.虚拟dom
###### 3.检查差异的diff算法

###### 文件目录介绍
1. index.js 外部引用react的入口
2. ReactElement.js 用于创建虚拟DOM
3. Component.js 所有react的组件的父类，包含最基本的构造函数和setState方法
4. ReactComponent.js</br>
   ReactCompositeComponent.js</br>
   ReactDomTextComponent.js </br>
   ReactDomTextComponent.js component类用来包裹虚拟dom，包含了渲染，更新的逻辑，按照虚拟dom类型分为三种，text类型，原生dom类型，自定义组件类型
5. util.js 渲染，更新需要的工具类