import { RecordModel as DefaultRecordModel } from 'redux-db'

export default class RecordModel extends DefaultRecordModel {
  get id() {
    if (this.table.schema._primaryKeyFields.length === 1) {
      return this.table.state.byId[this._id][this.table.schema._primaryKeyFields[0].propName]
    }
    return this._id
  }

  set id(value) {
    this._id = value
  }

  equals(record) {
    return record && record.value === this.value
  }

  idEquals(record) {
    return record && record._id === this._id
  }
}
