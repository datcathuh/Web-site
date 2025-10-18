const secret_password = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const pw = "x3ghx";

if (document.getElementById('splash-screen')) {
    const password_input = document.getElementById('password_input');
    const enter_btn = document.getElementById('enter_btn');

    function check_password() {
        const check_string = password_input.value;
        if (check_string === pw) { 
            localStorage.setItem('authenticated', 'true');
            window.location.href = 'home.html';
        } 
        else if (check_string === secret_password) {
            password_input.value = "";
            password_input.placeholder = "nice inspect element";
            password_input.style.borderColor = "red";
            setTimeout(() => {
                password_input.placeholder = "password";
                password_input.style.borderColor = "var(--inline)";
            }, 2000);
        } else {
            password_input.value = "";
            password_input.placeholder = "wrong password";
            password_input.style.borderColor = "red";
            setTimeout(() => {
                password_input.placeholder = "password";
                password_input.style.borderColor = "var(--inline)";
            }, 2000);
        }
    }

    function handle_key_press(event) {
        if (event.key === 'Enter') {
            check_password();
        }
    }

    password_input.addEventListener('keypress', handle_key_press);
    enter_btn.addEventListener('click', check_password);
}

if (document.getElementById('main_content')) {
    if (!localStorage.getItem('authenticated')) {
        window.location.href = 'index.html';
    }

    const audio = document.getElementById('background_music');
    const main_image = document.getElementById('main_image');
    const music_icon_hover = document.getElementById('music_icon_hover');
    const music_controls_panel = document.getElementById('music_controls_panel');
    const play_btn = document.getElementById('play_btn');
    const pause_btn = document.getElementById('pause_btn');
    const prev_btn = document.getElementById('prev_btn');
    const next_btn = document.getElementById('next_btn');
    const volume_slider = document.getElementById('volume_slider');
    const song_title = document.getElementById('song_title');
    const playback_status = document.getElementById('playback_status');
    const readme_btn = document.getElementById('readme_btn');
    const readme_modal = document.getElementById('readme_modal');
    const close_readme = document.getElementById('close_readme');

    const images = [
        "../assets/imgs/cat.jpg",
        "../assets/imgs/title fight lol.png"
    ];

    const songs = [
        { file: "../assets/music/1 800 jesus- band0me.mp3", name: "1 800 jesus- band0me" },
        { file: "../assets/music/music/Sometimes Memory Fails Me Sometimes - Everyone Asked About You.mp3", name: "Sometimes Memory Fails Me Sometimes - Everyone Asked About You" }
    ];

    let currentSongIndex = -1;
    let isPlaying = false;
    let isMusicPanelOpen = false;

    function set_random_image() {
        if (images.length === 0) return;
        const random_index = Math.floor(Math.random() * images.length);
        main_image.src = images[random_index];
    }

    function set_random_audio() {
        if (songs.length === 0) return;
        
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * songs.length);
        } while (newIndex === currentSongIndex && songs.length > 1);
        
        currentSongIndex = newIndex;
        audio.src = songs[currentSongIndex].file;
        updateMusicInfo();
    }

    function playAudio() {
        if (currentSongIndex === -1) {
            set_random_audio();
        }
        audio.play().catch(e => console.log('Audio play failed:', e));
        isPlaying = true;
        updateMusicInfo();
        updateButtonStates();
    }

    function pauseAudio() {
        audio.pause();
        isPlaying = false;
        updateMusicInfo();
        updateButtonStates();
    }

    function nextSong() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex + 1) % songs.length;
        audio.src = songs[currentSongIndex].file;
        if (isPlaying) {
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
        updateMusicInfo();
    }

    function prevSong() {
        if (songs.length === 0) return;
        currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
        audio.src = songs[currentSongIndex].file;
        if (isPlaying) {
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
        updateMusicInfo();
    }

    function updateMusicInfo() {
        if (currentSongIndex >= 0 && currentSongIndex < songs.length) {
            song_title.textContent = songs[currentSongIndex].name;
            playback_status.textContent = isPlaying ? "▶ playing" : "❚❚ paused";
        } else {
            song_title.textContent = "No song selected";
            playback_status.textContent = "click play to start";
        }
    }

    function updateButtonStates() {
        if (isPlaying) {
            play_btn.style.display = 'none';
            pause_btn.style.display = 'block';
        } else {
            play_btn.style.display = 'block';
            pause_btn.style.display = 'none';
        }
    }

    function setVolume() {
        audio.volume = volume_slider.value;
    }

    function toggleMusicPanel() {
        isMusicPanelOpen = !isMusicPanelOpen;
        if (isMusicPanelOpen) {
            music_controls_panel.classList.add('open');
        } else {
            music_controls_panel.classList.remove('open');
        }
    }

    function openReadme() {
        readme_modal.classList.add('active');
    }

    function closeReadme() {
        readme_modal.classList.remove('active');
    }

    document.addEventListener('click', function(event) {
        if (!music_icon_hover.contains(event.target) && !music_controls_panel.contains(event.target)) {
            music_controls_panel.classList.remove('open');
            isMusicPanelOpen = false;
        }
    });

    readme_modal.addEventListener('click', function(event) {
        if (event.target === readme_modal) {
            closeReadme();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (readme_modal.classList.contains('active')) {
                closeReadme();
            }
            if (isMusicPanelOpen) {
                toggleMusicPanel();
            }
        }
    });

    document.getElementById('main_content').style.display = 'flex';
    set_random_image();
    set_random_audio();
    setVolume();
    updateButtonStates();

    music_icon_hover.addEventListener('click', toggleMusicPanel);
    play_btn.addEventListener('click', playAudio);
    pause_btn.addEventListener('click', pauseAudio);
    next_btn.addEventListener('click', nextSong);
    prev_btn.addEventListener('click', prevSong);
    volume_slider.addEventListener('input', setVolume);
    readme_btn.addEventListener('click', openReadme);
    close_readme.addEventListener('click', closeReadme);
    
    audio.addEventListener('ended', nextSong);
    audio.addEventListener('loadedmetadata', updateMusicInfo);
}