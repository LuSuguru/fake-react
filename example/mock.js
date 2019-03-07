const proxy = {
  'GET /repos/hello.do': (body, res) => res.json({
    text: 'this is from mock server123'
  }),

  'POST /api/login/account': (body, res) => res.json({
    status: 'ok123',
    code: 0,
    text: "ceshsds",
    data: {
      id: 1,
      username: 'kenny',
      sex: 6
    }
  })
}

module.exports = proxy;