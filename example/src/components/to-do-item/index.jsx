import { React } from 'fake-react'
import './style.less'

const { useState, memo } = React

function Todo({ children, date, index, onAddDetail }) {
  const [checked, setChecked] = useState(false)

  function onChange(e) {
    setChecked(e.target.checked)
    onAddDetail(index, e.target.checked)
  }

  return (
    <li className="to-do-item">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <div className="time">{date}</div>
      <div className="content">{children}</div>
    </li>
  )
}

export default memo(Todo)
