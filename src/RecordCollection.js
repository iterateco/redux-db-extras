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

  map(callback) {
    return this.all().map(callback)
  }

  filter(callback) {
    return this.all().filter(callback)
  }

  set(ids, meta) {
    const props = { ids }
    props.meta = arguments.length > 1 ? meta : this.meta
    return this._setProps(props)
  }

  setMeta(meta) {
    return this._setProps({ meta })
  }

  insert(ids, index) {
    Array.isArray(ids) || (ids = [ids])

    if (index == null) {
      return this.set(this.ids.concat(ids))
    } else {
      return this.set(this.ids.slice().splice(index, 0, ...ids))
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
    return this.set([], undefined)
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
        [this.key]: props
      }
    }

    this.table.dirty = true
    return this
  }
}