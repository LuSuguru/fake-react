import { React, ReactDOM } from 'fake-react'

const { useState, useEffect } = React

function Ceshi() {
  const [test, setTest] = useState(0)

  function onClick() {
    setTest(1)
  }

  useEffect(() => {
    console.log(1)
  }, [])

  return <h1 className="ceshi" onClick={onClick}>{test}</h1>
}

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
