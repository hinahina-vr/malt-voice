import React, { useEffect, useMemo, useRef, useState } from 'react';
import { voices, bgmList } from './data/assets';
import './index.css';

import LoadingOverlay from './components/LoadingOverlay';
import ShareModal from './components/ShareModal';
import HeaderControls from './components/HeaderControls';
import ProPanel from './components/ProPanel';
import CharacterTabs from './components/CharacterTabs';
import SoundBoard from './components/SoundBoard';
import FooterControls from './components/FooterControls';
import StepSequencer from './components/StepSequencer';

import { useAudioEngine } from './hooks/useAudioEngine';
import { useAudioUnlock } from './hooks/useAudioUnlock';
import { useBgmPlayer } from './hooks/useBgmPlayer';
import { encodeSettings, decodeSettings } from './utils/settingsCodec';

function App() {
    const [character, setCharacter] = useState('hinahina');
    const [currentBgm, setCurrentBgm] = useState(bgmList[0].id);
    const [volume, setVolume] = useState(1);
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
    const [restartOnClick, setRestartOnClick] = useState(false);

    // BPM Sync
    const [bpm, setBpm] = useState(120);
    const [tapTimes, setTapTimes] = useState([]);
    const [loopVolumes, setLoopVolumes] = useState({});
    const [seqEnabled, setSeqEnabled] = useState(false);
    const [seqPlaying, setSeqPlaying] = useState(false);
    const [seqSync, setSeqSync] = useState(true);
    const [seqTracks, setSeqTracks] = useState([null, null, null, null]);
    const [seqSteps, setSeqSteps] = useState(() => Array.from({ length: 4 }, () => Array(16).fill(false)));
    const [seqStepIndex, setSeqStepIndex] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingTriggers, setPendingTriggers] = useState([]); // Array of {sound, mode}

    const {
        audioCtxRef,
        audioBuffers,
        activeLoops,
        playheadInfo,
        isLoading,
        progress,
        playSound
    } = useAudioEngine({
        voices,
        filterType,
        filterFreq,
        filterQ,
        eqLow,
        eqMid,
        eqHigh,
        reverbMix,
        reverbDecay,
        echoMix,
        echoTime,
        echoFeedback,
        playbackRate,
        loopMode,
        drillMode,
        restartOnClick,
        grainSize,
        loopVolumes,
        setPlayingSounds
    });

    useAudioUnlock(audioCtxRef);
    const bgmRef = useBgmPlayer({ bgmList, currentBgm, volume });

    const voiceById = useMemo(() => {
        const map = new Map();
        Object.values(voices).flat().forEach(v => map.set(v.id, v));
        return map;
    }, [voices]);

    const voiceOptions = useMemo(() => {
        return Object.values(voices).flat().map(v => ({ id: v.id, label: v.label }));
    }, [voices]);

    const seqStepsRef = useRef(seqSteps);
    const seqTracksRef = useRef(seqTracks);
    const bpmRef = useRef(bpm);
    const playSoundRef = useRef(playSound);
    const voiceByIdRef = useRef(voiceById);
    const schedulerRef = useRef(null);
    const nextStepTimeRef = useRef(0);
    const currentStepRef = useRef(0);

    useEffect(() => { seqStepsRef.current = seqSteps; }, [seqSteps]);
    useEffect(() => { seqTracksRef.current = seqTracks; }, [seqTracks]);
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { playSoundRef.current = playSound; }, [playSound]);
    useEffect(() => { voiceByIdRef.current = voiceById; }, [voiceById]);

    useEffect(() => {
        const p = new URLSearchParams(window.location.search).get('p');
        if (!p) return;

        const decoded = decodeSettings(p, voices);
        if (!decoded.ok) {
            if (decoded.version !== undefined) {
                console.warn("Unknown settings version or old URL", decoded.version);
                alert("URLの形式が古いため読み込めませんでした。\\n新しいURLを作成してください。");
            } else if (decoded.error) {
                console.error("Failed to decode settings", decoded.error);
            }
            return;
        }

        const { settings, grainSize: decodedGrainSize, restored } = decoded;

        setBpm(settings.bpm);
        setPlaybackRate(settings.playbackRate);
        setEchoFeedback(settings.echoFeedback);
        setEchoTime(settings.echoTime);
        setEchoMix(settings.echoMix);
        setReverbDecay(settings.reverbDecay);
        setReverbMix(settings.reverbMix);
        setEqLow(settings.eqLow);
        setEqMid(settings.eqMid);
        setEqHigh(settings.eqHigh);
        setFilterQ(settings.filterQ);
        setFilterFreq(settings.filterFreq);
        setFilterType(settings.filterType);
        setLoopMode(settings.loopMode);
        setDrillMode(settings.drillMode);
        setShowPro(true);
        setGrainSize(decodedGrainSize);

        if (restored.length > 0) {
            setPendingTriggers(restored);
            setCharacter('hinahina');
            setModalOpen(true);
        }

        window.history.replaceState({}, '', window.location.pathname);
    }, [voices]);

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
        const code = encodeSettings({
            voices,
            playingSounds,
            activeLoopsRef: activeLoops,
            grainSize,
            filterType,
            filterFreq,
            filterQ,
            eqLow,
            eqMid,
            eqHigh,
            reverbMix,
            reverbDecay,
            echoMix,
            echoTime,
            echoFeedback,
            playbackRate,
            bpm,
            loopMode,
            drillMode
        });
        const url = `${window.location.origin}${window.location.pathname}?p=${code}`;
        const text = `【モルトバトルサンプラーからのお知らせ】\nドゥンドゥンしようねえ\n${url}\n\n#モルトバトルサンプラー`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    };

    const handleTap = () => {
        const now = Date.now();
        const times = tapTimes.filter(t => now - t < 2000);
        times.push(now);

        if (times.length >= 3) {
            const intervals = [];
            for (let i = 1; i < times.length; i++) {
                intervals.push(times[i] - times[i - 1]);
            }
            const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const newBpm = Math.round(60000 / avgMs);

            if (newBpm > 40 && newBpm < 300) {
                setBpm(newBpm);
                setPlaybackRate(Number((newBpm / 120).toFixed(2)));
                const note32 = (60 / newBpm) / 8;
                setGrainSize(Number(note32.toFixed(3)));
            }
            if (times.length > 5) times.shift();
        }
        setTapTimes(times);
    };

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
        setRestartOnClick(false);

        Object.values(activeLoops.current).forEach(item => {
            try { item.src.stop(); } catch (e) { }
        });
        activeLoops.current = {};
        setPlayingSounds({});

        window.history.replaceState({}, '', window.location.pathname);
    };

    const handleLoopVolumeChange = (id, value) => {
        setLoopVolumes(prev => ({ ...prev, [id]: value }));
        if (activeLoops.current[id] && activeLoops.current[id].gain) {
            activeLoops.current[id].gain.gain.value = value;
        }
    };

    const appStyle = {
        '--primary-color': character === 'hinahina' ? 'var(--hina-color)' : character === 'kai' ? 'var(--kai-color)' : 'var(--others-color)',
        '--theme-bg': character === 'hinahina' ? 'rgba(255, 105, 180, 0.05)' : character === 'kai' ? 'rgba(92, 219, 211, 0.05)' : 'rgba(255, 215, 0, 0.05)'
    };
    const selectedBgmData = bgmList.find(b => b.id === currentBgm);

    useEffect(() => {
        if (!seqSync) return;
        if (selectedBgmData && selectedBgmData.bpm) {
            setBpm(selectedBgmData.bpm);
        }
    }, [seqSync, selectedBgmData]);


    useEffect(() => {
        if (!seqEnabled && seqPlaying) setSeqPlaying(false);
    }, [seqEnabled, seqPlaying]);

    useEffect(() => {
        if (!seqPlaying) {
            if (schedulerRef.current) {
                clearInterval(schedulerRef.current);
                schedulerRef.current = null;
            }
            return;
        }
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const stepDuration = () => (60 / Math.max(40, bpmRef.current)) / 4;
        const lookaheadMs = 25;
        const scheduleAhead = 0.1;

        const tick = () => {
            const stepSec = stepDuration();
            while (nextStepTimeRef.current < ctx.currentTime + scheduleAhead) {
                const step = currentStepRef.current;
                const rowSteps = seqStepsRef.current;
                const rowTracks = seqTracksRef.current;
                for (let i = 0; i < rowSteps.length; i++) {
                    if (rowSteps[i]?.[step]) {
                        const id = rowTracks[i];
                        const voice = id ? voiceByIdRef.current.get(id) : null;
                        if (voice) {
                            playSoundRef.current(voice.file, voice.id, 'oneshot', null, nextStepTimeRef.current);
                        }
                    }
                }
                nextStepTimeRef.current += stepSec;
                currentStepRef.current = (step + 1) % 16;
                setSeqStepIndex(currentStepRef.current);
            }
        };

        schedulerRef.current = setInterval(tick, lookaheadMs);
        return () => {
            if (schedulerRef.current) {
                clearInterval(schedulerRef.current);
                schedulerRef.current = null;
            }
        };
    }, [seqPlaying, audioCtxRef]);

    const handleSeqStart = () => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const stepSec = (60 / Math.max(40, bpm)) / 4;
        let startAt = ctx.currentTime;
        if (seqSync && selectedBgmData && selectedBgmData.downbeatOffsetSec != null) {
            const bgm = bgmRef.current;
            if (bgm && !bgm.paused) {
                const offset = selectedBgmData.downbeatOffsetSec;
                const barSec = stepSec * 16;
                if (bgm.currentTime < offset) {
                    startAt = ctx.currentTime + (offset - bgm.currentTime);
                } else {
                    const since = bgm.currentTime - offset;
                    const toNext = barSec - (since % barSec);
                    startAt = ctx.currentTime + (toNext === barSec ? 0 : toNext);
                }
            }
        }
        currentStepRef.current = 0;
        nextStepTimeRef.current = startAt;
        setSeqStepIndex(0);
        setSeqPlaying(true);
    };

    const handleSeqStop = () => {
        setSeqPlaying(false);
        setSeqStepIndex(0);
    };

    const handleTrackChange = (row, id) => {
        const next = [...seqTracks];
        next[row] = id || null;
        setSeqTracks(next);
    };

    const handleToggleStep = (row, step) => {
        setSeqSteps(prev => {
            const next = prev.map(r => r.slice());
            next[row][step] = !next[row][step];
            return next;
        });
    };

    return (
        <div className="app-container" style={appStyle}>
            <LoadingOverlay isLoading={isLoading} progress={progress} />
            <ShareModal open={modalOpen && pendingTriggers.length > 0} onPlay={handleModalPlay} />

            <HeaderControls
                bgmList={bgmList}
                currentBgm={currentBgm}
                onSelectBgm={setCurrentBgm}
                volume={volume}
                onVolumeChange={setVolume}
                showPro={showPro}
                onTogglePro={() => setShowPro(!showPro)}
                selectedBgmData={selectedBgmData}
                showSeq={seqEnabled}
                onToggleSeq={() => setSeqEnabled(!seqEnabled)}
            />

            {showPro && (
                <ProPanel
                    filterType={filterType}
                    onFilterTypeChange={setFilterType}
                    filterFreq={filterFreq}
                    onFilterFreqChange={setFilterFreq}
                    filterQ={filterQ}
                    onFilterQChange={setFilterQ}
                    eqHigh={eqHigh}
                    onEqHighChange={setEqHigh}
                    eqMid={eqMid}
                    onEqMidChange={setEqMid}
                    eqLow={eqLow}
                    onEqLowChange={setEqLow}
                    loopMode={loopMode}
                    drillMode={drillMode}
                    onToggleLoopMode={() => {
                        const next = !loopMode;
                        setLoopMode(next);
                        setDrillMode(false);
                        if (next) setRestartOnClick(false);
                    }}
                    onToggleDrillMode={() => {
                        const next = !drillMode;
                        setDrillMode(next);
                        setLoopMode(false);
                        if (next) setRestartOnClick(false);
                    }}
                    restartOnClick={restartOnClick}
                    onToggleRestartOnClick={() => {
                        if (loopMode || drillMode) return;
                        setRestartOnClick(!restartOnClick);
                    }}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    grainSize={grainSize}
                    onGrainSizeChange={setGrainSize}
                    reverbMix={reverbMix}
                    onReverbMixChange={setReverbMix}
                    reverbDecay={reverbDecay}
                    onReverbDecayChange={setReverbDecay}
                    echoMix={echoMix}
                    onEchoMixChange={setEchoMix}
                    echoTime={echoTime}
                    onEchoTimeChange={setEchoTime}
                    echoFeedback={echoFeedback}
                    onEchoFeedbackChange={setEchoFeedback}
                    playingSounds={playingSounds}
                    loopVolumes={loopVolumes}
                    onLoopVolumeChange={handleLoopVolumeChange}
                    voices={voices}
                />
            )}

            {seqEnabled && (
                <StepSequencer
                    tracks={seqTracks}
                    steps={seqSteps}
                    options={voiceOptions}
                    onTrackChange={handleTrackChange}
                    onToggleStep={handleToggleStep}
                    isPlaying={seqPlaying}
                    onStart={handleSeqStart}
                    onStop={handleSeqStop}
                    currentStep={seqStepIndex}
                    syncEnabled={seqSync}
                    onToggleSync={() => setSeqSync(prev => !prev)}
                    bpm={bpm}
                    onBpmChange={(value) => { if (!seqSync && value >= 40 && value <= 300) setBpm(value); }}
                    onResetSteps={() => setSeqSteps(Array.from({ length: 4 }, () => Array(16).fill(false)))}
                />
            )}

            <CharacterTabs character={character} onSelectCharacter={setCharacter} />

            <SoundBoard
                voices={voices}
                character={character}
                playingSounds={playingSounds}
                onPlaySound={playSound}
                compact={showPro}
                audioBuffers={audioBuffers}
                loadProgress={progress}
                audioCtxRef={audioCtxRef}
                playheadInfo={playheadInfo}
            />

            {showPro && (
                <FooterControls onShare={handleShare} onReset={resetSettings} />
            )}
        </div>
    );
}

export default App;













