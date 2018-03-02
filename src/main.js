import React from './react'

class HelloMessage extends React.Component {
  constructor(props) {
    super(props)
    this.state = { type: 'say:' }
  }

  componentWillMount() {
    console.log('我就要开始渲染了。。。')
  }

  componentDidMount() {
    console.log('我已经渲染好了。。。')
  }

  render() {
    return React.createElement('div', undefined, this.state.type, 'Hello', this.props.name)
  }
}

React.render(React.createElement(HelloMessage, {name: 'John'}), document.getElementById('root'))
