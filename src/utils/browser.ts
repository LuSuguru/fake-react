const noTimeout = -1

export function now() {
  const havePerformance: boolean = typeof performance === 'object' && typeof performance.now === 'function'

  if (havePerformance) {
    return performance.now()
  } else {
    return Date.now()
  }
}

export {
  noTimeout,
}
