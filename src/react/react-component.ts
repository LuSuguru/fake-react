import ReactNoopUpdateQueue from './react-noop-update-queue'

class Component {
  props: any
  context: any
  refs: any
  updater: ReactNoopUpdateQueue

  constructor(props: any, context: any, updater: ReactNoopUpdateQueue) {
    this.props = props
    this.context = context
    this.refs = {}
    this.updater = updater || new ReactNoopUpdateQueue()
  }

  setState(partialState: any, callback: any) {
    this.updater.enqueueSetState(this, partialState, callback, 'setState')
  }

  forceUpdate(callback: any) {
    this.updater.enqueueForceUpdate(this, callback, 'forceUpdate')
  }
}

class PureComponent extends Component {
  isPureReactComponent: boolean

  constructor(props: any, context: any, updater: ReactNoopUpdateQueue) {
    super(props, context, updater)
    this.isPureReactComponent = true
  }
}

export { Component, PureComponent }
