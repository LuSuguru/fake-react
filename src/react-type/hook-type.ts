import { ReactContext } from '../react-context/fiber-context'

type Dispatch<A> = (a: A) => any

type BasicStateAction<S> = ((s: S) => S) | S

interface Dispatcher {
  readContext<T>(context: ReactContext<T>, observedBits: void | number | boolean): T,
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer<S, I, A>(reducer: (s: S, a: A) => S, initialArg: I, init?: (i: I) => S): [S, Dispatch<A>],
  useContext<T>(context: ReactContext<T>, observedBits: void | number | boolean): T,
  useRef<T>(initialValue: T): { current: T },
  useEffect(create: () => (() => void) | void, deps: any[] | void | null): void,
  useLayoutEffect(create: () => (() => void) | void, deps: any[] | void | null ): void,
  useCallback<T>(callback: T, deps: any[] | void | null): T,
  useMemo<T>(nextCreate: () => T, deps: any[] | void | null): T
}

export {
  BasicStateAction,
  Dispatch,
  Dispatcher,
}
