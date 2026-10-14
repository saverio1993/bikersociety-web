const { send } = require('../_lib');
module.exports = (req, res) => send(res, 200, { key: process.env.VAPID_PUBLIC_KEY || '' });
