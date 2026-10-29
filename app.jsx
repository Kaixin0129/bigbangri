
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import AlbumList from './pages/AlbumList';
import AlbumDetail from './pages/AlbumDetail';
import Player from './components/Player';

function App() {
  
  const [currentSong, setCurrentSong] = useState(null);
  
  const [playlist, setPlaylist] = useState([]);

  return (
    <Router>
      {/* 主要内容区域 */}
      <div className="main-content">
        <Routes>
          <Route path="/album" element={<AlbumList />} />
          {/* :id 是动态参数，代表专辑ID */}
          <Route path="/album/:id" element={
            <AlbumDetail 
              setCurrentSong={setCurrentSong} 
              setPlaylist={setPlaylist}
            />
          } />
        </Routes>
      </div>

      {/* 底部播放器 - 始终存在，但没歌曲时不显示 */}
      {currentSong && <Player currentSong={currentSong} playlist={playlist} setCurrentSong={setCurrentSong} />}
    </Router>
  );
}

export default App;