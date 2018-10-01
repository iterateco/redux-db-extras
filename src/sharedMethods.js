export default {
  find(predicate, context) {
    const record = this.schema.db.factory.newRecordModel("*", this)
    const result = this.state.ids.find((id, i) => {
      record._id = id
      return predicate.call(context, record, i)
    })

    return result != null ? record : result
  },

  filter(predicate, context) {
    const { factory } = this.schema.db
    const dummyRecord = factory.newRecordModel("*", this)

    return this.state.ids.reduce((acc, id, i) => {
      dummyRecord._id = id
      if (predicate.call(context, dummyRecord, i)) {
        acc.push(factory.newRecordModel(id, this))
      }
      return acc
    }, [])
  }
}