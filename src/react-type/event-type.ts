import SyntheticEvent from '../event/synthetic-event'
import { Fiber } from '../react-fiber/fiber'

export type TopLevelType = string

export interface DispatchConfig {
  // props名，区分冒泡和捕获，与 registrationName 互斥
  phasedRegistrationNames?: {
    bubbled: string,
    captured: string,
  },
  dependencies: TopLevelType[], // 依赖的原生事件名，需要注册

  registrationName?: string, // props名，不区分冒泡和捕获，与 phasedRegistrationNames 互斥
  isInteractive?: boolean, // 是否高优先级反馈
}

export interface StaticSyntheticEvent {
  Interface: any
  eventPool: SyntheticEvent[]
  getPooled: (
    dispatchConfig: DispatchConfig,
    targetInst: Fiber,
    nativeTarget: Event,
    nativeEventTarget: EventTarget,
  ) => SyntheticEvent,
  release: (event: SyntheticEvent) => void,
}

export interface EventTypes {
  [key: string]: DispatchConfig
}

export type AnyNativeEvent = Event | KeyboardEvent | MouseEvent | Touch

export type PluginName = string

export interface PluginModule<NativeEvent> {
  eventTypes: EventTypes,
  extractEvents: (
    topLevelType: string,
    targetInst: Fiber,
    nativeTarget: NativeEvent,
    nativeEventTarget: EventTarget,
  ) => SyntheticEvent | SyntheticEvent[],
  tapMoveThreshold?: number,
}

