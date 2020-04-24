'use strict'

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

function unwrapState (state) {
  if (state.isLocked) {
    throw new Error('Locked')
  }
  state.isLocked = !state.skipLocking
  return state.present
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
    isLocked: false,
    past,
    present,
    future
  })
}

function fluentify (state, fn) {
  return function fluentMethod (...args) {
    return buildState(
      updateState(
        state,
        state.produce(
          unwrapState(state),
          context => fn(context, ...args)
        )
      )
    )
  }
}

function bind (state, fn) {
  return function normalMethod (...args) {
    return fn(unwrapState(state), ...args)
  }
}

function buildState (state) {
  return Object.assign(
    {
      undo: function undoMethod (steps) {
        return buildState(undoState(state, parseNumber(steps, 1)))
      },
      redo: function redoMethod (steps) {
        return buildState(redoState(state, parseNumber(steps, 1)))
      }
    },
    state.constants,
    mapValues(
      state.normalMethods,
      fn => bind(state, fn)
    ),
    mapValues(
      state.fluentMethods,
      fn => fluentify(state, fn)
    )
  )
}

module.exports = function fluente (options) {
  return buildState(createState(options))
}
