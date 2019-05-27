# 源码解析二 expirationTime 优先级与过期时间
优先级与过期时间，它们之间可以相互转化，这里为了便于理解，在转化为优先级单位时，采用了减法，如果某个节点的过期时间越长，那么它的 ExpirationTime 越小，说明它优先级越低



附上上源码：

``` javaScript
// Math.pow(2, 30) - 1
export const MAX_SIGNED_31_BIT_INT = 1073741823

type ExpirationTime = number

const NoWork = 0
const Never = 1
const Sync = MAX_SIGNED_31_BIT_INT

const UNIT_SIZE = 10
const MAGIC_NUMBER_OFFSET = MAX_SIGNED_31_BIT_INT - 1

function ceiling(num: number, precision: number): number {
  return (((num / precision) | 0) + 1) * precision
}

// 过期时间转优先级 
function msToExpirationTime(ms: number): ExpirationTime {
  return MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0)
}

// 优先级转过期时间
function expirationTimeToMS(expirationTime: ExpirationTime): number {
  return (MAX_SIGNED_31_BIT_INT - expirationTime) * UNIT_SIZE
}

function computeExpirationBucket(
  currentTime: ExpirationTime,
  expirationInMs: number,
  bucketSizeMs: number): ExpirationTime {
  return (
    MAGIC_NUMBER_OFFSET -
    ceiling(
      MAGIC_NUMBER_OFFSET - currentTime + expirationInMs / UNIT_SIZE,
      bucketSizeMs / UNIT_SIZE,
    )
  )
}

function computeAsyncExpiration(currentTime: ExpirationTime): ExpirationTime {
  return computeExpirationBucket(currentTime, 5000, 250)
}

function computeInteractiveExpiration(currentTime: ExpirationTime): ExpirationTime {
  return computeExpirationBucket(currentTime, 150, 100)
}
```


