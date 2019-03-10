// Math.pow(2, 30) - 1
const MAX_SIGNED_31_BIT_INT = 1073741823

type ExpirationTime = number

const NoWork = 0
const Never = 1
const Sync = MAX_SIGNED_31_BIT_INT

const UNIT_SIZE = 10
const MAGIC_NUMBER_OFFSET = MAX_SIGNED_31_BIT_INT - 1

function msToExpirationTime(ms: number): ExpirationTime {
  return MAGIC_NUMBER_OFFSET - ((ms / UNIT_SIZE) | 0)
}

function expirationTimeToMS(expirationTime: ExpirationTime): number {
  return (MAX_SIGNED_31_BIT_INT - expirationTime) * UNIT_SIZE
}

export {
  ExpirationTime,
  NoWork,
  Never,
  Sync,
  msToExpirationTime,
  expirationTimeToMS,
}
