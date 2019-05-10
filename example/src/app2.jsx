import { React } from 'fake-react'
import Input from './components/input'
import ToDoItem from './components/to-do-item'
import { formatDate } from './utils'
import './styles/page.less'

const { PureComponent } = React

export default class extends PureComponent {
  state = {
    list: [],
    deleteList: []
  }

  onAdd = (value) => {
    const { list } = this.state
    const newList = list.slice()

    if (value) {
      newList.push({
        content: value,
        date: formatDate('YYYY-MM-DD hh:mm:ss', new Date())
      })
      this.setState({ list: newList })
    }
  }

  onDelete = () => {
    const { list, deleteList } = this.state

    if (deleteList.length === 0) {
      return null
    }

    const newList = list.slice()
    deleteList.forEach(index => newList.splice(index, 1))

    this.setState({
      list: newList,
      deleteList: []
    })
  }

  onAddDetail = (index, checked) => {
    const { deleteList } = this.state

    const newList = deleteList.slice()
    if (checked) {
      newList.push(index)
    } else {
      newList.splice(index, 1)
    }

    this.setState({ deleteList: newList })
  }

  render() {
    const { deleteList, list } = this.state
    const { onDelete, onAdd, onAddDetail } = this
    return (
      <div className="todo-list">
        <Input
          onDelete={onDelete}
          onAdd={onAdd}
          disabled={deleteList.length === 0} />
        <ul>
          {list.map(({ content, date }, index) => (
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
}
