export default class RecordCollection {
  constructor(table, key) {
    this.table = table
    this.key = key
  }

  get ids() {
    return this._getProps().ids || []
  }

  get length() {
    return this.ids.length
  }

  get meta() {
    return this._getProps().meta || {}
  }

  exists() {
    return !!this._getProps().ids
  }

  all() {
    const { factory } = this.table.schema.db
    return this.ids.map(id => factory.newRecordModel(id, this.table))
  }

  value() {
    return this.ids.map(id => this.table.getValue(id))
  }

  map(callback) {
    return this.all().map(callback)
  }

  filter(callback) {
    return this.all().filter(callback)
  }

  set(ids, meta) {
    const props = { ids }
    if (arguments.length > 1) {
      props.meta = meta
    }
    return this._setProps(props)
  }

  setMeta(meta) {
    return this._setProps({ meta })
  }

  updateMeta(meta) {
    return this.setMeta({ ...this.meta, ...meta })
  }

  insert(ids, index) {
    Array.isArray(ids) || (ids = [ids])
    const currentIds = this.ids.slice()

    // Remove duplicate ids from the collection before insertion.
    if (currentIds.length) {
      ids.forEach((id, i) => {
        const idx = currentIds.indexOf(id)

        if (idx > -1) {
          currentIds.splice(idx, 1)

          if (idx < index) {
            index--
          }
        }
      })
    }

    if (index == null) {
      return this.set(currentIds.concat(ids))
    } else {
      currentIds.splice(index, 0, ...ids)
      return this.set(currentIds)
    }
  }

  insertUnique(ids, index) {
    Array.isArray(ids) || (ids = [ids])
    const currentIds = this.ids.slice()

    // Omit ids that already exist in the collection.
    if (currentIds.length) {
      ids = ids.filter(id => currentIds.indexOf(id) === -1)
    }

    if (index == null) {
      return this.set(currentIds.concat(ids))
    } else {
      currentIds.splice(index, 0, ...ids)
      return this.set(currentIds)
    }
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

    return this.set(updatedIds)
  }

  clear() {
    return this.set([], {})
  }

  delete() {
    const { state } = this.table
    let { collections } = state

    if (collections && collections[this.key]) {
      collections = { ...collections }
      delete collections[this.key]

      this.table.state = { ...state, collections }
      this.table.dirty = true
    }
  }

  _getProps() {
    return (this.table.state.collections || {})[this.key] || {}
  }

  _setProps(props) {
    const { state } = this.table
    const { collections = {} } = state

    this.table.state = {
      ...state,
      collections: {
        ...collections,
        [this.key]: {
          ...collections[this.key],
          ...props 
        }
      }
    }

    this.table.dirty = true
    return this
  }
}
