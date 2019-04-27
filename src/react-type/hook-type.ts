import { ReactContext } from '../react-context/fiber-context'
import { ExpirationTime } from '../react-fiber/expiration-time'

export type HookEffectTag = number

export const NoEffect = /*             */ 0b00000000
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
}

interface Update<S, A> {
  expirationTime: ExpirationTime,
  action: A,
  eagerReducer: ((s: S, a: A) => S) | null,
  eagerState: S | null,
  next: Update<S, A> | null,
}

interface UpdateQueue<S, A> {
  last: Update<S, A> | null,
  dispatch: ((a: A) => any) | null,
  eagerReducer: ((s: S, a: A) => S) | null,
  eagerState: S | null,
}

interface Hook {
  memoizedState: any,
  baseState: any,
  baseUpdate: Update<any, any>,
  queue: UpdateQueue<any, any>,
  next: Hook,
}

export {
  Update,
  UpdateQueue,
  BasicStateAction,
  Dispatch,
  Dispatcher,
  Hook,
}
