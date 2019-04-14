const modifierKeyToProp = {
  Alt: 'altKey',
  Control: 'ctrlKey',
  Meta: 'metaKey',
  Shift: 'shiftKey',
}

function modifierStateGetter(keyArg: string): boolean {
  const syntheticEvent = this
  const nativeEvent = syntheticEvent.nativeEvent
  if (nativeEvent.getModifierState) {
    return nativeEvent.getModifierState(keyArg)
  }

  const keyProp = modifierKeyToProp[keyArg]
  return keyProp ? !!nativeEvent[keyProp] : false
}

function getEventModifierState(): (keyArg: string) => boolean {
  return modifierStateGetter
}

export default getEventModifierState
