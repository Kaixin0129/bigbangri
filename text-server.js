import express from 'express';
const app = express();
const PORT = 3000;

app.use(express.static('.'));

app.listen(PORT, () => {
  console.log('✅ 服务器启动成功！');
  console.log('🚀 访问: http://localhost:3000/wyy.html');
});