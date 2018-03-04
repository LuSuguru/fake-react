import ReactComponent from './ReactComponent'
import instantiateReactComponent, { shouldUpdateReactComponent, arrayToMap, insertChildAt, deleteChild } from './util'
import $ from 'jquery'

// 全局的更新深度标识，用来判定触发patch的时机
let updateDepth = 0
// 全局的更新队列
let diffQueue = []
// 差异更新的几种类型
const UPDATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}

// 用来表示默认节点在渲染，更新，删除时应该做的事情
export default class extends ReactComponent {
  constructor(vDom) {
    super(vDom)
    this._renderedChildComponents = null
  }

  // 渲染
  mountComponent(rootId) {
    this._rootNodeId = rootId

    const { props, type, props: { children = [] } } = this._vDom,
      childComponents = []

    // 设置tag，加上标识
    let tagOpen = `${type} data-reactid=${this._rootNodeId}`,
      tagClose = `/${type}`,
      content = ''

    // 拼凑属性
    for (let propKey in props) {
      // 事件
      if (/^on[A-Za-z]/.test(propKey)) {
        const eventType = propKey.replace('on', '')
        $(document).delegate(`[data-reactid="${this._rootNodeId}"]`, `${eventType}.${this._rootNodeId}`, props[propKey])
      }

      // 普通属性，排除children与事件
      if (props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)) {
        tagOpen += ` ${propKey}=${props[propKey]}`
      }
    }

    // 获取子节点渲染出的内容
    children.forEach((item, index) => {
      // 再次使用工厂方法实例化子节点的component，拼接好返回
      const childComponent = instantiateReactComponent(item)
      childComponent._mountIndex = index

      childComponents.push(childComponent)

      // 子节点的rootId是父节点的rootId加上索引拼接的值
      const curRootId = `${this._rootNodeId}.${index}`
      // 得到子节点的渲染内容
      const childMarkup = childComponent.mountComponent(curRootId)
      // 拼接
      content += childMarkup

      // 保存所有子节点的component
      this._renderedChildComponents = childComponents
    })

    return `<${tagOpen}>${content}<${tagClose}>`
  }

  // 更新
  updateComponent(nextVDom) {
    const lastProps = this._vDom.props
    const nextProps = nextVDom.props

    this._vDom = nextVDom

    // 更新属性
    this._updateDOMProperties(lastProps, nextProps)
    // 再更新子节点
    this._updateDOMChildren(nextVDom.props.children)
  }

  _updateDOMProperties(lastProps, nextProps) {
    let propKey = ''

    // 遍历，删除已不在新属性集合里的老属性
    for (propKey in lastProps) {
      // 属性在原型上或者新属性里有，直接跳过
      if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
        continue
      }

      // 对于事件等特殊属性，需要单独处理
      if (/^on[A-Za-z]/.test(propKey)) {
        const eventType = propKey.replace('on', '')
        // 针对当前的节点取消事件代理
        $(document).undelegate(`[data-reactid="${this._rootNodeId}"]`, eventType, lastProps[propKey])
        continue
      }
    }

    // 对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
      // 更新事件属性
      if (/^on[A-Za-z]/.test(propKey)) {
        var eventType = propKey.replace('on', '')

        // 以前如果已经有，需要先去掉
        lastProps[propKey] && $(document).undelegate(`[data-reactid="${this._rootNodeId}"]`, eventType, lastProps[propKey])

        // 针对当前的节点添加事件代理
        $(document).delegate(`[data-reactid="${this._rootNodeId}"]`, `${eventType}.${this._rootNodeId}`, nextProps[propKey])
        continue
      }

      if (propKey === 'children') continue

      // 更新普通属性
      $(`[data-reactid="${this._rootNodeId}"]`).prop(propKey, nextProps[propKey])
    }
  }

  _updateDOMChildren(nextChildVDoms) {
    updateDepth++

    // diff用来递归查找差异，组装差异对象，并添加到diffQueue中
    this._diff(diffQueue, nextChildVDoms)
    updateDepth--

    if (updateDepth === 0) {
      // 具体的dom渲染
      this._patch(diffQueue)
      diffQueue = []
    }
  }

  // 追踪差异
  _diff(diffQueue, nextChildVDoms) {
    // 将之前子节点的component数组转化为map
    const prevChildComponents = arrayToMap(this._renderedChildComponents)
    // 生成新的子节点的component对象集合
    const nextChildComponents = generateComponentsMap(prevChildComponents, nextChildVDoms)

    // 重新复制_renderChildComponents
    this._renderedChildComponents = []
    for (let name in nextChildComponents) {
      nextChildComponents.hasOwnProperty(name) && this._renderedChildComponents.push(nextChildComponents[name])
    }

    let lastIndex = 0 // 代表访问的最后一次老的集合位置
    let nextIndex = 0 // 代表到达的新的节点的index

    // 通过对比两个集合的差异，将差异节点添加到队列中
    for (let name in nextChildComponents) {
      if (!nextChildComponents.hasOwnProperty(name)) continue

      const prevChildComponent = prevChildComponents && prevChildComponents[name]
      const nextChildComponent = nextChildComponents[name]

      // 相同的话，说明是使用的同一个component，需要移动
      if (prevChildComponent === nextChildComponent) {
        // 添加差异对象，类型：MOVE_EXISTING
        prevChildComponent._mountIndex < lastIndex && diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.MOVE_EXISTING,
          fromIndex: prevChildComponent._mountIndex,
          toIndex: nextIndex
        })

        lastIndex = Math.max(prevChildComponent._mountIndex, lastIndex)
      } else {
        // 如果不相同，说明是新增的节点
        // 如果老的component在，需要把老的component删除
        if (prevChildComponent) {
          diffQueue.push({
            parentId: this._rootNodeId,
            parentNode: $(`[data-reactid="${this._rootNodeId}"]`),
            type: UPDATE_TYPES.REMOVE_NODE,
            fromIndex: prevChildComponent._mountIndex,
            toIndex: null
          })

          // 去掉事件监听
          if (prevChildComponent._rootNodeId) {
            $(document).undelegate(`.${prevChildComponent._rootNodeId}`)
          }

          lastIndex = Math.max(prevChildComponent._mountIndex, lastIndex)
        }

        // 新增加的节点
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.INSERT_MARKUP,
          fromIndex: null,
          toIndex: nextIndex,
          markup: nextChildComponent.mountComponent(`${this._rootNodeId}.${name}`)
        })
      }

      // 更新_mountIndex
      nextChildComponent._mountIndex = nextIndex
      nextIndex++
    }

    // 对于老的节点里有，新的节点里没有的，全部删除
    for (let name in prevChildComponents) {
      const prevChildComponent = prevChildComponents[name]

      if (prevChildComponents.hasOwnProperty(name) && !(nextChildComponents && nextChildComponents.hasOwnProperty(name))) {
        diffQueue.push({
          parentId: this._rootNodeId,
          parentNode: $(`[data-reactid="${this._rootNodeId}"]`),
          type: UPDATE_TYPES.REMOVE_NODE,
          fromIndex: prevChildComponent._mountIndex,
          toIndex: null
        })

        // 如果渲染过，去掉事件监听
        if (prevChildComponent._rootNodeId) {
          $(document).undelegate(`.${prevChildComponent._rootNodeId}`)
        }
      }
    }
  }

  // 渲染
  _patch(updates) {
    // 处理移动和删除的
    updates.forEach(({ type, fromIndex, toIndex, parentNode, parentId, markup }) => {
      const updatedChild = $(parentNode.children().get(fromIndex))

      switch (type) {
        case UPDATE_TYPES.INSERT_MARKUP:
          insertChildAt(parentNode, $(markup), toIndex) // 插入
          break
        case UPDATE_TYPES.MOVE_EXISTING:
          deleteChild(updatedChild) // 删除
          insertChildAt(parentNode, updatedChild, toIndex)
          break
        case UPDATE_TYPES.REMOVE_NODE:
          deleteChild(updatedChild)
          break
        default:
          break
      }
    })
  }
}

/**
 * 用来生成子节点的component
 * 如果是更新，就会继续使用以前的component，调用对应的updateComponent
 * 如果是新的节点，就会重新生成一个新的componentInstance
 */
function generateComponentsMap(prevChildComponents, nextChildVDoms = []) {
  const nextChildComponents = {}

  nextChildVDoms.forEach((item, index) => {
    const name = item.key ? item.key : index.toString(36)
    const prevChildComponent = prevChildComponents && prevChildComponents[name]

    const prevVdom = prevChildComponent && prevChildComponent._vDom
    const nextVdom = item

    // 判断是更新还是重新渲染
    if (shouldUpdateReactComponent(prevVdom, nextVdom)) {
      // 更新的话直接递归调用子节点的updateComponent
      prevChildComponent.updateComponent(nextVdom)
      nextChildComponents[name] = prevChildComponent
    } else {
      // 重新渲染的话重新生成component
      const nextChildComponent = instantiateReactComponent(nextVdom)
      nextChildComponents[name] = nextChildComponent
    }
  })
  return nextChildComponents
}
