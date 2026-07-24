const app = require('./app');

const PORT = process.env.PORT || 3000;

function start() {
  const server = app.listen(PORT, () => {
    console.log(`云端问候服务已启动，监听端口 ${PORT}`);
    console.log(`版本: v${process.env.VERSION || '1.0.0'}`);
  });
  return server;
}

if (require.main === module) {
  start();
}

module.exports = { start, app };
