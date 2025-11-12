let inactivityTimer,
    playlists = JSON.parse(localStorage.getItem("playlists")) || [{name:"Пример плейлиста, не удалять!",url:"https://iptv-org.github.io/iptv/countries/ru.m3u"}],
    channels = [],
    groups = [],
    currentPlaylistIndex = -1,
    currentChannelIndex = 0,
    previousChannelIndex = -1,
    currentGroupIndex = -1,
    selectedPlaylistIndex = -1,
    focusedElement = null,
    keyboardActive = false,
    isMenuOpen = false,
    scrollPosition = 0,
    epgVisible = false,
    epgHideTimer = null;

// 🔧 Параметры для навигации
const scrollSpeed = 200;
const holdDelay = 300;
const pageSize = 15;

let scrollInterval = null;
let holdTimeout = null;
let scrollDirection = null;

// ==================== История каналов ====================
let channelHistory = JSON.parse(localStorage.getItem("channelHistory")) || [];
const maxHistoryItems = 15;

// ==================== EPG Функции ====================
function showEpg() {
    if (channels.length === 0 || currentChannelIndex < 0) return;
    
    const channel = channels[currentChannelIndex];
    const epgContainer = document.getElementById("epg-container");
    const epgInfo = document.getElementById("epg-info");
    
    epgInfo.innerHTML = `
        <h3>${channel.name}</h3>
        ${channel.logo ? `<img src="${channel.logo}" alt="Логотип" style="max-height: 100px; float: right; margin-left: 10px;">` : ''}
        <p><strong>Группа:</strong> ${channel.group || 'Не указана'}</p>
        ${channel.id ? `<p><strong>ID:</strong> ${channel.id}</p>` : ''}
        <p><strong>URL:</strong> ${channel.url}</p>
    `;
    
    epgContainer.style.display = "block";
    epgVisible = true;
    
    clearTimeout(epgHideTimer);
    epgHideTimer = setTimeout(() => {
        hideEpg();
    }, 30000);
    
    resetInactivityTimer();
}

function hideEpg() {
    const epgContainer = document.getElementById("epg-container");
    epgContainer.style.display = "none";
    epgVisible = false;
    clearTimeout(epgHideTimer);
}

function toggleEpg() {
    if (epgVisible) {
        hideEpg();
    } else {
        showEpg();
    }
}

const video = document.getElementById("video"),
      notification = document.getElementById("notification"),
      mainMenu = document.getElementById("main-menu");

function updateEpgPosition() {
    const epgContainer = document.getElementById("epg-container");
    if (!epgContainer) return;
    
    const panelVisible = document.querySelector(".sub-panel.visible");
    
    if (panelVisible) {
        epgContainer.style.left = "520px";
    } else {
        epgContainer.style.left = "20px";
    }
}

// ==================== Функции истории каналов ====================
function addToChannelHistory(channel) {
    // Удаляем дубликаты
    channelHistory = channelHistory.filter(item => item.url !== channel.url);
    
    // Добавляем в начало
    channelHistory.unshift({
        name: channel.name,
        url: channel.url,
        group: channel.group,
        logo: channel.logo,
        timestamp: new Date().toLocaleString()
    });
    
    // Ограничиваем размер истории
    if (channelHistory.length > maxHistoryItems) {
        channelHistory = channelHistory.slice(0, maxHistoryItems);
    }
    
    // Сохраняем в localStorage
    localStorage.setItem("channelHistory", JSON.stringify(channelHistory));
}

function showChannelHistory() {
    if (channelHistory.length === 0) {
        showNotification("История каналов пуста");
        return;
    }

    // Сохраняем элемент, который был в фокусе до открытия модального окна
    const previousFocusedElement = document.activeElement;
    
    // Создаем модальное окно в стиле приложения
    const modalHtml = `
        <div id="channel-history-modal" class="modal-overlay">
            <div class="modal-content" style="max-width: 700px; width: 90%;">
                <div class="panel-header">
                    <div class="panel-title">История каналов</div>
                </div>
                
                <div class="history-list" style="max-height: 60vh; overflow-y: auto; margin: 15px 0;">
                    ${channelHistory.map((channel, index) => `
                        <div class="history-item channel-item" tabindex="0" data-url="${channel.url}" 
                             style="padding: 8px 12px; margin: 6px 0; border-radius: 0px; 
                                    background: linear-gradient(135deg, rgba(40, 40, 40, 0.8), rgba(50, 50, 50, 0.8));
                                    border: 1px solid rgba(100, 100, 100, 0.5);
                                    display: flex; align-items: center; cursor: pointer;
                                    transition: all 0.2s ease; height: 50px;">
                            <div style="display: flex; align-items: center; width: 100%;">
                                ${channel.logo ? `
                                    <img src="${channel.logo}" alt="Лого" 
                                         style="width: 35px; height: 35px; margin-right: 10px; 
                                                object-fit: contain; border-radius: 3px;
                                                border: 1px solid rgba(242, 115, 72, 0.5);">
                                ` : `
                                    <div style="width: 35px; height: 35px; margin-right: 10px;
                                               background: linear-gradient(135deg, rgba(242, 115, 72, 0.3), rgba(242, 115, 72, 0.6));
                                               display: flex; align-items: center; justify-content: center;
                                               border-radius: 3px; font-size: 0.7em; font-weight: bold;">
                                        ${channel.name.charAt(0).toUpperCase()}
                                    </div>
                                `}
                                <div style="flex-grow: 1; min-width: 0;">
                                    <div style="font-size: 1.1em; font-weight: bold; color: #fff; 
                                               margin-bottom: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
                                               white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                        ${channel.name}
                                    </div>
                               
                                </div>
                                <div style="font-size: 1em; color: #f27348; margin-left: 8px; 
                                           min-width: 20px; text-align: right; font-weight: bold;">
                                    ${index + 1}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-buttons" style="margin-top: 15px; display: flex; gap: 10px;">
                    <button id="history-clear-btn" class="danger-btn" tabindex="0" 
                            style="flex: 1; padding: 10px; font-size: 1.1em; height: 45px;">
                        Очистить
                    </button>
                    <button id="history-close-btn" class="secondary-btn" tabindex="0" 
                            style="flex: 1; padding: 10px; font-size: 1.1em; height: 45px;">
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    
    const modal = document.getElementById("channel-history-modal");
    const closeBtn = document.getElementById("history-close-btn");
    const clearBtn = document.getElementById("history-clear-btn");
    const historyItems = document.querySelectorAll(".history-item");
    const historyList = document.querySelector(".history-list");    
    
 // Функция для закрытия модального окна и возврата фокуса
    const closeModal = () => {
        modal.remove();
        // Возвращаем фокус на предыдущий элемент
        if (previousFocusedElement && typeof previousFocusedElement.focus === 'function') {
            setTimeout(() => {
                previousFocusedElement.focus();
            }, 100);
        }
    };


  // Обработчик BACK кнопки для модального окна
    const handleBackButtonInModal = (e) => {
        if (e.keyCode === 461 || e.which === 461) {
            e.preventDefault();
            closeModal();
        }
    };
    
    // Добавляем обработчик BACK кнопки
    document.addEventListener('keydown', handleBackButtonInModal);


 // Фокусируемся на первом элементе
    setTimeout(() => {
        if (historyItems.length > 0) {
            historyItems[0].focus();
        }
    }, 100);
    
     // Обработчики событий для элементов истории
    historyItems.forEach(item => {
        item.addEventListener('click', () => {
            const url = item.dataset.url;
            switchToChannelFromHistory(url);
            closeModal();
        });
        
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const url = item.dataset.url;
                switchToChannelFromHistory(url);
                closeModal();
            }
        });
    });
    
    // Эффекты при наведении и фокусе
    historyItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            item.style.background = 'linear-gradient(135deg, rgba(242, 115, 72, 0.3), rgba(242, 115, 72, 0.6))';
            item.style.transform = 'scale(1.02)';
            item.style.borderColor = 'rgba(242, 115, 72, 0.8)';
        });
        
        item.addEventListener('mouseleave', () => {
            if (document.activeElement !== item) {
                item.style.background = 'linear-gradient(135deg, rgba(40, 40, 40, 0.8), rgba(50, 50, 50, 0.8))';
                item.style.transform = 'scale(1)';
                item.style.borderColor = 'rgba(100, 100, 100, 0.5)';
            }
        });
        
        item.addEventListener('focus', () => {
            item.style.background = 'linear-gradient(135deg, rgba(242, 115, 72, 0.4), rgba(242, 115, 72, 0.7))';
            item.style.transform = 'scale(1.02)';
            item.style.borderColor = 'rgba(242, 115, 72, 0.9)';
            smoothScrollToElement(item);
        });
        
        item.addEventListener('blur', () => {
            item.style.background = 'linear-gradient(135deg, rgba(40, 40, 40, 0.8), rgba(50, 50, 50, 0.8))';
            item.style.transform = 'scale(1)';
            item.style.borderColor = 'rgba(100, 100, 100, 0.5)';
        });
    });
            
    // Обработчики для кнопок
    closeBtn.addEventListener('click', closeModal);
    
    closeBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            closeModal();
        }
    });
    
    clearBtn.addEventListener('click', () => {
        clearChannelHistory();
        closeModal();
    });
    
    clearBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearChannelHistory();
            closeModal();
        }
    });
    
    // Обработка клавиатуры в модальном окне
    let currentHistoryIndex = 0;
    
    modal.addEventListener('keydown', (e) => {
        const focusableElements = Array.from(modal.querySelectorAll('button, .history-item'));
        const currentIndex = focusableElements.indexOf(document.activeElement);
        
        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                closeModal();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (currentIndex > 0) {
                    const nextIndex = currentIndex - 1;
                    focusableElements[nextIndex].focus();
                    currentHistoryIndex = nextIndex;
                } else {
                    // Переход к последнему элементу
                    focusableElements[focusableElements.length - 1].focus();
                    currentHistoryIndex = focusableElements.length - 1;
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                if (currentIndex < focusableElements.length - 1) {
                    const nextIndex = currentIndex + 1;
                    focusableElements[nextIndex].focus();
                    currentHistoryIndex = nextIndex;
                } else {
                    // Переход к первому элементу
                    focusableElements[0].focus();
                    currentHistoryIndex = 0;
                }
                break;
                
            case 'Tab':
                e.preventDefault();
                let nextIndex;
                
                if (e.shiftKey) {
                    nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
                } else {
                    nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
                }
                
                focusableElements[nextIndex].focus();
                currentHistoryIndex = nextIndex;
                break;
                
            case 'PageUp':
                e.preventDefault();
                if (currentIndex >= 5) {
                    const nextIndex = currentIndex - 5;
                    focusableElements[nextIndex].focus();
                    currentHistoryIndex = nextIndex;
                } else {
                    focusableElements[0].focus();
                    currentHistoryIndex = 0;
                }
                break;
                
            case 'PageDown':
                e.preventDefault();
                if (currentIndex <= focusableElements.length - 6) {
                    const nextIndex = currentIndex + 5;
                    focusableElements[nextIndex].focus();
                    currentHistoryIndex = nextIndex;
                } else {
                    focusableElements[focusableElements.length - 1].focus();
                    currentHistoryIndex = focusableElements.length - 1;
                }
                break;
                
            case 'Home':
                e.preventDefault();
                focusableElements[0].focus();
                currentHistoryIndex = 0;
                break;
                
            case 'End':
                e.preventDefault();
                focusableElements[focusableElements.length - 1].focus();
                currentHistoryIndex = focusableElements.length - 1;
                break;
        }
    });
    
     // Добавляем стили для скроллбара
    const style = document.createElement('style');
    style.textContent = `
        .history-list::-webkit-scrollbar {
            width: 10px;
        }
        
        .history-list::-webkit-scrollbar-track {
            background: linear-gradient(to bottom, 
                        rgba(51, 51, 51, 0.8), 
                        rgba(40, 40, 40, 0.8));
            border-radius: 5px;
        }
        
        .history-list::-webkit-scrollbar-thumb {
            background: rgb(198, 201, 208);
            border-radius: 5px;
        }
        
        .history-list::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(to bottom, 
                        rgba(242, 115, 72, 0.9), 
                        rgba(242, 115, 72, 0.7));
        }
    `;
    document.head.appendChild(style);
    
    clearTimeout(inactivityTimer);
}

function switchToChannelFromHistory(url) {
    // Ищем канал в текущем плейлисте
    const channelIndex = channels.findIndex(channel => channel.url === url);
    
    if (channelIndex !== -1) {
        // Канал найден в текущем плейлисте
        currentChannelIndex = channelIndex;
        playCurrentChannel();
        document.getElementById("channel-history-modal").remove();
        return;
    }
    
    // Если канал не найден в текущем плейлисте
    showNotification("Канал не найден в текущем плейлисте");
    document.getElementById("channel-history-modal").remove();
}

function switchToPreviousChannel() {
    if (channelHistory.length <= 1) {
        showNotification("Недостаточно каналов в истории");
        return;
    }
    
    // Берем второй элемент (первый - текущий канал)
    const previousChannel = channelHistory[1];
    
    // Ищем канал в текущем плейлисте
    const channelIndex = channels.findIndex(channel => channel.url === previousChannel.url);
    
    if (channelIndex !== -1) {
        currentChannelIndex = channelIndex;
        playCurrentChannel();
        showNotification(`Переключено на: ${previousChannel.name}`);
    } else {
        showNotification("Предыдущий канал не найден в текущем плейлисте");
        showChannelHistory(); // Показываем полную историю
    }
}

function clearChannelHistory() {
    channelHistory = [];
    localStorage.removeItem("channelHistory");
    showNotification("История каналов очищена");
}

// ==================== Основные функции ====================
// Инициализация меню
function initMenu() {
    document.addEventListener("keydown", handleKeyDown);
    renderPlaylists();
    
    const lastPlaylistIndex = localStorage.getItem("lastPlaylistIndex");
    if (lastPlaylistIndex !== null && playlists[lastPlaylistIndex]) {
        currentPlaylistIndex = parseInt(lastPlaylistIndex);
        loadPlaylist(currentPlaylistIndex);
    } else if (playlists.length > 0) {
        currentPlaylistIndex = 0;
        loadPlaylist(0);
    }
    
    video.setAttribute("tabindex", "0");
    video.focus();
    resetInactivityTimer();
}

// Обработчик нажатий клавиш
function handleKeyDown(e) {
    if (e.keyCode === 461 || e.which === 461) { // Кнопка BACK
        handleBackButton();
        e.preventDefault();
        return;
    }
    
    // Открываем меню по кнопке OK/Enter когда видео в фокусе
    if ((e.key === "Enter" || e.keyCode === 13) && document.activeElement === video) {
        toggleMainMenu();
        e.preventDefault();
        return;
    }
    
    // Просто передаем все клавиши в глобальный обработчик
    handleGlobalKeyDown(e);
}

// Обработка кнопки BACK
function handleBackButton() {
    const modal = document.getElementById("add-playlist-modal");
    const historyModal = document.getElementById("channel-history-modal");
    const contextMenuVisible = document.getElementById("playlist-context-menu").style.display === "block";
    const panelVisible = document.querySelector(".sub-panel.visible");
    
    if (modal) {
        modal.remove();
        keyboardActive = false;
        showPanel("playlists-panel");
        return;
    }
    
    if (historyModal) {
        historyModal.remove();
        return;
    }
    
    if (contextMenuVisible) {
        hidePlaylistContextMenu();
        return;
    } 
    else if (currentGroupIndex >= 0) {
        currentGroupIndex = -1;
        renderGroups();
        return;
    } 
    else if (panelVisible) {
        hidePanel("playlists-panel");
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
                container.querySelector("[tabindex], button, input, select, textarea, .menu-item, .group-item, .playlist-item");
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

    const epgContainer = document.getElementById("epg-container");
    if (epgContainer) {
        epgContainer.style.left = "20px";
    }
    hidePlaylistContextMenu();
}

// Показать панель
function showPanel(panelId) {
    closeAllPanels();
    
    if (isMenuOpen) {
        toggleMainMenu();
    }
    
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.classList.add("visible");
        resetInactivityTimer();

        const epgContainer = document.getElementById("epg-container");
        if (epgContainer) {
            epgContainer.style.left = "520px";
        }
        
        setTimeout(() => {
            if (panelId === "playlists-panel") {
                let elementToFocus = null;
                if (currentPlaylistIndex >= 0) {
                    elementToFocus = document.querySelector(`.playlist-item:nth-child(${currentPlaylistIndex+1})`);
                } else {
                    elementToFocus = panel.querySelector(".playlist-item");
                }
                if (elementToFocus) elementToFocus.focus();
            } 
            else if (panelId === "groups-panel") {
                if (channels.length > 0 && currentChannelIndex >= 0) {
                    const currentChannel = channels[currentChannelIndex];
                    currentGroupIndex = groups.findIndex(group => group.name === currentChannel.group);
                }
                
                renderGroups();
                
                setTimeout(() => {
                    const groupItems = document.querySelectorAll(".group-item");
                    if (currentGroupIndex >= 0 && groupItems[currentGroupIndex]) {
                        groupItems[currentGroupIndex].focus();
                    } else if (groupItems.length > 0) {
                        groupItems[0].focus();
                    }
                }, 50);
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

    const epgContainer = document.getElementById("epg-container");
    if (epgContainer) {
        epgContainer.style.left = "20px";
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
            hideEpg();
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
            renderGroups();
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
        return;
    }
    
    playlists.forEach((playlist, index) => {
        const item = document.createElement("div");
        item.className = `playlist-item${index === currentPlaylistIndex ? " active" : ""}`;
        item.textContent = playlist.name;
        item.tabIndex = 0;
        item.dataset.index = index;
        
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
    
    setTimeout(() => {
        if (currentPlaylistIndex >= 0) {
            const currentItem = container.querySelector(`.playlist-item[data-index="${currentPlaylistIndex}"]`);
            if (currentItem) {
                currentItem.focus();
            }
        } else if (container.firstElementChild) {
            container.firstElementChild.focus();
        }
    }, 50);
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
    showNotification("Загрузка плейлиста...");
    
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
            renderGroups();
            playCurrentChannel();
            
            currentPlaylistIndex = index;
            localStorage.setItem("lastPlaylistIndex", index);
            
            renderPlaylists();
            
            setTimeout(() => {
                const activeItem = document.querySelector(`.playlist-item[data-index="${index}"]`);
                if (activeItem) {
                    activeItem.focus();
                }
            }, 100);
            
            showNotification(`Загружено каналов: ${channels.length}`);
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
    addToChannelHistory(channel); // Добавляем в историю
    
    video.pause();
    video.removeAttribute('src');
    video.load();

    const isHLS = channel.url.includes('.m3u8') || 
                 channel.url.includes('hls') || 
                 channel.url.includes('m3u');
    const isDASH = channel.url.includes('.mpd');
    const isRTMP = channel.url.startsWith('rtmp://');
    const isRTSP = channel.url.startsWith('rtsp://');
    const isDolbyAudio = channel.url.includes('eac3') || channel.url.includes('ec-3');

    try {
        if (isHLS && typeof Hls !== "undefined" && Hls.isSupported()) {
            if (video.hls) {
                video.hls.destroy();
            }
            
            const hlsConfig = {
                maxMaxBufferLength: 30,
                maxBufferSize: 60000,
                maxBufferLength: 30,
                enableWorker: true,
                defaultAudioCodec: isDolbyAudio ? 'mp4a.40.2' : undefined,
                audioTrackLoading: { reloadOnError: true },
                enableWebAudio: true
            };
            
            const hls = new Hls(hlsConfig);
            video.hls = hls;
            hls.loadSource(channel.url);
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
                if (hls.audioTracks && hls.audioTracks.length > 0) {
                    hls.audioTrack = 0;
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.type === Hls.ErrorTypes.MEDIA_ERROR && data.details === 'audioTrackError') {
                    tryFallbackAudioPlayback(channel.url);
                }
                else if (data.fatal) {
                    tryFallbackPlayback(channel.url);
                }
            });
            
            video.play().catch(e => {
                console.error("Auto-play failed:", e);
                tryFallbackPlayback(channel.url);
            });
        } 
        else if (isDASH && typeof dashjs !== "undefined") {
            const player = dashjs.MediaPlayer().create();
            player.updateSettings({
                streaming: {
                    audio: {
                        expectedCodec: 'mp4a.40.2'
                    }
                }
            });
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

    showEpg();
}

function tryFallbackAudioPlayback(url) {
    console.log("Пробуем альтернативные методы воспроизведения аудио");
    
    if (url.includes('.m3u8')) {
        const modifiedUrl = url.replace('eac3', 'aac').replace('ec-3', 'mp4a.40.2');
        video.src = modifiedUrl;
        video.play().catch(e => {
            console.error("Fallback audio failed:", e);
            initWebAudioFallback();
        });
        return;
    }
    
    initWebAudioFallback();
}

function initWebAudioFallback() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(video);
        source.connect(audioCtx.destination);
        showNotification("Аудио подключено через Web Audio API");
    } catch (e) {
        console.error("Web Audio API error:", e);
        showNotification("Не удалось инициализировать аудио");
    }
}

function tryFallbackPlayback(url) {
    if (!video.audioTracks || video.audioTracks.length === 0) {
        tryFallbackAudioPlayback(url);
    }
    
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
        item.textContent = `${group.name} (${group.channels.length})`;
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
    const items = container.querySelectorAll(".channel-item");
    if (currentIndexInGroup >= 0 && items[currentIndexInGroup]) {
      items[currentIndexInGroup].focus();
    } else if (items.length > 0) {
      items[0].focus();
    }
  }, 100);
}

// Глобальный обработчик клавиш
function handleGlobalKeyDown(e) {
    if (document.getElementById("add-playlist-modal") || document.getElementById("channel-history-modal")) return;

    resetInactivityTimer();
    focusedElement = document.activeElement;

    const contextMenuVisible = document.getElementById("playlist-context-menu").style.display === "block";
    const panelVisible = document.querySelector(".sub-panel.visible");
    const menuVisible = isMenuOpen;
    const channelListVisible = currentGroupIndex >= 0 &&
        document.querySelector(".sub-panel.visible") &&
        document.querySelector(".channel-item");

    if (!document.activeElement || document.activeElement === document.body) {
        video.focus();
        focusedElement = video;
    }

    switch (e.key) {
        case "ArrowLeft":
            if (channelListVisible) {
                const items = document.querySelectorAll(".channel-item");
                let currentItem = document.querySelector(".channel-item:focus");
                if (!currentItem) currentItem = document.querySelector(".channel-item.active");
                
                let currentIndex = Array.from(items).indexOf(currentItem);

                if (items.length > 0) {
                    let newIndex;
                    if (currentIndex === -1) {
                        newIndex = items.length - 1;
                    } else {
                        newIndex = currentIndex - pageSize;
                        if (newIndex < 0) newIndex = 0;
                    }
                    
                    items[newIndex].focus();
                    items[newIndex].scrollIntoView({ block: "center" });
                }
                e.preventDefault();
                return;
            } else if (menuVisible || panelVisible) {
                if (focusedElement && focusedElement.previousElementSibling) {
                    focusedElement.previousElementSibling.focus();
                    e.preventDefault();
                }
            }
            break;

        case "ArrowRight":
            if (channelListVisible) {
                const items = document.querySelectorAll(".channel-item");
                let currentItem = document.querySelector(".channel-item:focus");
                if (!currentItem) currentItem = document.querySelector(".channel-item.active");
                
                let currentIndex = Array.from(items).indexOf(currentItem);

                if (items.length > 0) {
                    let newIndex;
                    if (currentIndex === -1) {
                        newIndex = 0;
                    } else {
                        newIndex = currentIndex + pageSize;
                        if (newIndex >= items.length) newIndex = items.length - 1;
                    }
                    
                    items[newIndex].focus();
                    items[newIndex].scrollIntoView({ block: "center" });
                }
                e.preventDefault();
                return;
            } else if (!menuVisible && !panelVisible) {
                toggleEpg();
                e.preventDefault();
            }
            break;

        case "ArrowUp":
        case "ArrowDown":
            if (!holdTimeout && !scrollInterval) {
                scrollDirection = e.key === "ArrowUp" ? "up" : "down";
                navigateList(scrollDirection);
                holdTimeout = setTimeout(() => {
                    scrollInterval = setInterval(() => {
                        navigateList(scrollDirection);
                    }, scrollSpeed);
                }, holdDelay);
            }
            e.preventDefault();
            break;

        case "Enter":
            if (channelListVisible) {
                const activeItem = document.querySelector(".channel-item:focus") ||
                    document.querySelector(".channel-item.active");
                if (activeItem) {
                    const channelIndex = parseInt(activeItem.dataset.index);
                    if (!isNaN(channelIndex)) {
                        currentChannelIndex = channelIndex;
                        playCurrentChannel();
                        e.preventDefault();
                    }
                }
            } else if (menuVisible || panelVisible || contextMenuVisible) {
                if (focusedElement) {
                    focusedElement.click();
                    e.preventDefault();
                }
            }
           
            break;

        case "Backspace":
        case "Escape":
            if (channelListVisible) {
                currentGroupIndex = -1;
                renderGroups();
                e.preventDefault();
            } else if (contextMenuVisible) {
                hidePlaylistContextMenu();
                e.preventDefault();
            } else if (panelVisible) {
                hidePanel("playlists-panel");
                hidePanel("groups-panel");
                e.preventDefault();
            } else if (isMenuOpen) {
                toggleMainMenu();
                e.preventDefault();
            }
            break;
    }
}

// Сброс при отпускании
document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        clearTimeout(holdTimeout);
        holdTimeout = null;
        clearInterval(scrollInterval);
        scrollInterval = null;
        scrollDirection = null;
    }
});

// Навигация по списку и каналам
function navigateList(direction) {
    const contextMenuVisible = document.getElementById("playlist-context-menu").style.display === "block";
    const panelVisible = document.querySelector(".sub-panel.visible");
    const menuVisible = isMenuOpen;
    const channelListVisible = currentGroupIndex >= 0 &&
        document.querySelector(".sub-panel.visible") &&
        document.querySelector(".channel-item");

    if (channelListVisible) {
        const items = document.querySelectorAll(".channel-item");
        const currentItem = document.querySelector(".channel-item:focus") ||
            document.querySelector(".channel-item.active");
        let currentIndex = Array.from(items).indexOf(currentItem);

        if (direction === "up") {
            if (currentIndex > 0) {
                items[currentIndex - 1].focus();
            } else if (items.length > 0) {
                items[items.length - 1].focus();
            }
        } else {
            if (currentIndex < items.length - 1) {
                items[currentIndex + 1].focus();
            } else if (items.length > 0) {
                items[0].focus();
            }
        }
    } else if (menuVisible || panelVisible) {
        if (direction === "up" && focusedElement && focusedElement.previousElementSibling) {
            focusedElement.previousElementSibling.focus();
        }
        if (direction === "down" && focusedElement && focusedElement.nextElementSibling) {
            focusedElement.nextElementSibling.focus();
        }
    } else if (channels.length > 0) {
        if (currentGroupIndex >= 0) {
            const group = groups[currentGroupIndex];
            const currentIndex = group.channels.findIndex(ch => ch.url === channels[currentChannelIndex].url);
            if (currentIndex >= 0) {
                let newIndex;
                if (direction === "up") {
                    newIndex = (currentIndex + 1) % group.channels.length;
                } else {
                    newIndex = (currentIndex - 1 + group.channels.length) % group.channels.length;
                }
                const channelIndex = channels.findIndex(ch => ch.url === group.channels[newIndex].url);
                if (channelIndex >= 0) {
                    currentChannelIndex = channelIndex;
                    playCurrentChannel();
                }
            }
        } else {
            if (direction === "up") {
                currentChannelIndex = (currentChannelIndex + 1) % channels.length;
            } else {
                currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
            }
            playCurrentChannel();
        }
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
    
    video.addEventListener('volumechange', function() {
        if (video.muted || video.volume === 0) {
            showNotification("Проверьте: звук отключен или на минимуме");
        }
    });

    const lastPlaylistIndex = localStorage.getItem("lastPlaylistIndex");
    if (lastPlaylistIndex !== null) {
        loadPlaylist(parseInt(lastPlaylistIndex));
    }
});