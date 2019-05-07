import { React, ReactDOM } from 'fake-react'

const { useState, useEffect, Component } = React

class Ceshi extends Component {
  state = {
    test: 1
  }


  onClick = () => {
    this.setState({ test: 2 })
    this.setState({ test: 3 })
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
        <h1 className="ceshi" onClick={onClick} style={{ color: 'red' }}>{test}</h1>
      </div>
    )
  }
}

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
