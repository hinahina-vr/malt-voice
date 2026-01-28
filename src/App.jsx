import React, { useState, useEffect, useRef } from 'react';
import { voices, bgmList } from './data/assets';
import './index.css';

// Icons
const Icons = {
    Setting: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2" /><path d="M12 22v-2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M22 12h-2" /><path d="m4.93 19.07 1.41-1.41" /><path d="m17.66 6.34 1.41-1.41" /></svg>,
    Close: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>,
    Music: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
};

function App() {
    const [character, setCharacter] = useState('hinahina');
    const [currentBgm, setCurrentBgm] = useState(bgmList[0].id);
    const [volume, setVolume] = useState(1); // Default Volume 1
    const [playingSounds, setPlayingSounds] = useState({});

    // PRO State
    const [showPro, setShowPro] = useState(false);
    const [filterType, setFilterType] = useState('lowpass');
    const [filterFreq, setFilterFreq] = useState(100);
    const [filterQ, setFilterQ] = useState(1);
    const [eqLow, setEqLow] = useState(0);
    const [eqMid, setEqMid] = useState(0);
    const [eqHigh, setEqHigh] = useState(0);

    // SPATIAL EFFECTS State
    const [reverbMix, setReverbMix] = useState(0);
    const [reverbDecay, setReverbDecay] = useState(2.0);
    const [echoMix, setEchoMix] = useState(0);
    const [echoTime, setEchoTime] = useState(0.3);
    const [echoFeedback, setEchoFeedback] = useState(0.4);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [loopMode, setLoopMode] = useState(false);
    const [drillMode, setDrillMode] = useState(false);
    const [grainSize, setGrainSize] = useState(0.4);

    // BPM Sync
    const [bpm, setBpm] = useState(120);

    const [tapTimes, setTapTimes] = useState([]);
    const [loopVolumes, setLoopVolumes] = useState({});

    // Loading
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    // Audio Refs
    const bgmRef = useRef(new Audio());
    const audioCtxRef = useRef(null);
    const audioBuffers = useRef({});
    const filterNode = useRef(null);
    const eqNodes = useRef({});
    const masterGain = useRef(null);

    // Effect Refs
    const reverbNode = useRef(null);
    const reverbGain = useRef(null);
    const echoNode = useRef(null);
    const echoFeedbackNode = useRef(null);
    const echoGain = useRef(null);

    // Loop Ref
    const activeLoops = useRef({});

    // Helper: Generate Impulse Response
    const createImpulseResponse = (ctx, duration, decay, reverse) => {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const n = reverse ? length - i : i;
            // Simple exponential decay noise
            left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
            right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, decay);
        }
        return impulse;
    };

    // --- Init Web Audio ---
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const master = ctx.createGain();
        master.connect(ctx.destination);
        masterGain.current = master;

        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 20000;
        // Connect Filter -> Master (Dry path)
        f.connect(master);
        filterNode.current = f;

        // --- REVERB SETUP ---
        const rev = ctx.createConvolver();
        rev.buffer = createImpulseResponse(ctx, 2.0, 2.0, false); // Default IR
        const revGain = ctx.createGain();
        revGain.gain.value = 0;

        // Filter -> ReverbGain -> Reverb -> Master
        f.connect(revGain);
        revGain.connect(rev);
        rev.connect(master);

        reverbNode.current = rev;
        reverbGain.current = revGain;

        // --- ECHO SETUP ---
        const dly = ctx.createDelay(5.0);
        dly.delayTime.value = 0.3;
        const dlyFb = ctx.createGain();
        dlyFb.gain.value = 0.4;
        const dlyGain = ctx.createGain();
        dlyGain.gain.value = 0;

        // Filter -> EchoGain -> Delay -> Master
        f.connect(dlyGain);
        dlyGain.connect(dly);
        dly.connect(master);

        // Feedback Loop
        dly.connect(dlyFb);
        dlyFb.connect(dly);

        echoNode.current = dly;
        echoFeedbackNode.current = dlyFb;
        echoGain.current = dlyGain;

        const high = ctx.createBiquadFilter(); high.type = 'highshelf'; high.frequency.value = 3000;
        const mid = ctx.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 1000;
        const low = ctx.createBiquadFilter(); low.type = 'lowshelf'; low.frequency.value = 200;

        low.connect(mid);
        mid.connect(high);
        high.connect(f);

        eqNodes.current = { low, mid, high };

        // Loader
        const loadDocs = async () => {
            const allVoices = Object.values(voices).flat();
            if (!allVoices.length) { setIsLoading(false); return; }
            setIsLoading(true);
            let loaded = 0;
            for (const v of allVoices) {
                try {
                    const res = await fetch(`/sounds/${v.file}`);
                    const ab = await res.arrayBuffer();
                    audioBuffers.current[v.file] = await ctx.decodeAudioData(ab);
                } catch (e) { console.error(e); }
                loaded++;
                setProgress(Math.floor((loaded / allVoices.length) * 100));
            }
            setTimeout(() => setIsLoading(false), 500);
        };
        loadDocs();
        return () => ctx.close();
    }, []);

    // --- Update FX ---
    useEffect(() => {
        if (!filterNode.current) return;
        const ctx = audioCtxRef.current;
        const now = ctx.currentTime;

        const f = filterNode.current;
        f.type = filterType;
        f.Q.setTargetAtTime(filterQ, now, 0.1);

        let freq;
        const norm = (filterFreq + 100) / 200;
        if (norm === 1) freq = 20000;
        else if (norm === 0) freq = 20;
        else freq = 20 * Math.pow(1000, norm);
        f.frequency.setTargetAtTime(freq, now, 0.1);

        const { low, mid, high } = eqNodes.current;
        if (low) low.gain.setTargetAtTime(eqLow, now, 0.1);
        if (mid) mid.gain.setTargetAtTime(eqMid, now, 0.1);
        if (high) high.gain.setTargetAtTime(eqHigh, now, 0.1);

        // Update Reverb
        if (reverbGain.current) reverbGain.current.gain.setTargetAtTime(reverbMix / 100, now, 0.1);

        // Update Echo
        if (echoGain.current) echoGain.current.gain.setTargetAtTime(echoMix / 100, now, 0.1);
        if (echoNode.current) echoNode.current.delayTime.setTargetAtTime(echoTime, now, 0.1);
        if (echoFeedbackNode.current) echoFeedbackNode.current.gain.setTargetAtTime(echoFeedback, now, 0.1);

    }, [filterType, filterFreq, filterQ, eqLow, eqMid, eqHigh, reverbMix, reverbDecay, echoMix, echoTime, echoFeedback]);

    // Separate Effect for Reverb Buffer Generation to avoid lag
    useEffect(() => {
        if (!audioCtxRef.current || !reverbNode.current) return;
        const buf = createImpulseResponse(audioCtxRef.current, 2.0, reverbDecay, false);
        reverbNode.current.buffer = buf;
    }, [reverbDecay]);

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingTriggers, setPendingTriggers] = useState([]); // Array of {sound, mode}

    // --- Shareable URL Logic ---
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const toBase64 = (bigInt) => {
        let str = "";
        let n = bigInt;
        while (n > 0n) {
            str = chars[Number(n & 63n)] + str;
            n >>= 6n;
        }
        return str || "0";
    };
    const fromBase64 = (str) => {
        let n = 0n;
        for (let i = 0; i < str.length; i++) {
            n = (n << 6n) + BigInt(chars.indexOf(str[i]));
        }
        return n;
    };

    const encodeSettings = () => {
        let b = 0n;
        const push = (val, bits) => { b = (b << BigInt(bits)) + BigInt(val); };

        // --- SOUNDS ---
        push(0, 8); // Terminator for sounds

        const allVoices = Object.values(voices).flat();
        const activeIds = Object.keys(playingSounds).filter(k => playingSounds[k] === 'drill' || playingSounds[k] === 'loop');

        activeIds.forEach(id => {
            const vIndex = allVoices.findIndex(v => v.id === id) + 1;
            if (vIndex > 0) {
                const isDrill = playingSounds[id] === 'drill';
                const modeVal = isDrill ? 2 : 1;

                if (isDrill) {
                    const src = activeLoops.current[id];
                    // Use explicit custom property or fallback to current state
                    let currentGrain = src && src._customGrain ? src._customGrain : grainSize;
                    const gVal = Math.round((currentGrain - 0.01) / 0.99 * 63);
                    push(gVal, 6);
                }

                push(modeVal, 2);
                push(vIndex, 6);
            }
        });

        // --- GLOBAL SETTINGS ---
        const fType = ['lowpass', 'highpass', 'bandpass', 'notch'].indexOf(filterType);

        push(drillMode ? 1 : 0, 1);
        push(loopMode ? 1 : 0, 1);

        push(fType < 0 ? 0 : fType, 2);
        push(Math.round((filterFreq + 100) / 200 * 31), 5);
        push(Math.round(filterQ / 20 * 15), 4);
        [eqHigh, eqMid, eqLow].forEach(v => push(Math.round((v + 12) / 24 * 15), 4));
        push(Math.round(reverbMix / 100 * 15), 4);
        push(Math.round((reverbDecay - 0.1) / 4.9 * 15), 4);
        push(Math.round(echoMix / 100 * 15), 4);
        push(Math.round((echoTime - 0.1) / 0.9 * 15), 4);
        push(Math.round(echoFeedback / 0.9 * 15), 4);
        push(Math.round((playbackRate - 0.5) / 1.5 * 15), 4);
        push(Math.max(0, Math.min(255, bpm - 40)), 8);

        // VERSION HEADER (Last pushed -> First popped)
        push(1, 4); // v1

        return toBase64(b);
    };

    const decodeSettings = (str) => {
        try {
            let b = fromBase64(str);
            const pop = (bits) => {
                const mask = (1n << BigInt(bits)) - 1n;
                const val = Number(b & mask);
                b >>= BigInt(bits);
                return val;
            };

            // Version Check
            const version = pop(4);
            if (version !== 1) {
                console.warn("Unknown settings version or old URL", version);
                alert("URLの形式が古いため読み込めませんでした。\n新しいURLを作成してください。");
                return;
            }

            const d_bpm = pop(8);
            const d_pitch = pop(4);
            const d_efbk = pop(4);
            const d_etime = pop(4);
            const d_emix = pop(4);
            const d_rdecay = pop(4);
            const d_rmix = pop(4);
            const d_eql = pop(4);
            const d_eqm = pop(4);
            const d_eqh = pop(4);
            const d_fres = pop(4);
            const d_ffreq = pop(5);
            const d_ftype = pop(2);

            const d_loop = pop(1);
            const d_drill = pop(1);

            setBpm(d_bpm + 40);
            setPlaybackRate(Number((d_pitch / 15 * 1.5 + 0.5).toFixed(1)));
            setEchoFeedback(Number((d_efbk / 15 * 0.9).toFixed(2)));
            setEchoTime(Number((d_etime / 15 * 0.9 + 0.1).toFixed(2)));
            setEchoMix(Math.round(d_emix / 15 * 100));
            setReverbDecay(Number((d_rdecay / 15 * 4.9 + 0.1).toFixed(1)));
            setReverbMix(Math.round(d_rmix / 15 * 100));
            setEqLow(Math.round(d_eql / 15 * 24 - 12));
            setEqMid(Math.round(d_eqm / 15 * 24 - 12));
            setEqHigh(Math.round(d_eqh / 15 * 24 - 12));
            setFilterQ(Number((d_fres / 15 * 20).toFixed(1)));
            setFilterFreq(Math.round(d_ffreq / 31 * 200 - 100));
            setFilterType(['lowpass', 'highpass', 'bandpass', 'notch'][d_ftype] || 'lowpass');

            setLoopMode(d_loop === 1);
            setDrillMode(d_drill === 1);

            setShowPro(true);
            const newBpm = d_bpm + 40;
            const note32 = (60 / newBpm) / 8;
            setGrainSize(Number(note32.toFixed(3)));

            // Pop Sounds loop
            const restored = [];
            const allVoices = Object.values(voices).flat();

            while (true) {
                if (b <= 0n) break;

                const sIdx = pop(6);
                if (sIdx === 0) break; // Terminator

                const sMode = pop(2);
                let sGrain = null;

                if (sMode === 2) { // Drill
                    const gVal = pop(6);
                    sGrain = (gVal / 63 * 0.99) + 0.01;
                }

                const targetSound = allVoices[sIdx - 1];
                if (targetSound) {
                    restored.push({
                        sound: targetSound,
                        mode: sMode === 2 ? 'drill' : 'loop',
                        grain: sGrain
                    });
                }
            }

            if (restored.length > 0) {
                setPendingTriggers(restored);

                const first = restored[0].sound;
                // Force Hina as requested
                setCharacter('hinahina');

                setModalOpen(true);
            }

            window.history.replaceState({}, '', window.location.pathname);
        } catch (e) { console.error("Failed to decode settings", e); }
    };

    useEffect(() => {
        const p = new URLSearchParams(window.location.search).get('p');
        if (p) decodeSettings(p);
    }, []);

    const handleModalPlay = () => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        pendingTriggers.forEach(item => {
            playSound(item.sound.file, item.sound.id, item.mode, item.grain);
        });
        setModalOpen(false);
    };

    const handleShare = () => {
        const code = encodeSettings();
        const url = `${window.location.origin}${window.location.pathname}?p=${code}`;
        const text = `【モルトバトルサンプラーからのお知らせ】\nドゥンドゥンしようねえ\n${url}\n\n#モルトバトルサンプラー`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    };

    // Reset
    const handleTap = () => {
        const now = Date.now();
        // Clear if too long (2s)
        const times = tapTimes.filter(t => now - t < 2000);
        times.push(now);

        if (times.length >= 3) {
            // Calculate BPM
            const intervals = [];
            for (let i = 1; i < times.length; i++) {
                intervals.push(times[i] - times[i - 1]);
            }
            const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const newBpm = Math.round(60000 / avgMs);

            // Limit reasonably
            if (newBpm > 40 && newBpm < 300) {
                setBpm(newBpm);
                // SYNC Effect
                // 1. Set Speed: Base 120 = 1.0
                setPlaybackRate(Number((newBpm / 120).toFixed(2)));
                // 2. Set Grain: 1/32 note (60/BPM/8)
                const note32 = (60 / newBpm) / 8;
                setGrainSize(Number(note32.toFixed(3)));
            }
            if (times.length > 5) times.shift();
        }
        setTapTimes(times);
    };

    // Reset
    const resetSettings = () => {
        setFilterType('lowpass');
        setFilterFreq(100);
        setFilterQ(1);
        setEqLow(0);
        setEqMid(0);
        setEqHigh(0);
        setReverbMix(0);
        setReverbDecay(2.0);
        setEchoMix(0);
        setEchoTime(0.3);
        setEchoFeedback(0.4);
        setPlaybackRate(1.0);
        setBpm(120);
        setTapTimes([]);
        setLoopMode(false);
        setDrillMode(false);
        setGrainSize(0.4);

        // Stop all sounds immediately
        // Stop all sounds immediately
        Object.values(activeLoops.current).forEach(item => {
            try { item.src.stop(); } catch (e) { }
        });
        activeLoops.current = {};
        setPlayingSounds({});

        // Clear URL param if exists
        window.history.replaceState({}, '', window.location.pathname);
    };

    // --- Audio Unlock (Auto-resume on first interaction) ---
    useEffect(() => {
        const unlockAudio = () => {
            const ctx = audioCtxRef.current;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    console.log("Audio Context Resumed");
                    document.removeEventListener('click', unlockAudio);
                    document.removeEventListener('touchstart', unlockAudio);
                    document.removeEventListener('keydown', unlockAudio);
                });
            }
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        }
    }, []);

    // --- Playback ---
    const playSound = (soundFile, id, forcedMode = null, forcedGrain = null) => {
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume(); // Backup check


        // Determine Mode
        let mode = forcedMode;
        if (!mode) {
            if (drillMode) mode = 'drill';
            else if (loopMode) mode = 'loop';
            else mode = 'oneshot';
        }

        if (!forcedMode) {
            // Normal Click Behavior: Toggle if loop/drill
            if (mode === 'drill' || mode === 'loop') {
                if (activeLoops.current[id]) {
                    try { activeLoops.current[id].src.stop(); } catch (e) { }
                    delete activeLoops.current[id];
                    setPlayingSounds(p => {
                        const next = { ...p };
                        delete next[id];
                        return next;
                    });
                    return;
                }
            }
        } else {
            // Forced Start (Modal): If already playing, stop first?
            if (activeLoops.current[id]) {
                try { activeLoops.current[id].src.stop(); } catch (e) { }
                delete activeLoops.current[id];
            }
        }

        const buffer = audioBuffers.current[soundFile];
        if (buffer) {
            const src = ctx.createBufferSource();
            src.buffer = buffer;
            src.playbackRate.value = playbackRate;

            // Create Gain for per-loop volume
            const gainNode = ctx.createGain();
            const initialVol = loopVolumes[id] !== undefined ? loopVolumes[id] : 1.0;
            gainNode.gain.value = initialVol;

            if (mode === 'drill') {
                // DRILL / GRANULAR
                src.loop = true;
                src.loopStart = 0;
                src.loopEnd = forcedGrain || grainSize;
                src._customGrain = src.loopEnd; // Explicitly store for sharing logic
                activeLoops.current[id] = { src, gain: gainNode };
                setPlayingSounds(p => ({ ...p, [id]: 'drill' }));
            } else if (mode === 'loop') {
                // NORMAL LOOP
                src.loop = true;
                activeLoops.current[id] = { src, gain: gainNode };
                setPlayingSounds(p => ({ ...p, [id]: 'loop' }));
            } else {
                // ONESHOT
                setPlayingSounds(p => ({ ...p, [id]: 'oneshot' }));
                setTimeout(() => setPlayingSounds(p => {
                    // Only remove if it's still 'oneshot'
                    if (p[id] === 'oneshot') {
                        const next = { ...p };
                        delete next[id];
                        return next;
                    }
                    return p;
                }), 100);
            }

            // Connection: src -> gain -> eq/dest
            src.connect(gainNode);

            if (eqNodes.current.low) gainNode.connect(eqNodes.current.low);
            else gainNode.connect(ctx.destination);

            src.start(0);
        }
    };

    // --- BGM ---
    useEffect(() => {
        const audio = bgmRef.current;
        audio.pause();
        const b = bgmList.find(x => x.id === currentBgm);
        if (b && b.file) {
            audio.src = `/bgm/${b.file}`;
            audio.loop = true;
            audio.volume = volume / 10;
            audio.play().catch(() => { });
        }
    }, [currentBgm]);

    useEffect(() => { bgmRef.current.volume = volume / 10; }, [volume]);

    const appStyle = {
        '--primary-color': character === 'hinahina' ? 'var(--hina-color)' : character === 'kai' ? 'var(--kai-color)' : 'var(--others-color)',
        '--theme-bg': character === 'hinahina' ? 'rgba(255, 105, 180, 0.05)' : character === 'kai' ? 'rgba(92, 219, 211, 0.05)' : 'rgba(255, 215, 0, 0.05)'
    };
    const selectedBgmData = bgmList.find(b => b.id === currentBgm);

    return (
        <div className="app-container" style={appStyle}>
            {isLoading && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <img src="/images/loading_bg.jpg" alt="" className="loading-image" />
                        <h2>モルト舐め妖精が準備中です…</h2>
                        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progress}%` }}></div></div>
                        <p>{progress}%</p>
                        <p className="loading-text">LOADING AUDIO DATA...</p>
                    </div>
                </div>
            )}

            {modalOpen && pendingTriggers.length > 0 && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="modal-content" style={{ background: '#222', padding: '2rem', borderRadius: '10px', textAlign: 'center', border: '1px solid #444', maxWidth: '400px', width: '90%' }}>

                        <img src="/images/loading_bg.jpg" alt="" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #444' }} />

                        <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.2rem' }}>モルトバトルサンプラーへようこそ！</h2>
                        <div style={{ color: '#888', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '1.2rem', color: 'var(--primary-color)', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                音が鳴るけどいい？
                            </div>
                        </div>
                        <button onClick={handleModalPlay} style={{
                            background: 'var(--primary-color)', color: '#000', fontSize: '1.2rem', fontWeight: 'bold',
                            border: 'none', borderRadius: '30px', padding: '1rem 3rem', cursor: 'pointer',
                            boxShadow: '0 0 20px var(--primary-color)'
                        }}>
                            エーヤオ
                        </button>
                    </div>
                </div>
            )}

            <header>
                <div className="header-logo-container">
                    <img src="/images/header_logo.png" alt="Malt Battle Sampler" className="header-logo" />
                </div>
                <div className="controls">
                    <div className="bgm-control-group">
                        <div className="label-row">
                            <Icons.Music />
                            <span style={{ flexShrink: 0 }}>BGM</span>
                            {selectedBgmData && (
                                <div className="marquee-container">
                                    <div className="marquee-content">{selectedBgmData.credit}</div>
                                </div>
                            )}
                        </div>
                        <div className="bgm-buttons">
                            {bgmList.map(b => (
                                <button key={b.id} className={`bgm-btn ${currentBgm === b.id ? 'active' : ''}`} onClick={() => setCurrentBgm(b.id)}>{b.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="control-right-group">
                        <div className="vol-control">
                            <span className="vol-label">VOL: {volume}</span>
                            <input type="range" min="0" max="10" value={volume} onChange={e => setVolume(Number(e.target.value))} />
                        </div>

                        <button className={`pro-toggle-btn ${showPro ? 'active' : ''}`} onClick={() => setShowPro(!showPro)}>
                            PRO
                        </button>
                    </div>
                </div>
            </header>

            {/* INLINE PRO PANEL */}
            {showPro && (
                <div className="pro-panel-inline">
                    <div className="fx-section">
                        <div className="fx-title">FILTER ({filterType.toUpperCase()})</div>
                        <div className="fx-types">
                            {['lowpass', 'highpass', 'bandpass', 'notch'].map(t => (
                                <button key={t} className={filterType === t ? 'active' : ''} onClick={() => setFilterType(t)}>
                                    {t === 'lowpass' ? 'LPF' : t === 'highpass' ? 'HPF' : t === 'bandpass' ? 'BPF' : 'NT'}
                                </button>
                            ))}
                        </div>
                        <div className="fx-row">
                            <label>FREQ</label>
                            <input type="range" min="-100" max="100" value={filterFreq} onChange={e => setFilterFreq(Number(e.target.value))} />
                        </div>
                        <div className="fx-row">
                            <label>RES</label>
                            <input type="range" min="0" max="20" value={filterQ} onChange={e => setFilterQ(Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="fx-section">
                        <div className="fx-title">3-BAND EQ</div>
                        <div className="eq-row">
                            <div className="v-slider"><input type="range" min="-12" max="12" value={eqHigh} onChange={e => setEqHigh(Number(e.target.value))} /><label>HI</label></div>
                            <div className="v-slider"><input type="range" min="-12" max="12" value={eqMid} onChange={e => setEqMid(Number(e.target.value))} /><label>MID</label></div>
                            <div className="v-slider"><input type="range" min="-12" max="12" value={eqLow} onChange={e => setEqLow(Number(e.target.value))} /><label>LO</label></div>
                        </div>
                    </div>

                    {/* SPATIAL EFFECTS & PITCH */}
                    <div className="fx-section" style={{ gridColumn: '1 / -1', borderTop: '1px solid #444', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                        {/* PITCH / LOOP / DRILL */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div className="fx-title">MODE</div>
                            <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.2rem' }}>
                                <button
                                    className={`loop-mode-btn ${loopMode && !drillMode ? 'active' : ''}`}
                                    onClick={() => { setLoopMode(!loopMode); setDrillMode(false); }}
                                    style={{
                                        background: (loopMode && !drillMode) ? 'var(--primary-color)' : '#333',
                                        color: (loopMode && !drillMode) ? '#000' : '#888',
                                        border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', flex: 1, transition: 'background 0.2s'
                                    }}
                                >
                                    LOOP
                                </button>
                                <button
                                    className={`loop-mode-btn ${drillMode ? 'active' : ''}`}
                                    onClick={() => { setDrillMode(!drillMode); setLoopMode(false); }}
                                    style={{
                                        background: drillMode ? '#ff4081' : '#333',
                                        color: drillMode ? '#fff' : '#888',
                                        border: 'none', borderRadius: '4px', padding: '2px 4px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', flex: 1, transition: 'background 0.2s'
                                    }}
                                >
                                    DRILL
                                </button>
                            </div>



                            <div className="fx-row">
                                <label>PITCH (x{playbackRate})</label>
                                <input type="range" min="0.5" max="2.0" step="0.1" value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} />
                            </div>
                            {drillMode && (
                                <div className="fx-row">
                                    <label>GRAIN ({Math.round(grainSize * 1000)}ms)</label>
                                    <input type="range" min="0.01" max="1.0" step="0.001" value={grainSize} onChange={e => setGrainSize(Number(e.target.value))} />
                                </div>
                            )}
                        </div>

                        {/* REVERB */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div className="fx-title">REVERB</div>
                            <div className="fx-row">
                                <label>MIX ({reverbMix}%)</label>
                                <input type="range" min="0" max="100" value={reverbMix} onChange={e => setReverbMix(Number(e.target.value))} />
                            </div>
                            <div className="fx-row">
                                <label>DECAY ({reverbDecay})</label>
                                <input type="range" min="0.1" max="5.0" step="0.1" value={reverbDecay} onChange={e => setReverbDecay(Number(e.target.value))} />
                            </div>
                        </div>

                        {/* ECHO */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div className="fx-title">ECHO</div>
                            <div className="fx-row">
                                <label>MIX ({echoMix}%)</label>
                                <input type="range" min="0" max="100" value={echoMix} onChange={e => setEchoMix(Number(e.target.value))} />
                            </div>
                            <div className="fx-row">
                                <label>TIME ({echoTime}s)</label>
                                <input type="range" min="0.1" max="1.0" step="0.05" value={echoTime} onChange={e => setEchoTime(Number(e.target.value))} />
                            </div>
                            <div className="fx-row">
                                <label>FBK ({echoFeedback})</label>
                                <input type="range" min="0" max="0.9" step="0.05" value={echoFeedback} onChange={e => setEchoFeedback(Number(e.target.value))} />
                            </div>
                        </div>
                        {/* ACTIVE MIXER */}
                        {(Object.keys(playingSounds).filter(k => playingSounds[k] !== 'oneshot').length > 0) && (
                            <div style={{ marginTop: '4px', borderTop: '1px solid #444', paddingTop: '4px', width: '100%' }}>
                                <div className="fx-title">ACTIVE MIXER</div>
                                <div style={{ maxHeight: '75px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                    {Object.keys(playingSounds).map(id => {
                                        if (playingSounds[id] === 'oneshot') return null;
                                        const voice = Object.values(voices).flat().find(v => v.id === id);
                                        if (!voice) return null;
                                        return (
                                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', paddingRight: '4px' }}>
                                                <span style={{ fontSize: '0.6rem', width: '50px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{voice.label}</span>
                                                <input type="range" min="0" max="1.5" step="0.1"
                                                    value={loopVolumes[id] !== undefined ? loopVolumes[id] : 1.0}
                                                    onChange={(e) => {
                                                        const v = Number(e.target.value);
                                                        setLoopVolumes(prev => ({ ...prev, [id]: v }));
                                                        if (activeLoops.current[id] && activeLoops.current[id].gain) {
                                                            activeLoops.current[id].gain.gain.value = v;
                                                        }
                                                    }}
                                                    style={{ flex: 1, height: '15px' }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="char-tabs">
                <div className={`tab hina ${character === 'hinahina' ? 'active' : ''}`} onClick={() => setCharacter('hinahina')}>
                    <div className="char-icon-frame"><img src="/images/hina_icon.jpg" className="hina-img" alt="" /></div>ひなひな
                </div>
                <div className={`tab kai ${character === 'kai' ? 'active' : ''}`} onClick={() => setCharacter('kai')}>
                    <div className="char-icon-frame"><img src="/images/kai_icon.png" className="kai-img" alt="" /></div>かい
                </div>
                <div className={`tab others ${character === 'others' ? 'active' : ''}`} onClick={() => setCharacter('others')}>
                    <div className="char-icon-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#fff', fontSize: '1.2rem' }}>?</div>その他
                </div>
            </div>

            <main className="content-area">
                <div className={`board ${showPro ? 'compact' : ''}`} style={{ zIndex: 1, position: 'relative' }}>
                    {voices[character] && voices[character].map(v => (
                        <button key={v.id}
                            className={`sound-btn ${playingSounds[v.id] ? 'playing' : ''}`}
                            style={playingSounds[v.id] ? {
                                background: playingSounds[v.id] === 'drill' ? '#ff4081' : 'var(--primary-color)',
                                borderColor: playingSounds[v.id] === 'drill' ? '#ff4081' : 'var(--primary-color)',
                                boxShadow: `0 0 15px ${playingSounds[v.id] === 'drill' ? '#ff4081' : 'var(--primary-color)'}`
                            } : {}}
                            onPointerDown={() => playSound(v.file, v.id)}
                        >
                            {v.label}
                        </button>
                    ))}
                    {(!voices[character] || voices[character].length === 0) && (
                        <div className="construction">
                            <h2>{character === 'kai' ? 'KAI PAGE' : 'PAGE'}</h2>
                            <p>🚧 UNDER CONSTRUCTION 🚧</p>
                            <p>Coming Soon...</p>
                        </div>
                    )}
                </div>
            </main>

            {
                showPro && (
                    <footer className="footer-controls">
                        <button className="footer-btn share-btn" onClick={handleShare}>
                            この設定をXで共有
                        </button>
                        <button className="footer-btn reset-btn" onClick={resetSettings}>
                            RESET
                        </button>
                    </footer>
                )
            }
        </div >
    );
}

export default App;
