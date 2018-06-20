import { RecordModel as DefaultRecordModel } from 'redux-db'

export default class RecordModel extends DefaultRecordModel {
  equals(record) {
    return record && record.value === this.value
  }

  idEquals(record) {
    return record && record.id === this.id
  }
}
