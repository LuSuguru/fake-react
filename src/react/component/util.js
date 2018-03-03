import ReactDomTextComponent from './ReactDomTextComponent'
import ReactDomComponent from './ReactDomComponent'
import ReactCompositeComponent from './ReactCompositeComponent'

// component工厂，用来返回一个component实例
export default function instantiateReactComponent(node) {
  // 文本节点的情况
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactDomTextComponent(node)
  }

  // 浏览器默认节点的情况
  if (typeof node === 'object' && typeof node.type === 'string') {
    return new ReactDomComponent(node)
  }

  // 自定义的元素节点
  if (typeof node === 'object' && typeof node.type === 'function') {
    return new ReactCompositeComponent(node)
  }
}

// 判断是更新还是渲染
export function shouldUpdateReactComponent(prevVDom, nextVDom) {
  if (prevVDom != null && nextVDom != null) {
    const prevType = typeof prevVDom
    const nextType = typeof nextVDom

    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number'
    } else {
      return nextType === 'object' && prevVDom.type === nextVDom.type && prevVDom.key === nextVDom.key
    }
  }
}

// 将children数组转化为map
export function arrayToMap(array) {
  array = array || []
  const childMap = {}

  array.forEach((item, index) => {
    const name = item && item._vDom && item._vDom.key ? item._vDom.key : index.toString(36)
    childMap[name] = item
  })
  return childMap
}

// 用于将childNode插入到指定位置
export function insertChildAt(parentNode, childNode, index) {
  var beforeChild = parentNode.children().get(index)
  beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode)
}

// 删除节点
export function deleteChild(child) {
  child && child.remove()
}
