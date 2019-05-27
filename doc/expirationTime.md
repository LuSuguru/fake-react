# 源码解析二 expirationTime 优先级与过期时间
优先级与过期时间，它们之间可以相互转化，，过期时间用毫秒表示，优先级单位我们用 ExpirationTime 表示。为了便于理解，在转化为优先级时，采用了减法，并消除了10ms内的误差，如果某个节点的过期时间越长，那么它的 ExpirationTime 越小，说明它优先级越低。

另外，这里很牵涉到两种异步的优先级计算，Async 和 Interactive，Interactive 优先级较高，一般用于事件。

拿 Async 举例，这里的时间是 1073741823 - (((1073741823 - currentTime + 5000 / 10) / 25)|0 + 1) * 25，注意这里的 currentTime 也是已经转化过的优先级单位，注意这里的25，是由 250 / UNIT_SIZE 得来

附上源码：

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

function expirationTimeToMS(expirationTime: ExpirationTime): number {
  return (MAX_SIGNED_31_BIT_INT - expirationTime) * UNIT_SIZE
}

// 优先级转过期时间
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

// 向后 5000ms，抹平250ms的误差
function computeAsyncExpiration(currentTime: ExpirationTime): ExpirationTime {
  return computeExpirationBucket(currentTime, 5000, 250)
}

// 向后 150 ms ,抹平100ms内误差
function computeInteractiveExpiration(currentTime: ExpirationTime): ExpirationTime {
  return computeExpirationBucket(currentTime, 150, 100)
}
```



