import ReactComponent from './ReactComponent'
import instantiateReactComponent from './util'
import $ from 'jquery'

export default class extends ReactComponent {
  constructor(element) {
    super(element)
    // 存放对应的组件实例
    this._instance = null
  }
  mountComponent(rootId) {
    this._rootNodeId = rootId
    const { type: Component, props } = this._vDom

    // 获取自定义组件的实例
    const inst = new Component(props)
    this._instance = inst

    // 保留对当前component的引用，下面更新时会用到
    inst._reactInternalInstance = this

    inst.componentWillMount && inst.componentWillMount()

    // 调用自定义组件的render方法，返回一个element或者文本节点
    const renderedElement = inst.render()

    // 获取renderedElement的component
    const renderedComponentInstance = instantiateReactComponent(renderedElement)
    this._renederedComponent = renderedComponentInstance

    // 得到渲染之后的内容
    const renderMarkup = renderedComponentInstance.mountComponent(this._rootNodeId)

    // 在ReactDom.render方法最后触发了mountReady事件，所在在这里监听，在渲染完成后触发
    $(document).on('mountReady', () => {
      inst.componentDidMount && inst.componentDidMount()
    })

    return renderMarkup
  }
}
