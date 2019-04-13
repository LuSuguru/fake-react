export let getFiberCurrentPropsFromNode: Function = null
export let getInstanceFromNode: Function = null
export let getNodeFromInstance: Function = null

function setComponentTree(getFiberCurrentPropsFromNodeImpl, getInstanceFromNodeImpl, getNodeFromInstanceImpl) {
  getFiberCurrentPropsFromNode = getFiberCurrentPropsFromNodeImpl
  getInstanceFromNode = getInstanceFromNodeImpl
  getNodeFromInstance = getNodeFromInstanceImpl
}

export {
  setComponentTree,
}


