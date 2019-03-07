import React, { PureComponent } from 'react'

export default function asyncComponent(importComponent, newProps) {
  class AsyncComponent extends PureComponent {
    state = { component: null }

    async componentDidMount() {
      const { default: component } = await importComponent()
      this.setState({ component })
    }

    render() {
      const C = this.state.component
      return C ? <C {...this.props} {...newProps} /> : null
    }
  }

  return AsyncComponent
}
