//component类，用来表示文本在渲染，更新，删除时应该做的事情
function ReactDomTextComponent(text) {
  //存下当前的字符创
  this._currentElement = text
  //用来标识当前component
  this._rootNodeId = null
}

//component渲染时生成的DOM结构
ReactDomTextComponent.prototype.mountComponent = function (rootID) {
  this._rootNodeId = rootID
  return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>'
}

//component类，用来表示默认节点
function ReactDomComponent(element) {
  //存下当前的element对象引用
  this._currentElement = element
  this._rootNodeId = null
}

ReactDomComponent.prototype.mountComponent = function (rootID) {
  //赋值标志
  this._rootNodeId = rootID
  var props = this._currentElement.props

  var tagOpen = '<' + this._currentElement.type
  var tagClose = '</' + this._currentElement.type + '>'

  //加上标识
  tagOpen += ' data-reactid=' + this._rootNodeId

  //拼凑出属性
  for (var propKey in props) {

    //事件单独提取出来，增加事件监听
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '')
      $(document).delegate('[data-reactid="' + this._rootNodeId + '"]', eventType + '.' + this._rootNodeId, props[propKey])
    }

    //除了事件和children属性，其余属性进行字符串拼接
    if (props[propKey] && propKey !== 'children' && !/^on[A-Za-z]/.test(propKey)) {
      tagOpen += ' ' + propKey + '=' + props[propKey]
    }
  }

  //获取子节点渲染出的内容
  var content = ''
  var children = props.children || []

  var childrenInstances = [] //用于保存所有的子节点的component实例，以后会用到
  var that = this
  $.each(children, function (key, child) {
    //这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
    var childComponentInstance = instantiateReactComponent(child)
    childrenInstances._mountIndex = key

    childrenInstances.push(childComponentInstance)
    //子节点的rootId是父节点的rootId加上新的Key也就是顺序拼接的值
    var curRootId = that._rootNodeId + '.' + key
    //得到子节点的渲染内容
    var childMarkup = childComponentInstance.mountComponent(curRootId)
    //拼接
    content = content + childMarkup
  })

  this._renderedChildren = childrenInstances

  //拼接出整个html内容
  return tagOpen + '>' + content + tagClose
}

function ReactCompositeComponent(element) {
  //存放元素element对象
  this._currentElement = element
  //存放唯一标识
  this._rootNodeId = null
  //存放对应的reactClass实例
  this._instance = null
}

ReactCompositeComponent.prototype.mountComponent = function (rootId) {
  this._rootNodeId = rootId
  //拿到当前元素对应的属性值
  var publicProps = this._currentElement.props
  //拿到对应的reactClass
  var ReactClass = this._currentElement.type
  //获取reactClass实例
  var inst = new ReactClass(publicProps)
  this._instance = inst
  //保留对当前comonent的引用，下面更新时会用到
  inst._reactInternalInstance = this

  if (inst.componentWillMount) {
    inst.componentWillMount()
  }

  //调用ReactClass的实例的render方法，返回一个element或者一个文本节点
  var renderedElement = this._instance.render()

  //得到renderedElement对应的component类实例
  var renderedComponentInstance = instantiateReactComponent(renderedElement)
  this._renderedComponent = renderedComponentInstance

  //拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
  var renderMarkup = renderedComponentInstance.mountComponent(this._rootNodeId)

  //在React.render方法最后触发了mountReady事件，所以在这里监听，在渲染完成后触发
  $(document).on('mountReady', function () {
    inst.componentDidMount && inst.componentDidMount()
  })

  return renderMarkup
}

//component工厂，用来返回一个component实例
function instantiateReactComponent(node) {
  //文本节点的情况
  if (typeof node === 'string' || typeof node === 'number') {
    return new ReactDomTextComponent(node)
  }

  //浏览器默认节点的情况
  if (typeof node === 'object' && typeof node.type === 'string') {
    return new ReactDomComponent(node)
  }

  //自定义的元素节点
  if (typeof node === 'object' && typeof node.type === 'function') {
    return new ReactCompositeComponent(node)
  }
}

/**
 * ReactElement就是虚拟DOM的概念
 * @param type :代表当前的节点属性
 * @param key :用来标识element,用于优化以后的更新
 * @param props:节点的属性
 */
function ReactElement(type, key, props) {
  this.type = type
  this.key = key
  this.props = props
}

//定义ReactClass类，所有自定义组件的父类
var ReactClass = function () { }
//留给子类继承去继承覆盖
ReactClass.prototype.render = function () { }


React = {
  nextReactRootIndex: 0,

  createClass: function (spec) {
    //生成一个子类
    var Constructor = function (props) {
      this.props = props
      this.state = this.getInitialState ? this.getInitialState() : null
    }

    //原型继承，继承父类
    Constructor.prototype = new ReactClass()
    Constructor.prototype.constructor = Constructor
    //混入spec到原型
    $.extend(Constructor.prototype, spec)
    return Constructor
  },

  createElement: function (type, config, children) {
    var props = {}, propName
    config = config || {}

    //看看有没有key,用来标识element的类型，方便以后高效的更新
    var key = config.key || null

    //复制config里的内容到props
    for (propName in config) {
      if (config.hasOwnProperty(propName) && propName !== 'key') {
        props[propName] = config[propName]
      }
    }

    //处理children，全部挂载到props的children属性上
    //支持两种写法，如果只有一个参数，直接赋值给children,否则做合并处理
    var childrenLength = arguments.length - 2
    if (childrenLength === 1) {
      props.children = $.isArray(children) ? children : [children]
    } else if (childrenLength > 1) {
      var childArray = Array(childrenLength)
      for (var i = 0; i < childrenLength; i++) {
        childArray[i] = arguments[i + 2]
      }
      props.children = childArray
    }
    return new ReactElement(type, key, props)
  },

  render: function (element, container) {
    var componentInstance = instantiateReactComponent(element)
    var markup = componentInstance.mountComponent(React.nextReactRootIndex++)
    $(container).html(markup)
    $(document).trigger('mountReady')
  }
}

