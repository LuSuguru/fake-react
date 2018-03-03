import Component from './Component'
import createElement from './ReactElement'
import instantiateReactComponent from './component/util'
import $ from 'jquery'

export default {
  nextReactRootIndex: 0,
  Component,
  createElement,
  render(element, container) {
    var componentInstance = instantiateReactComponent(element)
    var markup = componentInstance.mountComponent(this.nextReactRootIndex++)

    container.innerHTML = markup
    $(document).trigger('mountReady')
  }
}
