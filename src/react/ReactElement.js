/**
 * VDom就是虚拟DOM
 * @param type :代表当前的节点属性
 * @param key :用来标识element,用于优化以后的更新
 * @param props:节点的属性
 */
function VDom(type, key, props) {
  this.type = type
  this.key = key
  this.props = props
}

export default function createElement(type, config = {}, children) {
  const props = {}

  // 获取key，用来标识element，方便以后高效的更新
  const { key = null } = config

  let propName = ''

  // 复制config里的内容到props
  for (propName in config) {
    if (config.hasOwnProperty(propName) && propName !== 'key') {
      props[propName] = config[propName]
    }
  }

  // 将children全部放到props的children属性上
  // 支持两种写法，如果只有一个参数，直接复制，否则做合并处理
  const childrenLength = arguments.length - 2

  if (childrenLength === 1) {
    props.children = Array.isArray(children) ? children : [children]
  } else if (childrenLength > 1) {
    const childArray = new Array(childrenLength)
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2]
    }
    props.children = childArray
  }

  return new VDom(type, key, props)
}
