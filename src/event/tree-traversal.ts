import { Fiber } from '../react-fiber/fiber'
import { HostComponent } from '../react-type/tag-type'
import SyntheticEvent from './synthetic-event'


function getParent(inst: Fiber) {
  do {
    inst = inst.return
  } while (inst && inst.tag !== HostComponent)

  if (inst) {
    return inst
  }
  return null
}

export function getLowestCommonAncestor(instA: Fiber, instB: Fiber) {
  let depthA = 0
  for (let tempA = instA; tempA; tempA = getParent(tempA)) {
    depthA++
  }
  let depthB = 0
  for (let tempB = instB; tempB; tempB = getParent(tempB)) {
    depthB++
  }

  while (depthA - depthB > 0) {
    instA = getParent(instA)
    depthA--
  }

  while (depthB - depthA > 0) {
    instB = getParent(instB)
    depthB--
  }

  let depth = depthA
  while (depth--) {
    if (instA === instB || instA === instB.alternate) {
      return instA
    }
    instA = getParent(instA)
    instB = getParent(instB)
  }
  return null
}

/**
 * Return if A is an ancestor of B.
 */
export function isAncestor(instA: Fiber, instB: Fiber) {
  while (instB) {
    if (instA === instB || instA === instB.alternate) {
      return true
    }
    instB = getParent(instB)
  }
  return false
}


export function getParentInstance(inst: Fiber) {
  return getParent(inst)
}

/**
 * Simulates the traversal of a two-phase, capture/bubble event dispatch.
 */
export function traverseTwoPhase(inst: Fiber, fn: Function, arg: SyntheticEvent) {
  const path = []
  while (inst) {
    path.push(inst)
    inst = getParent(inst)
  }

  let i: number
  for (i = path.length; i-- > 0;) {
    fn(path[i], 'captured', arg)
  }
  for (i = 0; i < path.length; i++) {
    fn(path[i], 'bubbled', arg)
  }
}

export function traverseEnterLeave(from: Fiber, to: Fiber, fn: Function, argFrom: SyntheticEvent, argTo: SyntheticEvent) {
  function getPathArr(inst: Fiber, root: Fiber) {
    const arr: Fiber[] = []
    let first: Fiber = inst
    while (true) {
      if (!first) {
        break
      }
      if (first === root) {
        break
      }
      const alternate = first.alternate
      if (alternate !== null && alternate === common) {
        break
      }
      arr.push(from)
      first = getParent(from)
    }
    return arr
  }

  const common = from && to ? getLowestCommonAncestor(from, to) : null
  const pathFrom = getPathArr(from, common)
  const pathTo = getPathArr(to, common)

  for (let i = pathTo.length; i-- > 0;) {
    fn(pathTo[i], 'captured', argTo)
  }
  for (let i = 0; i < pathFrom.length; i++) {
    fn(pathFrom[i], 'bubbled', argFrom)
  }
}
