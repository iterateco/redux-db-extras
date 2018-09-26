import { TableModel as DefaultTableModel } from 'redux-db'
import { DEFAULT_COLLECTION_KEY } from './constants'
import RecordCollection from './RecordCollection'

export default class TableModel extends DefaultTableModel {
  getRecordCollectionClass() {
    return RecordCollection
  }

  find(predicate, context) {
    const record = this.schema.db.factory.newRecordModel("*", this)
    const result = this.state.ids.find((id, i) => {
      record.id = id
      return predicate.call(context, record, i)
    })

    return result != null ? record : result
  }

  filter(predicate, context) {
    const { factory } = this.schema.db
    const dummyRecord = factory.newRecordModel("*", this)

    return this.state.ids.reduce((acc, id, i) => {
      dummyRecord.id = id
      if (predicate.call(context, dummyRecord, i)) {
        acc.push(factory.newRecordModel(id, this))
      }
      return acc
    }, [])
  }

  ingest(data) {
    const isArray = Array.isArray(data)
    isArray || (data = [data])
    this.upsert(data)
    const ids = data.map(obj => this.schema.getPrimaryKey(obj))
    return isArray ? ids : ids[0]
  }

  collection(key = DEFAULT_COLLECTION_KEY) {
    const RecordCollection = this.getRecordCollectionClass()
    return new RecordCollection(this, key)
  }

  purgeUnreferencedRecords(exceptIds = []) {
    const { tables } = this.session
    const { ids, byId, indexes, collections = {} } = this.state

    const nextById = exceptIds.reduce((acc, id) => {
      if (byId[id]) acc[id] = byId[id]
      return acc
    }, {})

    Object.keys(collections).forEach(key => {
      const { ids = [] } = collections[key]
      ids.forEach(id => {
        nextById[id] = byId[id]
      })
    })

    this.schema.relations.forEach(f => {
      const idx = tables[f.table.name].state.indexes[f.propName]

      if (idx) {
        Object.keys(idx.values).forEach(id => {
          nextById[id] = byId[id]
        })
      }
    })

    const nextIds = ids.reduce((acc, id) => {
      if (nextById[id]) {
        acc.push(id)
      }
      return acc
    }, [])

    // Exit if no records were dereferenced.
    if (ids.length === nextIds.length) return

    // Clean indexes.
    const nextIndexes = Object.keys(indexes).reduce((acc, key) => {
      const index = indexes[key]
      const values = Object.keys(index.values).reduce((acc, foreignId) => {
        const value = index.values[foreignId].filter(id => nextById[id])
        if (value.length) {
          acc[foreignId] = value
        }
        return acc
      }, {})

      acc[key] = { ...index, values }
      return acc
    }, {})

    this.state = {
      ...this.state,
      ids: nextIds,
      byId: nextById,
      indexes: nextIndexes
    }

    this.dirty = true
  }

  _cleanIndexes(id, record, indexes) {
    super._cleanIndexes(id, record, indexes)

    const { collections } = this.state
    if (!collections) return

    let updatedCollections

    Object.keys(collections).forEach(key => {
      let { ids = [] } = collections[key]
      const index = ids.indexOf(id)

      if (index > -1) {
        updatedCollections || (updatedCollections = { ...collections })
        ids = ids.slice()
        ids.splice(index, 1)
        updatedCollections[key] = { ...collections[key], ids }
      }
    })

    if (updatedCollections) {
      this.state = {
        ...this.state,
        collections: updatedCollections
      }
    }
  }
}
