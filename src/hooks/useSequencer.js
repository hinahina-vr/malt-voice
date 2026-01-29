import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    DEFAULT_SEQ_STEPS,
    DEFAULT_TAP_MAX_BPM,
    DEFAULT_TAP_MIN_BPM,
    createDefaultSeqSteps,
    createDefaultSeqTrackFx,
    createDefaultSeqTrackMutes,
    createDefaultSeqTrackRetrig,
    createDefaultSeqTracks
} from '../constants/audioDefaults';
import { buildVoiceIndex } from '../utils/voiceUtils';

export const useSequencer = ({
    voices,
    audioCtxRef,
    bgmRef,
    playSound,
    selectedBgmData,
    bpm,
    setBpm
}) => {
    const [seqEnabled, setSeqEnabled] = useState(false);
    const [seqPlaying, setSeqPlaying] = useState(false);
    const [seqSync, setSeqSync] = useState(false);
    const [seqTracks, setSeqTracks] = useState(() => createDefaultSeqTracks());
    const [seqSteps, setSeqSteps] = useState(() => createDefaultSeqSteps());
    const [seqStepIndex, setSeqStepIndex] = useState(0);
    const [seqTrackFx, setSeqTrackFx] = useState(() => createDefaultSeqTrackFx());
    const [seqTrackMutes, setSeqTrackMutes] = useState(() => createDefaultSeqTrackMutes());
    const [seqTrackRetrig, setSeqTrackRetrig] = useState(() => createDefaultSeqTrackRetrig());

    const voiceById = useMemo(() => buildVoiceIndex(voices), [voices]);

    const seqStepsRef = useRef(seqSteps);
    const seqTracksRef = useRef(seqTracks);
    const bpmRef = useRef(bpm);
    const playSoundRef = useRef(playSound);
    const voiceByIdRef = useRef(voiceById);
    const seqTrackFxRef = useRef(seqTrackFx);
    const seqTrackMutesRef = useRef(seqTrackMutes);
    const seqTrackRetrigRef = useRef(seqTrackRetrig);
    const schedulerRef = useRef(null);
    const nextStepTimeRef = useRef(0);
    const currentStepRef = useRef(0);

    useEffect(() => { seqStepsRef.current = seqSteps; }, [seqSteps]);
    useEffect(() => { seqTracksRef.current = seqTracks; }, [seqTracks]);
    useEffect(() => { seqTrackFxRef.current = seqTrackFx; }, [seqTrackFx]);
    useEffect(() => { seqTrackMutesRef.current = seqTrackMutes; }, [seqTrackMutes]);
    useEffect(() => { seqTrackRetrigRef.current = seqTrackRetrig; }, [seqTrackRetrig]);
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { playSoundRef.current = playSound; }, [playSound]);
    useEffect(() => { voiceByIdRef.current = voiceById; }, [voiceById]);

    useEffect(() => {
        if (!seqSync) return;
        if (selectedBgmData && selectedBgmData.bpm) {
            setBpm(selectedBgmData.bpm);
        }
    }, [seqSync, selectedBgmData, setBpm]);

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

        const stepDuration = () => (60 / Math.max(DEFAULT_TAP_MIN_BPM, bpmRef.current)) / 4;
        const lookaheadMs = 25;
        const scheduleAhead = 0.1;

        const tick = () => {
            const stepSec = stepDuration();
            while (nextStepTimeRef.current < ctx.currentTime + scheduleAhead) {
                const step = currentStepRef.current;
                const rowSteps = seqStepsRef.current;
                const rowTracks = seqTracksRef.current;
                const rowMutes = seqTrackMutesRef.current;
                const rowRetrig = seqTrackRetrigRef.current;
                for (let i = 0; i < rowSteps.length; i++) {
                    if (rowMutes?.[i]) continue;
                    if (rowSteps[i]?.[step]) {
                        const id = rowTracks[i];
                        const voice = id ? voiceByIdRef.current.get(id) : null;
                        if (voice) {
                            const fx = seqTrackFxRef.current[i] || null;
                            const retrig = rowRetrig?.[i] ?? false;
                            playSoundRef.current(voice.file, voice.id, 'oneshot', null, nextStepTimeRef.current, fx, retrig);
                        }
                    }
                }
                nextStepTimeRef.current += stepSec;
                currentStepRef.current = (step + 1) % DEFAULT_SEQ_STEPS;
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

    const handleSeqStart = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();

        const stepSec = (60 / Math.max(DEFAULT_TAP_MIN_BPM, bpm)) / 4;
        let startAt = ctx.currentTime;
        if (seqSync && selectedBgmData && selectedBgmData.downbeatOffsetSec != null) {
            const bgm = bgmRef.current;
            if (bgm && !bgm.paused) {
                const offset = selectedBgmData.downbeatOffsetSec;
                const barSec = stepSec * DEFAULT_SEQ_STEPS;
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
    }, [audioCtxRef, bgmRef, bpm, selectedBgmData, seqSync]);

    const handleSeqStop = useCallback(() => {
        setSeqPlaying(false);
        setSeqStepIndex(0);
    }, []);

    const handleTrackChange = useCallback((row, id) => {
        setSeqTracks((prev) => {
            const next = [...prev];
            next[row] = id || null;
            return next;
        });
    }, []);

    const handleTrackFxChange = useCallback((row, patch) => {
        setSeqTrackFx((prev) => (
            prev.map((fx, index) => (index === row ? { ...fx, ...patch } : fx))
        ));
    }, []);

    const handleToggleMute = useCallback((row) => {
        setSeqTrackMutes((prev) => {
            const next = [...prev];
            next[row] = !next[row];
            return next;
        });
    }, []);

    const handleToggleRetrig = useCallback((row) => {
        setSeqTrackRetrig((prev) => {
            const next = [...prev];
            next[row] = !next[row];
            return next;
        });
    }, []);

    const handleToggleStep = useCallback((row, step) => {
        setSeqSteps((prev) => {
            const next = prev.map((r) => r.slice());
            next[row][step] = !next[row][step];
            return next;
        });
    }, []);

    const handlePlaySound = useCallback((soundFile, id, forcedMode = null, forcedGrain = null) => {
        const rowIndex = seqTracksRef.current.findIndex((t) => t === id);
        const fx = rowIndex >= 0 ? seqTrackFxRef.current[rowIndex] : null;
        const retrig = rowIndex >= 0 ? (seqTrackRetrigRef.current?.[rowIndex] ?? false) : false;
        playSound(soundFile, id, forcedMode, forcedGrain, null, fx, retrig);
    }, [playSound]);

    const handleBpmChange = useCallback((value) => {
        if (!seqSync && value >= DEFAULT_TAP_MIN_BPM && value <= DEFAULT_TAP_MAX_BPM) {
            setBpm(value);
        }
    }, [seqSync, setBpm]);

    const resetSteps = useCallback(() => {
        setSeqSteps(createDefaultSeqSteps());
    }, []);

    return {
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
        handlePlaySound,
        handleBpmChange,
        resetSteps
    };
};
