import { setTextContent } from '../react-dom/dom/property-operation'
import { Fiber } from '../react-fiber/fiber'
import { resolveDefaultProps } from '../react-fiber/lazy-component'
import { ClassComponent, ForwardRef, FunctionComponent, SimpleMemoComponent } from '../react-type/tag-type'

function commitBeforeMutationLifecycle(current: Fiber, finishWork: Fiber) {
  switch (finishWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
      // commitHookEffectList(UnmountSnapshot, NoHookEffect, finishedWork) // hook操作
      return
    case ClassComponent: {
      if (current !== null) {
        const prevPrrops = current.memoizedProps
        const prevState = current.memoizedState
        const instance = finishWork.stateNode

        const snapshot = instance.getSnapshotBeforeUpdate(finishWork.elementType === finishWork.type ? prevPrrops : resolveDefaultProps(finishWork.type, prevPrrops), prevState)
        instance.__reactInternalSnapshotBeforeUpdate = snapshot
      }
      return
    }
  }
}

function commitResetTextContent(current: Fiber) {
  setTextContent(current.stateNode)
}

export {
  commitBeforeMutationLifecycle,
  commitResetTextContent,
}
