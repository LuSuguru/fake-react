import { React, ReactDOM } from 'fake-react'

const { useState, useEffect, PureComponent, memo, useCallback } = React

// class Ceshi extends PureComponent {
//   state = {
//     test: 1
//   }

//   onClick = () => {
//     this.setState({ test: 2 })
//     this.setState({ test: 3 })
//   }

//   // static getDerivedStateFromProps(props, state) {
//   //   if (state.test === 1) {
//   //     return state
//   //   }
//   //   return { test: 4 }
//   // }

//   onChange = ({ target }) => {
//     this.setState({ test: target.value })
//   }

//   render() {
//     const { test } = this.state
//     const { onClick, onChange } = this

//     return (
//       <div>
//         123
//         <h1 className="ceshi" onClick={onClick} style={{ color: 'red' }}>{test}</h1>
//         <h2 className="ceshi" onClick={onClick} style={{ color: 'red' }}>{test}</h2>
//         <input type="text" value={test} onChange={onChange} />
//         <input type="text" />
//       </div>
//     )
//   }
// }


function Com() {
  const [test1, setTest1] = useState(0)
  const [test2, setTest2] = useState(0)

  const onChange1 = ({ target }) => {
    setTest1(target.value)
  }

  const onChange2 = ({ target }) => {
    setTest2(target.value)
  }

  return (
    <div>
      123

      <h2 className="ceshi" style={{ color: 'red' }}>{test2}</h2>

      <input type="checkbox" />
    </div>
  )
}

const Ceshi = Com

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
