import ReactComponent from './ReactComponent'
import $ from 'jquery'

// 用来表示文本节点在渲染，更新，删除时应该做的事情
export default class extends ReactComponent {
  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId
    return `<span data-reactid="${rootId}">${this._vDom}</span>`
  }

  // 更新
  updateComponent(nextVDom) {
    const nextText = '' + nextVDom

    if (nextText !== this._vDom) {
      this._vDom = nextText
    }
    // 替换整个节点
    $(`[data-reactid="${this._rootNodeId}"]`).html(this._vDom)
  }
}
