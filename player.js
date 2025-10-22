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
    this.playlist = [];
    this.isPlaylistVisible = false;
    this.currentIndex = 0;
    this.currentPlaylistType = 'album'; // 新增：跟踪播放列表类型
    
    // 其他属性保持不变...
    this.lastMoveTime = 0;
    this.lastDeltaY = 0;
    this.velocity = 0;
    this.playerDisabled = false;
    
    this.init();
}

    init() {
        this.loadState();
        this.waitForBodyAndCreatePlayer();
        this.bindAudioEvents();
        this.collectAllSongs();
        this.loadFavorites();
        this.loadPlaylist();
        setInterval(() => this.saveState(), 1000);
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            } else {
                this.loadState();
            }
        });
        
        window.addEventListener('storage', (e) => {
            if (e.key === 'globalPlayerState' || e.key === 'musicFavorites' || e.key === 'musicPlaylist') {
                this.loadState();
                this.loadFavorites();
                this.loadPlaylist();
            }
        });
        
        const urlParams = new URLSearchParams(window.location.search);
        const playSongId = urlParams.get('play');
        if (playSongId) {
            const favorites = JSON.parse(localStorage.getItem('musicFavorites') || '[]');
            const song = favorites.find(s => s.id === parseInt(playSongId));
            if (song) {
                this.play(song);
            }
        }
        
        this.isPlaylistVisible = false;
    }

// 修改 goToCurrentAlbum 方法
goToCurrentAlbum() {
    if (!this.currentSong) return;
    
    console.log('跳转到当前歌曲的专辑:', this.currentSong);
    
    // 检查当前是否在 wyy.html 页面
    const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                        window.location.href.includes('wyy.html');
    
    if (isInWyyPage) {
        console.log('在 wyy.html 页面内，显示当前歌曲的专辑');
        
        if (typeof window.showSongAlbum === 'function') {
            console.log('调用 window.showSongAlbum 函数');
            window.showSongAlbum(this.currentSong);
        } else {
            console.log('window.showSongAlbum 函数未定义，触发事件');
            const albumEvent = new CustomEvent('showSongAlbum', {
                detail: {
                    song: this.currentSong
                }
            });
            window.dispatchEvent(albumEvent);
        }
        
    } else {
        console.log('不在 wyy.html 页面，导航到专辑详情页面');
        this.navigateToAlbumDetail(this.currentSong);
    }
}

// 改进的 navigateToAlbumDetail 方法
navigateToAlbumDetail(song) {
    console.log('导航到专辑详情页面，歌曲:', song);
    
    // 首先确定歌曲类型（团体还是成员个人）
    const songType = this.determineSongType(song);
    console.log('歌曲类型:', songType);
    
    // 构建导航URL
    let targetUrl = 'wyy.html';
    const params = new URLSearchParams();
    
    if (songType === 'member') {
        // 成员个人歌曲 - 关键修复：确保传递成员参数
        const memberId = this.getMemberIdFromArtist(song.artist);
        if (memberId) {
            params.set('member', memberId);
            console.log('成员歌曲，设置成员参数:', memberId);
            
            // 查找成员专辑
            const albumId = this.findAlbumIdForMemberSong(song, memberId);
            if (albumId) {
                params.set('album', albumId);
                console.log('找到成员专辑ID:', albumId);
            }
        } else {
            console.log('无法确定成员ID，艺人:', song.artist);
            // 如果无法确定成员，尝试直接查找专辑
            const albumId = this.findAlbumForSong(song);
            if (albumId) {
                params.set('album', albumId);
            }
        }
    } else {
        // 团体歌曲
        const albumId = this.findAlbumForSong(song);
        if (albumId) {
            params.set('album', albumId);
            console.log('团体歌曲专辑ID:', albumId);
        }
    }
    
    // 添加歌曲ID参数（可选）
    if (song.id) {
        params.set('song', song.id);
    }
    
    // 构建完整URL
    if (params.toString()) {
        targetUrl += '?' + params.toString();
    }
    
    console.log('最终导航URL:', targetUrl);
    window.location.href = targetUrl;
}

// 新增方法：查找歌曲所属专辑ID
findAlbumForSong(song) {
    // 先在团体专辑中查找
    if (window.bigbangData && window.bigbangData.group) {
        for (const album of window.bigbangData.group.albums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('在团体专辑中找到歌曲:', album.title);
                return album.id;
            }
        }
    }
    
    // 然后在成员专辑中查找
    if (window.bigbangData && window.bigbangData.members) {
        for (const member of window.bigbangData.members) {
            for (const album of member.albums) {
                const foundSong = album.songs.find(s => s.id === song.id);
                if (foundSong) {
                    console.log('在成员专辑中找到歌曲:', album.title, '艺人:', member.stage_name);
                    return album.id;
                }
            }
        }
    }
    
    // 如果都没找到，使用备用方法
    return song.album_id || this.extractAlbumIdFromSongId(song.id);
}

// 新增方法：确定歌曲类型
determineSongType(song) {
    if (!song.artist) return 'group'; // 默认团体
    
    const memberArtists = [
        'G-DRAGON', '权志龙', 'GD', 'G-DRAGON (权志龙)',
        'T.O.P', 
        '태양', '太阳', 'TAEYANG', 'TAEYANG (太阳)',
        '大成', '대성', 'DAESUNG', 'DAESUNG (大成)',
        '胜利', '승리', 'SEUNGRI', 'SEUNGRI (胜利)'
    ];
    
    // 检查是否是成员艺人
    const isMemberSong = memberArtists.some(artist => 
        song.artist.includes(artist) || artist.includes(song.artist)
    );
    
    return isMemberSong ? 'member' : 'group';
}

// 改进的成员ID映射
getMemberIdFromArtist(artist) {
    const memberMap = {
        // G-DRAGON
        'G-DRAGON': 'gd',
        '权志龙': 'gd',
        'GD': 'gd',
        'G-DRAGON (权志龙)': 'gd',
        
        // T.O.P
        'T.O.P': 'top',
        
        // TAEYANG
        '태양': 'taeyang', 
        '太阳': 'taeyang',
        'TAEYANG': 'taeyang',
        'TAEYANG (太阳)': 'taeyang',
        
        // DAESUNG
        '大成': 'daesung',
        '대성': 'daesung',
        'DAESUNG': 'daesung',
        'DAESUNG (大成)': 'daesung',
        
        // SEUNGRI
        '胜利': 'seungri',
        '승리': 'seungri',
        'SEUNGRI': 'seungri',
        'SEUNGRI (胜利)': 'seungri'
    };
    
    // 精确匹配
    if (memberMap[artist]) {
        return memberMap[artist];
    }
    
    // 模糊匹配（包含关系）
    for (const [key, value] of Object.entries(memberMap)) {
        if (artist.includes(key) || key.includes(artist)) {
            return value;
        }
    }
    
    return null;
}

// 新增方法：查找成员歌曲的专辑ID
findAlbumIdForMemberSong(song, memberId) {
    if (!window.bigbangData || !window.bigbangData.members) {
        return song.album_id || this.extractAlbumIdFromSongId(song.id);
    }
    
    // 在成员专辑中查找歌曲
    const member = window.bigbangData.members.find(m => m.id === memberId);
    if (member && member.albums) {
        for (const album of member.albums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('在成员专辑中找到歌曲:', album.title, '专辑ID:', album.id);
                return album.id;
            }
        }
    }
    
    // 如果没找到，回退到原来的方法
    return song.album_id || this.extractAlbumIdFromSongId(song.id);
}

// 改进的专辑ID提取方法
extractAlbumIdFromSongId(songId) {
    if (!songId) return null;
    
    // 如果是数字ID，尝试从数据结构中查找
    if (typeof songId === 'number') {
        // 先在团体专辑中查找
        if (window.bigbangData && window.bigbangData.group) {
            for (const album of window.bigbangData.group.albums) {
                const foundSong = album.songs.find(s => s.id === songId);
                if (foundSong) {
                    return album.id;
                }
            }
        }
        
        // 然后在成员专辑中查找
        if (window.bigbangData && window.bigbangData.members) {
            for (const member of window.bigbangData.members) {
                for (const album of member.albums) {
                    const foundSong = album.songs.find(s => s.id === songId);
                    if (foundSong) {
                        return album.id;
                    }
                }
            }
        }
        
        // 如果都没找到，使用数学方法提取（作为最后手段）
        return Math.floor(songId / 100);
    }
    
    // 字符串ID处理
    if (typeof songId === 'string') {
        const parts = songId.split('_');
        if (parts.length > 1) {
            return parts[0];
        }
        // 尝试解析数字
        const numId = parseInt(songId);
        if (!isNaN(numId)) {
            return Math.floor(numId / 100);
        }
    }
    
    return null;
}

// 新增方法：从艺人名称获取成员ID - 改进映射
getMemberIdFromArtist(artist) {
    const memberMap = {
        'G-DRAGON': 'gd',
        '权志龙': 'gd',
        'GD': 'gd',
        'G-DRAGON (权志龙)': 'gd',
        'T.O.P': 'top',
        '태양': 'taeyang',
        '太阳': 'taeyang',
        'TAEYANG': 'taeyang',
        'TAEYANG (太阳)': 'taeyang',
        '大成': 'daesung',
        '대성': 'daesung',
        'DAESUNG': 'daesung',
        'DAESUNG (大成)': 'daesung',
        '胜利': 'seungri',
        '승리': 'seungri',
        'SEUNGRI': 'seungri',
        'SEUNGRI (胜利)': 'seungri'
    };
    
    // 精确匹配
    if (memberMap[artist]) {
        return memberMap[artist];
    }
    
    // 模糊匹配（包含关系）
    for (const [key, value] of Object.entries(memberMap)) {
        if (artist.includes(key) || key.includes(artist)) {
            return value;
        }
    }
    
    return null;
}

// 新增方法：查找成员歌曲的专辑ID
findAlbumIdForMemberSong(song, memberId) {
    if (!window.bigbangData || !window.bigbangData.members) {
        return song.album_id || this.extractAlbumIdFromSongId(song.id);
    }
    
    // 在成员专辑中查找歌曲
    const member = window.bigbangData.members.find(m => m.id === memberId);
    if (member && member.albums) {
        for (const album of member.albums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('在成员专辑中找到歌曲:', album.title, '专辑ID:', album.id);
                return album.id;
            }
        }
    }
    
    // 如果没找到，回退到原来的方法
    return song.album_id || this.extractAlbumIdFromSongId(song.id);
}

// 改进的专辑ID提取方法
extractAlbumIdFromSongId(songId) {
    if (!songId) return null;
    
    // 如果是数字ID，尝试从数据结构中查找
    if (typeof songId === 'number') {
        // 先在团体专辑中查找
        if (window.bigbangData && window.bigbangData.group) {
            for (const album of window.bigbangData.group.albums) {
                const foundSong = album.songs.find(s => s.id === songId);
                if (foundSong) {
                    return album.id;
                }
            }
        }
        
        // 然后在成员专辑中查找
        if (window.bigbangData && window.bigbangData.members) {
            for (const member of window.bigbangData.members) {
                for (const album of member.albums) {
                    const foundSong = album.songs.find(s => s.id === songId);
                    if (foundSong) {
                        return album.id;
                    }
                }
            }
        }
        
        // 如果都没找到，使用数学方法提取（作为最后手段）
        return Math.floor(songId / 100);
    }
    
    // 字符串ID处理
    if (typeof songId === 'string') {
        const parts = songId.split('_');
        if (parts.length > 1) {
            return parts[0];
        }
        // 尝试解析数字
        const numId = parseInt(songId);
        if (!isNaN(numId)) {
            return Math.floor(numId / 100);
        }
    }
    
    return null;
}

// 新增直接显示专辑的方法
showAlbumDirectly() {
    if (!this.currentSong) return;
    
    const albumId = this.currentSong.album_id || this.extractAlbumIdFromSongId(this.currentSong.id);
    if (!albumId) {
        console.log('无法提取专辑ID');
        return;
    }
    
    console.log('直接显示专辑:', albumId);
    
    // 方法1: 查找并点击对应的专辑元素
    const albumElement = document.querySelector(`[data-album-id="${albumId}"]`);
    if (albumElement) {
        console.log('找到专辑元素，执行点击');
        albumElement.click();
        return;
    }
    
    // 方法2: 查找专辑标题包含当前歌曲专辑标题的元素
    if (this.currentSong.album_title) {
        const albumElements = document.querySelectorAll('[class*="album"], [class*="Album"]');
        for (let element of albumElements) {
            if (element.textContent && element.textContent.includes(this.currentSong.album_title)) {
                console.log('通过专辑标题找到元素:', this.currentSong.album_title);
                element.scrollIntoView({ behavior: 'smooth' });
                // 添加高亮效果
                element.style.boxShadow = '0 0 0 2px #33FFFF';
                setTimeout(() => {
                    element.style.boxShadow = '';
                }, 2000);
                return;
            }
        }
    }
    
    // 方法3: 查找所有可能的专辑容器
    const albumContainers = document.querySelectorAll('.album-container, .album-item, [class*="album"]');
    for (let container of albumContainers) {
        const containerAlbumId = container.getAttribute('data-album-id');
        if (containerAlbumId === albumId.toString()) {
            console.log('通过 data-album-id 找到专辑容器');
            container.scrollIntoView({ behavior: 'smooth' });
            container.style.boxShadow = '0 0 0 2px #33FFFF';
            setTimeout(() => {
                container.style.boxShadow = '';
            }, 2000);
            return;
        }
    }
    
    console.log('无法找到对应的专辑元素，专辑ID:', albumId);
}
    
    // 从歌曲ID中提取专辑ID的辅助方法
    extractAlbumIdFromSongId(songId) {
        if (typeof songId === 'number') {
            // 如果是数字ID，取前几位作为专辑ID
            return Math.floor(songId / 100);
        } else if (typeof songId === 'string') {
            // 如果是字符串ID，尝试分割
            const parts = songId.split('_');
            if (parts.length > 1) {
                return parts[0];
            }
        }
        return null;
    }

// 在 player.js 中修改 toggleFavorite 方法
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
    
    // 保存收藏列表
    this.saveFavorites();
    
    console.log('播放器收藏状态变化，触发事件', {
        songId: songId,
        isFavorite: !isFavorite,
        favoritesCount: this.favorites.length
    });
    
    // 触发自定义事件 - 使用正确的方式
    const favoritesUpdatedEvent = new CustomEvent('favoritesUpdated', {
        detail: {
            favorites: this.favorites,
            updatedSong: this.currentSong,
            action: isFavorite ? 'removed' : 'added'
        }
    });
    window.dispatchEvent(favoritesUpdatedEvent);
    
    // 触发存储事件
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'musicFavorites',
        newValue: JSON.stringify(this.favorites),
        oldValue: JSON.stringify(this.favorites),
        url: window.location.href,
        storageArea: localStorage
    }));
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
        try {
            localStorage.setItem('musicFavorites', JSON.stringify(this.favorites));
        } catch (error) {
            console.error('保存收藏列表失败:', error);
        }
    }

    loadFavorites() {
        const saved = localStorage.getItem('musicFavorites');
        if (saved) {
            try {
                this.favorites = JSON.parse(saved);
                if (this.currentSong) {
                    const isFavorite = this.favorites.some(fav => fav.id === this.currentSong.id);
                    this.updateFavoriteButton(isFavorite);
                }
            } catch (error) {
                console.error('加载收藏列表失败:', error);
                this.favorites = [];
            }
        } else {
            this.favorites = [];
        }
    }

    getFavorites() {
        return this.favorites;
    }

addToPlaylist(song) {
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
    console.log('删除播放列表中的歌曲:', songId);
    
    // 从播放列表中移除歌曲
    this.playlist = this.playlist.filter(song => song.id !== songId);
    this.savePlaylist();
    this.updatePlaylistUI();
    
    // 如果删除的是当前播放的歌曲，自动播放下一首
    if (this.currentSong && this.currentSong.id === songId) {
        if (this.playlist.length > 0) {
            // 找到当前歌曲在播放列表中的位置
            const currentIndex = this.playlist.findIndex(song => song.id === songId);
            if (currentIndex !== -1 && currentIndex < this.playlist.length) {
                // 播放下一首
                this.play(this.playlist[currentIndex]);
            } else if (this.playlist.length > 0) {
                // 如果找不到位置，播放第一首
                this.play(this.playlist[0]);
            }
        } else {
            // 如果播放列表为空，停止播放并重置播放器状态
            this.audio.pause();
            this.isPlaying = false;
            this.currentSong = null;
            this.updateUI(); // 更新UI显示"暂无歌曲播放"
        }
    }
    
    // 如果播放列表为空，重置播放器状态
    if (this.playlist.length === 0) {
        this.currentSong = null;
        this.isPlaying = false;
        this.updateUI(); // 更新UI显示"暂无歌曲播放"
    }
    
    // 确保播放列表保持显示状态
    this.keepPlaylistOpen();
    
    console.log('删除完成，当前播放列表:', this.playlist.length);
}

// 新增方法：保持播放列表打开状态
keepPlaylistOpen() {
    const playlistPanel = document.getElementById('playlist-panel');
    if (playlistPanel && this.isPlaylistVisible) {
        // 确保播放列表保持显示
        playlistPanel.style.display = 'block';
    }
}

// 修改 togglePlaylist 方法，确保状态正确
togglePlaylist() {
    console.log('切换播放列表');
    
    const playlistPanel = document.getElementById('playlist-panel');
    if (!playlistPanel) {
        console.error('播放列表面板未找到');
        return;
    }
    
    const isCurrentlyVisible = playlistPanel.style.display === 'block';
    console.log('播放列表当前显示状态:', isCurrentlyVisible);
    
    if (isCurrentlyVisible) {
        this.hidePlaylist();
    } else {
        this.showPlaylist();
    }
}

// 修改 showPlaylist 方法
showPlaylist() {
    const playlistPanel = document.getElementById('playlist-panel');
    if (playlistPanel) {
        playlistPanel.style.display = 'block';
        this.isPlaylistVisible = true;
        this.updatePlaylistUI();
        console.log('播放列表已显示');
    }
}

// 修改 hidePlaylist 方法，只有明确调用时才关闭
hidePlaylist() {
    const playlistPanel = document.getElementById('playlist-panel');
    if (playlistPanel) {
        playlistPanel.style.display = 'none';
        this.isPlaylistVisible = false;
        console.log('播放列表已隐藏');
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
            </div>
            <button class="remove-from-playlist" data-song-id="${song.id}" title="从播放列表删除">✕</button>
        </div>
    `).join('');
}

playFromPlaylist(songId) {
    const song = this.playlist.find(s => s.id === songId);
    if (song) {
        // 使用当前记录的播放列表类型
        this.play(song, this.currentPlaylistType);
    }
}

savePlaylist() {
    try {
        // 只保存基本的歌曲信息，避免循环引用
        const simplifiedPlaylist = this.playlist.map(song => ({
            id: song.id,
            title: song.title,
            file_url: song.file_url,
            duration: song.duration,
            cover_url: song.cover_url,
            album_title: song.album_title,
            artist: song.artist,
            addedAt: song.addedAt
        }));
        localStorage.setItem('musicPlaylist', JSON.stringify(simplifiedPlaylist));
        console.log('播放列表已保存:', simplifiedPlaylist.length, '首歌曲');
    } catch (error) {
        console.error('保存播放列表失败:', error);
    }
}

loadPlaylist() {
    const saved = localStorage.getItem('musicPlaylist');
    if (saved) {
        try {
            const savedPlaylist = JSON.parse(saved);
            
            // 重新构建完整的歌曲信息
            this.playlist = savedPlaylist.map(savedSong => {
                // 尝试从所有歌曲中找到完整信息
                const fullSong = this.allSongs.find(s => s.id === savedSong.id);
                if (fullSong) {
                    return {
                        ...fullSong,
                        addedAt: savedSong.addedAt
                    };
                }
                // 如果找不到完整信息，使用保存的基本信息
                return savedSong;
            });
            
            console.log('播放列表已加载:', this.playlist.length, '首歌曲');
            this.updatePlaylistUI();
        } catch (error) {
            console.error('加载播放列表失败:', error);
            this.playlist = [];
        }
    } else {
        this.playlist = [];
    }
}

collectAllSongs() {
    console.log('开始收集所有歌曲...');
    
    if (window.allSongs && window.allSongs.length > 0) {
        this.allSongs = window.allSongs;
        console.log('从 window.allSongs 获取歌曲:', this.allSongs.length);
        return;
    }
    
    // 支持新的数据结构
    if (window.bigbangData) {
        this.allSongs = [
            // 团体专辑歌曲
            ...(window.bigbangData.group?.albums || []).flatMap(album => 
                album.songs.map(song => ({
                    ...song,
                    cover_url: song.cover_url || album.cover_url,
                    album_title: album.title,
                    artist: 'BIGBANG'
                }))
            ),
            // 成员个人专辑歌曲
            ...(window.bigbangData.members || []).flatMap(member =>
                member.albums.flatMap(album =>
                    album.songs.map(song => ({
                        ...song,
                        cover_url: song.cover_url || album.cover_url,
                        album_title: album.title,
                        artist: member.stage_name
                    }))
                )
            )
        ];
        console.log('从 bigbangData 提取歌曲:', this.allSongs.length);
        return;
    }
    
    // 保持向后兼容
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
    
    this.allSongs = [];
    console.log('没有找到歌曲数据，歌曲列表为空');
}

play(song, playlistType = 'album') {
    console.log('播放歌曲:', song, '播放列表类型:', playlistType);
    
    // 检查是否在其他页面且播放器已被禁用
    const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                        window.location.href.includes('wyy.html');
    
    if (!isInWyyPage && this.playerDisabled) {
        console.log('播放器已被用户关闭，不再显示');
        return;
    }
    
    if (!song.cover_url) {
        song.cover_url = 'default-cover.jpg';
    }
    
    this.currentSong = song;
    this.audio.src = song.file_url;
    this.currentPlaylistType = playlistType; // 记录播放列表类型
    
    // 根据播放列表类型设置不同的播放列表
    if (playlistType === 'favorites') {
        // 如果是收藏列表播放，使用完整的收藏列表
        this.playlist = [...this.favorites]; // 创建副本
        console.log('使用收藏列表作为播放列表:', this.playlist.length, '首歌曲');
    } else {
        // 默认使用专辑播放列表
        const currentAlbumSongs = this.getAlbumSongs(song);
        this.playlist = currentAlbumSongs;
        console.log('使用专辑列表作为播放列表:', this.playlist.length, '首歌曲');
        
        // 确保当前歌曲在播放列表中
        const isInPlaylist = this.playlist.some(s => s.id === song.id);
        if (!isInPlaylist && this.playlist.length > 0) {
            console.log('当前歌曲不在播放列表中，添加到播放列表');
            this.playlist.push(song);
        }
    }
    
    // 更新当前索引
    this.currentIndex = this.playlist.findIndex(s => s.id === song.id);
    console.log('当前歌曲在播放列表中的索引:', this.currentIndex);
    
    // 添加到播放列表（用于持久化存储）
    const isInPersistentPlaylist = this.playlist.some(s => s.id === song.id);
    if (!isInPersistentPlaylist) {
        this.addToPlaylist(song);
    }
    
    const isFavorite = this.favorites.some(fav => fav.id === song.id);
    this.updateFavoriteButton(isFavorite);
    
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

getAlbumSongs(song) {
    console.log('=== 开始查找歌曲所属专辑 ===');
    console.log('目标歌曲:', { id: song.id, title: song.title });
    
    // 首先在团体专辑中查找
    if (window.bigbangData && window.bigbangData.group) {
        for (const album of window.bigbangData.group.albums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('找到团体专辑:', album.title, '歌曲数量:', album.songs.length);
                return album.songs.map(albumSong => ({
                    ...albumSong,
                    cover_url: albumSong.cover_url || album.cover_url,
                    album_title: album.title,
                    artist: 'BIGBANG'
                }));
            }
        }
    }
    
    // 然后在成员个人专辑中查找
    if (window.bigbangData && window.bigbangData.members) {
        for (const member of window.bigbangData.members) {
            for (const album of member.albums) {
                const foundSong = album.songs.find(s => s.id === song.id);
                if (foundSong) {
                    console.log('找到个人专辑:', album.title, '艺人:', member.stage_name, '歌曲数量:', album.songs.length);
                    return album.songs.map(albumSong => ({
                        ...albumSong,
                        cover_url: albumSong.cover_url || album.cover_url,
                        album_title: album.title,
                        artist: member.stage_name
                    }));
                }
            }
        }
    }
    
    console.log('最终返回的播放列表:', this.playlist?.length || 0, '首歌曲');
    console.log('=== 查找完成 ===');
    return this.playlist || [song];
}

// 修改 next 方法，使用专辑播放列表
next() {
    if (this.playlist.length === 0) {
        console.log('播放列表为空，无法播放下一首');
        return;
    }
    
    if (!this.currentSong) {
        this.play(this.playlist[0], this.currentPlaylistType);
        return;
    }
    
    const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
    console.log('当前歌曲在播放列表中的索引:', index, '播放列表长度:', this.playlist.length);
    
    if (index === -1) {
        // 如果当前歌曲不在播放列表中，播放第一首
        this.play(this.playlist[0], this.currentPlaylistType);
    } else {
        const nextIndex = (index + 1) % this.playlist.length;
        console.log('下一首索引:', nextIndex, '歌曲:', this.playlist[nextIndex].title);
        this.play(this.playlist[nextIndex], this.currentPlaylistType);
    }
}

previous() {
    if (this.playlist.length === 0) {
        console.log('播放列表为空，无法播放上一首');
        return;
    }
    
    if (!this.currentSong) {
        this.play(this.playlist[this.playlist.length - 1], this.currentPlaylistType);
        return;
    }
    
    const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
    console.log('当前歌曲在播放列表中的索引:', index);
    
    if (index === -1) {
        this.play(this.playlist[this.playlist.length - 1], this.currentPlaylistType);
    } else {
        const prevIndex = (index - 1 + this.playlist.length) % this.playlist.length;
        console.log('上一首索引:', prevIndex, '歌曲:', this.playlist[prevIndex].title);
        this.play(this.playlist[prevIndex], this.currentPlaylistType);
    }
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
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
    cursor: grab;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
">
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
                    cursor: pointer;
                ">${this.currentSong?.title || ''}</div>
                
                <div style="display: flex; align-items: center; min-width: 0; max-width: 40%; margin-right: auto;">
                    <img id="player-cover" src="${this.currentSong?.cover_url || 'default-cover.jpg'}" style="width: 40px; height: 40px; border-radius: 6px; margin-right: 15px; flex-shrink: 0;">
                    <div style="min-width: 0; flex: 1;">
                        <div id="player-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; line-height: 1.3; font-weight: bold; cursor: pointer;" title="点击查看专辑">${this.currentSong?.title || '暂无播放'}</div>
                    </div>
                </div>
                
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
                
                <div style="
                    display: flex; 
                    align-items: center; 
                    justify-content: flex-end;
                    min-width: 0;
                    gap: 8px;
                    margin-left: auto;
                ">
                    <div id="current-time" style="
                        color: white; 
                        font-size: 12px; 
                        min-width: 40px;
                        text-align: center;
                        font-weight: bold;
                    ">0:00</div>
                    
                    <div style="width: 120px; flex-shrink: 0;">
                        <input id="player-progress" type="range" min="0" max="100" value="${this.progress}" style="width: 100%;">
                    </div>
                    
                    <div id="duration-time" style="
                        color: #cdcdcd; 
                        font-size: 12px; 
                        min-width: 40px;
                        text-align: center;
                        font-weight: bold;
                    ">0:00</div>
                </div>
            </div>

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

                /* 为可点击的歌曲名称添加悬停效果 */
                #player-title:hover, #mobile-song-title:hover {
                    color: #33FFFF !important;
                    text-decoration: underline;
                }

                @media (min-width: 769px) {
                    #global-player > div:nth-child(3) {
                        position: absolute !important;
                        left: 50% !important;
                        transform: translateX(-50%) !important;
                    }
                    
                    #mobile-song-title {
                        display: none !important;
                    }
                    
                    #global-player > div:nth-child(2) {
                        display: flex !important;
                    }
                }

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
                        padding-top: 15px !important;
                    }
                    
                    #global-player > div:nth-child(2) {
                        display: none !important;
                    }
                    
                    #mobile-song-title {
                        display: block !important;
                        order: 1 !important;
                        margin-bottom: 5px !important;
                    }
                    
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
                    
                    #global-player > div:nth-child(4) {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 100% !important;
                        gap: 8px !important;
                        margin-top: 5px !important;
                        order: 3 !important;
                    }
                    
                    #player-progress {
                        width: 120px !important;
                        flex-shrink: 0 !important;
                    }
                    
                    #current-time, #duration-time {
                        display: block !important;
                        font-size: 11px !important;
                        min-width: 35px !important;
                    }
                    
                    #playlist-panel {
                        width: 280px !important;
                        right: 10px !important;
                        bottom: 100px !important;
                    }
                    
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
    
    // 延迟绑定播放列表事件，确保 DOM 完全渲染
    setTimeout(() => {
        this.bindPlaylistEvents();
    }, 100);
}

// 新增专门绑定播放列表事件的方法
bindPlaylistEvents() {
    console.log('绑定播放列表事件...');
    
    const playlistList = document.getElementById('playlist-list');
    if (!playlistList) {
        console.error('播放列表容器未找到');
        return;
    }
    
    // 直接为播放列表容器绑定事件委托
    playlistList.addEventListener('click', (e) => {
        console.log('播放列表点击事件:', e.target);
        
        // 处理删除按钮点击
        if (e.target.classList.contains('remove-from-playlist')) {
            e.stopPropagation();
            e.preventDefault();
            const songId = parseInt(e.target.dataset.songId);
            console.log('删除歌曲:', songId);
            this.removeFromPlaylist(songId);
            return;
        }
        
        // 处理播放列表歌曲点击（除了删除按钮）
        if (e.target.closest('.playlist-song-item') && !e.target.classList.contains('remove-from-playlist')) {
            const songItem = e.target.closest('.playlist-song-item');
            const songId = parseInt(songItem.dataset.songId);
            console.log('播放歌曲:', songId);
            this.playFromPlaylist(songId);
            return;
        }
    });
    
    console.log('播放列表事件绑定完成');
}

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

updateTimeDisplay() {
    const currentTimeEl = document.getElementById('current-time');
    const durationTimeEl = document.getElementById('duration-time');
    const progressBar = document.getElementById('player-progress');
    
    if (this.currentSong) {
        // 有当前歌曲时正常显示时间
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
        
        if (progressBar && !this.isSeeking) {
            const current = this.audio?.currentTime || 0;
            const duration = this.audio?.duration && this.audio.duration !== Infinity 
                ? this.audio.duration 
                : (this.currentSong?.duration || 1);
            if (duration > 0) {
                this.progress = (current / duration) * 100;
                progressBar.value = this.progress;
            }
        }
    } else {
        // 没有当前歌曲时显示默认时间
        if (currentTimeEl) {
            currentTimeEl.textContent = '0:00';
        }
        if (durationTimeEl) {
            durationTimeEl.textContent = '0:00';
        }
        if (progressBar) {
            progressBar.value = 0;
            this.progress = 0;
        }
    }
}

bindEvents() {
    console.log('绑定播放器事件...');
    
    // 为所有按钮绑定直接事件
    const buttons = [
        { id: 'player-playlist', handler: (e) => { this.togglePlaylist(); e.stopPropagation(); } },
        { id: 'close-playlist', handler: (e) => { this.hidePlaylist(); e.stopPropagation(); } },
        { id: 'player-play-pause', handler: () => this.togglePlayPause() },
        { id: 'player-prev', handler: () => this.previous() },
        { id: 'player-next', handler: () => this.next() },
        { id: 'player-favorite', handler: () => this.toggleFavorite() }
    ];
    
    buttons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.addEventListener('click', button.handler);
        }
    });
    
    // 添加歌曲名称点击事件
    const playerTitle = document.getElementById('player-title');
    const mobileTitle = document.getElementById('mobile-song-title');
    
    if (playerTitle) {
        playerTitle.addEventListener('click', () => {
            this.goToCurrentAlbum();
        });
    }
    
    if (mobileTitle) {
        mobileTitle.addEventListener('click', () => {
            this.goToCurrentAlbum();
        });
    }
    
    // 修复：为 document 绑定事件委托，但使用更精确的选择器
    document.addEventListener('click', (e) => {
        console.log('全局点击事件:', e.target);
        
        // 处理删除按钮点击 - 使用更精确的选择器
        if (e.target.classList.contains('remove-from-playlist') || 
            e.target.closest('.remove-from-playlist')) {
            e.stopPropagation();
            e.preventDefault();
            
            const removeButton = e.target.classList.contains('remove-from-playlist') 
                ? e.target 
                : e.target.closest('.remove-from-playlist');
                
            const songId = parseInt(removeButton.dataset.songId);
            console.log('删除歌曲:', songId);
            this.removeFromPlaylist(songId);
            return;
        }
        
        // 处理播放列表歌曲点击
        const songItem = e.target.closest('.playlist-song-item');
        if (songItem && !e.target.classList.contains('remove-from-playlist')) {
            const songId = parseInt(songItem.dataset.songId);
            console.log('播放歌曲:', songId);
            this.playFromPlaylist(songId);
            return;
        }
        
        // 点击播放列表外部区域时关闭播放列表
        const playlistPanel = document.getElementById('playlist-panel');
        if (playlistPanel && playlistPanel.style.display === 'block') {
            const isClickInsidePanel = playlistPanel.contains(e.target);
            const isPlaylistButton = e.target.closest('#player-playlist');
            
            if (!isClickInsidePanel && !isPlaylistButton) {
                console.log('点击播放列表外部区域，关闭播放列表');
                this.hidePlaylist();
            }
        }
    });

    // 进度条事件保持不变...
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

handleDragStart(e) {
    if (e.target.id === 'player-progress' || e.target.closest('#player-progress')) {
        return;
    }

    this.isDragging = true;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    this.startY = clientY;
    this.currentY = clientY;
    this.lastMoveTime = Date.now();
    this.lastDeltaY = 0;
    this.velocity = 0;
    
    const player = document.getElementById('global-player');
    player.style.transition = 'none';
    player.style.cursor = 'grabbing';
}

handleDragMove(e) {
    if (!this.isDragging) return;

    e.preventDefault();
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    this.currentY = clientY;
    
    const deltaY = this.currentY - this.startY;
    
    // 大幅降低触发阈值，让拖拽更灵敏
    if (deltaY > 5) {
        const player = document.getElementById('global-player');
        
        // 使用更缓慢的拖拽效果 - 降低拖拽系数
        const translateY = Math.min(deltaY * 0.8, 150); // 从1.3改为0.8，让拖拽更缓慢
        
        player.style.transform = `translateY(${translateY}px)`;
        
        // 更平滑的透明度变化 - 降低透明度变化速度
        const opacity = Math.max(0.4, 1 - (translateY / 200)); // 从80改为200，让透明度变化更缓慢
        
        player.style.opacity = opacity;
        
        // 移除阴影效果，只保留边框颜色变化
        const borderIntensity = Math.min(translateY / 100, 0.6);
        player.style.borderTop = `2px solid rgba(51, 255, 255, ${borderIntensity})`;
        
        // 计算速度（用于惯性效果）
        const now = Date.now();
        if (this.lastMoveTime) {
            const timeDiff = now - this.lastMoveTime;
            if (timeDiff > 0) {
                this.velocity = (deltaY - this.lastDeltaY) / timeDiff;
            }
        }
        this.lastMoveTime = now;
        this.lastDeltaY = deltaY;
    }
}

handleDragEnd() {
    if (!this.isDragging) return;

    this.isDragging = false;
    const player = document.getElementById('global-player');
    const deltaY = this.currentY - this.startY;
    
    // 清除边框效果
    player.style.borderTop = '1px solid #333';
    
    player.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease, border 0.3s ease'; // 延长动画时间
    player.style.cursor = 'grab';

    // 大幅降低关闭阈值，从50改为30，让关闭更容易
    // 同时考虑速度因素，快速滑动时更容易关闭
    const velocityThreshold = Math.abs(this.velocity) > 0.5;
    const distanceThreshold = deltaY > 30;
    
    if (distanceThreshold || (deltaY > 20 && velocityThreshold)) {
        // 关闭播放器并清空播放列表
        this.closePlayer();
    } else {
        player.style.transform = 'translateY(0)';
        player.style.opacity = '1';
    }
}

closePlayer() {
    const player = document.getElementById('global-player');
    
    // 清除边框效果
    player.style.borderTop = '1px solid #333';
    
    player.style.transform = 'translateY(100%)';
    player.style.opacity = '0';
    
    this.audio.pause();
    this.isPlaying = false;
    
    // 清空播放列表
    this.playlist = [];
    this.savePlaylist();
    this.updatePlaylistUI();
    
    // 检查当前是否在 wyy.html 页面
    const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                        window.location.href.includes('wyy.html');
    
    if (!isInWyyPage) {
        // 不在 wyy.html 页面，设置标志位阻止播放器再次显示
        this.playerDisabled = true;
    }
    
    setTimeout(() => {
        player.style.display = 'none';
        this.currentSong = null;
        this.updateUI();
        this.saveState();
    }, 400);
}

ensurePlayerVisible() {
    // 检查是否在其他页面且播放器已被禁用
    const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                        window.location.href.includes('wyy.html');
    
    if (!isInWyyPage && this.playerDisabled) {
        console.log('播放器已被用户关闭，不再显示');
        return;
    }
    
    const player = document.getElementById('global-player');
    if (!player) {
        this.createPlayerDOM();
    } else {
        player.style.display = 'flex';
        player.style.transform = 'translateY(0)';
        player.style.opacity = '1';
        player.style.cursor = 'grab';
        player.style.borderTop = '1px solid #333';
        player.style.transition = 'transform 0.3s ease';
        this.updateUI();
    }
}

togglePlayPause() {
    if (!this.currentSong) {
        console.log('没有歌曲可播放');
        return;
    }
    
    console.log('切换播放状态:', this.isPlaying ? '暂停' : '播放');
    if (this.isPlaying) {
        this.audio.pause();
    } else {
        this.audio.play().catch(error => {
            console.error('播放失败:', error);
        });
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

updateUI() {
    const player = document.getElementById('global-player');
    const playBtn = document.getElementById('player-play-pause');
    const title = document.getElementById('player-title');
    const mobileTitle = document.getElementById('mobile-song-title');
    const cover = document.getElementById('player-cover');
    
    if (player) {
        // 如果有当前歌曲，正常显示；如果没有，显示"暂无歌曲播放"
        if (this.currentSong) {
            player.style.display = 'flex';
            if (mobileTitle) {
                mobileTitle.textContent = this.currentSong.title;
            }
            if (title) {
                title.textContent = this.currentSong.title;
            }
            if (cover) {
                cover.src = this.currentSong.cover_url || 'default-cover.jpg';
            }
        } else {
            // 没有当前歌曲时，显示"暂无歌曲播放"
            player.style.display = 'flex'; // 保持播放器显示
            if (mobileTitle) {
                mobileTitle.textContent = '暂无歌曲播放';
            }
            if (title) {
                title.textContent = '暂无歌曲播放';
            }
            if (cover) {
                cover.src = 'default-cover.jpg'; // 使用默认封面
            }
        }
    }
    
    // 更新播放按钮状态
    if (playBtn) {
        playBtn.textContent = this.isPlaying ? '⏸' : '▶';
    }
    
    this.updateTimeDisplay();
}

    saveState() {
        const state = {
            currentSong: this.currentSong,
            isPlaying: this.isPlaying,
            currentTime: this.audio.currentTime,
            progress: this.progress,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('globalPlayerState', JSON.stringify(state));
        } catch (error) {
            console.error('保存播放状态失败:', error);
        }
    }

    loadState() {
        const saved = localStorage.getItem('globalPlayerState');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                
                const isExpired = state.timestamp && (Date.now() - state.timestamp > 5 * 60 * 1000);
                
                if (!isExpired && state.currentSong) {
                    this.currentSong = state.currentSong;
                    this.isPlaying = state.isPlaying;
                    this.progress = state.progress;
                    
                    if (!this.audio.src || this.audio.src !== state.currentSong.file_url) {
                        this.audio.src = state.currentSong.file_url;
                    }
                    
                    this.audio.currentTime = state.currentTime || 0;
                    
                    if (this.isPlaying && this.audio.paused) {
                        this.audio.play().catch(error => {
                            console.error('恢复播放失败:', error);
                            this.isPlaying = false;
                        });
                    }
                    
                    setTimeout(() => {
                        this.ensurePlayerVisible();
                        this.updateUI();
                    }, 100);
                }
            } catch (error) {
                console.error('加载播放状态失败:', error);
            }
        }
    }

    bindWindowUnload() {
        window.addEventListener('beforeunload', () => {
            this.saveState();
            this.saveFavorites();
            this.savePlaylist();
        });
    }
}

// 确保全局播放器正确初始化
document.addEventListener('DOMContentLoaded', function() {
    if (!window.globalPlayer) {
        window.globalPlayer = new GlobalPlayer();
        window.globalPlayer.bindWindowUnload();
    }
    
    window.playSong = (song) => {
        console.log('调用全局播放:', song);
        if (window.globalPlayer) {
            window.globalPlayer.play(song);
        } else {
            window.globalPlayer = new GlobalPlayer();
            setTimeout(() => {
                window.globalPlayer.play(song);
            }, 100);
        }
    };
    
    console.log('全局播放器已初始化');
});

// 立即创建实例
window.globalPlayer = new GlobalPlayer();
window.globalPlayer.bindWindowUnload();

window.playSong = (song) => {
    console.log('调用播放:', song);
    if (window.globalPlayer) {
        window.globalPlayer.play(song);
    } else {
        console.error('全局播放器未初始化');
    }
};

// 在player.js中添加这个监听
window.addEventListener('storage', function(e) {
    if (e.key === 'currentPlaylistData' && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.type === 'favorites') {
            this.playlist = data.songs;
            this.currentIndex = data.currentIndex;
            this.play(data.currentSong);
        }
    }
});