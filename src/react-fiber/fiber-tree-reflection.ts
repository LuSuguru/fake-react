import { NoEffect, Placement } from '../react-type/effect-type'
import { HostRoot } from '../react-type/tag-type'
import { ReactElement } from '../react/react'
import { Component } from '../react/react-component'
import { Fiber } from './fiber'

enum WorkStatus {
  Mounting = 1,
  Mounted = 2,
  UnMounted = 3,
}

function isFiberMountedImpl(fiber: Fiber): number {
  let node = fiber
  if (!fiber.alternate) {
    if ((node.effectTag & Placement) !== NoEffect) {
      return WorkStatus.Mounting
    }

    while (node.return) {
      node = node.return
      if ((node.effectTag & Placement) !== NoEffect) {
        return WorkStatus.Mounting
      }
    }
  } else {
    while (node.return) {
      node = node.return
      if ((node.effectTag & Placement) !== NoEffect) {
        return WorkStatus.Mounting
      }
    }
  }

  if (node.tag === HostRoot) {
    return WorkStatus.Mounted
  }

  return WorkStatus.UnMounted
}

function isFiberMounted(fiber: Fiber): boolean {
  return isFiberMountedImpl(fiber) === WorkStatus.Mounted
}

function isMounted(component: Component) {
  const fiber = component._reactInternalFiber

  if (!fiber) {
    return false
  }

  return isFiberMountedImpl(fiber) === WorkStatus.Mounted
}

export {
  isMounted,
  isFiberMounted,
}
