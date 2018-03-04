import Component from './Component'
import createElement from './ReactElement'
import instantiateReactComponent from './component/util'
import $ from 'jquery'

export default {
  nextReactRootIndex: 0, // 标识id
  Component, // 所有自定义组件的父类
  createElement, // 创建vdom
  render(vDom, container) { // 入口
    var componentInstance = instantiateReactComponent(vDom)
    var markup = componentInstance.mountComponent(this.nextReactRootIndex++)

    container.innerHTML = markup
    $(document).trigger('mountReady')
  }
}
