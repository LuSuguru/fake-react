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


function If({ visible, children }) {
  if (visible) {
    return children
  }
  return null
}

function Com() {
  const [test, setTest] = useState('grapefruit')


  const onChange = ({ target }) => {
    setTest(target.value)
  }

  return (
    <div>
      <select onChange={onChange} value={test}>
        <option value="grapefruit">Grapefruit</option>
        <option value="lime">Lime</option>
        <option selected value="coconut">Coconut</option>
        <option value="mango">Mango</option>
      </select>

      <h2 className="ceshi" style={{ color: 'red' }}>{test}</h2>
      <If visible={test === 'grapefruit'}>
        {[1, 2, 3].map(name => <h1 key={name}>{name}</h1>)}
      </If>
    </div>
  )
}

const Ceshi = Com

ReactDOM.render(
  <Ceshi />,
  document.getElementById('root')
)
