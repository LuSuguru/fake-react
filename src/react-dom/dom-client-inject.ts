import { injection as EventPluginHubInjection } from '../event/plugin-hub'
import { setComponentTree } from '../event/plugin-utils'
import { getFiberCurrentPropsFromNode, getInstanceFromNode, getNodeFromInstance } from './dom/dom-component-tree'

import BeforeInputEventPlugin from '../event/dom/before-input-event-plugin'
import ChangeEventPlugin from '../event/dom/change-event-plugin'
import EnterLeaveEventPlugin from '../event/dom/enter-leave-event-plugin'
import SelectEventPlugin from '../event/dom/select-event-plugin'
import SimpleEventPlugin from '../event/dom/simple-event-plugin'

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

EventPluginHubInjection.injectEventPluginsByName({
  SimpleEventPlugin,
  EnterLeaveEventPlugin,
  ChangeEventPlugin,
  SelectEventPlugin,
  BeforeInputEventPlugin,
})
