import { STORAGE_KEY } from './mutations'
import createLogger from '../thirdParty/logger'

const localStoragePlugin = store => {
  store.subscribe((mutation, { todos }) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  })
}

const loggerPlugin = createLogger()

export default function() {
    return [loggerPlugin, localStoragePlugin]
}