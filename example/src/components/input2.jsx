import { React } from 'fake-react'

const { PureComponent } = React

export default class extends PureComponent {
  state = {
    value: ''
  }

  onChange = (e) => {
    this.setState({ value: e.target.value })
  }

  render() {
    const { onAdd, onDelete, disabled } = this.props
    const { value } = this.state
    const { onChange } = this

    return (
      <div className="input">
        <input type="text" {...{ value, onChange }} />
        <button onClick={() => onAdd(value)}>添加</button>
        <button onClick={onDelete} type="primary" disabled={disabled}>删除</button>
      </div>
    )
  }
}
