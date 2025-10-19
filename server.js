// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // 服务当前目录的静态文件

// 模拟数据
const albums = [
  {
    id: 1,
    title: 'BIGBANG - MADE',
    cover_url: 'https://picsum.photos/300/300?random=1',
    artist: 'BIGBANG',
    release_year: 2016,
    description: 'BIGBANG正规专辑'
  },
  {
    id: 2,
    title: 'Still Alive',
    cover_url: 'https://picsum.photos/300/300?random=2',
    artist: 'BIGBANG',
    release_year: 2012,
    description: 'BIGBANG特别专辑'
  }
];

const songs = [
  { id: 101, title: 'BANG BANG BANG', duration: 231, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', album_id: 1 },
  { id: 102, title: 'LOSER', duration: 223, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', album_id: 1 },
  { id: 201, title: 'Fantastic Baby', duration: 245, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', album_id: 2 }
];

// API 路由
app.get('/api/albums', (req, res) => {
  console.log('📀 获取专辑列表');
  res.json({ success: true, data: albums });
});

app.get('/api/albums/:id', (req, res) => {
  const albumId = parseInt(req.params.id);
  console.log(`🎵 获取专辑详情 ID: ${albumId}`);
  
  const album = albums.find(a => a.id === albumId);
  if (!album) {
    return res.status(404).json({ success: false, message: '专辑不存在' });
  }

  const albumSongs = songs.filter(song => song.album_id === albumId);
  res.json({ success: true, data: { ...album, songs: albumSongs } });
});

app.get('/api/songs/:id', (req, res) => {
  const songId = parseInt(req.params.id);
  console.log(`🎶 获取歌曲详情 ID: ${songId}`);
  
  const song = songs.find(s => s.id === songId);
  if (!song) {
    return res.status(404).json({ success: false, message: '歌曲不存在' });
  }

  const album = albums.find(a => a.id === song.album_id);
  res.json({
    success: true,
    data: {
      ...song,
      album_title: album.title,
      artist: album.artist,
      cover_url: album.cover_url
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: '音乐API服务运行正常',
    timestamp: new Date().toISOString()
  });
});

// 关键：处理 wyy.html 的直接访问
app.get('/wyy.html', (req, res) => {
  console.log('🎵 访问音乐播放器页面');
  res.sendFile(path.join(__dirname, 'wyy.html'));
});

// 根路径也可以重定向到音乐播放器（可选）
app.get('/', (req, res) => {
  console.log('🏠 访问根路径，重定向到音乐播放器');
  res.redirect('/wyy.html');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`🎵 音乐播放器: http://localhost:${PORT}/wyy.html`);
  console.log(`📀 API测试: http://localhost:${PORT}/api/albums`);
});