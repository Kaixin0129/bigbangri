// pages/AlbumList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AlbumList = () => {
  const [albums, setAlbums] = useState([]);

  // 模拟从后端API获取专辑列表
  useEffect(() => {
    // 替换为您的真实API，例如：fetch('/api/albums')
    const fetchAlbums = async () => {
      // 模拟数据
      const mockAlbums = [
        { id: 1, title: '专辑一', cover_url: '/img/cover1.jpg', artist: '歌手A', release_year: 2023 },
        { id: 2, title: '专辑二', cover_url: '/img/cover2.jpg', artist: '歌手B', release_year: 2022 },
      ];
      setAlbums(mockAlbums);
    };
    fetchAlbums();
  }, []);

  return (
    <div className="album-list">
      <h1>所有专辑</h1>
      <div className="albums-grid">
        {albums.map(album => (
          <Link to={`/album/${album.id}`} key={album.id} className="album-card">
            <img src={album.cover_url} alt={album.title} />
            <div className="album-info">
              <h3>{album.title}</h3>
              <p>{album.artist}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AlbumList;