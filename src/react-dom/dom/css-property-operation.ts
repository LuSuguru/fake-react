function dangerousStyleValue(name: string, value: any, isCustomProperty: boolean) {
  const isEmpty = value == null || typeof value === 'boolean' || value === ''
  if (isEmpty) {
    return ''
  }

  if (!isCustomProperty && typeof value === 'number' && value !== 0 && ) {
    return value + 'px'
  }

  return ('' + value).trim()
}

function setValueForStyles(node: any, styles: any) {
  const style = node.style

  Object.keys(styles).forEach((styleName) => {
    const isCustomProperty = styleName.indexOf('--') === 0

    const styleValue = dangerousStyleValue(styleName, styles[styleName], isCustomProperty)

    if (styleName === 'float') {
      styleName = 'cssFloat'
    }
    if (isCustomProperty) {
      style.setProperty(styleName, styleValue)
    } else {
      style[styleName] = styleValue
    }
  })
}

export { setValueForStyles }
