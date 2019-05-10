import { React } from 'fake-react'
import './style.less'

const { PureComponent } = React

export default class extends PureComponent {
  state = {
    checked: false
  }

  onChange = (e) => {
    const { onAddDetail, index } = this.props

    this.setState({ checked: e.target.checked })
    onAddDetail(index, e.target.checked)
  }

  render() {
    const { date, children } = this.props
    const { checked } = this.state
    const { onChange } = this
    return (
      <li className="to-do-item">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <div className="time">{date}</div>
        <div className="content">{children}</div>
      </li>
    )
  }
}
