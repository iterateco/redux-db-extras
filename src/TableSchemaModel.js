import { TableSchemaModel as DefaultTableSchemaModel } from 'redux-db'

export default class TableSchemaModel extends DefaultTableSchemaModel {
  _getPrimaryKey(record) {
    const lookup = (this._primaryKeyFields.length ? this._primaryKeyFields : this._foreignKeyFields)

    const combinedPk = lookup.reduce((p, n) => {
      const k = n.getValue(record)
      return p && k ? (p + "_" + k) : k
    }, null)

    return combinedPk
  }
}
