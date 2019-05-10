import { React, ReactDOM } from 'fake-react'
import App from './app'
import App2 from './app2'
import './styles/reset.css'
import './styles/root.less'

const { Fragment } = React

function Test() {
  return (
    <Fragment>
      <App />
      <App2 />
    </Fragment>)
}

ReactDOM.render(
  <Test />,
  document.getElementById('root')
)
