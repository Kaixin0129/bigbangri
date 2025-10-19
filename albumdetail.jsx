// pages/AlbumDetail.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const AlbumDetail = ({ setCurrentSong, setPlaylist }) => {
  // 获取URL中的动态参数 `id`
  const { id } = useParams();
  const [album, setAlbum] = useState(null);
  const [songs, setSongs] = useState([]);

  // 根据专辑ID获取专辑详情和歌曲列表
  useEffect(() => {
    const fetchAlbumData = async () => {
      // 1. 获取专辑信息 (模拟： fetch(`/api/albums/${id}`))
      const mockAlbum = { id: 1, title: '专辑一', cover_url: '/img/cover1.jpg', artist: '歌手A', release_year: 2023 };
      setAlbum(mockAlbum);

      // 2. 获取该专辑下的歌曲列表 (模拟： fetch(`/api/songs?album_id=${id}`))
      const mockSongs = [
        { id: 101, title: '歌曲一', duration: 180, file_url: '/music/song1.mp3', album_id: 1 },
        { id: 102, title: '歌曲二', duration: 200, file_url: '/music/song2.mp3', album_id: 1 },
      ];
      setSongs(mockSongs);
      // 当进入详情页时，将整个专辑的歌曲设置为播放列表
      setPlaylist(mockSongs);
    };

    fetchAlbumData();
  }, [id, setPlaylist]); // 依赖 id，当切换专辑时重新获取数据

  const handlePlaySong = (song) => {
    // 设置当前播放的歌曲，触发底部播放器播放
    setCurrentSong(song);
  };

  if (!album) return <div>Loading...</div>;

  return (
    <div className="album-detail">
      <div className="album-header">
        <img src={album.cover_url} alt={album.title} className="album-cover-large" />
        <div className="album-meta">
          <h1>{album.title}</h1>
          <p>艺术家：{album.artist}</p>
          <p>发行年份：{album.release_year}</p>
        </div>
      </div>

      <div className="songs-list">
        <h2>歌曲列表</h2>
        <ul>
          {songs.map(song => (
            <li key={song.id} className="song-item" onClick={() => handlePlaySong(song)}>
              <span className="song-title">{song.title}</span>
              <span className="song-duration">{Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AlbumDetail;