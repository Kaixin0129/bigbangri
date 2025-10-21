class GlobalPlayer {
    constructor() {
        this.audio = new Audio();
        this.currentSong = null;
        this.isPlaying = false;
        this.progress = 0;
        this.isSeeking = false;
        this.playerCreated = false;
        this.isDragging = false;
        this.startY = 0;
        this.currentY = 0;
        this.allSongs = [];
        this.favorites = [];
        this.playlist = []; // 新增：播放列表
        
        this.init();
    }

    init() {
        this.loadState();
        this.waitForBodyAndCreatePlayer();
        this.bindAudioEvents();
        this.collectAllSongs();
        this.loadFavorites(); // 加载收藏列表
        setInterval(() => this.saveState(), 1000);
    }

    // 收藏功能方法
    toggleFavorite() {
        if (!this.currentSong) return;
        
        const songId = this.currentSong.id;
        const isFavorite = this.favorites.some(song => song.id === songId);
        
        if (isFavorite) {
            // 取消收藏
            this.favorites = this.favorites.filter(song => song.id !== songId);
            this.updateFavoriteButton(false);
        } else {
            // 添加收藏
            this.favorites.push({
                ...this.currentSong,
                addedAt: new Date().toISOString()
            });
            this.updateFavoriteButton(true);
        }
        
        this.saveFavorites();
    }

    updateFavoriteButton(isFavorite) {
        const favoriteBtn = document.getElementById('player-favorite');
        if (favoriteBtn) {
            favoriteBtn.textContent = isFavorite ? '❤️' : '🤍';
            favoriteBtn.style.color = isFavorite ? '#ff4757' : '#666';
            if (isFavorite) {
                favoriteBtn.classList.add('active');
            } else {
                favoriteBtn.classList.remove('active');
            }
        }
    }

    saveFavorites() {
        localStorage.setItem('musicFavorites', JSON.stringify(this.favorites));
    }

    loadFavorites() {
        const saved = localStorage.getItem('musicFavorites');
        if (saved) {
            try {
                this.favorites = JSON.parse(saved);
            } catch (error) {
                console.error('加载收藏列表失败:', error);
                this.favorites = [];
            }
        }
    }

    // 获取收藏列表
    getFavorites() {
        return this.favorites;
    }

    addToPlaylist(song) {
        // 检查是否已经在播放列表中
        const isInPlaylist = this.playlist.some(s => s.id === song.id);
        if (!isInPlaylist) {
            this.playlist.push({
                ...song,
                addedAt: new Date().toISOString()
            });
            this.savePlaylist();
            this.updatePlaylistUI();
        }
    }

    removeFromPlaylist(songId) {
        this.playlist = this.playlist.filter(song => song.id !== songId);
        this.savePlaylist();
        this.updatePlaylistUI();
    }

showPlaylist() {
    const playlistPanel = document.getElementById('playlist-panel');
    if (playlistPanel) {
        // 切换显示/隐藏状态
        if (playlistPanel.style.display === 'block') {
            playlistPanel.style.display = 'none';
        } else {
            playlistPanel.style.display = 'block';
        }
    }
}

hidePlaylist() {
    const playlistPanel = document.getElementById('playlist-panel');
    if (playlistPanel) {
        playlistPanel.style.display = 'none';
    }
}

    updatePlaylistUI() {
        const playlistList = document.getElementById('playlist-list');
        if (!playlistList) return;
        
        if (this.playlist.length === 0) {
            playlistList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">播放列表为空</div>';
            return;
        }
        
        playlistList.innerHTML = this.playlist.map(song => `
            <div class="playlist-song-item ${this.currentSong && this.currentSong.id === song.id ? 'current' : ''}" data-song-id="${song.id}">
                <img src="${song.cover_url || 'default-cover.jpg'}" alt="${song.title}" class="playlist-song-cover">
                <div class="playlist-song-info">
                    <div class="playlist-song-title">${song.title}</div>
                    <div class="playlist-song-album">${this.getAlbumTitleWithoutBigbang(song.album_title)}</div>
                </div>
                <button class="remove-from-playlist" data-song-id="${song.id}">✕</button>
            </div>
        `).join('');
    }

    // 新增方法：移除BIGBANG相关文字
    getAlbumTitleWithoutBigbang(albumTitle) {
        if (!albumTitle) return '';
        // 移除BIGBANG相关文字
        return albumTitle.replace(/BIGBANG/gi, '').trim();
    }

    playFromPlaylist(songId) {
        const song = this.playlist.find(s => s.id === songId);
        if (song) {
            this.play(song);
            this.hidePlaylist();
        }
    }

    savePlaylist() {
        localStorage.setItem('musicPlaylist', JSON.stringify(this.playlist));
    }

loadPlaylist() {
    // 强制清空播放列表，重新开始
    this.playlist = [];
    this.savePlaylist();
    this.updatePlaylistUI();
    
    // 或者注释掉加载逻辑
    /*
    const saved = localStorage.getItem('musicPlaylist');
    if (saved) {
        try {
            this.playlist = JSON.parse(saved);
            this.updatePlaylistUI();
        } catch (error) {
            console.error('加载播放列表失败:', error);
            this.playlist = [];
        }
    }
    */
}

// 收集所有专辑中的歌曲
collectAllSongs() {
    console.log('开始收集所有歌曲...');
    
    // 方法1: 从全局变量获取
    if (window.allSongs && window.allSongs.length > 0) {
        this.allSongs = window.allSongs;
        console.log('从 window.allSongs 获取歌曲:', this.allSongs.length);
        return;
    }
    
    // 方法2: 从专辑数据中提取
    if (window.bigbangAlbums) {
        this.allSongs = window.bigbangAlbums.flatMap(album => 
            album.songs.map(song => ({
                ...song,
                album_title: album.title,
                cover_url: song.cover_url || album.cover_url
            }))
        );
        console.log('从 bigbangAlbums 提取歌曲:', this.allSongs.length);
        return;
    }
    
    // 删除硬编码的备用歌曲列表
    this.allSongs = [];
    console.log('没有找到歌曲数据，歌曲列表为空');
}

// 修改 next() 方法 - 按照播放列表顺序播放
next() {
    console.log('下一首按钮点击 - 播放列表模式');
    
    if (this.playlist.length === 0) {
        console.log('播放列表为空，无法播放下一首');
        return;
    }
    
    if (!this.currentSong) {
        // 如果没有当前歌曲，播放第一首
        this.play(this.playlist[0]);
        return;
    }
    
    const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
    console.log('当前歌曲在播放列表中的索引:', index);
    
    if (index === -1) {
        // 如果当前歌曲不在播放列表中，播放第一首
        this.play(this.playlist[0]);
    } else {
        const nextIndex = (index + 1) % this.playlist.length;
        console.log('下一首索引:', nextIndex, '歌曲:', this.playlist[nextIndex].title);
        this.play(this.playlist[nextIndex]);
    }
}

// 修改 previous() 方法 - 按照播放列表顺序播放
previous() {
    console.log('上一首按钮点击 - 播放列表模式');
    
    if (this.playlist.length === 0) {
        console.log('播放列表为空，无法播放上一首');
        return;
    }
    
    if (!this.currentSong) {
        // 如果没有当前歌曲，播放最后一首
        this.play(this.playlist[this.playlist.length - 1]);
        return;
    }
    
    const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
    console.log('当前歌曲在播放列表中的索引:', index);
    
    if (index === -1) {
        // 如果当前歌曲不在播放列表中，播放最后一首
        this.play(this.playlist[this.playlist.length - 1]);
    } else {
        const prevIndex = (index - 1 + this.playlist.length) % this.playlist.length;
        console.log('上一首索引:', prevIndex, '歌曲:', this.playlist[prevIndex].title);
        this.play(this.playlist[prevIndex]);
    }
}

play(song) {
    console.log('播放歌曲:', song);
    
    if (!song.cover_url) {
        song.cover_url = 'default-cover.jpg';
    }
    
    this.currentSong = song;
    this.audio.src = song.file_url;
    
    // 如果歌曲不在播放列表中，自动添加到播放列表
    const isInPlaylist = this.playlist.some(s => s.id === song.id);
    if (!isInPlaylist) {
        this.addToPlaylist(song);
    }
    
    // 更新收藏按钮状态
    const isFavorite = this.favorites.some(fav => fav.id === song.id);
    this.updateFavoriteButton(isFavorite);
    
    // 更新播放列表UI
    this.updatePlaylistUI();
    
    this.updateTimeDisplay();
    
    const updateDuration = () => {
        if (this.audio.duration && this.audio.duration !== Infinity) {
            this.updateTimeDisplay();
            this.audio.removeEventListener('loadedmetadata', updateDuration);
            this.audio.removeEventListener('canplaythrough', updateDuration);
            this.audio.removeEventListener('durationchange', updateDuration);
        }
    };
    
    this.audio.addEventListener('loadedmetadata', updateDuration);
    this.audio.addEventListener('canplaythrough', updateDuration);
    this.audio.addEventListener('durationchange', updateDuration);
    
    setTimeout(updateDuration, 1000);
    
    this.audio.play().then(() => {
        this.isPlaying = true;
        this.ensurePlayerVisible();
        this.updateUI();
        this.saveState();
    }).catch(error => {
        console.error('播放失败:', error);
    });
}

    waitForBodyAndCreatePlayer() {
        if (document.body) {
            this.createPlayerDOM();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                this.createPlayerDOM();
            });
            
            const checkBody = setInterval(() => {
                if (document.body) {
                    this.createPlayerDOM();
                    clearInterval(checkBody);
                }
            }, 10);
        }
    }

createPlayerDOM() {
    if (document.getElementById('global-player')) {
        this.bindEvents();
        return;
    }

    console.log('创建播放器DOM...');

    const playerHTML = `
        <div id="global-player" style="
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #111;
            color: white;
            display: ${this.currentSong ? 'flex' : 'none'};
            align-items: center;
            padding: 8px 10px;
            border-top: 1px solid #333;
            z-index: 10000;
            min-height: 60px;
            box-sizing: border-box;
            transition: transform 0.3s ease;
            cursor: grab;
        ">
            <!-- 手机版专辑名字显示 - 第一排 -->
            <div id="mobile-song-title" style="
                display: none;
                text-align: center;
                font-size: 13px;
                font-weight: bold;
                color: white;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
                padding: 0 10px;
                margin-bottom: 5px;
            ">${this.currentSong?.title || ''}</div>
            
            <!-- 左侧：封面和歌曲信息 -->
            <div style="display: flex; align-items: center; flex: 1; min-width: 0; max-width: 40%;">
                <img id="player-cover" src="${this.currentSong?.cover_url || 'default-cover.jpg'}" style="width: 40px; height: 40px; border-radius: 6px; margin-right: 15px; flex-shrink: 0;">
                <div style="min-width: 0; flex: 1; width: 100%;">
                    <div id="player-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; line-height: 1.3; width: 100%; font-weight: bold;">${this.currentSong?.title || '暂无播放'}</div>
                </div>
            </div>
            
            <!-- 中间：控制按钮 - 第二排 -->
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: center;
                gap: 2px; 
                flex-shrink: 0;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
            ">
                <!-- 爱心收藏按钮 -->
                <button id="player-favorite" style="
                    background: none; 
                    border: none; 
                    color: #666; 
                    font-size: 16px; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 0;
                    line-height: 1;
                    margin-right: 5px;
                ">🤍</button>
                
                <button id="player-prev" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 0;
                    line-height: 1;
                ">⏮</button>
                <button id="player-play-pause" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 0;
                    line-height: 1;
                ">${this.isPlaying ? '⏸' : '▶'}</button>
                <button id="player-next" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 0;
                    line-height: 1;
                ">⏭</button>
                
                <!-- 播放列表按钮 -->
                <button id="player-playlist" style="
                    background: none; 
                    border: none; 
                    color: white; 
                    font-size: 16px; 
                    cursor: pointer; 
                    width: 30px; 
                    height: 30px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    padding: 0;
                    line-height: 1;
                    margin-left: 5px;
                ">≡</button>
            </div>
            
            <!-- 右侧：进度条和时间显示 - 第三排 -->
            <div style="
                display: flex; 
                align-items: center; 
                justify-content: flex-end;
                flex: 1; 
                min-width: 0;
                gap: 8px;
            ">
                <!-- 当前时间显示 -->
                <div id="current-time" style="
                    color: white; 
                    font-size: 12px; 
                    min-width: 40px;
                    text-align: center;
                    font-weight: bold;
                ">0:00</div>
                
                <!-- 进度条 -->
                <div style="width: 120px; flex-shrink: 0;">
                    <input id="player-progress" type="range" min="0" max="100" value="${this.progress}" style="width: 100%;">
                </div>
                
                <!-- 总时长显示 -->
                <div id="duration-time" style="
                    color: #cdcdcd; 
                    font-size: 12px; 
                    min-width: 40px;
                    text-align: center;
                    font-weight: bold;
                ">0:00</div>
            </div>
        </div>

        <!-- 播放列表面板 -->
        <div id="playlist-panel" style="
            position: fixed;
            bottom: 70px;
            right: 20px;
            background: rgba(0, 0, 0, 0.95);
            color: white;
            z-index: 10001;
            padding: 20px;
            display: none;
            width: 300px;
            max-height: 400px;
            overflow-y: auto;
            border-radius: 10px;
            border: 1px solid #333;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #33FFFF; margin: 0;">播放列表</h3>
                <button id="close-playlist" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 5px;
                ">✕</button>
            </div>
            <div id="playlist-list" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="text-align: center; color: #666; padding: 20px;">
                    播放列表为空
                </div>
            </div>
        </div>
        
        <!-- 收藏按钮样式和媒体查询 -->
        <style>
            #player-favorite.active {
                color: #ff4757 !important;
            }

            .playlist-song-item {
                display: flex;
                align-items: center;
                padding: 10px;
                background: #1a1a1a;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 1px solid #333;
            }
            
            .playlist-song-item:hover {
                background: #2a2a2a;
            }
            
            .playlist-song-item.current {
                background: #2a2a2a;
                border-color: #33FFFF;
            }
            
            .playlist-song-cover {
                width: 35px;
                height: 35px;
                border-radius: 4px;
                margin-right: 12px;
                flex-shrink: 0;
            }
            
            .playlist-song-info {
                flex: 1;
                min-width: 0;
            }
            
            .playlist-song-title {
                font-weight: bold;
                font-size: 13px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .playlist-song-album {
                color: #cdcdcd;
                font-size: 11px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .remove-from-playlist {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                padding: 4px;
                border-radius: 3px;
                transition: all 0.3s ease;
                font-size: 12px;
            }
            
            .remove-from-playlist:hover {
                color: #ff4757;
                background: rgba(255, 71, 87, 0.1);
            }

            /* 电脑版：使用绝对定位确保按钮居中 */
            @media (min-width: 769px) {
                #global-player > div:nth-child(2) {
                    position: absolute !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                }
                
                /* 隐藏手机版专辑名字 */
                #mobile-song-title {
                    display: none !important;
                }
            }

/* 手机版：三排布局 */
@media (max-width: 768px) {
    #global-player {
        flex-direction: column !important;
        padding: 8px 10px !important;
        min-height: 90px !important;
        justify-content: center !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        z-index: 10000 !important;
    }
    
    /* 隐藏左侧专辑封面区域 */
    #global-player > div:nth-child(2) {
        display: none !important;
    }
    
    /* 第一排：专辑名字 */
    #mobile-song-title {
        display: block !important;
        order: 1 !important;
        margin-bottom: 5px !important;
    }
    
    /* 第二排：控制按钮 + 右侧按钮 */
    #global-player > div:nth-child(3) {
        position: static !important;
        transform: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        gap: 15px !important;
        margin: 0 !important;
        order: 2 !important;
    }
    
    /* 第三排：进度条和时间显示 */
    #global-player > div:nth-child(4) {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 100% !important;
        gap: 8px !important;
        margin-top: 5px !important;
        order: 3 !important;
    }
    
    /* 进度条在手机上 - 与按钮宽度一致 */
    #player-progress {
        width: 120px !important;
        flex-shrink: 0 !important;
    }
    
    /* 手机版显示时间 */
    #current-time, #duration-time {
        display: block !important;
        font-size: 11px !important;
        min-width: 35px !important;
    }
    
    /* 手机版播放列表面板 */
    #playlist-panel {
        width: 280px !important;
        right: 10px !important;
        bottom: 100px !important;
    }
    
    /* 调整按钮间距 */
    #player-favorite, #player-playlist {
        margin: 0 !important;
    }
}
        </style>
    `;
    
    document.documentElement.insertAdjacentHTML('beforeend', playerHTML);
    console.log('播放器DOM创建完成');
    this.playerCreated = true;
    
    this.bindEvents();
    this.updateTimeDisplay();
    this.loadFavorites();
    this.loadPlaylist();
}

    // 格式化时间显示
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 更新时间显示
    updateTimeDisplay() {
        const currentTimeEl = document.getElementById('current-time');
        const durationTimeEl = document.getElementById('duration-time');
        
        if (currentTimeEl) {
            const currentTime = this.audio?.currentTime || 0;
            currentTimeEl.textContent = this.formatTime(currentTime);
        }
        
        if (durationTimeEl) {
            const duration = this.audio?.duration && this.audio.duration !== Infinity 
                ? this.audio.duration 
                : (this.currentSong?.duration || 0);
            durationTimeEl.textContent = this.formatTime(duration);
        }
    }

    bindEvents() {
        console.log('绑定播放器事件...');
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'player-play-pause' || e.target.closest('#player-play-pause')) {
                this.togglePlayPause();
            } else if (e.target.id === 'player-prev' || e.target.closest('#player-prev')) {
                this.previous();
            } else if (e.target.id === 'player-next' || e.target.closest('#player-next')) {
                this.next();
            } else if (e.target.id === 'player-favorite' || e.target.closest('#player-favorite')) {
                this.toggleFavorite();
            } else if (e.target.id === 'player-playlist' || e.target.closest('#player-playlist')) {
                this.showPlaylist();
            } else if (e.target.id === 'close-playlist') {
                this.hidePlaylist();
            } else if (e.target.closest('.playlist-song-item')) {
                const songItem = e.target.closest('.playlist-song-item');
                const songId = parseInt(songItem.dataset.songId);
                this.playFromPlaylist(songId);
            } else if (e.target.classList.contains('remove-from-playlist')) {
                e.stopPropagation();
                const songId = parseInt(e.target.dataset.songId);
                this.removeFromPlaylist(songId);
            }
        });

    const progressBar = document.getElementById('player-progress');
    if (progressBar) {
        progressBar.addEventListener('mousedown', () => {
            this.isSeeking = true;
        });
        
        progressBar.addEventListener('touchstart', () => {
            this.isSeeking = true;
        });
        
        progressBar.addEventListener('input', (e) => {
            const value = e.target.value;
            const duration = this.audio?.duration && this.audio.duration !== Infinity 
                ? this.audio.duration 
                : (this.currentSong?.duration || 1);
            const currentTime = (value / 100) * duration;
            
            const currentTimeEl = document.getElementById('current-time');
            if (currentTimeEl) {
                currentTimeEl.textContent = this.formatTime(currentTime);
            }
        });
        
        progressBar.addEventListener('mouseup', (e) => {
            this.isSeeking = false;
            this.seek(e.target.value);
        });
        
        progressBar.addEventListener('touchend', (e) => {
            this.isSeeking = false;
            this.seek(e.target.value);
        });
    }

    this.bindDragToCloseEvents();
    console.log('事件绑定完成');
}

    // 绑定音频事件
    bindAudioEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('loadedmetadata', () => {
            console.log('音频元数据加载完成，时长:', this.audio.duration);
            this.updateTimeDisplay();
        });
        this.audio.addEventListener('durationchange', () => {
            console.log('音频时长变化:', this.audio.duration);
            this.updateTimeDisplay();
        });
    }

    // 绑定拖动关闭事件
    bindDragToCloseEvents() {
        const player = document.getElementById('global-player');
        if (!player) return;

        player.addEventListener('mousedown', this.handleDragStart.bind(this));
        document.addEventListener('mousemove', this.handleDragMove.bind(this));
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));

        player.addEventListener('touchstart', this.handleDragStart.bind(this));
        document.addEventListener('touchmove', this.handleDragMove.bind(this));
        document.addEventListener('touchend', this.handleDragEnd.bind(this));
    }

    // 处理拖动开始
    handleDragStart(e) {
        if (e.target.id === 'player-progress' || e.target.closest('#player-progress')) {
            return;
        }

        this.isDragging = true;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        this.startY = clientY;
        this.currentY = clientY;
        
        const player = document.getElementById('global-player');
        player.style.transition = 'none';
        player.style.cursor = 'grabbing';
    }

    // 处理拖动过程
    handleDragMove(e) {
        if (!this.isDragging) return;

        e.preventDefault();
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        this.currentY = clientY;
        
        const deltaY = this.currentY - this.startY;
        
        if (deltaY > 0) {
            const player = document.getElementById('global-player');
            const translateY = Math.min(deltaY, 100);
            player.style.transform = `translateY(${translateY}px)`;
            
            const opacity = Math.max(0.3, 1 - (translateY / 100));
            player.style.opacity = opacity;
        }
    }

    // 处理拖动结束
    handleDragEnd() {
        if (!this.isDragging) return;

        this.isDragging = false;
        const player = document.getElementById('global-player');
        const deltaY = this.currentY - this.startY;
        
        player.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        player.style.cursor = 'grab';

        if (deltaY > 50) {
            this.closePlayer();
        } else {
            player.style.transform = 'translateY(0)';
            player.style.opacity = '1';
        }
    }

    // 关闭播放器
    closePlayer() {
        const player = document.getElementById('global-player');
        
        player.style.transform = 'translateY(100%)';
        player.style.opacity = '0';
        
        this.audio.pause();
        this.isPlaying = false;
        
        setTimeout(() => {
            player.style.display = 'none';
            this.currentSong = null;
            this.updateUI();
            this.saveState();
        }, 300);
    }

    // 确保播放器显示
    ensurePlayerVisible() {
        const player = document.getElementById('global-player');
        if (!player) {
            this.createPlayerDOM();
        } else {
            player.style.display = 'flex';
            player.style.transform = 'translateY(0)';
            player.style.opacity = '1';
            player.style.cursor = 'grab';
            player.style.transition = 'transform 0.3s ease';
        }
    }

    togglePlayPause() {
        console.log('切换播放状态:', this.isPlaying ? '暂停' : '播放');
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
        this.isPlaying = !this.isPlaying;
        this.updateUI();
        this.saveState();
    }

    updateProgress() {
        if (!this.audio || this.isSeeking) return;
        
        const current = this.audio.currentTime;
        const duration = this.audio.duration && this.audio.duration !== Infinity 
            ? this.audio.duration 
            : (this.currentSong?.duration || 1);
        
        if (duration > 0) {
            this.progress = (current / duration) * 100;
            
            const progressBar = document.getElementById('player-progress');
            if (progressBar && !this.isSeeking) {
                progressBar.value = this.progress;
            }
            
            this.updateTimeDisplay();
        }
    }

    seek(value) {
        if (!this.audio) return;
        
        const duration = this.audio.duration && this.audio.duration !== Infinity 
            ? this.audio.duration 
            : (this.currentSong?.duration || 1);
        
        const newTime = (value / 100) * duration;
        
        console.log('跳转到:', newTime, '秒, 进度:', value + '%');
        
        this.audio.currentTime = newTime;
        this.progress = parseFloat(value);
        
        if (this.isPlaying && this.audio.paused) {
            this.audio.play().catch(error => {
                console.error('跳转后播放失败:', error);
            });
        }
        
        this.updateTimeDisplay();
    }


// 在 updateUI 方法中更新手机版的专辑名字显示
updateUI() {
    const player = document.getElementById('global-player');
    const playBtn = document.getElementById('player-play-pause');
    const title = document.getElementById('player-title');
    const mobileTitle = document.getElementById('mobile-song-title');
    const cover = document.getElementById('player-cover');
    
    if (player && this.currentSong) {
        player.style.display = 'flex';
        // 设置手机版的专辑名字
        if (mobileTitle) {
            mobileTitle.textContent = this.currentSong.title;
        }
    } else if (player && !this.currentSong) {
        // 如果没有当前歌曲，清除专辑名字
        if (mobileTitle) {
            mobileTitle.textContent = '';
        }
    }
    
    if (playBtn) playBtn.textContent = this.isPlaying ? '⏸' : '▶';
    if (title && this.currentSong) title.textContent = this.currentSong.title;
    if (cover && this.currentSong) cover.src = this.currentSong.cover_url || 'default-cover.jpg';
    
    this.updateTimeDisplay();
}


    saveState() {
        const state = {
            currentSong: this.currentSong,
            isPlaying: this.isPlaying,
            currentTime: this.audio.currentTime,
            progress: this.progress
        };
        localStorage.setItem('globalPlayerState', JSON.stringify(state));
    }

    loadState() {
        const saved = localStorage.getItem('globalPlayerState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.currentSong = state.currentSong;
                this.isPlaying = state.isPlaying;
                this.progress = state.progress;
                
                if (this.currentSong) {
                    this.audio.src = this.currentSong.file_url;
                    this.audio.currentTime = state.currentTime || 0;
                    if (this.isPlaying) {
                        this.audio.play().catch(error => {
                            console.error('恢复播放失败:', error);
                            this.isPlaying = false;
                        });
                    }
                    
                    setTimeout(() => this.ensurePlayerVisible(), 100);
                }
            } catch (error) {
                console.error('加载播放状态失败:', error);
            }
        }
    }
}

// 立即创建全局播放器实例
window.globalPlayer = new GlobalPlayer();

// 提供给其他页面使用的API
window.playSong = (song) => {
    console.log('调用播放:', song);
    if (window.globalPlayer) {
        window.globalPlayer.play(song);
    } else {
        console.error('全局播放器未初始化');
    }
};

console.log('全局播放器已加载');