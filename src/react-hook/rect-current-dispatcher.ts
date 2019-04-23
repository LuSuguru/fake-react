import { Dispatcher } from '../react-type/hook-type'

const ReactCurrentDispatcher = {
  /**
   * @internal
   * @type {ReactComponent}
   */
  current: null as Dispatcher,
}

export default ReactCurrentDispatcher
