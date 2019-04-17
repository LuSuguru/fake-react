export let getFiberCurrentPropsFromNode: Function = null
export let getInstanceFromNode: Function = null
export let getNodeFromInstance: Function = null

function setComponentTree(getFiberCurrentPropsFromNodeImpl: Function, getInstanceFromNodeImpl: Function, getNodeFromInstanceImpl: Function) {
  getFiberCurrentPropsFromNode = getFiberCurrentPropsFromNodeImpl
  getInstanceFromNode = getInstanceFromNodeImpl
  getNodeFromInstance = getNodeFromInstanceImpl
}

export {
  setComponentTree,
}


