import { React } from 'fake-react'

const { useState, useEffect, memo } = React

function Input({ onAdd, onDelete, disabled }) {
  const [value, setValue] = useState()

  useEffect(() => {
    console.log(1)
  }, [])

  function onChange(e) {
    setValue(e.target.value)
  }

  return (
    <div className="input">
      <input type="text" {...{ value, onChange }} />
      <button onClick={() => onAdd(value)}>添加</button>
      <button onClick={onDelete} type="primary" disabled={disabled}>删除</button>
    </div>
  )
}

export default memo(Input)
