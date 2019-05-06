import { React, ReactDOM } from 'fake-react'

const { useState, useEffect } = React

function Ceshi() {
  const [test, setTest] = useState(0)

  function onClick(e) {
    console.log(e)
    setTest(1)
  }

  function onDivClick() {
    console.log(2)
  }

  useEffect(() => {
    console.log(1)
  }, [])

  return (
    <div onClick={onDivClick}>
      <h1 className="ceshi" onClick={onClick}>{test}</h1>
    </div>
  )
}

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
