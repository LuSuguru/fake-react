function getSelectProps(element: Element, props: object) {
  return {
    ...props,
    value: undefined,
  }
}

export {
  getSelectProps,
}
