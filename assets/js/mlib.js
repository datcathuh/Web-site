document.addEventListener('DOMContentLoaded', () => {
  const dragDropArea = document.getElementById('dragDropArea');
  const albumArt = document.getElementById('albumArt');
  const musicInfo = document.getElementById('musicInfo');
  const audioPlayer = document.getElementById('audioPlayer');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressFill = document.getElementById('progressFill');
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const statusMessage = document.getElementById('statusMessage');
  const trackList = document.getElementById('trackList');
  const trackCount = document.getElementById('trackCount');
  const nowPlayingContainer = document.getElementById('nowPlayingContainer');
  
  let musicLibrary = [];
  let currentTrackIndex = -1;
  let isPlaying = false;
  let db;
  
  audioPlayer.volume = volumeSlider.value / 100;
  
  initDB();
  
  dragDropArea.addEventListener('click', () => {
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = 'audio/*';
    tempInput.multiple = true;
    tempInput.addEventListener('change', handleFileSelect);
    tempInput.click();
  });
  
  dragDropArea.addEventListener('dragover', handleDragOver);
  dragDropArea.addEventListener('dragleave', handleDragLeave);
  dragDropArea.addEventListener('drop', handleFileDrop);
  
  playBtn.addEventListener('click', playCurrentTrack);
  pauseBtn.addEventListener('click', pauseAudio);
  prevBtn.addEventListener('click', playPreviousTrack);
  nextBtn.addEventListener('click', playNextTrack);
  volumeSlider.addEventListener('input', updateVolume);
  
  audioPlayer.addEventListener('loadedmetadata', updateDuration);
  audioPlayer.addEventListener('timeupdate', updateProgress);
  audioPlayer.addEventListener('ended', playNextTrack);
  
  progressContainer.addEventListener('click', seekAudio);
  
  function initDB() {
    const request = indexedDB.open('MusicLibraryDB', 1);
    
    request.onerror = (event) => {
      console.error('Database error:', event.target.error);
      showStatus('Error initializing music library storage', 'error');
    };
    
    request.onsuccess = (event) => {
      db = event.target.result;
      loadLibraryFromDB();
    };
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains('tracks')) {
        const store = database.createObjectStore('tracks', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  }
  
  function loadLibraryFromDB() {
    const transaction = db.transaction(['tracks'], 'readonly');
    const store = transaction.objectStore('tracks');
    const request = store.getAll();
    
    request.onsuccess = (event) => {
      const tracks = event.target.result;
      if (tracks.length > 0) {
        musicLibrary = tracks;
        updateLibraryUI();
        showStatus(`Loaded ${tracks.length} tracks from your library`, 'success');
        
        if (currentTrackIndex === -1 && musicLibrary.length > 0) {
          setTimeout(() => playTrack(0), 1000);
        }
      }
    };
    
    request.onerror = (event) => {
      console.error('Error loading library from DB:', event.target.error);
    };
  }
  
  function saveTrackToDB(track) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tracks'], 'readwrite');
      const store = transaction.objectStore('tracks');
      const request = store.add(track);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
  
  function deleteTrackFromDB(trackId) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tracks'], 'readwrite');
      const store = transaction.objectStore('tracks');
      const request = store.delete(trackId);
      
      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
  
  function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
      processAudioFiles(files);
    }
  }
  
  function handleDragOver(event) {
    event.preventDefault();
    dragDropArea.classList.add('drag_over');
  }
  
  function handleDragLeave(event) {
    event.preventDefault();
    dragDropArea.classList.remove('drag_over');
  }
  
  function handleFileDrop(event) {
    event.preventDefault();
    dragDropArea.classList.remove('drag_over');
    
    const files = Array.from(event.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0) {
      processAudioFiles(audioFiles);
    } else {
      showStatus('Please select audio files', 'error');
    }
  }
  
  async function processAudioFiles(files) {
    let processedCount = 0;
    let newTracks = 0;
    
    for (const file of files) {
      const existingTrack = musicLibrary.find(track => 
        track.fileName === file.name && track.fileSize === file.size
      );
      
      if (existingTrack) {
        showStatus(`"${file.name}" is already in your library`, 'error');
        processedCount++;
        continue;
      }
      
      try {
        const metadata = await extractMetadata(file);
        const audioBlob = new Blob([file], { type: file.type });
        
        const track = {
          id: generateId(),
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          lastModified: file.lastModified,
          timestamp: Date.now(),
          metadata: metadata,
          audioBlob: audioBlob
        };
        
        await saveTrackToDB(track);
        
        musicLibrary.push(track);
        processedCount++;
        newTracks++;
        
      } catch (error) {
        console.error('Error processing file:', error);
        processedCount++;
      }
    }
    
    if (newTracks > 0) {
      updateLibraryUI();
      showStatus(`Added ${newTracks} track(s) to your library`, 'success');
      
      if (musicLibrary.length === newTracks) {
        setTimeout(() => playTrack(0), 500);
      }
    }
  }
  
  function extractMetadata(file) {
    return new Promise((resolve, reject) => {
      try {
        window.jsmediatags.read(file, {
          onSuccess: function(tag) {
            const { tags } = tag;
            
            const title = tags.title || file.name.replace(/\.[^/.]+$/, "");
            const artist = tags.artist || 'Unknown Artist';
            const album = tags.album || 'Unknown Album';
            const year = tags.year || 'Unknown';
            
            let albumArtUrl = null;
            if (tags.picture) {
              const picture = tags.picture;
              const base64String = arrayBufferToBase64(picture.data);
              albumArtUrl = `data:${picture.format};base64,${base64String}`;
            }
            
            resolve({
              title,
              artist,
              album,
              year,
              albumArtUrl
            });
          },
          onError: function(error) {
            console.error('Error extracting metadata:', error);
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            
            resolve({
              title: fileName,
              artist: 'Unknown Artist',
              album: 'Unknown Album',
              year: 'Unknown',
              albumArtUrl: null
            });
          }
        });
      } catch (error) {
        console.error('Error extracting metadata:', error);
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        
        resolve({
          title: fileName,
          artist: 'Unknown Artist',
          album: 'Unknown Album',
          year: 'Unknown',
          albumArtUrl: null
        });
      }
    });
  }
  
  function updateLibraryUI() {
    trackCount.textContent = `${musicLibrary.length} ${musicLibrary.length === 1 ? 'track' : 'tracks'}`;
    trackList.innerHTML = '';
    
    if (musicLibrary.length === 0) {
      trackList.innerHTML = `
        <div class="empty_library">
          <p>Your music library is empty</p>
          <p class="empty_hint">Drag and drop audio files here to add them</p>
        </div>
      `;
      nowPlayingContainer.style.display = 'none';
      return;
    }
    
    musicLibrary.forEach((track, index) => {
      const trackElement = document.createElement('div');
      trackElement.className = 'track_item';
      if (index === currentTrackIndex) {
        trackElement.classList.add('active');
      }
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete_btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Remove from library';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTrack(index);
      });
      
      trackElement.innerHTML = `
        <div class="track_art">
          ${track.metadata.albumArtUrl 
            ? `<img src="${track.metadata.albumArtUrl}" alt="${track.metadata.album}" />` 
            : '<div class="track_art_placeholder">♫</div>'}
        </div>
        <div class="track_info">
          <div class="track_title">${track.metadata.title}</div>
          <div class="track_artist">${track.metadata.artist}</div>
          <div class="track_album">${track.metadata.album}</div>
        </div>
        <div class="track_duration">--:--</div>
      `;
      
      trackElement.appendChild(deleteBtn);
      trackElement.addEventListener('click', () => playTrack(index));
      trackList.appendChild(trackElement);
    });
    
    nowPlayingContainer.style.display = 'block';
  }
  
  async function deleteTrack(index) {
    const track = musicLibrary[index];
    if (!track) return;
    
    try {
      await deleteTrackFromDB(track.id);
      musicLibrary.splice(index, 1);
      
      if (currentTrackIndex === index) {
        pauseAudio();
        currentTrackIndex = -1;
        resetNowPlayingUI();
      } else if (currentTrackIndex > index) {
        currentTrackIndex--;
      }
      
      updateLibraryUI();
      showStatus('Track removed from library', 'success');
    } catch (error) {
      console.error('Error deleting track:', error);
      showStatus('Error removing track', 'error');
    }
  }
  
  function playTrack(index) {
    if (index < 0 || index >= musicLibrary.length) return;
    
    const track = musicLibrary[index];
    currentTrackIndex = index;
    
    const objectURL = URL.createObjectURL(track.audioBlob);
    audioPlayer.src = objectURL;
    
    updateNowPlayingUI(track);
    updateLibraryUI();
    playCurrentTrack();
  }
  
  function playCurrentTrack() {
    if (currentTrackIndex === -1 && musicLibrary.length > 0) {
      playTrack(0);
      return;
    }
    
    if (currentTrackIndex >= 0) {
      audioPlayer.play().then(() => {
        isPlaying = true;
        updatePlayPauseButtons();
      }).catch(error => {
        console.error('Error playing audio:', error);
        showStatus('Error playing audio track', 'error');
      });
    }
  }
  
  function pauseAudio() {
    audioPlayer.pause();
    isPlaying = false;
    updatePlayPauseButtons();
  }
  
  function playPreviousTrack() {
    if (musicLibrary.length === 0) return;
    
    let newIndex = currentTrackIndex - 1;
    if (newIndex < 0) {
      newIndex = musicLibrary.length - 1;
    }
    
    playTrack(newIndex);
  }
  
  function playNextTrack() {
    if (musicLibrary.length === 0) return;
    
    let newIndex = currentTrackIndex + 1;
    if (newIndex >= musicLibrary.length) {
      newIndex = 0;
    }
    
    playTrack(newIndex);
  }
  
  function seekAudio(event) {
    if (!audioPlayer.duration) return;
    
    const progressBar = event.currentTarget;
    const clickPosition = event.offsetX;
    const progressBarWidth = progressBar.clientWidth;
    const seekTime = (clickPosition / progressBarWidth) * audioPlayer.duration;
    
    audioPlayer.currentTime = seekTime;
  }
  
  function updateNowPlayingUI(track) {
    musicInfo.innerHTML = `
      <span class="song_title">${track.metadata.title}</span>
      <span class="artist_name">${track.metadata.artist}</span>
      <span class="album_name">${track.metadata.album}</span>
    `;
    
    if (track.metadata.albumArtUrl) {
      albumArt.className = 'main_image';
      albumArt.style.backgroundImage = `url(${track.metadata.albumArtUrl})`;
      albumArt.style.backgroundSize = 'cover';
      albumArt.style.backgroundPosition = 'center';
      albumArt.textContent = '';
    } else {
      albumArt.className = 'main_image default-art';
      albumArt.style.backgroundImage = '';
      albumArt.textContent = '♫';
    }
    
    progressContainer.style.display = 'block';
  }
  
  function resetNowPlayingUI() {
    musicInfo.innerHTML = `
      <span class="song_title">No track selected</span>
      <span class="artist_name">Select a track to play</span>
      <span class="album_name">Your music library</span>
    `;
    
    albumArt.className = 'main_image default-art';
    albumArt.style.backgroundImage = '';
    albumArt.textContent = '♫';
    
    progressContainer.style.display = 'none';
  }
  
  function updatePlayPauseButtons() {
    if (isPlaying) {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      playBtn.style.display = 'block';
      pauseBtn.style.display = 'none';
    }
  }
  
  function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
  }
  
  function updateDuration() {
    const duration = audioPlayer.duration;
    durationEl.textContent = formatTime(duration);
  }
  
  function updateProgress() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    
    if (duration) {
      const progressPercent = (currentTime / duration) * 100;
      progressFill.style.width = `${progressPercent}%`;
      currentTimeEl.textContent = formatTime(currentTime);
    }
  }
  
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status_message status_${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.style.display = 'none';
      }, 4000);
    }
  }
  
  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  
  function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }
  
  updateLibraryUI();
  updatePlayPauseButtons();
});