import ReactComponent from './ReactComponent'
import instantiateReactComponent, { shouldUpdateReactComponent } from './util'
import $ from 'jquery'

export default class extends ReactComponent {
  constructor(element) {
    super(element)
    // 存放对应的组件实例
    this._instance = null
    this._renderedComponent = null
  }

  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId
    const { type: Component, props } = this._vDom

    // 获取自定义组件的实例
    const inst = new Component(props)
    this._instance = inst

    // 保留对当前component的引用，下面更新时会用到
    inst._reactInternalInstance = this

    inst.componentWillMount && inst.componentWillMount()

    // 调用自定义组件的render方法，返回一个Vdom
    const renderedVdom = inst.render()

    // 获取renderedElement的component
    const renderedComponent = instantiateReactComponent(renderedVdom)
    this._renderedComponent = renderedComponent

    // 得到渲染之后的内容
    const renderMarkup = renderedComponent.mountComponent(this._rootNodeId)

    // 在ReactDom.render方法最后触发了mountReady事件，所在在这里监听，在渲染完成后触发
    $(document).on('mountReady', () => {
      inst.componentDidMount && inst.componentDidMount()
    })

    return renderMarkup
  }

  // 更新
  receiveComponent(nextVDom, newState) {
    // 如果有新的vDom,就使用新的
    this._vDom = nextVDom || this._vDom
    const inst = this._instance
    // 获取新的state,props
    const nextState = { ...inst.state, ...newState }
    const nextProps = this._vDom.props

    // 判断shouldComponentUpdate
    if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return

    inst.componentWillUpdate && inst.componentWillUpdate(nextProps, nextState)

    // 更改state,props
    inst.state = nextState
    inst.props = nextProps

    const prevComponent = this._renderedComponent

    // 获取render新旧的vDom
    const prevRenderVDom = prevComponent._vDom
    const nextRenderVDom = inst.render()

    // 判断是需要更新还是重新渲染
    if (shouldUpdateReactComponent(prevRenderVDom, nextRenderVDom)) {
      // 更新
      prevComponent.receiveComponent(nextRenderVDom)
      inst.componentDidUpdate && inst.componentDidUpdate()
    } else {
      // 重新渲染
      this._renderedComponent = instantiateReactComponent(nextRenderVDom)
      // 重新生成对应的元素内容
      const nextMarkUp = this._renderedComponent.mountComponent(this._rootNodeId)
      // 替换整个节点
      $(`[data-reactid="${this._rootNodeId}"]`).replaceWith(nextMarkUp)
    }
  }
}
