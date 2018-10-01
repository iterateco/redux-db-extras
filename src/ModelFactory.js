import { DefaultModelFactory } from 'redux-db'
import RecordModel from './RecordModel'
import TableModel from './TableModel'
import TableSchemaModel from './TableSchemaModel'

export default class ModelFactory extends DefaultModelFactory {  
  getRecordBaseClass(schema) {
    return RecordModel
  }

  newTableSchema(db, name, schema) {
    return new TableSchemaModel(db, name, schema)
  }

  newTableModel(session, state, schema) {
    return new TableModel(session, state, schema)
  }

  createRecordModel(schema) {
    if (this._recordClass[schema.name])
      return this._recordClass[schema.name]
    else {
      const ExtendedRecordModel = createRecordModelClass(this.getRecordBaseClass(schema))

      const defineAttributeProperty = (name, field, factory) => {
        assertFieldName(field, name)

        Object.defineProperty(ExtendedRecordModel.prototype, name, {
          get() {
            return factory(field, this)
          }
        })
      }

      const defineRelationProperty = (name, field, factory, cache = true) => {
        assertFieldName(field, name)

        Object.defineProperty(ExtendedRecordModel.prototype, name, {
          get() {
            // TODO: Improve the instance cache mechanism. Invalidate when the field value changes..
            return cache ? (this._fields[name] || (this._fields[name] = factory(field, this))) : factory(field, this)
          }
        })
      }

      schema.fields.forEach(f => (f.isForeignKey || !f.isPrimaryKey) && defineAttributeProperty(f.propName, f, f.references ? this._newRecordField : this._newRecordValueField.bind(this)))
      schema.relations.forEach(f => f.relationName && defineRelationProperty(f.relationName, f, f.unique ? this._newRecordRelation.bind(this) : this._newRecordSet.bind(this), !f.unique))

      return this._recordClass[schema.name] = ExtendedRecordModel
    }
  }

  _newRecordValueField(schema, record) {
    const field = this._newRecordField(schema, record)
    return field && field.value
  }
}

function createRecordModelClass(BaseClass) {
  return class ExtendedRecordModel extends BaseClass {
    _fields = {}
  }
}

function assertFieldName(field, name) {
  if (name === "id") {
    throw new Error(`The property "${field.table.name}.${name}" is a reserved name. Please specify another name using the "propName" definition.`)
  }
}
