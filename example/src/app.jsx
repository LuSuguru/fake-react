import { React } from 'fake-react'
import useStates from './hook/useStates'
import Input from './components/input'
import ToDoItem from './components/to-do-item'
import { formatDate } from './utils'
import './styles/page.less'

const { memo, useCallback } = React

function ToDoList() {
  const [state, setState] = useStates({
    list: [],
    deleteList: []
  })

  const onAdd = useCallback((value) => {
    if (value) {
      setState(({ list }) => {
        const newList = list.slice()
        newList.push({
          content: value,
          date: formatDate('YYYY-MM-DD hh:mm:ss', new Date())
        })

        return { list: newList }
      })
    }
  }, [])

  const onDelete = useCallback(() => {
    setState(({ list, deleteList }) => {
      if (deleteList.length === 0) {
        return null
      }

      const newList = list.slice()
      deleteList.forEach(index => newList.splice(index, 1))
      return {
        list: newList,
        deleteList: []
      }
    })
  }, [])

  function onAddDetail(index, checked) {
    setState(({ deleteList }) => {
      const newList = deleteList.slice()
      if (checked) {
        newList.push(index)
      } else {
        newList.splice(index, 1)
      }

      return ({ deleteList: newList })
    })
  }

  return (
    <div className="todo-list">
      <Input
        onDelete={onDelete}
        onAdd={onAdd}
        disabled={state.deleteList.length === 0} />
      <ul>
        {state.list.map(({ content, date }, index) => (
          <ToDoItem
            date={date}
            key={date}
            index={index}
            onAddDetail={onAddDetail}>
            {content}
          </ToDoItem>
        ))}
      </ul>
    </div>
  )
}

export default memo(ToDoList)
