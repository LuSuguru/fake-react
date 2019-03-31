function initSelectProps(element: any, props: any) {
  element._wrapperState = { wasMultiple: !!props.multiple }
}

function getSelectProps(element: Element, props: object) {
  return {
    ...props,
    value: undefined,
  }
}

export {
  initSelectProps,
  getSelectProps,
}
