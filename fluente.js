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
    historySize: options.historySize || 10,
    isShareable: !!options.share,
    isBranchable: !!options.branch,
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
  state.isLocked = !state.isBranchable
  return state.present
}

function assignState (state, partial) {
  return state.isShareable
    ? Object.assign(state, partial)
    : Object.assign({}, state, partial)
}

function updateState (state, context) {
  return assignState(state, {
    isLocked: false,
    past: takeRight([...state.past, state.present], state.historySize),
    present: context,
    future: []
  })
}

function parseSteps (steps = 1) {
  return typeof steps !== 'number' || isNaN(steps) || steps < 0
    ? 0
    : steps
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
    isLocked: false,
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
        return buildState(undoState(state, parseSteps(steps)))
      },
      redo: function redoMethod (steps) {
        return buildState(redoState(state, parseSteps(steps)))
      }
    },
    state.constants,
    mapValues(
      state.normalMethods,
      method => bind(state, method)
    ),
    mapValues(
      state.fluentMethods,
      method => fluentify(state, method)
    )
  )
}

module.exports = function fluente (options = {}) {
  return buildState(createState(options))
}
