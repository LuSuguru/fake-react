export function shallowEqual(objA: any, objB: any): boolean {
  if (Object.is(objA, objB)) {
    return true
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) {
    return false
  }

  for (let i = 0; i < keysA.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(objB, keysA[i]) || !Object.is(objA[keysA[i]], objB[keysA[i]])) {
      return false
    }
  }

  return true
}

export function getToStringValue(value: any) {
  switch (typeof value) {
    case 'boolean':
    case 'number':
    case 'object':
    case 'string':
    case 'undefined':
      return value
    default:
      return ''
  }
}

export function forEachAccumulated<T>(arr: T[] | T, cb: (elem: T) => void, scope?: any) {
  if (Array.isArray(arr)) {
    arr.forEach(cb, scope)
  } else if (arr) {
    cb.call(scope, arr)
  }
}

export function accumulateInto<T>(current: T | T[], next?: T[] | T): T | T[] {
  if (current == null) {
    return next
  }

  if (Array.isArray(current)) {
    if (Array.isArray(next)) {
      current.push.apply(current, next)
      return current
    }
    current.push(next)
    return current
  }

  if (Array.isArray(next)) {
    return [current].concat(next)
  }

  return [current, next]
}
