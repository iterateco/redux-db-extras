import { createSelector, createStructuredSelector } from 'reselect'
import { DEFAULT_COLLECTION_KEY } from './constants'

export default class SelectorFactory {
  constructor(db, stateKey = 'db') {
    this.db = db
    this.stateKey = stateKey
    this._relatedTableNamesCache = {}
  }

  record(tableName) {
    return createSelector(
      this.createTablesSelector(tableName),
      (state, id) => id,
      (tables, id) => {
        const table = this.db.selectTables(tables)[tableName]
        if (table.exists(id)) {
          return table.get(id)
        }
      }
    )
  }

  collection(tableName, defaultKey = DEFAULT_COLLECTION_KEY) {
    return createSelector(
      this.createTablesSelector(tableName),
      (state, key = defaultKey) => key,
      (tables, key) => {
        const table = this.db.selectTables(tables)[tableName]
        const collection = table.collection(key)

        if (collection.exists()) {
          const recordArray = collection.all()
          recordArray.meta = collection.meta
          return recordArray
        }
      }
    )
  }

  createTablesSelector(tableNames) {
    if (!Array.isArray(tableNames)) {
      tableNames = [tableNames].concat(this._getRelatedTableNames(tableNames))
    }

    return createStructuredSelector(
      tableNames.reduce((acc, name) => {
        acc[name] = state => state[this.stateKey][name]
        return acc
      }, {})
    )
  }

  _getRelatedTableNames(name) {
    if (!this._relatedTableNamesCache[name]) {
      const schema = this.db.tables.find(schema => schema.name === name)
      const tableNames = []

      schema.fields.forEach(f => {
        if (f.isForeignKey && f.references !== name) {
          tableNames.push(f.references)
        }
      })

      schema.relations.forEach(f => {
        if (f.relationName && f.references !== name && tableNames.indexOf(f.references) === -1) {
          tableNames.push(f.references)
        }
      })

      this._relatedTableNamesCache[name] = tableNames
    }

    return this._relatedTableNamesCache[name]
  }
}
