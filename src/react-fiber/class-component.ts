import { isEmpty } from '../utils/getType'
import { ExpirationTime } from './expiration-time'
import { Fiber } from './fiber'

function constructClassInstance(workInProgress: Fiber, ctor: any, props: any, renderExpirationTime: ExpirationTime) {
  // 一波context的骚操作，先省略
  //  let isLegacyContextConsumer = false
  const context: any = null
  //     context = isLegacyContextConsumer
  // ? getMaskedContext(workInProgress, unmaskedContext)
  // : emptyContextObject
  const instance = new ctor(props, context)
  const state = (workInProgress.memoizedState = isEmpty(instance.state) ? null : instance.state)

}
