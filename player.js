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
        this.allSongs = []; // 添加本地歌曲列表
        
        this.init();
    }

    init() {
        this.loadState();
        this.waitForBodyAndCreatePlayer();
        this.bindAudioEvents();
        this.collectAllSongs(); // 收集所有歌曲
        setInterval(() => this.saveState(), 1000);
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
        
        // 方法3: 硬编码备用歌曲列表
        this.allSongs = [
            { id: 101, title: 'BANG BANG BANG', duration: 231, file_url: 'https://github.com/Kaixin0129/bigbangri-music/raw/main/Put%20Your%20Hands%20Up%20-%20Intro.mp3', cover_url: 'BIGBANG2006.jpg' },
            { id: 102, title: 'LOVE SONG', duration: 223, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'BIGBANG2006.jpg' },
            { id: 103, title: 'BAE BAE', duration: 156, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'BIGBANG2006.jpg' },
            { id: 104, title: 'IF YOU', duration: 264, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'BIGBANG2006.jpg' },
            { id: 201, title: 'FANTASTIC BABY', duration: 229, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=2' },
            { id: 202, title: 'BLUE', duration: 236, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=2' },
            { id: 203, title: 'BAD BOY', duration: 234, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=2' },
            { id: 301, title: 'MONSTER', duration: 234, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=3' },
            { id: 302, title: 'STILL ALIVE', duration: 204, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=3' },
            { id: 401, title: 'TONIGHT', duration: 234, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=4' },
            { id: 402, title: 'HANDS UP', duration: 203, file_url: 'https://www.soundjay.com/misc/sounds/fail-buzzer-02.wav', cover_url: 'https://picsum.photos/300/300?random=4' }
        ];
        console.log('使用备用歌曲列表:', this.allSongs.length);
    }

    // 修复 next() 方法
    next() {
        console.log('下一首按钮点击');
        if (!this.currentSong || this.allSongs.length === 0) {
            console.log('无法播放下一首: 没有当前歌曲或歌曲列表为空');
            return;
        }
        
        const index = this.allSongs.findIndex(s => s.id === this.currentSong.id);
        console.log('当前歌曲索引:', index, '歌曲ID:', this.currentSong.id);
        
        if (index === -1) {
            console.log('未找到当前歌曲在列表中的位置');
            // 如果没找到，就播放第一首
            this.play(this.allSongs[0]);
            return;
        }
        
        const nextIndex = (index + 1) % this.allSongs.length;
        console.log('下一首索引:', nextIndex, '歌曲:', this.allSongs[nextIndex].title);
        
        this.play(this.allSongs[nextIndex]);
    }

    // 修复 previous() 方法
    previous() {
        console.log('上一首按钮点击');
        if (!this.currentSong || this.allSongs.length === 0) {
            console.log('无法播放上一首: 没有当前歌曲或歌曲列表为空');
            return;
        }
        
        const index = this.allSongs.findIndex(s => s.id === this.currentSong.id);
        console.log('当前歌曲索引:', index, '歌曲ID:', this.currentSong.id);
        
        if (index === -1) {
            console.log('未找到当前歌曲在列表中的位置');
            // 如果没找到，就播放最后一首
            this.play(this.allSongs[this.allSongs.length - 1]);
            return;
        }
        
        const prevIndex = (index - 1 + this.allSongs.length) % this.allSongs.length;
        console.log('上一首索引:', prevIndex, '歌曲:', this.allSongs[prevIndex].title);
        
        this.play(this.allSongs[prevIndex]);
    }

    // 修改 play 方法，确保歌曲有封面
    play(song) {
        console.log('播放歌曲:', song);
        
        // 确保歌曲有封面
        if (!song.cover_url) {
            song.cover_url = 'default-cover.jpg';
        }
        
        this.currentSong = song;
        this.audio.src = song.file_url;
        
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

    // 其他方法保持不变...
    // [这里是你原来的所有其他方法，包括 createPlayerDOM, bindEvents, updateProgress 等]
    // 为了简洁，我没有重复这些代码，你只需要替换上面的方法

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
                <!-- 左侧：封面和歌曲信息 -->
                <div style="display: flex; align-items: center; flex: 1; min-width: 0; max-width: 40%;">
                    <img id="player-cover" src="${this.currentSong?.cover_url || 'default-cover.jpg'}" style="width: 40px; height: 40px; border-radius: 6px; margin-right: 15px; flex-shrink: 0;">
                    <div style="min-width: 0; flex: 1; width: 100%;">
                        <div id="player-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 14px; line-height: 1.3; width: 100%; font-weight: bold;">${this.currentSong?.title || '暂无播放'}</div>
                    </div>
                </div>
                
                <!-- 中间：控制按钮 -->
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
                </div>
                
                <!-- 右侧：进度条和时间显示 -->
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
            
            <!-- 时间提示框样式 -->
            <style>
                #player-progress {
                    position: relative;
                    cursor: pointer;
                }
                
                /* 自定义进度条样式 */
                #player-progress::-webkit-slider-thumb {
                    appearance: none;
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: #33FFFF;
                    cursor: pointer;
                }
                
                #player-progress::-moz-range-thumb {
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: #33FFFF;
                    cursor: pointer;
                    border: none;
                }
            </style>
            
            <!-- 媒体查询样式 -->
            <style>
                /* 播放按钮居中修复 */
                #player-prev,
                #player-play-pause,
                #player-next {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    text-align: center !important;
                    line-height: 1 !important;
                    font-size: 16px !important;
                }
                
                #player-play-pause {
                    font-size: 14px !important;
                }

                /* 确保所有文字都是粗体 */
                #player-title {
                    font-weight: bold !important;
                }
                
                #current-time, #duration-time {
                    font-weight: bold !important;
                }

                /* 电脑版：使用绝对定位确保按钮居中 */
                @media (min-width: 769px) {
                    #global-player > div:nth-child(2) {
                        position: absolute !important;
                        left: 50% !important;
                        transform: translateX(-50%) !important;
                    }
                }

                /* 手机版：只修改进度条和时间显示，保持按钮居中 */
                @media (max-width: 768px) {
                    #global-player {
                        justify-content: space-between;
                    }
                    
                    #global-player > div:nth-child(2) {
                        position: absolute !important; /* 保持绝对定位 */
                        left: 50% !important; /* 保持居中 */
                        transform: translateX(-50%) !important; /* 保持居中 */
                        margin: 0 !important;
                    }
                    
                    #global-player > div:first-child {
                        max-width: 35% !important;
                    }
                    
                    #global-player > div:last-child > div:nth-child(2) {
                        width: 100px !important;
                    }
                    
                    /* 手机版：隐藏总时长，显示当前时间 */
                    #duration-time {
                        display: none !important;
                    }
                    
                    #current-time {
                        display: block !important;
                        color: white !important;
                        font-size: 12px !important;
                        min-width: 40px !important;
                    }
                }

                @media (max-width: 480px) {
                    #global-player {
                        padding: 6px 8px;
                        min-height: 50px;
                    }
                    
                    #player-cover {
                        width: 35px !important;
                        height: 35px !important;
                        margin-right: 12px !important;
                    }
                    
                    #player-title {
                        font-size: 12px !important;
                        font-weight: bold !important;
                    }
                    
                    #global-player > div:first-child {
                        max-width: 30% !important;
                    }
                    
                    #player-prev,
                    #player-play-pause,
                    #player-next {
                        width: 28px !important;
                        height: 28px !important;
                        font-size: 14px !important;
                    }
                    
                    #player-play-pause {
                        font-size: 12px !important;
                    }
                    
                    #global-player > div:last-child > div:nth-child(2) {
                        width: 80px !important;
                    }
                    
                    /* 小屏手机当前时间字体调整 */
                    #current-time {
                        font-size: 11px !important;
                    }
                }
                
                @media (max-width: 360px) {
                    #global-player {
                        padding: 5px;
                        min-height: auto;
                    }
                    
                    #global-player > div:first-child {
                        max-width: 35% !important;
                    }
                    
                    #player-cover {
                        margin-right: 10px !important;
                    }
                    
                    #global-player > div:last-child > div:nth-child(2) {
                        width: 70px !important;
                    }
                    
                    #player-prev,
                    #player-play-pause,
                    #player-next {
                        width: 26px !important;
                        height: 26px !important;
                        font-size: 12px !important;
                    }
                    
                    #current-time {
                        font-size: 10px !important;
                    }
                }
            </style>
        `;
        
        document.documentElement.insertAdjacentHTML('beforeend', playerHTML);
        console.log('播放器DOM创建完成');
        this.playerCreated = true;
        
        this.bindEvents();
        this.updateTimeDisplay();
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

    // 绑定事件
    bindEvents() {
        console.log('绑定播放器事件...');
        
        document.addEventListener('click', (e) => {
            if (e.target.id === 'player-play-pause') {
                this.togglePlayPause();
            } else if (e.target.id === 'player-prev') {
                this.previous();
            } else if (e.target.id === 'player-next') {
                this.next();
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

    updateUI() {
        const player = document.getElementById('global-player');
        const playBtn = document.getElementById('player-play-pause');
        const title = document.getElementById('player-title');
        const cover = document.getElementById('player-cover');
        
        if (player && this.currentSong) {
            player.style.display = 'flex';
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