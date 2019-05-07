import { React, ReactDOM } from 'fake-react'

const { useState, useEffect, PureComponent, Fragment } = React

class Ceshi extends PureComponent {
  state = {
    test: 1
  }

  onClick = () => {
    this.setState({ test: 2 })
    this.setState({ test: 3 })
  }

  static getDerivedStateFromProps(props, state) {
    if (state.test === 1) {
      return state
    }
    return { test: 4 }
  }

  // shouldComponentUpdate(nextProps, nextState) {
  //   if (this.state.test === nextState.test) {
  //     return false
  //   }
  //   return true
  // }

  componentDidUpdate() {
    console.log('componentDidUpdate')
  }

  onDivClick = () => {
    console.log(2)
  }

  componentDidMount() {
    console.log('componentDidMount')
  }

  render() {
    const { test } = this.state
    const { onClick, onDivClick } = this

    return (
      <div onClick={onDivClick}>
        123
        <Fragment>
          <h1 className="ceshi" onClick={onClick} style={{ color: 'red' }}>{test}</h1>
          <h2 className="ceshi" onClick={onClick} style={{ color: 'red' }}>{test}</h2>
        </Fragment>
        {/* <input type="text" value={test} /> */}
      </div>
    )
  }
}

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
