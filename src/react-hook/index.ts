import { ReactContext } from '../react-context/fiber-context'
import ReactCurrentDispatcher from './rect-current-dispatcher'

function resolveDispatcher(): any {
  const dispatcher = ReactCurrentDispatcher.current
  return dispatcher
}

function useContext<T>(Context: ReactContext<T>, unstable_observedBits: number | boolean) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useContext(Context, unstable_observedBits)
}

function useState<S>(initialState: () => S | S) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

function useRef<T>(initialValue: T): { current: T } {
  const dispatcher = resolveDispatcher()
  return dispatcher.useRef(initialValue)
}

function useEffect(create: () => (() => void) | void, inputs: any[] | void | null) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useEffect(create, inputs)
}

function useLayoutEffect(create: () => (() => void) | void, inputs: any[] | void | null) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useLayoutEffect(create, inputs)
}

function useCallback(callback: () => any, inputs: any[] | void | null) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useCallback(callback, inputs)
}

function useMemo(create: () => any, inputs: any[] | void | null) {
  const dispatcher = resolveDispatcher()
  return dispatcher.useMemo(create, inputs)
}

export {
  useContext,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
}
