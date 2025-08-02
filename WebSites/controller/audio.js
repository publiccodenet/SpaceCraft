// audio.js - Complete Audio Module for SpaceCraft

export class AudioModule {
    // Complete sound patterns - keeping all original functionality
    static soundPatterns = {
        CLICK: { frequency: 1200, duration: 40, type: 'sine' },
        SUCCESS: { frequency: 880, duration: 60, type: 'sine', fadeOut: true },
        ERROR: { frequency: 220, duration: 150, type: 'square' },
        TILT_ON: { frequency: 440, duration: 75, type: 'triangle', fadeIn: true },
        TILT_OFF: { frequency: 330, duration: 75, type: 'triangle', fadeOut: true },
        JOIN: [
            { frequency: 660, duration: 40, type: 'sine' },
            { frequency: 880, duration: 40, type: 'sine' }
        ],
        LEAVE: [
            { frequency: 880, duration: 40, type: 'sine' },
            { frequency: 660, duration: 75, type: 'sine', fadeOut: true }
        ],
        BUTTON_TILT: { frequency: 1320, duration: 30, type: 'sine' },
        BUTTON_SPEECH: { frequency: 1100, duration: 30, type: 'sine' },
        BUTTON_SOUND: { frequency: 980, duration: 30, type: 'sine' },
        BUTTON_ON: { frequency: 1000, duration: 20, type: 'sine' },
        BUTTON_OFF: { frequency: 700, duration: 20, type: 'sine' },
        TOUCH: { frequency: 600, duration: 15, type: 'sine' },
        RELEASE_TAP: { frequency: 700, duration: 15, type: 'sine' },
        RELEASE_SOUTH: { frequency: 800, duration: 15, type: 'sine' },
        RELEASE_EAST: { frequency: 900, duration: 15, type: 'sine' },
        RELEASE_WEST: { frequency: 1000, duration: 15, type: 'sine' },
        RELEASE_NORTH: { frequency: 1100, duration: 15, type: 'sine' },
        IMPULSE_TRIGGER: { frequency: 200, duration: 5, type: 'sine' },
        SHAKE_CONFIRM: { frequency: 400, duration: 10, type: 'sine' },
        SHAKE_NORTH: [
            { frequency: 440, duration: 30, type: 'sine' },
            { frequency: 660, duration: 40, type: 'sine' }
        ],
        SHAKE_SOUTH: [
            { frequency: 660, duration: 30, type: 'sine' },
            { frequency: 440, duration: 40, type: 'sine' }
        ],
        SHAKE_EAST: [
            { frequency: 550, duration: 30, type: 'sine' },
            { frequency: 880, duration: 40, type: 'sine' }
        ],
        SHAKE_WEST: [
            { frequency: 880, duration: 30, type: 'sine' },
            { frequency: 550, duration: 40, type: 'sine' }
        ]
    };

    static overallVolume = 0.1;

    constructor(logger) {
        this.logger = logger;
        this.soundEnabled = false;
        this.speechEnabled = false;
        this.audioContext = null;
        this.speechSynthesis = null;
        this.userInteractionDetected = false;
        
        // Auto-enable audio on first user interaction
        this.setupUserInteractionListener();
    }
    
    setupUserInteractionListener() {
        const enableAudioOnInteraction = () => {
            if (!this.userInteractionDetected) {
                this.userInteractionDetected = true;
                // Just mark that user interaction happened, but don't auto-enable sound
                // Sound must be explicitly enabled by user via toggleSound()
                
                // Remove listeners after first interaction
                document.removeEventListener('touchstart', enableAudioOnInteraction, true);
                document.removeEventListener('click', enableAudioOnInteraction, true);
                document.removeEventListener('keydown', enableAudioOnInteraction, true);
            }
        };
        
        document.addEventListener('touchstart', enableAudioOnInteraction, true);
        document.addEventListener('click', enableAudioOnInteraction, true);
        document.addEventListener('keydown', enableAudioOnInteraction, true);
    }

    initAudioContext() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.logger.log('Audio', 'Audio context initialized');
            } catch (error) {
                this.logger.log('Audio', 'Failed to initialize audio context', error);
            }
        }
        return this.audioContext !== null;
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (this.soundEnabled) {
            this.initAudioContext();
        }
        this.logger.log('Audio', `Sound ${this.soundEnabled ? 'enabled' : 'disabled'}`);
        return this.soundEnabled;
    }

    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        if (this.speechEnabled && !this.speechSynthesis) {
            this.speechSynthesis = window.speechSynthesis;
        }
        this.logger.log('Audio', `Speech ${this.speechEnabled ? 'enabled' : 'disabled'}`);
        return this.speechEnabled;
    }

    async playTone(options) {
        if (!this.soundEnabled || !this.audioContext) return;

        // Resume AudioContext if suspended (required after user interaction)
        if (this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                this.logger.log('Audio', 'Failed to resume audio context', error);
                return;
            }
        }

        const {
            frequency = 440,
            duration = 100,
            type = 'sine',
            fadeIn = false,
            fadeOut = false,
            delay = 0
        } = options;

        const startTime = this.audioContext.currentTime + (delay / 1000);
        const endTime = startTime + (duration / 1000);

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        let volume = AudioModule.overallVolume;

        if (fadeIn) {
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        } else {
            gainNode.gain.setValueAtTime(volume, startTime);
        }

        if (fadeOut) {
            gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);
        } else {
            gainNode.gain.setValueAtTime(volume, endTime - 0.01);
            gainNode.gain.linearRampToValueAtTime(0, endTime);
        }

        oscillator.start(startTime);
        oscillator.stop(endTime);
    }

    async playSound(pattern) {
        if (!this.soundEnabled) return;

        if (Array.isArray(pattern)) {
            // Sequence of tones
            let totalDelay = 0;
            for (const tone of pattern) {
                this.playTone({ ...tone, delay: totalDelay });
                totalDelay += tone.duration || 100;
            }
        } else {
            // Single tone
            this.playTone(pattern);
        }
    }

    speakText(text, options = {}) {
        if (!this.speechEnabled || !this.speechSynthesis) return;

        const utterance = new SpeechSynthesisUtterance(text);
        
        if (options.rate) utterance.rate = options.rate;
        if (options.pitch) utterance.pitch = options.pitch;
        if (options.volume) utterance.volume = options.volume;
        if (options.voice) utterance.voice = options.voice;

        this.speechSynthesis.speak(utterance);
        this.logger.log('Audio', `Speaking: "${text}"`);
    }

    // High-level interface methods
    playGestureSound(gestureType) {
        const soundKey = `SHAKE_${gestureType.toUpperCase()}`;
        const pattern = AudioModule.soundPatterns[soundKey] || AudioModule.soundPatterns.CLICK;
        this.playSound(pattern);
    }

    playTouchSound() {
        this.playSound(AudioModule.soundPatterns.TOUCH);
    }

    playReleaseSound(gestureType) {
        const soundKey = `RELEASE_${gestureType.toUpperCase()}`;
        const pattern = AudioModule.soundPatterns[soundKey] || AudioModule.soundPatterns.RELEASE_TAP;
        this.playSound(pattern);
    }

    playButtonSound(buttonType = 'CLICK') {
        const pattern = AudioModule.soundPatterns[buttonType] || AudioModule.soundPatterns.CLICK;
        this.playSound(pattern);
    }

    playSuccessSound() {
        this.playSound(AudioModule.soundPatterns.SUCCESS);
    }

    playErrorSound() {
        this.playSound(AudioModule.soundPatterns.ERROR);
    }
} 