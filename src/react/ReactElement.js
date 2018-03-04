/**
 * VDom就是虚拟DOM
 * @param type :代表当前的节点属性
 * @param key :用来标识element,用于优化以后的更新`
 * @param props:节点的属性
 */
function VDom(type, key, props) {
  this.type = type
  this.key = key
  this.props = props
}

export default function createElement(type, config, ...children) {
  const props = {}

  config = config || {}
  // 获取key，用来标识element，方便以后高效的更新
  const { key = null } = config

  let propName = ''

  // 复制config里的内容到props
  for (propName in config) {
    if (config.hasOwnProperty(propName) && propName !== 'key') {
      props[propName] = config[propName]
    }
  }

  // 转化children
  if (children.length === 1 && Array.isArray(children[0])) {
    props.children = children[0]
  } else {
    props.children = children
  }

  return new VDom(type, key, props)
}
