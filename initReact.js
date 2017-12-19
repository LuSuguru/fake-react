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

ReactDomTextComponent.prototype.receiveComponent = function (nextText) {
  var nextStringText = '' + nextText
  //跟以前保存的字符串比较
  if (nextStringText !== this._currentElement) {
    this._currentElement = nextStringText
    //替换整个节点
    $('[data-reactid="' + this._rootNodeId + '"]').html(this._currentElement)
  }
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
    childComponentInstance._mountIndex = key

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

ReactDomComponent.prototype.receiveComponent = function (nextElement) {
  var lastProps = this._currentElement.props
  var nextProps = nextElement.props

  this._currentElement = nextElement
  //更新属性
  this._updateDOMproperties(lastProps, nextProps)
  //再更新子节点
  this._updateDOMChildren(nextElement.props.children)
}

ReactDomComponent.prototype._updateDOMproperties = function (lastProps, nextProps) {
  var propKey

  //遍历，当一个老的属性不在新的属性集合里时，需要删除
  for (propKey in lastProps) {
    //新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的，需要删除
    if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
      continue
    }
    //对于事件等特殊属性，需要单独处理
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '')
      //针对当前的节点取消事件代理
      $(document).undelegate('[data-reactid="' + this._rootNodeId + '"]', eventType, lastProps[propKey])
      continue
    }

    //从dom上删除不需要的属性
    $('[data-reactid="' + this._rootNodeId + '"]').removeAttr(propKey)
  }

  //对于新的属性，需要写到dom节点上
  for (propKey in nextProps) {
    //对于事件监听的属性我们需要特殊处理
    if (/^on[A-Za-z]/.test(propKey)) {
      var eventType = propKey.replace('on', '')

      //以前如果已经有，需要先去掉
      lastProps[propKey] && $(document).undelegate('[data-reactid="' + this._rootNodeId + '"]', eventType, lastProps[propKey])

      //针对当前的节点添加事件代理
      $(document).delegate('[data-reactid="' + this._rootNodeId + '"]', eventType + '.' + this._rootNodeId, nextProps[propKey])
      continue
    }

    if (propKey = 'children') continue

    //添加新的属性，或者是更新老的同名属性
    $('[data-reactid="' + this._rootNodeId + '"]').prop(propKey, nextProps[propKey])
  }
}

//全局的更新深度标识
var updateDepth = 0
//全局的更新队列，所有的差异都存在这里
var diffQueue = []

ReactDomComponent.prototype._updateDOMChildren = function (nextChildrenElements) {
  updateDepth++

  //_diff用来递归找出差异，组装差异对象，添加到更新队列diffQueue
  this._diff(diffQueue, nextChildrenElements)
  updateDepth--

  if (updateDepth === 0) {
    //调用patch,执行具体的dom操作
    this._patch(diffQueue)
    diffQueue = []
  }
}

//差异更新的几种类型
var UPATE_TYPES = {
  MOVE_EXISTING: 1,
  REMOVE_NODE: 2,
  INSERT_MARKUP: 3
}

/**
 * 普通的children是一个数组，将其转为map，
 * key就是element的key，如果是text节点或者element创建时并没有传入
 * Key, 就直接用在数组里的index标识
 */
function flattenChildren(componentChildren) {
  var child
  var name
  var childrenMap = {}

  for (var i = 0; i < componentChildren.length; i++) {
    child = componentChildren[i]
    name = child && child._currentElement && child._currentElement.key ? chid._currentElement.key : i.toString(36)
    childrenMap[name] = child
  }
  return childrenMap
}

/**
 * 用来生成子节点element的component集合
 * 如果是更新，就会继续使用以前的componentInstance，调用对应的receiveComponent
 * 如果是新的节点，就会重新生成一个新的componentInstance
 */
function generateComponentChildren(prevChildren, nextChildrenElements) {
  var nextChildren = {}
  nextChildrenElements = nextChildrenElements || []

  $.each(nextChildrenElements, function (index, element) {
    var name = element.key ? element.key : index
    var prevChild = prevChildren && prevChildren[name]
    var prevElement = prevChild && prevChild._currentElement
    var nextElement = element

    //调用_shouldUpdateReactComponent判断是否是更新
    if (_shouldUpdateReactComponent(prevElement, nextElement)) {
      //更新的话直接递归调用子节点的receiveComponent
      prevChild.receiveComponent(nextElement)
      nextChildren[name] = prevChild
    } else {
      //对于没有老的，那就重新新增一个，重新生成一个component
      var nextChildInstance = instantiateReactComponent(nextElement, null)
      //使用新的component
      nextChildren[name] = nextChildInstance
    }
  })
  return nextChildren
}

ReactDomComponent.prototype._diff = function (diffQueue, nextChildrenElements) {
  var self = this

  //拿到之前的子节点的component类型对象的集合，_renderedChildren本来是数组，转化成map
  var prevChildren = flattenChildren(self._renderedChildren)
  //生成新的子节点的component对象集合，这里注意，会复用老的component对象
  var nextChildren = generateComponentChildren(prevChildren, nextChildrenElements)

  //重新赋值_renderedChildren,使用最新的
  self._renderedChildren = []
  $.each(nextChildren, function (key, instance) {
    self._renderedChildren.push(instance)
  })

  var lastIndex = 0 //代表访问的最后一次的老的集合的位置
  var nextIndex = 0 //代表到达的新的节点的index

  //通过对比两个集合的差异，组装差异节点添加到队列中
  for (name in nextChildren) {
    if (!nextChildren.hasOwnProperty(name)) {
      continue
    }

    var prevChild = prevChildren && prevChildren[name]
    var nextChild = nextChildren[name]

    //相同的话，说明是使用的同一个component，所以需要做移动的操作
    if (prevChild === nextChild) {
      //添加差异对象，类型：MOVE_EXISTING
      prevChild._mountIndex < lastIndex && diffQueue.push({
        parentId: self._rootNodeId,
        parentNode: $('[data-reactid=' + self._rootNodeId + ']'),
        type: UPATE_TYPES.MOVE_EXISTING,
        fromIndex: prevChild._mountIndex,
        toIndex: nextIndex
      })
      lastIndex = Math.max(prevChild._mountIndex, lastIndex)
    } else { //如果不相同，说明是新增加的节点
      //如果老的还在，就是element不同，但是component一样。我们需要把它对应的老的element删除
      if (prevChild) {
        diffQueue.push({
          parentId: self._rootNodeId,
          parentNode: $('[data-reactid=' + self._rootNodeId + ']'),
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })

        //如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
        if (prevChild._rootNodeId) {
          $(document).undelegate('.' + prevChild._rootNodeId)
        }
        lastIndex = Math.max(prevChild._mountIndex, lastIndex)
      }

      //新增加的节点，也组装差异对象放到队列里
      //添加差异对象，类型：INSERT_MARKUP
      diffQueue.push({
        parentId: self._rootNodeId,
        parentNode: $('[data-reactid=' + self._rootNodeId + ']'),
        type: UPATE_TYPES.INSERT_MARKUP,
        fromIndex: null,
        toIndex: nextIndex,
        markup: nextChild.mountComponent(self._rootNodeId + '.' + name)
      })
    }
    //更新mount的index
    nextChild._mountIndex = nextIndex
    nextIndex++
  }

  //对于老的节点里有，新的节点里没有的那些，也全都删除掉
  for (name in prevChildren) {
    if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
      //添加差异对象，类型：REMOVE_NODE
      diffQueue.push({
        parentId: self._rootNodeId,
        parentNode: $('[data-reactid=' + self._rootNodeId + ']'),
        type: UPATE_TYPES.REMOVE_NODE,
        fromIndex: prevChild._mountIndex,
        toIndex: null
      })

      //如果以前已经渲染过了，记得先去掉以前所有的事件监听
      if (prevChildren[name]._rootNodeId) {
        $(document).undelegate('.' + prevChildren[name]._rootNodeId)
      }
    }
  }
}

//用于将childNode插入到指定位置
function insertChildAt(parentNode, childNode, index) {
  var beforeChild = parentNode.children().get(index)
  beforeChild ? childNode.insertBefore(beforeChild) : childNode.appendTo(parentNode)
}

ReactDomComponent.prototype._patch = function (updates) {
  var update
  var initialChildren = {}
  var deleteChildren = []
  for (var i = 0; i < updates.length; i++) {
    update = updates[i]
    if (update.type === UPATE_TYPES.MOVE_EXISTING || update.type === UPATE_TYPES.REMOVE_NODE) {
      var updatedIndex = update.fromIndex
      var updatedChild = $(update.parentNode.children().get(updatedIndex))
      var parentId = update.parentId

      //所有需要更新的节点都保存下来，方便后面使用
      initialChildren[parentId] = initialChildren[parentId] || []
      //使用parentId作为简易命名空间
      initialChildren[parentId][updatedIndex] = updatedChild

      //所有需要修改的节点先删除，对于move的，后面再重新插入到正确的位置即可
      deleteChildren.push(updatedChild)
    }
  }

  //删除所有需要先删除的
  $.each(deleteChildren, function (index, child) {
    $(child).remove()
  })

  //再遍历一次，这次处理新增的节点，还有修改的节点这里也要重新插入
  for (var k = 0; k < updates.length; k++) {
    update = updates[k]
    switch (update.type) {
      case UPATE_TYPES.INSERT_MARKUP:
        insertChildAt(update.parentNode, $(update.markup), update.toIndex)
        break
      case UPATE_TYPES.MOVE_EXISTING:
        insertChildAt(update.parentNode, initialChildren[update.parentId][update.fromIndex], update)
        break
      case UPATE_TYPES.REMOVE_NODE:
        break
      default:
        break
    }
  }
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
  //获取reactClass实例(createClass里的constructor)
  var inst = new ReactClass(publicProps)
  this._instance = inst

  //保留对当前comonent的引用，下面更新时会用到
  inst._reactInternalInstance = this

  if (inst.componentWillMount) {
    inst.componentWillMount()
  }

  //调用ReactClass的实例的render方法，返回一个element或者一个文本节点
  var renderedElement = inst.render()

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

//更新
ReactCompositeComponent.prototype.receiveComponent = function (nextElement, newState) {
  //如果接受了新的，就使用新的element
  this._currentElement = nextElement || this._currentElement

  var inst = this._instance
  //合并state
  var nextState = $.extend(inst.state, newState)
  var nextProps = this._currentElement.props

  //改写state
  inst.state = nextState

  //如果inst有shouldComponntUpdate并且返回false,说明组件本身逻辑判断不要更新，则直接返回
  if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return

  //生命周期管理，如果有componentWillUpdate,就调用，表示更新开始
  if (inst.componentWillUpdate) inst.componentWillUpdate(nextProps, nextState)

  var prevComponentInstance = this._renderedComponent
  var prevRenderElement = prevComponentInstance._currentElement
  //重新执行render拿到对应的新element
  var nextRenderElement = inst.render()

  //判断是需要更新还是重新渲染
  if (_shouldUpdateReactComponent(prevRenderElement, nextRenderElement)) {
    //如果需要更新，就调用子节点的receiveComponent,传入新的element更新子节点
    prevComponentInstance.receiveComponent(nextRenderElement)
  } else {
    //如果发现是不同的两种element,就重新渲染
    var thisId = this._rootNodeId
    //重新喧嚷一个对应的component
    this._renderedComponent = instantiateReactComponent(nextRenderElement)
    //重新生成对应的元素内容
    var nextMarkUp = _renderedComponent.mountComponent(thisId)
    //替换整个节点
    $('[data-reactid="]' + this._rootNodeId + '"]').replaceWith(nextMarkUp)
  }
}

//用来判断两个element需不需要更新
//这里的key使我们createElement的时候可以选择性传入的。用来标识这个element,当发现key不同，就重新渲染，不必更新
function _shouldUpdateReactComponent(prevElement, nextElement) {
  if (prevElement != null && nextElement != null) {
    var prevType = typeof prevElement
    var nextType = typeof nextElement
    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number'
    } else {
      return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key
    }
  }
  return false
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

//setState
ReactClass.prototype.setState = function (newState) {
  this._reactInternalInstance.receiveComponent(null, newState)
}

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

  /**
   * @param element ReactElement对象
   * @param container 父对象
   */
  render: function (element, container) {
    var componentInstance = instantiateReactComponent(element)
    var markup = componentInstance.mountComponent(React.nextReactRootIndex++)
    $(container).html(markup)
    $(document).trigger('mountReady')
  }
}

