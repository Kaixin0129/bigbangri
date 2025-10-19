// components/Player.jsx
import { useState, useRef, useEffect } from 'react';

const Player = ({ currentSong, playlist, setCurrentSong }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // 当 currentSong 改变时，自动播放新歌曲
  useEffect(() => {
    if (currentSong && audioRef.current) {
      audioRef.current.src = currentSong.file_url;
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(error => {
        console.log("自动播放被阻止:", error);
      });
    }
  }, [currentSong]);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleEnded = () => {
    // 歌曲播放结束后的逻辑，例如播放下一首
    console.log('歌曲播放结束');
    setIsPlaying(false);
  };

  return (
    <div className="bottom-player">
      <div className="player-info">
        <span>正在播放：{currentSong?.title}</span>
      </div>
      <div className="player-controls">
        <button onClick={togglePlayPause}>
          {isPlaying ? '暂停' : '播放'}
        </button>
      </div>
      {/* 隐藏的audio元素，是真正的播放器 */}
      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
};

export default Player;