import sharedMethods from './sharedMethods'
import isEqual from 'lodash/isEqual'

const EMPTY_OBJECT = {}
const EMPTY_ARRAY = []

export default class RecordCollection {
  constructor(table, key) {
    this.table = table
    this.schema = table.schema
    this.key = key
    this.state = (table.state.collections || {})[key] || {}
  }

  get ids() {
    return this.state.ids || EMPTY_ARRAY
  }

  get length() {
    return this.ids.length
  }

  get meta() {
    return this.state.meta || EMPTY_OBJECT
  }

  exists() {
    return !!this.state.ids
  }

  all() {
    return this.ids.map(id => this.table.getOrDefault(id))
  }

  value() {
    return this.ids.map(id => this.table.getValue(id))
  }

  map(callback) {
    return this.all().map(callback)
  }

  set(ids, meta) {
    if (ids == null) throw new Error('Invalid ids')
    this._setProp('ids', ids)
    if (arguments.length > 1) {
      this.setMeta(meta)
    }
    return this
  }

  setMeta(meta) {
    return this._setProp('meta', meta)
  }

  updateMeta(meta) {
    return this._setProp('meta', { ...this.state.meta, ...meta })
  }

  insert(ids, index) {
    if (ids == null) throw new Error('Invalid ids')
    Array.isArray(ids) || (ids = [ids])

    if (index == null) {
      const currentIds = this.ids.filter(id => ids.indexOf(id) === -1)
      return this.set(currentIds.concat(ids))
    } else {
      const currentIds = this.ids.slice()

      // Remove duplicate ids from the collection before insertion.
      if (currentIds.length) {
        ids.forEach(id => {
          const idx = currentIds.indexOf(id)

          if (idx > -1) {
            currentIds.splice(idx, 1)

            if (idx < index) {
              index--
            }
          }
        })
      }

      currentIds.splice(index, 0, ...ids)
      return this.set(currentIds)
    }
  }

  insertUnique(ids, index) {
    if (ids == null) throw new Error('Invalid ids')
    Array.isArray(ids) || (ids = [ids])
    const currentIds = this.ids.slice()

    // Omit ids that already exist in the collection.
    if (currentIds.length) {
      ids = ids.filter(id => currentIds.indexOf(id) === -1)
    }

    if (ids.length) {
      if (index == null) {
        this.set(currentIds.concat(ids))
      } else {
        currentIds.splice(index, 0, ...ids)
        this.set(currentIds)
      }
    }

    return this
  }

  remove(ids) {
    Array.isArray(ids) || (ids = [ids])
    const updatedIds = this.ids.slice()

    ids.forEach(id => {
      const index = updatedIds.indexOf(id)
      if (index > -1) {
        updatedIds.splice(index, 1)
      }
    })

    if (ids.length !== updatedIds.length) {
      this.set(updatedIds)
    }

    return this
  }

  clear() {
    return this.set([], {})
  }

  delete() {
    const tableState = this.table.state
    let { collections } = tableState

    if (collections && collections[this.key]) {
      collections = { ...collections }
      delete collections[this.key]

      this.state = {}
      this.table.state = { ...tableState, collections }
      this.table.dirty = true
    }
  }

  _setProp(key, value) {
    if (isEqual(this.state[key], value)) return
    const tableState = this.table.state

    this.state = { ...this.state, [key]: value }

    this.table.state = {
      ...tableState,
      collections: {
        ...tableState.collections,
        [this.key]: this.state
      }
    }

    this.table.dirty = true
  }
}

RecordCollection.prototype.find = sharedMethods.find
RecordCollection.prototype.filter = sharedMethods.filter

