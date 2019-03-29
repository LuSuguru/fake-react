function getTextareaProps(element: any, props: object) {
  return {
    ...props,
    value: undefined,
    defaultValue: undefined,
    children: '' + element._wrapperState.initialValue,
  }
}

export { getTextareaProps }
