import { TableModel as DefaultTableModel } from 'redux-db'
import { DEFAULT_COLLECTION_KEY } from './constants'
import RecordCollection from './RecordCollection'

export default class TableModel extends DefaultTableModel {
  ingest(data) {
    const isArray = Array.isArray(data)
    isArray || (data = [data])
    this.upsert(data)
    const ids = data.map(obj => this.schema.getPrimaryKey(obj))
    return isArray ? ids : ids[0]
  }

  getRecordCollectionClass() {
    return RecordCollection
  }

  collection(key = DEFAULT_COLLECTION_KEY) {
    const RecordCollection = this.getRecordCollectionClass()
    return new RecordCollection(this, key)
  }

  _cleanIndexes(id, record, indexes) {
    super._cleanIndexes(id, record, indexes)

    const { collections } = this.state
    if (!collections) return

    let updatedCollections

    Object.keys(collections).forEach(key => {
      let { ids } = collections[key]
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
