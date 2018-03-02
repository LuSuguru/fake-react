// component类，用来处理不同的虚拟dom更新，渲染
export default class Component {
  constructor(element) {
    this._vDom = element
    // 用来标识当前component
    this._rootNodeId = null
  }
}
