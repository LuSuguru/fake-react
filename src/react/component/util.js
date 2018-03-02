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
