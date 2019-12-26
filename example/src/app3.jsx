import { React } from 'fake-react'

const { PureComponent } = React

class Test1 extends PureComponent {
  state = {
    value: ''
  }

  componentDidMount() {
    console.log(1)
  }

  onChange = (e) => {
    this.setState({ value: e.target.value })
  }

  render() {
    const { value } = this.state
    const { onChange } = this

    return (
      <div className="input">
        <input type="text" {...{ value, onChange }} />
        {/* <button onClick={() => onAdd(value)}>添加</button> */}
        {/* <button onClick={onDelete} type="primary" disabled={disabled}>删除</button> */}
      </div>
    )
  }
}

class Test2 extends PureComponent {
  state = {
    value: ''
  }

  componentDidMount() {
    console.log(2)
  }

  onChange = (e) => {
    this.setState({ value: e.target.value })
  }

  render() {
    const { value } = this.state
    const { onChange } = this

    return (
      <div className="input">
        <input type="text" {...{ value, onChange }} />
        {/* <button onClick={() => onAdd(value)}>添加</button> */}
        {/* <button onClick={onDelete} type="primary" disabled={disabled}>删除</button> */}
      </div>
    )
  }
}

class Test3 extends PureComponent {
  state = {
    value: ''
  }

  componentDidMount() {
    console.log(3)
  }

  onChange = (e) => {
    this.setState({ value: e.target.value })
  }

  render() {
    const { value } = this.state
    const { onChange } = this

    return (
      <div className="input">
        <input type="text" {...{ value, onChange }} />
        {/* <button onClick={() => onAdd(value)}>添加</button> */}
        {/* <button onClick={onDelete} type="primary" disabled={disabled}>删除</button> */}
      </div>
    )
  }
}

export default class extends PureComponent {
  state = {
    toggle: true
  }

  onSwitch = () => {
    this.setState(({ toggle }) => ({ toggle: !toggle }))
  }

  render() {
    const { toggle } = this.state
    const { onSwitch } = this
    return (
      <div>
        <button onClick={onSwitch}>开关</button>
        <Test1 />
        {toggle && <Test2 />}
        <Test3 />
      </div>
    )
  }
}
