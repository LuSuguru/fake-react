import ReactComponent from './ReactComponent'
import instantiateReactComponent from './util'
import $ from 'jquery'

// 用来表示默认节点在渲染，更新，删除时应该做的事情
export default class extends ReactComponent {
  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId

    const { props, type, props: { children = [] } } = this._vDom,
      childrenInstances = []

    // 设置tag，加上标识
    let tagOpen = `${type} data-reactId=${this._rootNodeId}`,
      tagClose = `/${type}`,
      content = ''

    // 拼凑属性
    for (let propKey in props) {
      // 事件
      if (/^on[A-Za-z]/.test(propKey)) {
        const eventType = propKey.replace('on', '')
        $(document).delegate(`[data-reactId=${this._rootNodeId}]`, `${eventType}.${this._rootNodeId}`, props[propKey])
      }

      // 普通属性，排除children与事件
      if (props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)) {
        tagOpen += ` ${propKey}=${props[propKey]}`
      }
    }

    // 获取子节点渲染出的内容
    children.forEach((item, index) => {
      // 再次使用工厂方法实例化子节点的component，拼接好返回
      const childComponentInstance = instantiateReactComponent(item)
      childComponentInstance._mountIndex = index

      childrenInstances.push(childComponentInstance)

      // 子节点的rootId是父节点的rootId加上索引拼接的值
      const curRootId = `${this._rootNodeId}.${index}`
      // 得到子节点的渲染内容
      const childMarkup = childComponentInstance.mountComponent(curRootId)
      // 拼接
      content += childMarkup

      // 保存所有子节点的component
      this._renderedChildren = childrenInstances
    })

    return `<${tagOpen}>${content}<${tagClose}>`
  }
}
