import { injection as EventPluginHubInjection } from '../event/plugin-hub'
import { setComponentTree } from '../event/plugin-utils'
import { getFiberCurrentPropsFromNode, getInstanceFromNode, getNodeFromInstance } from './dom/dom-component-tree'

import BeforeInputEventPlugin from '../event/dom/before-input-event-plugin'
import ChangeEventPlugin from '../event/dom/change-event-plugin'
import EnterLeaveEventPlugin from '../event/dom/enter-leave-event-plugin'
import SelectEventPlugin from '../event/dom/select-event-plugin'
import SimpleEventPlugin from '../event/dom/simple-event-plugin'
import { setBatchingImplementation } from '../event/generic-batching'
import { batchedUpdates, flushInteractiveUpdates, interactiveUpdates } from '../react-scheduler'

EventPluginHubInjection.injectEventPluginOrder([
  'ResponderEventPlugin',
  'SimpleEventPlugin',
  'EnterLeaveEventPlugin',
  'ChangeEventPlugin',
  'SelectEventPlugin',
  'BeforeInputEventPlugin',
])

setComponentTree(
  getFiberCurrentPropsFromNode,
  getInstanceFromNode,
  getNodeFromInstance,
)

setBatchingImplementation(
  batchedUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
)

EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin,
  EnterLeaveEventPlugin,
  ChangeEventPlugin,
  SelectEventPlugin,
  BeforeInputEventPlugin,
})
