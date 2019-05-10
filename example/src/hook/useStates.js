import { React } from 'fake-react'

const { useReducer } = React

function stateReducer(state, newState) {
  if (typeof newState === 'function') {
    newState = newState(state)
    if (newState === null) {
      return state
    }
  }

  return { ...state, ...newState }
}

export default function (initialState, reducer = stateReducer) {
  const [state, setState] = useReducer(reducer, initialState)

  return [state, setState]
}
