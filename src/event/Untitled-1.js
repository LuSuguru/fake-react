class Father {
  static ceshi = {
    a: 1,
    b: 1
  }

  s = 0
  constructor(s) {
    this.s = s
  }
}

class Child extends Father {
  static ceshi = {
    ...Father.ceshi,
    c: 1
  }

  constructor(s, t) {
    super(s)
    this.t = t
  }
}