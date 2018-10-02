import { TableModel as DefaultTableModel } from 'redux-db'
import { DEFAULT_COLLECTION_KEY } from './constants'
import sharedMethods from './sharedMethods'
import RecordCollection from './RecordCollection'

export default class TableModel extends DefaultTableModel {
  getRecordCollectionClass() {
    return RecordCollection
  }

  ingest(data) {
    const isArray = Array.isArray(data)
    isArray || (data = [data])
    this.upsert(data)
    const ids = data.map(obj => this.schema.getPrimaryKey(obj))
    return isArray ? ids : ids[0]
  }

  upsert(data) {
    const isArray = Array.isArray(data)
    const models = super.upsert.call(this, data)
    return isArray ? models : models[0]
  }

  collection(key = DEFAULT_COLLECTION_KEY) {
    const RecordCollection = this.getRecordCollectionClass()
    return new RecordCollection(this, key)
  }

  purgeUnreferencedRecords(exceptIds = []) {
    const { tables } = this.session
    const { ids, byId, indexes, collections } = this.state

    const nextById = exceptIds.reduce((acc, id) => {
      if (byId[id]) acc[id] = byId[id]
      return acc
    }, {})

    if (collections) {
      Object.keys(collections).forEach(key => {
        const { ids = [] } = collections[key]
        ids.forEach(id => {
          nextById[id] = byId[id]
        })
      })
    }

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
    const nextIndexes = {}
    let indexesUpdated

    Object.keys(indexes).forEach(relationName => {
      const index = indexes[relationName]
      const nextValues = {}
      let valuesUpdated

      Object.keys(index.values).forEach(foreignKey => {
        const value = index.values[foreignKey]
        const nextValue = value.filter(id => nextById[id])

        if (nextValue.length !== value.length) {
          valuesUpdated = true
          if (nextValue.length) {
            nextValues[foreignKey] = nextValue
          }
        } else {
          nextValues[foreignKey] = value
        }
      })
      
      if (valuesUpdated) {
        nextIndexes[relationName] = { ...index, values: nextValues }
        indexesUpdated = true
      } else {
        nextIndexes[relationName] = index
      }
    })

    this.state = {
      ...this.state,
      ids: nextIds,
      byId: nextById,
      indexes: indexesUpdated ? nextIndexes : indexes
    }

    this.dirty = true
  }

  /**
   * Fix state mutation bug 
   */
  updateNormalized(table) {
    let dirty
    let { state } = this

    const records = Object.keys(table.byId).map(id => {
      if (!state.byId[id])
        throw new Error("Failed to apply update. No \"" + this.schema.name + "\" record with id: " + id + " exists.")

      const oldRecord = state.byId[id]
      const newRecord = { ...oldRecord, ...table.byId[id] }

      const isModified = this.schema.isModified(oldRecord, newRecord)

      if (isModified) {
        if (!this.dirty) {
          state = { ...state, byId: { ...state.byId } }
          this.dirty = true
        }

        dirty = true
        state.byId[id] = newRecord
      }

      return this.schema.db.factory.newRecordModel(id, this)
    })

    if (dirty) {
      this.state = state
      this._updateIndexes(table)
    }

    return records
  }

  _cleanIndexes(id, record, indexes) {
    super._cleanIndexes(id, record, indexes)

    const { collections } = this.state
    if (!collections) return

    const nextCollections = {}
    let collectionsUpdated

    Object.keys(collections).forEach(key => {
      let { ids = [] } = collections[key]
      const index = ids.indexOf(id)

      if (index > -1) {
        ids = ids.slice()
        ids.splice(index, 1)
        nextCollections[key] = { ...collections[key], ids }
        collectionsUpdated = true
      } else {
        nextCollections[key] = collections[key]
      }
    })

    if (collectionsUpdated) {
      this.state = {
        ...this.state,
        collections: nextCollections
      }
    }
  }
}

TableModel.prototype.find = sharedMethods.find
TableModel.prototype.filter = sharedMethods.filter