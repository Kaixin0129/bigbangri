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
        this.currentPlaylistType = 'manual';
        
        this.lastMoveTime = 0;
        this.lastDeltaY = 0;
        this.velocity = 0;
        this.playerDisabled = false;
        
        // MV相关属性
        this.isMVMode = false;
        this.mvVideo = null;
        this.mvOverlay = null;
        
        // 新增：随机播放状态
        this.isShuffleMode = false;
        this.originalPlaylistOrder = []; // 保存原始播放列表顺序
        
        this.init();
    }

    init() {
        this.loadState();
        this.waitForBodyAndCreatePlayer();
        this.bindAudioEvents();
        this.collectAllSongs();
        this.loadFavorites();
        this.loadPlaylist();
        this.bindGlobalEvents();
        setInterval(() => this.saveState(), 1000);
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            } else {
                this.loadState();
            }
        });
        
        this.isPlaylistVisible = false;
    }

    // 绑定全局事件监听
    bindGlobalEvents() {
        window.addEventListener('favoriteStatusChanged', (event) => {
            console.log('播放器收到收藏状态变化:', event.detail);
            const { songId, isFavorite } = event.detail;
            this.handleFavoriteStatusChange(songId, isFavorite);
        });

        window.addEventListener('songPlayed', (event) => {
            const { song } = event.detail;
            if (song && this.currentSong?.id !== song.id) {
                this.play(song);
            }
        });

        window.addEventListener('storage', (event) => {
            if (event.key === 'musicFavorites') {
                console.log('检测到收藏列表存储变化，重新加载');
                this.loadFavorites();
            }
        });
    }

    // 处理收藏状态变化
    handleFavoriteStatusChange(songId, isFavorite) {
        console.log('处理收藏状态变化:', songId, isFavorite);
        
        if (this.currentSong && this.currentSong.id === songId) {
            console.log('更新当前歌曲的收藏按钮');
            this.updateFavoriteButton(isFavorite);
        }

        if (isFavorite) {
            const song = this.allSongs.find(s => s.id === songId);
            if (song && !this.favorites.some(fav => fav.id === songId)) {
                console.log('添加到收藏列表');
                this.favorites.push({
                    ...song,
                    addedAt: new Date().toISOString()
                });
                this.saveFavorites();
            }
        } else {
            console.log('从收藏列表移除');
            this.favorites = this.favorites.filter(fav => fav.id !== songId);
            this.saveFavorites();
        }

        if (this.currentPlaylistType === 'favorites') {
            this.playlist = [...this.favorites];
            this.updatePlaylistUI();
        }
    }

    // 修复专辑导航方法 - 重点修复精准跳转
    goToCurrentAlbum() {
        if (!this.currentSong) return;
        
        console.log('跳转到当前歌曲的专辑:', this.currentSong);
        
        const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                            window.location.href.includes('wyy.html');
        
        if (isInWyyPage) {
            console.log('在 wyy.html 页面内，显示当前歌曲的专辑');
            this.showAlbumDirectly();
        } else {
            console.log('不在 wyy.html 页面，导航到专辑详情页面');
            this.navigateToAlbumDetail(this.currentSong);
        }
    }

    // 修复导航方法 - 确保精准跳转
    navigateToAlbumDetail(song) {
        console.log('导航到专辑详情页面，歌曲:', song);
        
        const albumInfo = this.findAlbumInfoForSong(song);
        console.log('找到专辑信息:', albumInfo);
        
        if (!albumInfo) {
            console.log('无法找到专辑信息，导航到默认页面');
            window.location.href = 'wyy.html';
            return;
        }
        
        // 修复：构建正确的URL参数
        let targetUrl = `wyy.html?album=${albumInfo.albumId}&song=${song.id}`;
        
        // 如果是成员专辑，添加成员参数
        if (albumInfo.type === 'member' && albumInfo.memberId) {
            targetUrl += `&member=${albumInfo.memberId}`;
        }
        
        console.log('导航URL:', targetUrl);
        window.location.href = targetUrl;
    }

    // 修复专辑信息查找方法 - 确保精准查找
    findAlbumInfoForSong(song) {
        console.log('查找歌曲所属专辑信息:', song.id, song.title);
        
        // 首先检查歌曲是否已经有专辑信息
        if (song.album_id && song.album_type) {
            console.log('歌曲已有专辑信息:', song.album_id, song.album_type);
            return {
                albumId: song.album_id,
                type: song.album_type,
                memberId: song.member_id
            };
        }
        
        // 在所有专辑中精确查找
        const allAlbums = this.getAllAlbumsWithType();
        
        for (const album of allAlbums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('找到精确匹配专辑:', {
                    albumId: album.id,
                    albumTitle: album.title,
                    type: album.type,
                    memberId: album.memberId,
                    songCount: album.songs.length
                });
                return {
                    albumId: album.id,
                    type: album.type,
                    memberId: album.memberId
                };
            }
        }
        
        console.log('未找到专辑信息，尝试模糊匹配');
        // 如果精确匹配失败，尝试通过标题模糊匹配
        return this.findAlbumBySongTitle(song.title);
    }

    // 新增：通过歌曲标题模糊查找专辑
    findAlbumBySongTitle(songTitle) {
        console.log('通过歌曲标题模糊查找:', songTitle);
        
        const allAlbums = this.getAllAlbumsWithType();
        
        for (const album of allAlbums) {
            const foundSong = album.songs.find(s => 
                s.title === songTitle || 
                s.title.includes(songTitle) ||
                songTitle.includes(s.title)
            );
            if (foundSong) {
                console.log('模糊匹配找到专辑:', {
                    albumId: album.id,
                    albumTitle: album.title,
                    songTitle: foundSong.title,
                    type: album.type
                });
                return {
                    albumId: album.id,
                    type: album.type,
                    memberId: album.memberId
                };
            }
        }
        
        console.log('模糊匹配也未找到专辑');
        return null;
    }

    // 修复获取所有专辑的方法
    getAllAlbumsWithType() {
        const allAlbums = [];
        
        // 添加团体专辑
        if (window.bigbangData && window.bigbangData.group) {
            console.log('添加团体专辑:', window.bigbangData.group.albums.length);
            window.bigbangData.group.albums.forEach(album => {
                // 修复：确保团体专辑有正确的歌曲数据
                const albumWithSongs = {
                    ...album,
                    type: 'group',
                    memberId: null,
                    songs: album.songs || [] // 确保songs数组存在
                };
                allAlbums.push(albumWithSongs);
            });
        }
        
        // 添加成员专辑
        if (window.bigbangData && window.bigbangData.members) {
            console.log('添加成员专辑数量:', window.bigbangData.members.length);
            window.bigbangData.members.forEach(member => {
                member.albums.forEach(album => {
                    // 修复：确保成员专辑有正确的歌曲数据
                    const albumWithSongs = {
                        ...album,
                        type: 'member',
                        memberId: member.id,
                        songs: album.songs || [] // 确保songs数组存在
                    };
                    allAlbums.push(albumWithSongs);
                });
            });
        }
        
        console.log('总专辑数量:', allAlbums.length);
        // 打印每个专辑的歌曲数量用于调试
        allAlbums.forEach(album => {
            console.log(`专辑 "${album.title}" 有 ${album.songs.length} 首歌曲`);
        });
        
        return allAlbums;
    }

    // 修复直接显示专辑的方法
    showAlbumDirectly() {
        if (!this.currentSong) return;
        
        const albumInfo = this.findAlbumInfoForSong(this.currentSong);
        if (!albumInfo) {
            console.log('无法找到专辑信息');
            alert('无法找到该歌曲的专辑信息');
            return;
        }
        
        console.log('直接显示专辑:', albumInfo);
        
        // 更新URL但不刷新页面
        let newUrl = `?album=${albumInfo.albumId}&song=${this.currentSong.id}`;
        if (albumInfo.memberId) {
            newUrl += `&member=${albumInfo.memberId}`;
        }
        
        window.history.replaceState({}, '', newUrl);
        
        // 修复：使用正确的函数来显示专辑
        if (window.globalSetSelectedAlbumId) {
            console.log('使用全局函数显示专辑:', albumInfo.albumId);
            window.globalSetSelectedAlbumId(albumInfo.albumId);
            window.globalSetCurrentView('albumDetail');
            
            // 延迟滚动到指定歌曲
            setTimeout(() => {
                this.scrollToCurrentSong();
            }, 1000);
            
        } else if (window.showAlbum) {
            console.log('使用showAlbum函数显示专辑');
            window.showAlbum(albumInfo.albumId);
            
            setTimeout(() => {
                this.scrollToCurrentSong();
            }, 1000);
            
        } else if (window.showSongAlbum) {
            console.log('使用showSongAlbum函数显示专辑');
            window.showSongAlbum(this.currentSong);
        } else {
            console.log('专辑显示函数未定义，重新加载页面');
            window.location.href = `wyy.html${newUrl}`;
        }
    }

    // 新增：滚动到当前歌曲
    scrollToCurrentSong() {
        if (!this.currentSong) return;
        
        setTimeout(() => {
            const songElement = document.querySelector(`[data-song-id="${this.currentSong.id}"]`);
            if (songElement) {
                console.log('找到歌曲元素，滚动到视图');
                songElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // 添加高亮效果
                songElement.style.background = 'rgba(51, 255, 255, 0.1)';
                songElement.style.borderColor = '#33FFFF';
                
                setTimeout(() => {
                    songElement.style.background = '';
                    songElement.style.borderColor = '';
                }, 3000);
            } else {
                console.log('未找到歌曲元素，尝试通过ID查找');
                // 尝试其他选择器
                const alternativeSelector = `#song-${this.currentSong.id}`;
                const altElement = document.querySelector(alternativeSelector);
                if (altElement) {
                    altElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 1500);
    }

    // 收藏相关方法
    toggleFavorite() {
        if (!this.currentSong) return;
        
        const songId = this.currentSong.id;
        const isFavorite = this.favorites.some(song => song.id === songId);
        const newFavoriteState = !isFavorite;
        
        console.log('播放器切换收藏状态:', songId, isFavorite, '->', newFavoriteState);
        
        if (isFavorite) {
            this.favorites = this.favorites.filter(song => song.id !== songId);
            this.updateFavoriteButton(false);
        } else {
            this.favorites.push({
                ...this.currentSong,
                addedAt: new Date().toISOString()
            });
            this.updateFavoriteButton(true);
        }
        
        this.saveFavorites();
        
        // 发送全局收藏状态变化事件
        const favoriteStatusChangedEvent = new CustomEvent('favoriteStatusChanged', {
            detail: {
                songId: songId,
                isFavorite: newFavoriteState,
                song: this.currentSong
            }
        });
        window.dispatchEvent(favoriteStatusChangedEvent);
        
        const favoritesUpdatedEvent = new CustomEvent('favoritesUpdated', {
            detail: {
                favorites: this.favorites,
                updatedSong: this.currentSong,
                action: isFavorite ? 'removed' : 'added'
            }
        });
        window.dispatchEvent(favoritesUpdatedEvent);
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
            console.log('更新播放器收藏按钮状态:', isFavorite);
        }
    }

    saveFavorites() {
        try {
            localStorage.setItem('musicFavorites', JSON.stringify(this.favorites));
            console.log('播放器保存收藏列表:', this.favorites.length);
        } catch (error) {
            console.error('保存收藏列表失败:', error);
        }
    }

    loadFavorites() {
        const saved = localStorage.getItem('musicFavorites');
        if (saved) {
            try {
                this.favorites = JSON.parse(saved);
                console.log('播放器加载收藏列表:', this.favorites.length);
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

    // 修复播放列表相关方法 - 重点修改这里
    addToPlaylist(song, albumSongs = null) {
        // 如果提供了专辑歌曲，则设置整个专辑到播放列表
        if (albumSongs && albumSongs.length > 0) {
            console.log('设置整个专辑到播放列表，歌曲数量:', albumSongs.length);
            this.playlist = [...albumSongs];
            this.originalPlaylistOrder = [...albumSongs]; // 保存原始顺序
            this.currentPlaylistType = 'album';
            this.savePlaylist();
            this.updatePlaylistUI();
            console.log('专辑播放列表已设置，当前播放列表长度:', this.playlist.length);
            return;
        }
        
        // 否则按原来的逻辑添加单曲
        const isInPlaylist = this.playlist.some(s => s.id === song.id);
        if (!isInPlaylist) {
            this.playlist.push({
                ...song,
                addedAt: new Date().toISOString()
            });
            // 添加歌曲时也要更新原始顺序
            this.originalPlaylistOrder = [...this.playlist];
            this.savePlaylist();
            this.updatePlaylistUI();
            console.log('添加到播放列表，当前播放列表长度:', this.playlist.length);
            
            // 修复：立即更新播放列表计数
            this.updatePlaylistCount();
        } else {
            console.log('歌曲已在播放列表中');
        }
    }

    removeFromPlaylist(songId) {
        this.playlist = this.playlist.filter(song => song.id !== songId);
        this.originalPlaylistOrder = this.originalPlaylistOrder.filter(song => song.id !== songId);
        this.savePlaylist();
        this.updatePlaylistUI();
        this.updatePlaylistCount(); // 修复：更新计数
        
        if (this.currentSong && this.currentSong.id === songId) {
            if (this.playlist.length > 0) {
                this.play(this.playlist[0]);
            } else {
                this.audio.pause();
                this.isPlaying = false;
                this.currentSong = null;
                this.updateUI();
            }
        }
    }

    togglePlaylist() {
        const playlistPanel = document.getElementById('playlist-panel');
        if (!playlistPanel) return;
        
        const isCurrentlyVisible = playlistPanel.style.display === 'block';
        
        if (isCurrentlyVisible) {
            this.hidePlaylist();
        } else {
            this.showPlaylist();
        }
    }

    showPlaylist() {
        const playlistPanel = document.getElementById('playlist-panel');
        if (playlistPanel) {
            playlistPanel.style.display = 'block';
            this.isPlaylistVisible = true;
            this.updatePlaylistUI();
            this.updatePlaylistCount(); // 修复：确保计数正确
        }
    }

    hidePlaylist() {
        const playlistPanel = document.getElementById('playlist-panel');
        if (playlistPanel) {
            playlistPanel.style.display = 'none';
            this.isPlaylistVisible = false;
        }
    }

    // 修复播放列表UI更新方法
    updatePlaylistUI() {
        const playlistList = document.getElementById('playlist-list');
        const playlistTitle = document.querySelector('#playlist-panel h3');
        
        if (!playlistList) return;
        
        // 修复：更新播放列表计数
        this.updatePlaylistCount();
        
        if (this.playlist.length === 0) {
            playlistList.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">播放列表为空</div>';
            return;
        }
        
        playlistList.innerHTML = this.playlist.map(song => `
            <div class="playlist-song-item ${this.currentSong && this.currentSong.id === song.id ? 'current' : ''}" data-song-id="${song.id}">
                <img src="${song.cover_url || 'default-cover.jpg'}" alt="${song.title}" class="playlist-song-cover" onerror="this.src='default-cover.jpg'">
                <div class="playlist-song-info">
                    <div class="playlist-song-title">${song.title}</div>
                    <div class="playlist-song-album" style="font-size: 11px; color: #888; margin-top: 2px;">${song.album_title || '未知专辑'}</div>
                </div>
                <button class="remove-from-playlist" data-song-id="${song.id}" title="从播放列表删除">✕</button>
            </div>
        `).join('');
    }

    // 新增：更新播放列表计数方法
    updatePlaylistCount() {
        const playlistTitle = document.querySelector('#playlist-panel h3');
        if (playlistTitle) {
            playlistTitle.textContent = `播放列表 (${this.playlist.length})`;
        }
    }

    // 修复：从播放列表播放歌曲时确保专辑信息完整
    playFromPlaylist(songId) {
        const song = this.playlist.find(s => s.id === songId);
        if (song) {
            console.log('从播放列表播放歌曲:', song);
            
            // 修复：确保播放列表中的歌曲有完整的专辑信息
            if (!song.album_id || !song.album_type) {
                console.log('播放列表中的歌曲缺少专辑信息，尝试补充');
                const albumInfo = this.findAlbumInfoForSong(song);
                if (albumInfo) {
                    song.album_id = albumInfo.albumId;
                    song.album_type = albumInfo.type;
                    song.member_id = albumInfo.memberId;
                    console.log('补充专辑信息后的歌曲:', song);
                }
            }
            
            this.play(song, 'manual');
        }
    }

    savePlaylist() {
        try {
            const simplifiedPlaylist = this.playlist.map(song => ({
                id: song.id,
                title: song.title,
                file_url: song.file_url,
                duration: song.duration,
                cover_url: song.cover_url,
                album_title: song.album_title,
                artist: song.artist,
                addedAt: song.addedAt,
                mv_url: song.mv_url,
                album_id: song.album_id, // 修复：保存专辑ID
                album_type: song.album_type, // 修复：保存专辑类型
                member_id: song.member_id // 修复：保存成员ID
            }));
            localStorage.setItem('musicPlaylist', JSON.stringify(simplifiedPlaylist));
            console.log('保存播放列表:', this.playlist.length);
        } catch (error) {
            console.error('保存播放列表失败:', error);
        }
    }

    loadPlaylist() {
        const saved = localStorage.getItem('musicPlaylist');
        if (saved) {
            try {
                const savedPlaylist = JSON.parse(saved);
                this.playlist = savedPlaylist.map(savedSong => {
                    const fullSong = this.allSongs.find(s => s.id === savedSong.id);
                    if (fullSong) {
                        return {
                            ...fullSong,
                            addedAt: savedSong.addedAt,
                            // 修复：确保加载时保留专辑信息
                            album_id: savedSong.album_id || fullSong.album_id,
                            album_type: savedSong.album_type || fullSong.album_type,
                            member_id: savedSong.member_id || fullSong.member_id
                        };
                    }
                    return savedSong;
                }).filter(song => song); // 过滤掉null值
                
                // 加载时也保存原始顺序
                this.originalPlaylistOrder = [...this.playlist];
                
                this.updatePlaylistUI();
                this.updatePlaylistCount(); // 修复：加载后更新计数
                console.log('加载播放列表:', this.playlist.length);
            } catch (error) {
                console.error('加载播放列表失败:', error);
                this.playlist = [];
                this.originalPlaylistOrder = [];
            }
        } else {
            this.playlist = [];
            this.originalPlaylistOrder = [];
        }
    }

    // 修复收集所有歌曲的方法 - 确保专辑信息完整
    collectAllSongs() {
        if (window.allSongs && window.allSongs.length > 0) {
            this.allSongs = window.allSongs;
            console.log('从全局allSongs加载歌曲:', this.allSongs.length);
            
            // 修复：确保所有歌曲都有完整的专辑信息
            this.allSongs = this.allSongs.map(song => {
                if (!song.album_id || !song.album_type) {
                    const albumInfo = this.findAlbumInfoForSong(song);
                    if (albumInfo) {
                        return {
                            ...song,
                            album_id: albumInfo.albumId,
                            album_type: albumInfo.type,
                            member_id: albumInfo.memberId
                        };
                    }
                }
                return song;
            });
            
            return;
        }
        
        if (window.bigbangData) {
            this.allSongs = [
                ...(window.bigbangData.group?.albums || []).flatMap(album => 
                    album.songs.map(song => ({
                        ...song,
                        cover_url: song.cover_url || album.cover_url,
                        album_title: album.title,
                        artist: 'BIGBANG',
                        album_id: album.id,
                        album_type: 'group',
                        member_id: null
                    }))
                ),
                ...(window.bigbangData.members || []).flatMap(member =>
                    member.albums.flatMap(album =>
                        album.songs.map(song => ({
                            ...song,
                            cover_url: song.cover_url || album.cover_url,
                            album_title: album.title,
                            artist: member.stage_name,
                            album_id: album.id,
                            album_type: 'member',
                            member_id: member.id
                        }))
                    )
                )
            ];
            console.log('从bigbangData收集歌曲:', this.allSongs.length);
            return;
        }
        
        this.allSongs = [];
        console.log('未找到歌曲数据');
    }

    // 修复播放方法 - 重点修改这里：在专辑页面播放时设置整个专辑到播放列表
    play(song, playlistType = 'manual', albumSongs = null) {
        console.log('播放歌曲:', song, '播放列表类型:', playlistType, '专辑歌曲:', albumSongs);
        
        // 修复：确保歌曲信息完整，特别是专辑信息
        if (!song.album_id || !song.album_type) {
            console.log('歌曲缺少专辑信息，尝试补充');
            const albumInfo = this.findAlbumInfoForSong(song);
            if (albumInfo) {
                song.album_id = albumInfo.albumId;
                song.album_type = albumInfo.type;
                song.member_id = albumInfo.memberId;
                console.log('补充专辑信息后的歌曲:', song);
            }
        }
        
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
        this.currentPlaylistType = playlistType;
        
        // 修复：重点修改播放列表设置逻辑
        if (playlistType === 'favorites') {
            this.playlist = [...this.favorites];
            this.originalPlaylistOrder = [...this.favorites];
        } else if (playlistType === 'album' || albumSongs) {
            // 如果是专辑播放模式或者提供了专辑歌曲，设置整个专辑到播放列表
            const currentAlbumSongs = albumSongs || this.getAlbumSongs(song);
            this.playlist = currentAlbumSongs;
            this.originalPlaylistOrder = [...currentAlbumSongs];
            console.log('设置专辑播放列表，歌曲数量:', this.playlist.length);
        } else {
            // 手动模式：确保歌曲在播放列表中
            this.addToPlaylist(song);
        }
        
        this.currentIndex = this.playlist.findIndex(s => s.id === song.id);
        
        // 更新UI状态
        const isFavorite = this.favorites.some(fav => fav.id === song.id);
        this.updateFavoriteButton(isFavorite);
        
        this.updateMVButton();
        this.updatePlaylistUI();
        this.updateTimeDisplay();
        
        // 发送歌曲播放事件
        const songPlayedEvent = new CustomEvent('songPlayed', {
            detail: { song }
        });
        window.dispatchEvent(songPlayedEvent);
        
        // 修复：在播放时也更新专辑跳转信息
        if (isInWyyPage && this.currentSong) {
            console.log('在wyy.html页面播放歌曲，更新URL信息');
            this.updateWyyPageUrl();
        }
        
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

    // 新增：在专辑页面播放歌曲的方法（设置整个专辑到播放列表）
    playAlbumSong(song, albumSongs) {
        console.log('播放专辑歌曲，设置整个专辑到播放列表');
        this.play(song, 'album', albumSongs);
    }

    // 新增：在wyy.html页面更新URL以保持精准跳转
    updateWyyPageUrl() {
        if (!this.currentSong) return;
        
        const albumInfo = this.findAlbumInfoForSong(this.currentSong);
        if (!albumInfo) {
            console.log('无法找到专辑信息，无法更新URL');
            return;
        }
        
        let newUrl = `?album=${albumInfo.albumId}&song=${this.currentSong.id}`;
        if (albumInfo.memberId) {
            newUrl += `&member=${albumInfo.memberId}`;
        }
        
        // 使用replaceState更新URL而不刷新页面
        window.history.replaceState({}, '', newUrl);
        console.log('更新wyy.html页面URL:', newUrl);
    }

    // 修复获取专辑歌曲的方法
    getAlbumSongs(song) {
        console.log('获取专辑歌曲，当前歌曲:', song);
        const allAlbums = this.getAllAlbumsWithType();
        
        for (const album of allAlbums) {
            const foundSong = album.songs.find(s => s.id === song.id);
            if (foundSong) {
                console.log('找到专辑歌曲，专辑:', album.title, '歌曲数量:', album.songs.length);
                return album.songs.map(albumSong => ({
                    ...albumSong,
                    cover_url: albumSong.cover_url || album.cover_url,
                    album_title: album.title,
                    artist: album.type === 'group' ? 'BIGBANG' : (album.artist || '未知艺人'),
                    album_id: album.id,
                    album_type: album.type,
                    member_id: album.memberId
                }));
            }
        }
        
        console.log('未找到专辑歌曲，返回当前播放列表或单曲');
        return this.playlist.length > 0 ? this.playlist : [song];
    }

    // 新增：切换随机播放模式 - 重点修改这里
    toggleShuffle() {
        this.isShuffleMode = !this.isShuffleMode;
        
        if (this.isShuffleMode) {
            // 开启随机播放：保存原始顺序并随机排列播放列表
            if (this.originalPlaylistOrder.length === 0) {
                this.originalPlaylistOrder = [...this.playlist];
            }
            this.shufflePlaylist();
            console.log('开启随机播放，播放列表已重新排列');
        } else {
            // 关闭随机播放：恢复原始顺序
            if (this.originalPlaylistOrder.length > 0) {
                this.playlist = [...this.originalPlaylistOrder];
                console.log('关闭随机播放，恢复原始顺序');
            }
        }
        
        this.updateShuffleButton();
        this.updatePlaylistUI();
        this.savePlaylist();
        console.log('随机播放模式:', this.isShuffleMode ? '开启' : '关闭');
    }

    // 新增：随机排列播放列表
    shufflePlaylist() {
        if (this.playlist.length <= 1) return;
        
        const currentSongId = this.currentSong ? this.currentSong.id : null;
        const shuffled = [...this.playlist];
        
        // Fisher-Yates 洗牌算法
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // 如果当前正在播放歌曲，确保当前歌曲不在第一个位置（避免重复播放同一首）
        if (currentSongId && shuffled.length > 1) {
            const currentIndex = shuffled.findIndex(song => song.id === currentSongId);
            if (currentIndex === 0) {
                // 将当前歌曲与随机位置交换
                const swapIndex = Math.floor(Math.random() * (shuffled.length - 1)) + 1;
                [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
            }
        }
        
        this.playlist = shuffled;
    }

    // 新增：更新随机播放按钮状态
    updateShuffleButton() {
        const shuffleBtn = document.getElementById('player-shuffle');
        if (shuffleBtn) {
            if (this.isShuffleMode) {
                shuffleBtn.style.color = '#33FFFF';
                shuffleBtn.classList.add('active');
                shuffleBtn.title = '随机播放中';
            } else {
                shuffleBtn.style.color = 'white';
                shuffleBtn.classList.remove('active');
                shuffleBtn.title = '随机播放';
            }
        }
    }

    // 修改 next 方法，支持随机播放
    next() {
        if (this.playlist.length === 0) return;
        
        if (!this.currentSong) {
            this.play(this.playlist[0], this.currentPlaylistType);
            return;
        }
        
        // 随机播放模式
        if (this.isShuffleMode) {
            this.playRandom();
        } else {
            // 顺序播放模式（原有逻辑）
            const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
            if (index === -1) {
                this.play(this.playlist[0], this.currentPlaylistType);
            } else {
                const nextIndex = (index + 1) % this.playlist.length;
                this.play(this.playlist[nextIndex], this.currentPlaylistType);
            }
        }
    }

    // 修改 previous 方法，支持随机播放
    previous() {
        if (this.playlist.length === 0) return;
        
        if (!this.currentSong) {
            this.play(this.playlist[this.playlist.length - 1], this.currentPlaylistType);
            return;
        }
        
        // 随机播放模式下，上一首也随机
        if (this.isShuffleMode) {
            this.playRandom();
        } else {
            // 顺序播放模式（原有逻辑）
            const index = this.playlist.findIndex(s => s.id === this.currentSong.id);
            if (index === -1) {
                this.play(this.playlist[this.playlist.length - 1], this.currentPlaylistType);
            } else {
                const prevIndex = (index - 1 + this.playlist.length) % this.playlist.length;
                this.play(this.playlist[prevIndex], this.currentPlaylistType);
            }
        }
    }

    // 新增：随机播放方法
    playRandom() {
        if (this.playlist.length === 0) return;
        
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * this.playlist.length);
        } while (this.playlist.length > 1 && 
                 this.currentSong && 
                 this.playlist[randomIndex].id === this.currentSong.id);
        
        this.play(this.playlist[randomIndex], this.currentPlaylistType);
    }

    // 新增：立即随机播放一首歌的方法
    playRandomSong() {
        if (this.playlist.length === 0) {
            console.log('播放列表为空，无法随机播放');
            return;
        }
        
        const randomIndex = Math.floor(Math.random() * this.playlist.length);
        this.play(this.playlist[randomIndex], this.currentPlaylistType);
        console.log('随机播放歌曲:', this.playlist[randomIndex].title);
    }

    // 修复MV相关方法
    hasMV() {
        return this.currentSong && this.currentSong.mv_url;
    }

    updateMVButton() {
        const mvBtn = document.getElementById('player-mv');
        const mobileMvBtn = document.getElementById('mobile-player-mv');
        
        const hasMV = this.hasMV();
        console.log('更新MV按钮状态:', hasMV, '当前歌曲:', this.currentSong);
        
        if (mvBtn) {
            if (hasMV) {
                mvBtn.style.display = 'flex';
            } else {
                mvBtn.style.display = 'none';
            }
        }
        
        if (mobileMvBtn) {
            if (hasMV) {
                mobileMvBtn.style.display = 'flex';
            } else {
                mobileMvBtn.style.display = 'none';
            }
        }
    }

    toggleMV() {
        if (!this.hasMV()) {
            console.log('当前歌曲没有MV');
            return;
        }
        
        if (this.isMVMode) {
            this.closeMV();
        } else {
            this.openMV();
        }
    }

    openMV() {
        if (!this.hasMV() || this.isMVMode) return;
        
        this.isMVMode = true;
        
        const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                            window.location.href.includes('wyy.html');
        
        if (!isInWyyPage) {
            this.hidePlayerForMV();
        }
        
        // 创建MV全屏覆盖层
        this.mvOverlay = document.createElement('div');
        this.mvOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            z-index: 10002;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // 创建视频容器
        const videoContainer = document.createElement('div');
        videoContainer.style.cssText = `
            width: 90%;
            height: 80%;
            max-width: 1200px;
            position: relative;
        `;
        
        // 创建嵌入视频
        this.mvVideo = document.createElement('iframe');
        this.mvVideo.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 10px;
        `;
        this.mvVideo.src = this.currentSong.mv_url;
        this.mvVideo.allowFullscreen = true;
        
        // 创建关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px;
            right: 0;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            font-size: 20px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.3s ease;
        `;
        
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.3)';
        });
        
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        
        closeBtn.addEventListener('click', () => {
            this.closeMV();
        });
        
        // 组装元素
        videoContainer.appendChild(this.mvVideo);
        videoContainer.appendChild(closeBtn);
        this.mvOverlay.appendChild(videoContainer);
        document.body.appendChild(this.mvOverlay);
        
        // 点击背景关闭
        this.mvOverlay.addEventListener('click', (e) => {
            if (e.target === this.mvOverlay) {
                this.closeMV();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    closeMV() {
        if (!this.isMVMode) return;
        
        this.isMVMode = false;
        
        const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                            window.location.href.includes('wyy.html');
        
        if (!isInWyyPage) {
            this.showPlayerAfterMV();
        }
        
        if (this.mvOverlay) {
            document.body.removeChild(this.mvOverlay);
            this.mvOverlay = null;
        }
        
        if (this.mvVideo) {
            this.mvVideo = null;
        }
        
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }

    hidePlayerForMV() {
        const player = document.getElementById('global-player');
        if (player) {
            player.style.display = 'none';
        }
    }

    showPlayerAfterMV() {
        const player = document.getElementById('global-player');
        if (player && this.currentSong) {
            player.style.display = 'flex';
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Escape' && this.isMVMode) {
            this.closeMV();
        }
    }

    // DOM创建和事件绑定方法
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

        // 修复：在创建时确保使用正确的播放列表计数
        const playlistCount = this.playlist ? this.playlist.length : 0;

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
                    <div style="position: relative;">
                        <img id="player-cover" src="${this.currentSong?.cover_url || 'default-cover.jpg'}" style="width: 40px; height: 40px; border-radius: 6px; margin-right: 15px; flex-shrink: 0;" onerror="this.src='default-cover.jpg'">
                        <button id="player-mv" style="
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.6);
                            border: none;
                            border-radius: 6px;
                            color: #33FFFF;
                            font-size: 10px;
                            font-weight: bold;
                            cursor: pointer;
                            display: ${this.hasMV() ? 'flex' : 'none'};
                            align-items: center;
                            justify-content: center;
                            padding: 0;
                            transition: all 0.3s ease;
                            opacity: 0;
                        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">MV</button>
                    </div>
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
                    
                    <button id="mobile-player-mv" style="
                        background: none; 
                        border: none; 
                        color: #33FFFF; 
                        font-size: 14px; 
                        cursor: pointer; 
                        width: 24px; 
                        height: 24px; 
                        display: ${this.hasMV() ? 'flex' : 'none'}; 
                        align-items: center; 
                        justify-content: center; 
                        padding: 0;
                        line-height: 1;
                        margin-left: 5px;
                    " title="观看MV">🎬</button>
                    
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
                    ">&lt;</button>
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
                    ">${this.isPlaying ? '❚❚' : '▷'}</button>
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
                    ">&gt;</button>
                    
                    <!-- 新增：随机播放按钮 -->
                    <button id="player-shuffle" style="
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
                    " title="随机播放">⇄</button>
                    
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
                    <h3 style="color: #33FFFF; margin: 0;">播放列表 (${playlistCount})</h3>
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

                /* 新增：随机播放按钮激活状态 */
                #player-shuffle.active {
                    color: #33FFFF !important;
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
                    
                    #mobile-player-mv {
                        display: none !important;
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
                    
                    #player-favorite, #player-playlist, #mobile-player-mv, #player-shuffle {
                        margin: 0 !important;
                    }
                    
                    #player-mv {
                        display: none !important;
                    }
                }
            </style>
        `;
        
    document.documentElement.insertAdjacentHTML('beforeend', playerHTML);
    this.playerCreated = true;
    
    this.bindEvents();
    this.updateTimeDisplay();
    this.loadFavorites();
    this.loadPlaylist();
    
    setTimeout(() => {
        this.bindPlaylistEvents();
    }, 100);
}

    bindPlaylistEvents() {
        const playlistList = document.getElementById('playlist-list');
        if (!playlistList) return;
        
        playlistList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-from-playlist')) {
                e.stopPropagation();
                e.preventDefault();
                const songId = parseInt(e.target.dataset.songId);
                this.removeFromPlaylist(songId);
                return;
            }
            
            if (e.target.closest('.playlist-song-item') && !e.target.classList.contains('remove-from-playlist')) {
                const songItem = e.target.closest('.playlist-song-item');
                const songId = parseInt(songItem.dataset.songId);
                this.playFromPlaylist(songId);
                return;
            }
        });
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

    // 修复事件绑定 - 确保点击事件正确绑定
    bindEvents() {
        const buttons = [
            { id: 'player-playlist', handler: (e) => { this.togglePlaylist(); e.stopPropagation(); } },
            { id: 'close-playlist', handler: (e) => { this.hidePlaylist(); e.stopPropagation(); } },
            { id: 'player-play-pause', handler: () => this.togglePlayPause() },
            { id: 'player-prev', handler: () => this.previous() },
            { id: 'player-next', handler: () => this.next() },
            { id: 'player-favorite', handler: () => this.toggleFavorite() },
            { id: 'player-mv', handler: () => this.toggleMV() },
            { id: 'mobile-player-mv', handler: () => this.toggleMV() },
            // 新增：随机播放按钮事件
            { id: 'player-shuffle', handler: () => this.toggleShuffle() }
        ];
        
        buttons.forEach(button => {
            const element = document.getElementById(button.id);
            if (element) {
                element.addEventListener('click', button.handler);
            }
        });
        
        // 修复：确保专辑跳转点击事件正确绑定
        const playerTitle = document.getElementById('player-title');
        const mobileTitle = document.getElementById('mobile-song-title');
        
        if (playerTitle) {
            playerTitle.removeEventListener('click', this.goToCurrentAlbum.bind(this));
            playerTitle.addEventListener('click', () => {
                console.log('点击播放器标题，跳转到专辑');
                this.goToCurrentAlbum();
            });
        }
        
        if (mobileTitle) {
            mobileTitle.removeEventListener('click', this.goToCurrentAlbum.bind(this));
            mobileTitle.addEventListener('click', () => {
                console.log('点击移动端标题，跳转到专辑');
                this.goToCurrentAlbum();
            });
        }
        
        // 修复：确保播放列表点击事件正确绑定
        this.bindPlaylistEvents();
        
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-from-playlist') || 
                e.target.closest('.remove-from-playlist')) {
                e.stopPropagation();
                e.preventDefault();
                
                const removeButton = e.target.classList.contains('remove-from-playlist') 
                    ? e.target 
                    : e.target.closest('.remove-from-playlist');
                    
                const songId = parseInt(removeButton.dataset.songId);
                this.removeFromPlaylist(songId);
                return;
            }
            
            const songItem = e.target.closest('.playlist-song-item');
            if (songItem && !e.target.classList.contains('remove-from-playlist')) {
                const songId = parseInt(songItem.dataset.songId);
                this.playFromPlaylist(songId);
                return;
            }
            
            const playlistPanel = document.getElementById('playlist-panel');
            if (playlistPanel && playlistPanel.style.display === 'block') {
                const isClickInsidePanel = playlistPanel.contains(e.target);
                const isPlaylistButton = e.target.closest('#player-playlist');
                
                if (!isClickInsidePanel && !isPlaylistButton) {
                    this.hidePlaylist();
                }
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
    }

    bindAudioEvents() {
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.next());
        this.audio.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
        });
        this.audio.addEventListener('durationchange', () => {
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
        
        if (deltaY > 5) {
            const player = document.getElementById('global-player');
            const translateY = Math.min(deltaY * 0.8, 150);
            player.style.transform = `translateY(${translateY}px)`;
            
            const opacity = Math.max(0.4, 1 - (translateY / 200));
            player.style.opacity = opacity;
            
            const borderIntensity = Math.min(translateY / 100, 0.6);
            player.style.borderTop = `2px solid rgba(51, 255, 255, ${borderIntensity})`;
            
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
        
        player.style.borderTop = '1px solid #333';
        player.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease, border 0.3s ease';
        player.style.cursor = 'grab';

        const velocityThreshold = Math.abs(this.velocity) > 0.5;
        const distanceThreshold = deltaY > 30;
        
        if (distanceThreshold || (deltaY > 20 && velocityThreshold)) {
            this.closePlayer();
        } else {
            player.style.transform = 'translateY(0)';
            player.style.opacity = '1';
        }
    }

    closePlayer() {
        const player = document.getElementById('global-player');
        player.style.borderTop = '1px solid #333';
        player.style.transform = 'translateY(100%)';
        player.style.opacity = '0';
        
        this.audio.pause();
        this.isPlaying = false;
        
        this.playlist = [];
        this.savePlaylist();
        this.updatePlaylistUI();
        
        const isInWyyPage = window.location.pathname.includes('wyy.html') || 
                            window.location.href.includes('wyy.html');
        
        if (!isInWyyPage) {
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
                    cover.onerror = function() { this.src = 'default-cover.jpg'; };
                }
            } else {
                player.style.display = 'flex';
                if (mobileTitle) {
                    mobileTitle.textContent = '暂无歌曲播放';
                }
                if (title) {
                    title.textContent = '暂无歌曲播放';
                }
                if (cover) {
                    cover.src = 'default-cover.jpg';
                }
            }
        }
        
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '❚❚' : '▷';
        }
        
        this.updateTimeDisplay();
        this.updateMVButton(); // 确保MV按钮状态正确更新
        this.updateShuffleButton(); // 更新随机播放按钮状态
    }

    saveState() {
        const state = {
            currentSong: this.currentSong,
            isPlaying: this.isPlaying,
            currentTime: this.audio.currentTime,
            progress: this.progress,
            isShuffleMode: this.isShuffleMode, // 保存随机播放状态
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
                    this.isShuffleMode = state.isShuffleMode || false; // 加载随机播放状态
                    
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

// 修复全局函数，确保在wyy.html中能正确接收参数
document.addEventListener('DOMContentLoaded', function() {
    if (!window.globalPlayer) {
        window.globalPlayer = new GlobalPlayer();
        window.globalPlayer.bindWindowUnload();
    }
    
    // 修复：增强全局播放函数 - 添加专辑播放支持
    window.playSong = (song, source = 'unknown', albumSongs = null) => {
        console.log('调用全局播放:', song, '来源:', source, '专辑歌曲:', albumSongs);
        if (window.globalPlayer) {
            // 确保歌曲有完整的专辑信息
            if (!song.album_id || !song.album_type) {
                console.log('歌曲缺少专辑信息，尝试补充');
                const albumInfo = window.globalPlayer.findAlbumInfoForSong(song);
                if (albumInfo) {
                    song.album_id = albumInfo.albumId;
                    song.album_type = albumInfo.type;
                    song.member_id = albumInfo.memberId;
                }
            }
            
            // 如果在专辑页面并且有专辑歌曲，使用专辑播放模式
            if (albumSongs && albumSongs.length > 0) {
                console.log('使用专辑播放模式，歌曲数量:', albumSongs.length);
                window.globalPlayer.playAlbumSong(song, albumSongs);
            } else {
                window.globalPlayer.play(song);
            }
        } else {
            window.globalPlayer = new GlobalPlayer();
            setTimeout(() => {
                if (albumSongs && albumSongs.length > 0) {
                    window.globalPlayer.playAlbumSong(song, albumSongs);
                } else {
                    window.globalPlayer.play(song);
                }
            }, 100);
        }
    };
    
    // 修复：增强专辑显示函数
    window.showSongAlbum = function(song) {
        console.log('showSongAlbum 被调用，歌曲:', song);
        
        if (!song) return;
        
        if (window.globalSetSelectedAlbumId && window.globalSetCurrentView) {
            // 查找专辑信息
            const albumInfo = window.globalPlayer.findAlbumInfoForSong(song);
            if (albumInfo) {
                console.log('找到专辑信息，显示专辑:', albumInfo.albumId);
                window.globalSetSelectedAlbumId(albumInfo.albumId);
                window.globalSetCurrentView('albumDetail');
                
                // 延迟滚动到歌曲
                setTimeout(() => {
                    const songElement = document.querySelector(`[data-song-id="${song.id}"]`);
                    if (songElement) {
                        songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        songElement.style.background = 'rgba(51, 255, 255, 0.1)';
                        setTimeout(() => {
                            songElement.style.background = '';
                        }, 3000);
                    }
                }, 1000);
            }
        }
    };
    
    console.log('全局播放器已初始化，专辑跳转功能已启用');
});

// 立即创建实例
window.globalPlayer = new GlobalPlayer();
window.globalPlayer.bindWindowUnload();

// 修复全局播放函数
window.playSong = (song, albumSongs = null) => {
    console.log('调用播放:', song, '专辑歌曲:', albumSongs);
    if (window.globalPlayer) {
        if (albumSongs && albumSongs.length > 0) {
            window.globalPlayer.playAlbumSong(song, albumSongs);
        } else {
            window.globalPlayer.play(song);
        }
    } else {
        console.error('全局播放器未初始化');
    }
};

// 新增：全局随机播放函数
window.playRandomSong = () => {
    if (window.globalPlayer) {
        window.globalPlayer.playRandomSong();
    } else {
        console.error('全局播放器未初始化');
    }
};

// 新增：全局切换随机播放函数
window.toggleShuffle = () => {
    if (window.globalPlayer) {
        window.globalPlayer.toggleShuffle();
    } else {
        console.error('全局播放器未初始化');
    }
};