import React from './react'

class TodoList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { items: [], text: '' }
  }

  add() {
    const nextItems = this.state.items.concat([this.state.text])
    this.setState({ items: nextItems, text: '' })
  }

  onChange(e) {
    this.setState({ text: e.target.value })
  }

  render() {
    const list = this.state.items.map(item => React.createElement('div', null, item))
    const input = React.createElement('input', { onkeyup: this.onChange.bind(this), value: this.state.text })
    const button = React.createElement('p', { onclick: this.add.bind(this) }, 'Add#' + (this.state.items.length + 1))

    const children = list.concat([input, button])
    return React.createElement('div', null, children)
  }
}

React.render(React.createElement(TodoList), document.getElementById('root'))
