function getInputProps(element: any, props: any) {
  return {
    ...props,
    ...{
      defaultChecked: undefined,
      defaultValue: undefined,
      value: undefined,
      checked: props.checked != null ? props.checked : element._wrapperState.initialChecked,
    },
  }
}

export { getInputProps }
