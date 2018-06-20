import { createDatabase as defaultCreateDatabase } from 'redux-db'
import ModelFactory from './ModelFactory'

export { default as ModelFactory } from './ModelFactory'
export { default as SelectorFactory } from './SelectorFactory'
export { default as TableModel } from './TableModel'
export { default as RecordModel } from './RecordModel'
export { default as RecordCollection } from './RecordCollection'

export function createDatabase(schema, options = {}) {
  const {
    factory = new ModelFactory(),
    onMissingPk = createPkGenerator(),
    ...rest
  } = options

  return defaultCreateDatabase(schema, {
    factory,
    onMissingPk,
    ...rest
  })
}

export function createPkGenerator(prefix = '@') {
  if (prefix == null) prefix = ''
  const pkCounters = {}

  return function generatePk(ref, table) {
    const counter = (pkCounters[table.name] || 0) + 1
    pkCounters[table.name] = counter
    return prefix + counter
  }
}

export function wrappedSessionCreator(db, stateKey = 'db') {
  const sessionCreator = stateKey != null
    ? state => createSessionProxy(db, state, stateKey)
    : state => db.createSession(state)

  return function createWrappedSession(state, callback) {
    return wrapSession(sessionCreator(state), callback)
  } 
}

export function createSessionProxy(db, state, stateKey = 'db') {
  const session = db.createSession(state[stateKey])

  return {
    tables: session.tables,
    commit: () => ({ [stateKey]: session.commit() }),
    upsert: () => session.upsert.bind(session)
  }
}

export function wrapSession(session, callback) {
  if (!callback) return session

  if (callback.then) {
    throw new Error('Asynchronous database sessions are not allowed.')
  }

  const update = callback(session.tables, session)

  return {
    ...update,
    ...session.commit()
  }
}
