import { ReactContext } from '../react-context/fiber-context'
import { ExpirationTime } from '../react-fiber/expiration-time'

export type HookEffectTag = number

export const NoHookEffect = /*         */ 0b00000000
export const UnmountSnapshot = /*      */ 0b00000010
export const UnmountMutation = /*      */ 0b00000100
export const MountMutation = /*        */ 0b00001000
export const UnmountLayout = /*        */ 0b00010000
export const MountLayout = /*          */ 0b00100000
export const MountPassive = /*         */ 0b01000000
export const UnmountPassive = /*       */ 0b10000000

type Dispatch<A> = (a: A) => void
type BasicStateAction<S> = ((s: S) => S) | S

interface Dispatcher {
  readContext<T>(context: ReactContext<T>, observedBits: void | number | boolean): T,
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer<S, I, A>(reducer: (s: S, a: A) => S, initialArg: I, init?: (i: I) => S): [S, Dispatch<A>],
  useContext<T>(context: ReactContext<T>, observedBits: void | number | boolean): T,
  useRef<T>(initialValue: T): { current: T },
  useEffect(create: () => (() => void) | void, deps: any[] | void | null): void,
  useLayoutEffect(create: () => (() => void) | void, deps: any[] | void | null): void,
  useCallback<T>(callback: T, deps: any[] | void | null): T,
  useMemo<T>(nextCreate: () => T, deps: any[] | void | null): T
  useImperativeHandle<T>(ref: Ref<T>, create: () => T, deps: any[] | void | null): void
}

interface Update<S, A> {
  expirationTime: ExpirationTime,
  action: A,
  eagerReducer: ((s: S, a: A) => S),
  eagerState: S,
  next: Update<S, A>,
}

interface UpdateQueue<S, A> {
  last: Update<S, A>, // 环形链表
  dispatch: ((a: A) => any),
  eagerReducer: ((s: S, a: A) => S), // 记录当前的reducer，在dispatch时用于提前计算state
  eagerState: S, // 计算当前的state，在dispath中做为提前计算的基值
}

interface Hook {
  memoizedState: any, // 当前的state
  baseState: any, // 记录低优先级的第一个跳过的state
  baseUpdate: Update<any, any>, // 记录低优先级的第一个跳过的update
  queue: UpdateQueue<any, any>, // 更新队列
  next: Hook,
}

interface Effect {
  tag: HookEffectTag,
  create: () => (() => void),
  destroy: (() => void),
  deps: any[],
  next: Effect,
}

interface FunctionComponentUpdateQueue {
  lastEffect: Effect | null,
}

type Ref<T> = { current: T | null } | ((inst: T | null) => void) | null | void

export {
  Update,
  UpdateQueue,
  BasicStateAction,
  Dispatch,
  Dispatcher,
  Hook,
  Effect,
  FunctionComponentUpdateQueue,
  Ref,
}
