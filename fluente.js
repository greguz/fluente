'use strict'

const Herry = require('herry')

const stateSymbol = Symbol('fluente')

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

function build (state) {
  const obj = {}
  Object.defineProperty(obj, stateSymbol, { value: state })
  Object.defineProperties(obj, state.descriptors)
  return obj
}

function fluentify (fn, key) {
  return Object.defineProperty(
    function (...args) {
      const state = this[stateSymbol]
      const out = state.produce(
        readContext(state),
        context => fn.call(null, context, ...args)
      )
      lockState(state)
      return build(updateState(state, out))
    },
    'name',
    { value: key }
  )
}

function methodify (fn, key) {
  return Object.defineProperty(
    function (...args) {
      const state = this[stateSymbol]
      const out = fn.call(null, readContext(state), ...args)
      lockState(state)
      return out
    },
    'name',
    { value: key }
  )
}

function undo (steps) {
  return build(undoState(this[stateSymbol], parseNumber(steps, 1)))
}

function redo (steps) {
  return build(redoState(this[stateSymbol], parseNumber(steps, 1)))
}

function createDescriptors (constants, normalMethods, fluentMethods) {
  return Object.assign(
    {
      undo: {
        configurable: true,
        value: undo,
        writable: true
      },
      redo: {
        configurable: true,
        value: redo,
        writable: true
      }
    },
    mapValues(constants, value => ({
      configurable: true,
      enumerable: true,
      value,
      writable: true
    })),
    mapValues(normalMethods, (fn, key) => ({
      configurable: true,
      value: methodify(fn, key),
      writable: true
    })),
    mapValues(fluentMethods, (fn, key) => ({
      configurable: true,
      value: fluentify(fn, key),
      writable: true
    }))
  )
}

module.exports = function fluente (options) {
  return build({
    historySize: parseNumber(options.historySize, 10),
    sharedState: !!options.sharedState,
    skipLocking: !!options.skipLocking,
    isLocked: false,
    past: [],
    present: options.state || {},
    future: [],
    produce: options.produce || defaultProducer,
    descriptors: createDescriptors(
      options.constants || {},
      options.methods || {},
      options.fluent || {}
    )
  })
}
