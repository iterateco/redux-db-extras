import { createSelector, createStructuredSelector } from 'reselect'
import { DEFAULT_COLLECTION_KEY } from './constants'

export default class SelectorFactory {
  constructor(db, stateKey = 'db') {
    this.db = db
    this.stateKey = stateKey
    this._relatedTableNamesCache = {}
  }

  create(tableNames, ...selectors) {
    const singleTable = !Array.isArray(tableNames)
    const resultSelector = selectors.pop()

    return createSelector(
      this._createTablesSelector(this._resolveTableNames(tableNames)),
      ...selectors,
      (state, ...args) => {
        const tables = this.db.selectTables(state)
        return resultSelector(singleTable ? tables[tableNames] : tables, ...args)
      }
    )
  }

  record(tableNames, defaultIdOrPredicate) {
    tableNames = this._resolveTableNames(tableNames)

    return this.create(
      this._resolveTableNames(tableNames),
      (state, idOrPredicate = defaultIdOrPredicate) => idOrPredicate,
      (tables, idOrPredicate) => {
        const table = tables[tableNames[0]]
        return typeof idOrPredicate === 'function'
          ? table.find(idOrPredicate)
          : table.getOrDefault(idOrPredicate) || undefined
      }
    )
  }

  recordArray(tableNames, defaultPredicate) {
    tableNames = this._resolveTableNames(tableNames)

    return this.create(
      tableNames,
      (state, predicate = defaultPredicate) => predicate,
      (tables, predicate) => {
        const table = tables[tableNames[0]]
        return predicate
          ? table.filter(predicate)
          : table.all()
      }
    )
  }

  collection(tableNames, defaultKey = DEFAULT_COLLECTION_KEY) {
    tableNames = this._resolveTableNames(tableNames)

    return this.create(
      tableNames,
      (state, key = defaultKey) => key,
      (tables, key) => {
        const collection = tables[tableNames[0]].collection(key)

        if (collection.exists()) {
          const recordArray = collection.all()
          recordArray.meta = collection.meta
          return recordArray
        }
      }
    )
  }

  collectionValue(tableName, defaultKey = DEFAULT_COLLECTION_KEY) {
    return this.create(
      tableName,
      (state, key = defaultKey) => key,
      (table, key) => {
        const collection = table.collection(key)

        if (collection.exists()) {
          return collection.value()
        }
      }
    )
  }

  _resolveTableNames(tableNames) {
    if (Array.isArray(tableNames)) {
      return tableNames
    }
    return [tableNames].concat(this._getRelatedTableNames(tableNames))
  }

  _createTablesSelector(tableNames) {
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
