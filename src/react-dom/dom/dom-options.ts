function getOptionProps(element: Element, props: any) {
  const hostProps = { children: undefined, ...props }
  const content = props.children // flattenChildren(props.children) 暂时忽略这个操作

  if (content) {
    hostProps.children = content
  }

  return hostProps
}

export { getOptionProps }


