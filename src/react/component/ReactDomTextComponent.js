import ReactComponent from './ReactComponent'

// 用来表示文本节点在渲染，更新，删除时应该做的事情
export default class extends ReactComponent {
  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId
    return `<span data-reactId="${rootId}">${this._vDom}</span>`
  }
}
