import { TEXT_NODE } from '../../react-type/html-type'
import { SVG_NAMESPACE } from '../../utils/dom-namespaces'
import { BOOLEAN, getPropertyInfo, isAttributeNameSafe, OVERLOADED_BOOLEAN, shouldIgnoreAttribute, shouldRemoveAttribute } from './property'

function setInnerHtml(node: any, html: string) {
  if (node.namespaceURI === SVG_NAMESPACE && !('innerHTML' in node)) {
    const SVGContainer = document.createElement('div')
    SVGContainer.innerHTML = '<svg>' + html + '</svg>'
    const svgNode = SVGContainer.firstChild

    while (node.firstChild) {
      node.removeChild(node.firstChild)
    }
    while (svgNode.firstChild) {
      node.appendChild(svgNode.firstChild)
    }
  } else {
    node.innerHTML = html
  }
}

function setTextContent(node: any, text?: string) {
  if (text) {
    const firstChild = node.firstChild

    if (firstChild && firstChild === node.lastChild && firstChild.nodeType === TEXT_NODE) {
      firstChild.nodeValue = text
      return
    }
  }
  node.textContent = text
}

function setValueForProperty(node: any, name: string, value: any, isCustomComponentTag: boolean) {
  const propertyInfo = getPropertyInfo(name)
  if (shouldIgnoreAttribute(name, propertyInfo, isCustomComponentTag)) {
    return
  }
  if (shouldRemoveAttribute(name, value, propertyInfo, isCustomComponentTag)) {
    value = null
  }

  if (isCustomComponentTag || propertyInfo === null) {
    if (isAttributeNameSafe(name)) {
      if (value === null) {
        node.removeAttribute(name)
      } else {
        node.setAttribute(name, '' + value)
      }
    }
    return
  }

  const { mustUseProperty, propertyName, type, attributeName, attributeNamespace } = propertyInfo

  if (mustUseProperty) {
    if (value === null) {
      node[propertyName] = type === BOOLEAN ? false : ''
    } else {
      node[propertyName] = value
    }
    return
  }

  if (value === null) {
    node.removeAttribute(attributeName)
  } else {
    const attributeValue = type === BOOLEAN || (type === OVERLOADED_BOOLEAN && value === true) ? '' : '' + value

    if (attributeNamespace) {
      node.setAttributeNS(attributeNamespace, attributeName, attributeValue)
    } else {
      node.setAttribute(attributeName, attributeValue)
    }
  }
}

export {
  setInnerHtml,
  setTextContent,
  setValueForProperty,
}
