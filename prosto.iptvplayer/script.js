let inactivityTimer,
    playlists = JSON.parse(localStorage.getItem("playlists")) || [{name:"Пример плейлиста, не удалять!",url:"https://iptv-org.github.io/iptv/countries/ru.m3u"}],
    channels = [],
    groups = [],
    currentPlaylistIndex = -1,
    currentChannelIndex = 0,
    currentGroupIndex = -1,
    selectedPlaylistIndex = -1,
    focusedElement = null,
    keyboardActive = false,
    isMenuOpen = false;

const video = document.getElementById("video"),
      notification = document.getElementById("notification"),
      mainMenu = document.getElementById("main-menu");

// Проверка поддержки форматов
const mediaSupport = {
    hls: video.canPlayType('application/vnd.apple.mpegurl') || 
         (typeof Hls !== "undefined" && Hls.isSupported()),
    dash: typeof dashjs !== "undefined",
    rtmp: false,
    rtsp: false
};

// Инициализация меню
function initMenu() {
    document.addEventListener("keydown", handleKeyDown);
}

// Обработчик нажатий клавиш
function handleKeyDown(e) {
    if (e.keyCode === 461 || e.which === 461) {
        handleBackButton();
        e.preventDefault();
        return;
    }
    
    if (e.keyCode === 37 || e.which === 37) {
        toggleMainMenu();
        e.preventDefault();
        return;
    }
    
    handleGlobalKeyDown(e);
}

// Обработка кнопки BACK
function handleBackButton() {
    const modal = document.getElementById("add-playlist-modal");
    const contextMenuVisible = document.getElementById("playlist-context-menu").style.display === "block";
    const panelVisible = document.querySelector(".sub-panel.visible");
    
    if (modal) {
        modal.remove();
        keyboardActive = false;
        showPanel("playlists-panel");
        return;
    }
    
    if (contextMenuVisible) {
        hidePlaylistContextMenu();
        return;
    } 
    else if (currentGroupIndex >= 0) {
        const prevGroupIndex = currentGroupIndex;
        currentGroupIndex = -1;
        renderGroups();
        
        setTimeout(() => {
            if (prevGroupIndex >= 0) {
                const groupItems = document.querySelectorAll(".group-item");
                if (groupItems.length > prevGroupIndex) {
                    groupItems[prevGroupIndex].focus();
                    focusedElement = groupItems[prevGroupIndex];
                }
            }
        }, 100);
        return;
    } 
    else if (panelVisible) {
        hidePanel("playlists-panel");
        hidePanel("channels-panel");
        hidePanel("groups-panel");
        return;
    } 
    else if (isMenuOpen) {
        toggleMainMenu();
        return;
    }
}

// Переключение главного меню
function toggleMainMenu() {
    const menu = document.getElementById("main-menu");
    const videoContainer = document.getElementById("video-container");
    
    if (isMenuOpen) {
        menu.classList.remove("visible");
        videoContainer.classList.remove("menu-visible");
        closeAllPanels();
        video.focus();
    } else {
        menu.classList.add("visible");
        videoContainer.classList.add("menu-visible");
        setInitialFocus("main-menu");
    }
    
    isMenuOpen = !isMenuOpen;
    resetInactivityTimer();
}

// Установка фокуса
function setInitialFocus(containerId, selector = null) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        if (container) {
            let element = selector ? container.querySelector(selector) : 
                container.querySelector("[tabindex], button, input, select, textarea, .menu-item, .channel-item, .group-item, .playlist-item");
            if (element) {
                element.focus();
                focusedElement = element;
            }
        }
    }, 100);
}

// Закрытие всех панелей
function closeAllPanels() {
    document.querySelectorAll('.sub-panel').forEach(panel => {
        panel.classList.remove("visible");
    });
    hidePlaylistContextMenu();
}

// Показать панель
function showPanel(panelId) {
    closeAllPanels();
    
    if (!isMenuOpen) {
        toggleMainMenu();
    }
    
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add("visible");
        resetInactivityTimer();
        
        setTimeout(() => {
            let elementToFocus = null;
            
            if (panelId === "playlists-panel" && currentPlaylistIndex >= 0) {
                elementToFocus = document.querySelector(`.playlist-item:nth-child(${currentPlaylistIndex+1})`);
            } 
            else if (panelId === "channels-panel" && currentChannelIndex >= 0 && channels.length > 0) {
                elementToFocus = document.querySelectorAll(".channel-item")[currentChannelIndex];
            } 
            else if (panelId === "groups-panel" && currentChannelIndex >= 0 && channels.length > 0) {
                const channel = channels[currentChannelIndex];
                currentGroupIndex = groups.findIndex(g => g.name === channel.group);
                elementToFocus = document.querySelectorAll(".group-item")[currentGroupIndex];
            }
            
            if (!elementToFocus) {
                elementToFocus = panel.querySelector(".channel-item, .group-item, .playlist-item");
            }
            
            if (elementToFocus) {
                elementToFocus.focus();
            }
        }, 100);
    }
}

// Скрыть панель
function hidePanel(panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.remove("visible");
    }
    
    if (panelId === "playlists-panel") {
        hidePlaylistContextMenu();
    }
    
    setTimeout(() => {
        if (!document.querySelector("#main-menu .menu-item:focus")) {
            const firstMenuItem = document.querySelector("#main-menu .menu-item");
            if (firstMenuItem) {
                firstMenuItem.focus();
            }
        }
    }, 100);
}

// Скрыть главное меню
function hideMainMenu() {
    document.getElementById("main-menu").classList.remove("visible");
    document.getElementById("video-container").classList.remove("menu-visible");
    closeAllPanels();
    isMenuOpen = false;
    video.focus();
}

// Показать уведомление
function showNotification(message = "") {
    if (message) notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}

// Сброс таймера неактивности
function resetInactivityTimer() {
    if (!keyboardActive) {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            hideMainMenu();
        }, 10000);
    }
}

// Контекстное меню плейлиста
function showPlaylistContextMenu(index, event) {
    selectedPlaylistIndex = index;
    const menu = document.getElementById("playlist-context-menu");
    const rect = event.target.getBoundingClientRect();
    
    menu.style.top = `${rect.bottom + window.scrollY}px`;
    menu.style.left = `${rect.left + window.scrollX}px`;
    menu.style.display = "block";
    
    setInitialFocus("playlist-context-menu");
}

function hidePlaylistContextMenu() {
    const menu = document.getElementById("playlist-context-menu");
    menu.style.display = "none";
    
    if (selectedPlaylistIndex >= 0) {
        const playlistItem = document.querySelectorAll(".playlist-item")[selectedPlaylistIndex];
        if (playlistItem) {
            playlistItem.focus();
        }
    }
}

function loadSelectedPlaylist() {
    if (selectedPlaylistIndex >= 0) {
        currentPlaylistIndex = selectedPlaylistIndex;
        hidePlaylistContextMenu();
        loadPlaylist(currentPlaylistIndex);
    }
}

function deleteSelectedPlaylist() {
    if (selectedPlaylistIndex >= 0) {
        playlists.splice(selectedPlaylistIndex, 1);
        localStorage.setItem("playlists", JSON.stringify(playlists));
        
        if (currentPlaylistIndex === selectedPlaylistIndex) {
            currentPlaylistIndex = -1;
            channels = [];
            renderChannels();
        } else if (currentPlaylistIndex > selectedPlaylistIndex) {
            currentPlaylistIndex--;
        }
        
        localStorage.setItem("lastPlaylistIndex", currentPlaylistIndex);
        renderPlaylists();
        hidePlaylistContextMenu();
        
        if (playlists.length === 0) {
            showNotification("Нет сохраненных плейлистов");
        }
    }
}

// Отрисовка плейлистов
function renderPlaylists() {
    const container = document.getElementById("playlists-list");
    container.innerHTML = "";
    
    if (playlists.length === 0) {
        container.innerHTML = '<p style="font-size: 1.2em; text-align: center; padding: 20px;">Нет сохраненных плейлистов</p>';
    }
    
    playlists.forEach((playlist, index) => {
        const item = document.createElement("div");
        item.className = `playlist-item${index === currentPlaylistIndex ? " active" : ""}`;
        item.textContent = playlist.name;
        item.tabIndex = 0;
        
        item.onclick = (e) => {
            e.stopPropagation();
            showPlaylistContextMenu(index, e);
        };
        
        item.onkeydown = (e) => {
            if (e.key === "Enter") {
                e.stopPropagation();
                e.preventDefault();
                showPlaylistContextMenu(index, {target: item});
            }
        };
        
        container.appendChild(item);
    });
    
    const addButton = document.createElement("button");
    addButton.className = "menu-item primary-btn";
    addButton.tabIndex = 0;
    addButton.textContent = "Добавить ссылку на плейлист";
    addButton.onclick = showAddPlaylistModal;
    addButton.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            showAddPlaylistModal();
        }
    };
    
    container.appendChild(addButton);
}

// Модальное окно добавления плейлиста
function showAddPlaylistModal() {
    hidePanel("playlists-panel");
    
    document.body.insertAdjacentHTML("beforeend", `
        <div id="add-playlist-modal" class="modal-overlay">
            <div class="modal-content">
                <h3>Добавить новый плейлист</h3>
                <div class="form-group">
                    <label for="modal-playlist-name">Название:</label>
                    <input type="text" id="modal-playlist-name" class="form-input" tabindex="0">
                </div>
                <div class="form-group">
                    <label for="modal-playlist-url">URL плейлиста:</label>
                    <input type="text" id="modal-playlist-url" class="form-input" tabindex="0" placeholder="http://example.com/playlist.m3u">
                </div>
                <div class="modal-buttons">
                    <button id="modal-save-btn" class="primary-btn" tabindex="0">Сохранить</button>
                    <button id="modal-cancel-btn" class="secondary-btn" tabindex="0">Отмена</button>
                </div>
            </div>
        </div>
    `);
    
    const modal = document.getElementById("add-playlist-modal");
    const nameInput = document.getElementById("modal-playlist-name");
    const urlInput = document.getElementById("modal-playlist-url");
    const saveBtn = document.getElementById("modal-save-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");
    
    setTimeout(() => {
        nameInput.focus();
        keyboardActive = true;
        focusedElement = nameInput;
    }, 100);
    
    const savePlaylist = () => {
        const name = nameInput.value.trim();
        const url = urlInput.value.trim();
        
        if (name && url) {
            try {
                new URL(url);
                
                playlists.push({name, url});
                currentPlaylistIndex = playlists.length - 1;
                localStorage.setItem("playlists", JSON.stringify(playlists));
                
                modal.remove();
                keyboardActive = false;
                
                renderPlaylists();
                loadPlaylist(currentPlaylistIndex);
                showPanel("playlists-panel");
            } catch (e) {
                showNotification("Введите корректный URL плейлиста");
            }
        } else {
            showNotification("Заполните все поля");
        }
    };
    
    const cancel = () => {
        modal.remove();
        keyboardActive = false;
        showPanel("playlists-panel");
    };
    
    saveBtn.addEventListener("click", savePlaylist);
    cancelBtn.addEventListener("click", cancel);
    
    modal.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "Enter":
                if (document.activeElement === saveBtn) {
                    e.preventDefault();
                    savePlaylist();
                } else if (document.activeElement === cancelBtn) {
                    e.preventDefault();
                    cancel();
                } else if (document.activeElement === nameInput || document.activeElement === urlInput) {
                    e.preventDefault();
                    savePlaylist();
                }
                break;
                
            case "Escape":
                e.preventDefault();
                cancel();
                break;
                
            case "ArrowDown":
                if (document.activeElement === nameInput) {
                    e.preventDefault();
                    urlInput.focus();
                } else if (document.activeElement === urlInput) {
                    e.preventDefault();
                    saveBtn.focus();
                } else if (document.activeElement === saveBtn) {
                    e.preventDefault();
                    cancelBtn.focus();
                }
                break;
                
            case "ArrowUp":
                if (document.activeElement === urlInput) {
                    e.preventDefault();
                    nameInput.focus();
                } else if (document.activeElement === saveBtn) {
                    e.preventDefault();
                    urlInput.focus();
                } else if (document.activeElement === cancelBtn) {
                    e.preventDefault();
                    saveBtn.focus();
                }
                break;
                
            case "Tab":
                e.preventDefault();
                if (document.activeElement === nameInput) {
                    urlInput.focus();
                } else if (document.activeElement === urlInput) {
                    saveBtn.focus();
                } else if (document.activeElement === saveBtn) {
                    cancelBtn.focus();
                } else if (document.activeElement === cancelBtn) {
                    nameInput.focus();
                }
                break;
        }
    });
    
    clearTimeout(inactivityTimer);
}

// Загрузка плейлиста
async function loadPlaylist(index) {
    if (index < 0 || index >= playlists.length) return;
    
    const playlist = playlists[index];
    
    try {
        const url = playlist.url.startsWith("http") ? playlist.url : `http://${playlist.url}`;
        const response = await fetch(url, {
            headers: {"X-Requested-With": "XMLHttpRequest"}
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const text = await response.text();
        let parsedChannels = [];
        
        if (text.includes("#EXTM3U")) {
            parsedChannels = parseM3U(text);
        } else if (text.toLowerCase().includes("[playlist]")) {
            parsedChannels = parsePLS(text);
        } else {
            parsedChannels = parseSimpleList(text);
        }
        
        if (parsedChannels.length > 0) {
            channels = parsedChannels;
            currentChannelIndex = parseInt(localStorage.getItem(`lastChannelIndex_${index}`)) || 0;
            
            updateGroups();
            renderChannels();
            renderGroups();
            playCurrentChannel();
            
            currentPlaylistIndex = index;
            localStorage.setItem("lastPlaylistIndex", index);
        } else {
            showNotification("Не удалось распознать плейлист");
        }
    } catch (error) {
        showNotification(`Ошибка загрузки плейлиста: ${error.message}`);
    }
}

// Парсеры плейлистов
function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];
    let currentName = "";
    let currentGroup = "Без группы";
    let currentLogo = "";
    let currentId = "";

    for (const line of lines) {
        if (line.startsWith("#EXTINF")) {
            currentName = line.split(",").pop().trim();
            
            const groupMatch = line.match(/group-title="([^"]*)"/i);
            currentGroup = groupMatch ? groupMatch[1] : "Без группы";
            
            const idMatch = line.match(/tvg-id="([^"]*)"/i);
            currentId = idMatch ? idMatch[1] : "";
            
            const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
            currentLogo = logoMatch ? logoMatch[1] : "";
        }
        else if (line.startsWith("#EXTGRP")) {
            currentGroup = line.replace("#EXTGRP:", "").trim();
        }
        else if (line.startsWith("http") || line.startsWith("rtmp") || line.startsWith("rtsp")) {
            channels.push({
                name: currentName,
                url: line.trim(),
                group: currentGroup,
                id: currentId,
                logo: currentLogo
            });
            
            currentName = "";
            currentGroup = "Без группы";
            currentLogo = "";
            currentId = "";
        }
    }

    return channels;
}

function parsePLS(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];
    const items = {};
    
    for (const line of lines) {
        if (line.startsWith("File")) {
            const match = line.match(/File(\d+)=(.*)/);
            if (match) {
                const index = match[1];
                items[index] = items[index] || {};
                items[index].url = match[2];
            }
        } 
        else if (line.startsWith("Title")) {
            const match = line.match(/Title(\d+)=(.*)/);
            if (match) {
                const index = match[1];
                items[index] = items[index] || {};
                items[index].name = match[2];
            }
        }
    }
    
    for (const index in items) {
        channels.push({
            name: items[index].name || `Канал ${index}`,
            url: items[index].url,
            group: "Без группы"
        });
    }
    
    return channels;
}

function parseSimpleList(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];
    let channelNumber = 1;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine && (trimmedLine.startsWith("http") || trimmedLine.startsWith("rtmp") || trimmedLine.startsWith("rtsp"))) {
            channels.push({
                name: `Канал ${channelNumber++}`,
                url: trimmedLine,
                group: "Без группы"
            });
        }
    }
    
    return channels;
}

// Воспроизведение текущего канала
function playCurrentChannel() {
    if (channels.length === 0 || currentChannelIndex < 0) {
        showNotification("Нет доступных каналов");
        return;
    }

    const channel = channels[currentChannelIndex];
    video.pause();
    video.removeAttribute('src');
    video.load();

    const isHLS = channel.url.includes('.m3u8') || 
                 channel.url.includes('hls') || 
                 channel.url.includes('m3u');
    const isDASH = channel.url.includes('.mpd');
    const isRTMP = channel.url.startsWith('rtmp://');
    const isRTSP = channel.url.startsWith('rtsp://');

    try {
        if (isHLS && typeof Hls !== "undefined" && Hls.isSupported()) {
            const hls = new Hls({
                maxMaxBufferLength: 30,
                maxBufferSize: 60000,
                maxBufferLength: 30,
                enableWorker: true
            });
            
            hls.loadSource(channel.url);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            tryFallbackPlayback(channel.url);
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            tryFallbackPlayback(channel.url);
                    }
                }
            });
            
            video.play().catch(e => {
                console.error("Auto-play failed:", e);
                tryFallbackPlayback(channel.url);
            });
        } 
        else if (isDASH && typeof dashjs !== "undefined") {
            const player = dashjs.MediaPlayer().create();
            player.initialize(video, channel.url, true);
            video.play().catch(e => console.error("DASH play error:", e));
        }
        else if (isRTMP) {
            const convertedUrl = channel.url.replace('rtmp://', 'http://')
                                          .replace('/live/', '/hls/') + '.m3u8';
            tryFallbackPlayback(convertedUrl);
        }
        else if (isRTSP) {
            const convertedUrl = channel.url.replace('rtsp://', 'http://') + '.m3u8';
            tryFallbackPlayback(convertedUrl);
        }
        else {
            video.src = channel.url;
            video.play().catch(e => {
                console.error("Direct play failed:", e);
                tryFallbackPlayback(channel.url);
            });
        }
    } catch (e) {
        console.error("Playback error:", e);
        tryFallbackPlayback(channel.url);
    }

    if (currentPlaylistIndex >= 0) {
        localStorage.setItem(`lastChannelIndex_${currentPlaylistIndex}`, currentChannelIndex);
    }

    document.querySelectorAll(".channel-item").forEach((item, index) => {
        item.classList.toggle("active", index === currentChannelIndex);
    });
}

// Попытка альтернативного воспроизведения
function tryFallbackPlayback(url) {
    if (url.includes('.m3u8')) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.play().catch(e => console.error("Native HLS play failed:", e));
        } else {
            showNotification("Не удалось воспроизвести HLS поток");
        }
    } else {
        video.src = url;
        video.play().catch(e => {
            console.error("Final play attempt failed:", e);
            showNotification("Неподдерживаемый формат потока");
        });
    }
}

// Отрисовка каналов
function renderChannels() {
    const container = document.getElementById("channels-list");
    container.innerHTML = "";
    
    if (channels.length === 0) {
        container.innerHTML = '<p style="font-size: 1.2em; text-align: center; padding: 20px;">Нет доступных каналов</p>';
        return;
    }
    
    channels.forEach((channel, index) => {
        const item = document.createElement("div");
        item.className = `channel-item${index === currentChannelIndex ? " active" : ""}`;
        item.tabIndex = 0;
        
        const numberSpan = document.createElement("span");
        numberSpan.className = "channel-number";
        numberSpan.textContent = `${index + 1}.`;
        
        const nameSpan = document.createElement("span");
        nameSpan.className = "channel-name";
        nameSpan.textContent = channel.name;
        
        item.appendChild(numberSpan);
        item.appendChild(nameSpan);
        
        item.onclick = () => {
            currentChannelIndex = index;
            playCurrentChannel();
        };
        
        item.onkeydown = (e) => {
            if (e.key === "Enter") {
                currentChannelIndex = index;
                playCurrentChannel();
            }
        };
        
        container.appendChild(item);
    });
}

// Обновление групп каналов
function updateGroups() {
    const groupsMap = {};
    
    channels.forEach(channel => {
        if (!groupsMap[channel.group]) {
            groupsMap[channel.group] = [];
        }
        groupsMap[channel.group].push(channel);
    });
    
    groups = Object.keys(groupsMap).map(name => ({
        name,
        channels: groupsMap[name]
    }));
    
    if (channels.length > 0 && currentChannelIndex >= 0) {
        const currentChannel = channels[currentChannelIndex];
        currentGroupIndex = groups.findIndex(group => group.name === currentChannel.group);
    }
}

// Отрисовка групп
function renderGroups() {
    const container = document.getElementById("groups-list");
    container.innerHTML = "";
    
    if (groups.length === 0) {
        container.innerHTML = '<p style="font-size: 1.2em; text-align: center; padding: 20px;">Нет доступных групп</p>';
        return;
    }
    
    groups.forEach((group, index) => {
        const item = document.createElement("div");
        item.className = `group-item${index === currentGroupIndex ? " active" : ""}`;
        item.textContent = group.name;
        item.tabIndex = 0;
        
        item.onclick = () => {
            currentGroupIndex = index;
            renderGroupChannels(index);
        };
        
        item.onkeydown = (e) => {
            if (e.key === "Enter") {
                currentGroupIndex = index;
                renderGroupChannels(index);
            }
        };
        
        container.appendChild(item);
    });
    
    setTimeout(() => {
        if (currentGroupIndex >= 0) {
            const groupItems = document.querySelectorAll(".group-item");
            if (groupItems.length > currentGroupIndex) {
                groupItems[currentGroupIndex].focus();
                focusedElement = groupItems[currentGroupIndex];
            }
        } 
        else if (groups.length > 0) {
            const firstGroup = document.querySelector(".group-item");
            if (firstGroup) {
                firstGroup.focus();
                focusedElement = firstGroup;
            }
        }
    }, 100);
}

// Отрисовка каналов в группе
function renderGroupChannels(groupIndex) {
    const container = document.getElementById("groups-list");
    container.innerHTML = "";
    
    const backButton = document.createElement("div");
    backButton.className = "group-item back-item";
    backButton.innerHTML = "← Назад к группам";
    backButton.tabIndex = 0;
    
    backButton.onclick = () => {
        currentGroupIndex = groupIndex;
        renderGroups();
    };
    
    backButton.onkeydown = (e) => {
        if (e.key === "Enter") {
            currentGroupIndex = groupIndex;
            renderGroups();
        }
    };
    
    container.appendChild(backButton);
    
    const group = groups[groupIndex];
    let currentIndexInGroup = -1;
    
    group.channels.forEach((channel, index) => {
        if (channel.url === channels[currentChannelIndex].url) {
            currentIndexInGroup = index;
        }
    });
    
    group.channels.forEach((channel, index) => {
        const channelIndex = channels.findIndex(c => c.url === channel.url);
        const item = document.createElement("div");
        item.className = `channel-item${channelIndex === currentChannelIndex ? " active" : ""}`;
        item.tabIndex = 0;
        
        const numberSpan = document.createElement("span");
        numberSpan.className = "channel-number";
        numberSpan.textContent = `${index + 1}.`;
        
        const nameSpan = document.createElement("span");
        nameSpan.className = "channel-name";
        nameSpan.textContent = channel.name;
        
        item.appendChild(numberSpan);
        item.appendChild(nameSpan);
        
        item.onclick = () => {
            currentChannelIndex = channelIndex;
            playCurrentChannel();
        };
        
        item.onkeydown = (e) => {
            if (e.key === "Enter") {
                currentChannelIndex = channelIndex;
                playCurrentChannel();
            }
        };
        
        container.appendChild(item);
    });
    
    setTimeout(() => {
        let elementToFocus;
        
        if (currentIndexInGroup >= 0) {
            const channelItems = container.querySelectorAll(".channel-item");
            if (channelItems.length > currentIndexInGroup) {
                elementToFocus = channelItems[currentIndexInGroup];
            }
        }
        
        if (!elementToFocus) {
            elementToFocus = container.querySelector(".channel-item");
        }
        
        if (!elementToFocus) {
            elementToFocus = container.querySelector(".back-item");
        }
        
        if (elementToFocus) {
            elementToFocus.focus();
            focusedElement = elementToFocus;
        }
    }, 100);
}

// Глобальный обработчик клавиш
function handleGlobalKeyDown(e) {
    if (document.getElementById("add-playlist-modal")) return;
    
    resetInactivityTimer();
    focusedElement = document.activeElement;
    
    const contextMenuVisible = document.getElementById("playlist-context-menu").style.display === "block";
    const panelVisible = document.querySelector(".sub-panel.visible");
    const menuVisible = isMenuOpen;
    
    if (!document.activeElement || document.activeElement === document.body) {
        video.focus();
        focusedElement = video;
    }
    
    switch (e.key) {
        case "ArrowRight":
            if (menuVisible || panelVisible) {
                if (focusedElement && focusedElement.nextElementSibling) {
                    focusedElement.nextElementSibling.focus();
                    e.preventDefault();
                }
            }
            break;
            
        case "ArrowUp":
            if (menuVisible || panelVisible) {
                if (focusedElement && focusedElement.previousElementSibling) {
                    focusedElement.previousElementSibling.focus();
                    e.preventDefault();
                }
            } 
            else if (channels.length > 0) {
                if (currentGroupIndex >= 0) {
                    const group = groups[currentGroupIndex];
                    const currentIndex = group.channels.findIndex(ch => ch.url === channels[currentChannelIndex].url);
                    if (currentIndex >= 0) {
                        const newIndex = (currentIndex - 1 + group.channels.length) % group.channels.length;
                        const channelIndex = channels.findIndex(ch => ch.url === group.channels[newIndex].url);
                        if (channelIndex >= 0) {
                            currentChannelIndex = channelIndex;
                            playCurrentChannel();
                        }
                    }
                } 
                else {
                    currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
                    playCurrentChannel();
                }
                e.preventDefault();
            }
            break;
            
        case "ArrowDown":
            if (menuVisible || panelVisible) {
                if (focusedElement && focusedElement.nextElementSibling) {
                    focusedElement.nextElementSibling.focus();
                    e.preventDefault();
                }
            } 
            else if (channels.length > 0) {
                if (currentGroupIndex >= 0) {
                    const group = groups[currentGroupIndex];
                    const currentIndex = group.channels.findIndex(ch => ch.url === channels[currentChannelIndex].url);
                    if (currentIndex >= 0) {
                        const newIndex = (currentIndex + 1) % group.channels.length;
                        const channelIndex = channels.findIndex(ch => ch.url === group.channels[newIndex].url);
                        if (channelIndex >= 0) {
                            currentChannelIndex = channelIndex;
                            playCurrentChannel();
                        }
                    }
                } 
                else {
                    currentChannelIndex = (currentChannelIndex + 1) % channels.length;
                    playCurrentChannel();
                }
                e.preventDefault();
            }
            break;
            
        case "Enter":
            if (menuVisible || panelVisible || contextMenuVisible) {
                if (focusedElement) {
                    focusedElement.click();
                    e.preventDefault();
                }
            }
            break;
    }
}

// Обработчик ошибок видео
video.addEventListener('error', function() {
    if (video.error) {
        console.error('Video error:', video.error.code, video.error.message);
        tryFallbackPlayback(channels[currentChannelIndex].url);
    }
});

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    renderPlaylists();
    resetInactivityTimer();
    video.setAttribute("tabindex", "0");
    video.focus();
    
    const lastPlaylistIndex = localStorage.getItem("lastPlaylistIndex");
    if (lastPlaylistIndex !== null && playlists[lastPlaylistIndex]) {
        currentPlaylistIndex = parseInt(lastPlaylistIndex);
        loadPlaylist(currentPlaylistIndex);
    } 
    else if (playlists.length > 0) {
        currentPlaylistIndex = 0;
        loadPlaylist(0);
    } 
    else {
        showNotification("Добавьте плейлист для начала работы");
    }
    
    document.addEventListener("mousemove", resetInactivityTimer);
    document.addEventListener("click", resetInactivityTimer);
    
    document.addEventListener("keypress", () => {
        keyboardActive = true;
        resetInactivityTimer();
    });
});

// Обработка колесика мыши
document.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) > 0) {
        resetInactivityTimer();
        const direction = e.deltaY > 0 ? "down" : "up";
        
        if (document.querySelector(".sub-panel.visible")) {
            const activeElement = document.activeElement;
            if (direction === "down" && activeElement.nextElementSibling) {
                activeElement.nextElementSibling.focus();
            } 
            else if (direction === "up" && activeElement.previousElementSibling) {
                activeElement.previousElementSibling.focus();
            }
            e.preventDefault();
        } 
        else if (channels.length > 0 && !document.getElementById("add-playlist-modal")) {
            if (currentGroupIndex >= 0) {
                const group = groups[currentGroupIndex];
                const currentIndex = group.channels.findIndex(ch => ch.url === channels[currentChannelIndex].url);
                if (currentIndex >= 0) {
                    const newIndex = direction === "down" ? 
                        (currentIndex + 1) % group.channels.length : 
                        (currentIndex - 1 + group.channels.length) % group.channels.length;
                    const channelIndex = channels.findIndex(ch => ch.url === group.channels[newIndex].url);
                    if (channelIndex >= 0) {
                        currentChannelIndex = channelIndex;
                        playCurrentChannel();
                    }
                }
            } 
            else {
                currentChannelIndex = direction === "down" ? 
                    (currentChannelIndex + 1) % channels.length : 
                    (currentChannelIndex - 1 + channels.length) % channels.length;
                playCurrentChannel();
            }
            e.preventDefault();
        }
    }
});