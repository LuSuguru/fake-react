function resolveDefaultProps(Component: any, baseProps: Object): Object {
  if (Component && Component.defaultProps) {
    const props = { ...baseProps }
    const { defaultProps } = Component

    for (const propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName]
      }
    }
    return props
  }
  return baseProps
}

export { resolveDefaultProps }
