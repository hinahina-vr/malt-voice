import React, { useCallback, useMemo, useState } from 'react';
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
import { useAudioSettings } from './hooks/useAudioSettings';
import { useSequencer } from './hooks/useSequencer';
import { useSettingsRestore } from './hooks/useSettingsRestore';
import { useTempo } from './hooks/useTempo';
import { buildShareTweetUrl, buildShareUrl } from './utils/shareUtils';
import { getAppThemeStyle } from './utils/themeUtils';
import { buildVoiceOptions } from './utils/voiceUtils';

function App() {
    const [character, setCharacter] = useState('hinahina');
    const [currentBgm, setCurrentBgm] = useState(bgmList[0].id);
    const [volume, setVolume] = useState(1);
    const [playingSounds, setPlayingSounds] = useState({});
    const [showPro, setShowPro] = useState(false);
    const [loopVolumes, setLoopVolumes] = useState({});

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingTriggers, setPendingTriggers] = useState([]); // Array of {sound, mode}

    const {
        filterType,
        setFilterType,
        filterFreq,
        setFilterFreq,
        filterQ,
        setFilterQ,
        eqLow,
        setEqLow,
        eqMid,
        setEqMid,
        eqHigh,
        setEqHigh,
        reverbMix,
        setReverbMix,
        reverbDecay,
        setReverbDecay,
        echoMix,
        setEchoMix,
        echoTime,
        setEchoTime,
        echoFeedback,
        setEchoFeedback,
        playbackRate,
        setPlaybackRate,
        timeStretch,
        setTimeStretch,
        loopMode,
        drillMode,
        grainSize,
        setGrainSize,
        restartOnClick,
        toggleLoopMode,
        toggleDrillMode,
        toggleRestartOnClick,
        resetAudioSettings,
        applySettings
    } = useAudioSettings();

    const {
        bpm,
        setBpm,
        resetTempo
    } = useTempo({
        onPlaybackRateChange: setPlaybackRate,
        onGrainSizeChange: setGrainSize
    });

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
        timeStretch,
        loopMode,
        drillMode,
        restartOnClick,
        grainSize,
        loopVolumes,
        setPlayingSounds
    });

    useAudioUnlock(audioCtxRef);
    const bgmRef = useBgmPlayer({ bgmList, currentBgm, volume });

    const selectedBgmData = useMemo(
        () => bgmList.find((bgm) => bgm.id === currentBgm),
        [currentBgm]
    );

    const voiceOptions = useMemo(() => buildVoiceOptions(voices), [voices]);

    const {
        seqEnabled,
        setSeqEnabled,
        seqPlaying,
        seqSync,
        setSeqSync,
        seqTracks,
        seqSteps,
        seqStepIndex,
        seqTrackFx,
        seqTrackMutes,
        seqTrackRetrig,
        handleSeqStart,
        handleSeqStop,
        handleTrackChange,
        handleTrackFxChange,
        handleToggleMute,
        handleToggleRetrig,
        handleToggleStep,
        handleBpmChange,
        resetSteps
    } = useSequencer({
        voices,
        audioCtxRef,
        bgmRef,
        playSound,
        selectedBgmData,
        bpm,
        setBpm
    });

    const applyDecodedSettings = useCallback((decoded) => {
        const { settings, grainSize: decodedGrainSize } = decoded;
        setBpm(settings.bpm);
        applySettings({ settings, grainSize: decodedGrainSize });
        setShowPro(true);
    }, [applySettings, setBpm]);

    const restoreTriggers = useCallback((restored) => {
        setPendingTriggers(restored);
        setCharacter('hinahina');
        setModalOpen(true);
    }, []);

    useSettingsRestore({
        voices,
        onApplySettings: applyDecodedSettings,
        onRestoreTriggers: restoreTriggers
    });

    const handleModalPlay = useCallback(() => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        pendingTriggers.forEach((item) => {
            playSound(item.sound.file, item.sound.id, item.mode, item.grain);
        });
        setModalOpen(false);
    }, [audioCtxRef, pendingTriggers, playSound]);

    const handleSoundBoardPlay = useCallback((soundFile, id, forcedMode = null, forcedGrain = null) => {
        playSound(soundFile, id, forcedMode, forcedGrain);
    }, [playSound]);

    const handleShare = useCallback(() => {
        const shareUrl = buildShareUrl({
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
        const twitterUrl = buildShareTweetUrl(shareUrl);
        window.open(twitterUrl, '_blank');
    }, [
        activeLoops,
        bpm,
        drillMode,
        echoFeedback,
        echoMix,
        echoTime,
        eqHigh,
        eqLow,
        eqMid,
        filterFreq,
        filterQ,
        filterType,
        grainSize,
        loopMode,
        playbackRate,
        playingSounds,
        reverbDecay,
        reverbMix,
        voices
    ]);

    const resetSettings = useCallback(() => {
        resetAudioSettings();
        resetTempo();

        Object.values(activeLoops.current).forEach((item) => {
            try { item.src.stop(); } catch (e) { }
        });
        activeLoops.current = {};
        setPlayingSounds({});

        window.history.replaceState({}, '', window.location.pathname);
    }, [activeLoops, resetAudioSettings, resetTempo]);

    const handleLoopVolumeChange = useCallback((id, value) => {
        setLoopVolumes((prev) => ({ ...prev, [id]: value }));
        if (activeLoops.current[id] && activeLoops.current[id].gain) {
            activeLoops.current[id].gain.gain.value = value;
        }
    }, [activeLoops]);

    const appStyle = useMemo(() => getAppThemeStyle(character), [character]);

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
                    onToggleLoopMode={toggleLoopMode}
                    onToggleDrillMode={toggleDrillMode}
                    restartOnClick={restartOnClick}
                    onToggleRestartOnClick={toggleRestartOnClick}
                    playbackRate={playbackRate}
                    onPlaybackRateChange={setPlaybackRate}
                    timeStretch={timeStretch}
                    onTimeStretchChange={setTimeStretch}
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
                    trackMutes={seqTrackMutes}
                    onToggleMute={handleToggleMute}
                    trackRetrig={seqTrackRetrig}
                    onToggleRetrig={handleToggleRetrig}
                    onToggleStep={handleToggleStep}
                    isPlaying={seqPlaying}
                    onStart={handleSeqStart}
                    onStop={handleSeqStop}
                    currentStep={seqStepIndex}
                    syncEnabled={seqSync}
                    onToggleSync={() => setSeqSync((prev) => !prev)}
                    bpm={bpm}
                    onBpmChange={handleBpmChange}
                    onResetSteps={resetSteps}
                    trackFx={seqTrackFx}
                    onTrackFxChange={handleTrackFxChange}
                />
            )}

            <CharacterTabs character={character} onSelectCharacter={setCharacter} />

            <SoundBoard
                voices={voices}
                character={character}
                playingSounds={playingSounds}
                onPlaySound={handleSoundBoardPlay}
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
