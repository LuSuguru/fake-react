import React from './react'

class TodoList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { items: [], text: '' }
  }

  add() {
    let { items, text } = this.state
    items = [...items, text]
    this.setState({ items, text: '' })
  }

  onChange(e) {
    this.setState({ text: e.target.value })
  }

  render() {
    const list = this.state.items.map(item => React.createElement('div', null, item))
    const input = React.createElement('input', { onkeyup: this.onChange.bind(this), value: this.state.text })
    const button = React.createElement('a', { onclick: this.add.bind(this) }, `add${this.state.items.length + 1}`)

    const children = [...list, input, button]
    return React.createElement('div', null, children)
  }
}

React.render(React.createElement(TodoList), document.getElementById('root'))
