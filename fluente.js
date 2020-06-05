'use strict'

const Herry = require('herry')

function set (object, path, value) {
  object[path] = value
  return object
}

function mapValues (object, iteratee) {
  return Object.keys(object).reduce(
    (acc, key) => set(acc, key, iteratee(object[key], key)),
    {}
  )
}

function takeRight (array, n) {
  return array.length > n
    ? array.slice(array.length - n)
    : array
}

function parseNumber (value, defaultValue) {
  return value === undefined
    ? defaultValue
    : typeof value !== 'number' || isNaN(value) || value < 0
    ? 0
    : value
}

function defaultProducer (state, mapper) {
  return Object.assign(
    {},
    state,
    mapper(state)
  )
}

function createState (options) {
  return {
    fluentMethods: options.fluent || {},
    normalMethods: options.methods || {},
    constants: options.constants || {},
    historySize: parseNumber(options.historySize, 10),
    sharedState: !!options.sharedState,
    skipLocking: !!options.skipLocking,
    isLocked: false,
    past: [],
    present: options.state || {},
    future: [],
    produce: options.produce || defaultProducer
  }
}

function readContext (state) {
  if (state.isLocked) {
    throw new Herry('FLUENTE_LOCKED', 'Locked')
  }
  return state.present
}

function lockState (state) {
  state.isLocked = !state.skipLocking
}

function unwrapState (state) {
  const ctx = readContext(state)
  lockState(state)
  return ctx
}

function assignState (state, partial) {
  return state.sharedState
    ? Object.assign(state, partial, { isLocked: false })
    : Object.assign({}, state, partial, { isLocked: false })
}

function updateState (state, present) {
  return assignState(state, {
    past: takeRight([...state.past, state.present], state.historySize),
    present,
    future: []
  })
}

function undoState (state, steps) {
  const past = state.past.slice()
  let present = unwrapState(state)
  const future = state.future.slice()
  for (let i = 0; i < steps && past.length > 0; i++) {
    future.push(present)
    present = past.pop()
  }
  return assignState(state, {
    past,
    present,
    future
  })
}

function redoState (state, steps) {
  const past = state.past.slice()
  let present = unwrapState(state)
  const future = state.future.slice()
  for (let i = 0; i < steps && future.length > 0; i++) {
    past.push(present)
    present = future.pop()
  }
  return assignState(state, {
    past,
    present,
    future
  })
}

function fluentify (state, fn, key) {
  return Object.defineProperty(
    function (...args) {
      const out = state.produce(
        readContext(state),
        context => fn.call(null, context, ...args)
      )
      lockState(state)
      return buildState(updateState(state, out))
    },
    'name',
    { value: key }
  )
}

function methodify (state, fn, key) {
  return Object.defineProperty(
    function (...args) {
      const out = fn.call(null, readContext(state), ...args)
      lockState(state)
      return out
    },
    'name',
    { value: key }
  )
}

function buildState (state) {
  return Object.assign(
    {
      undo (steps) {
        return buildState(undoState(state, parseNumber(steps, 1)))
      },
      redo (steps) {
        return buildState(redoState(state, parseNumber(steps, 1)))
      }
    },
    state.constants,
    mapValues(
      state.normalMethods,
      (fn, key) => methodify(state, fn, key)
    ),
    mapValues(
      state.fluentMethods,
      (fn, key) => fluentify(state, fn, key)
    )
  )
}

module.exports = function fluente (options) {
  return buildState(createState(options))
}
