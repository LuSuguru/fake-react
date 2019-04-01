// 接受数字但是不需要单位的属性
export const isUnitlessNumber = {
  animationIterationCount: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,

  // SVG-related properties
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true,
}

function prefixKey(prefix: string, key: string): string {
  return prefix + key.charAt(0).toUpperCase() + key.substring(1)
}

const prefixes = ['Webkit', 'ms', 'Moz', 'O']

Object.keys(isUnitlessNumber).forEach((prop: string) => {
  prefixes.forEach((prefix: string) => {
    isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop]
  })
})

function dangerousStyleValue(name: string, value: any, isCustomProperty: boolean): string {
  const isEmpty = value == null || typeof value === 'boolean' || value === ''
  if (isEmpty) {
    return ''
  }

  if (!isCustomProperty && typeof value === 'number' && value !== 0 && !(isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name])) {
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
