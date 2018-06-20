import { DefaultModelFactory } from 'redux-db'
import TableModel from './TableModel'
import RecordModel from './RecordModel'

export default class ModelFactory extends DefaultModelFactory {
  newTableModel(session, state, schema) {
    return new TableModel(session, state, schema)
  }

  getRecordBaseClass(schema) {
    return RecordModel
  }

  _createRecordModel(schema) {
    if (this._recordClass[schema.name])
      return this._recordClass[schema.name]
    else {
      const ExtendedRecordModel = createRecordModelClass(this.getRecordBaseClass(schema))

      const defineAttributeProperty = (name, field, factory) => {
        assertFieldName(field, name)

        Object.defineProperty(ExtendedRecordModel.prototype, name, {
          get() {
            const f = factory(field, this)
            return f && f.value
          }
        })
      }

      const defineRelationProperty = (name, field, factory, cache = true) => {
        assertFieldName(field, name)

        Object.defineProperty(ExtendedRecordModel.prototype, name, {
          get() {
            // TODO: Improve the instance cache mechanism. Invalidate when the field value changes..
            return cache ? (this.__fields[name] || (this.__fields[name] = factory(field, this))) : factory(field, this)
          }
        })
      }

      schema.fields.forEach(f => (f.isForeignKey || !f.isPrimaryKey) && defineAttributeProperty(f.propName, f, this.newRecordField.bind(this)))
      schema.relations.forEach(f => f.relationName && defineRelationProperty(f.relationName, f, f.unique ? this.newRecordRelation.bind(this) : this.newRecordSet.bind(this), !f.unique))

      return this._recordClass[schema.name] = ExtendedRecordModel
    }
  }
}

function createRecordModelClass(BaseClass) {
  return class ExtendedRecordModel extends BaseClass {
    __fields = {}
  }
}

function assertFieldName(field, name) {
  if (name === "id") {
    throw new Error(`The property "${field.table.name}.${name}" is a reserved name. Please specify another name using the "propName" definition.`)
  }
}
