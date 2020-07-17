import { setRestoreImplementation } from '../event/controlled-component'
import BeforeInputEventPlugin from '../event/dom/before-input-event-plugin'
import ChangeEventPlugin from '../event/dom/change-event-plugin'
import EnterLeaveEventPlugin from '../event/dom/enter-leave-event-plugin'
import SelectEventPlugin from '../event/dom/select-event-plugin'
import SimpleEventPlugin from '../event/dom/simple-event-plugin'
import { setBatchingImplementation } from '../event/generic-batching'
import { injection as EventPluginHubInjection } from '../event/plugin-hub'
import { batchedUpdates, flushInteractiveUpdates, interactiveUpdates } from '../react-scheduler'
import { restoreControlledState } from './dom/dom-component'


// 规定插件的注入顺序
EventPluginHubInjection.injectEventPluginOrder([
  'SimpleEventPlugin',
  'EnterLeaveEventPlugin',
  'ChangeEventPlugin',
  'SelectEventPlugin',
  'BeforeInputEventPlugin',
])

// 注入事件插件
EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin,
  EnterLeaveEventPlugin,
  ChangeEventPlugin,
  SelectEventPlugin,
  BeforeInputEventPlugin,
})

setBatchingImplementation(
  batchedUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
)

setRestoreImplementation(restoreControlledState)


