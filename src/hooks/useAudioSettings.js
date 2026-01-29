import { useCallback, useState } from 'react';
import {
    DEFAULT_EQ,
    DEFAULT_FILTER,
    DEFAULT_PLAYBACK,
    DEFAULT_SPATIAL
} from '../constants/audioDefaults';

export const useAudioSettings = () => {
    const [filterType, setFilterType] = useState(DEFAULT_FILTER.filterType);
    const [filterFreq, setFilterFreq] = useState(DEFAULT_FILTER.filterFreq);
    const [filterQ, setFilterQ] = useState(DEFAULT_FILTER.filterQ);

    const [eqLow, setEqLow] = useState(DEFAULT_EQ.eqLow);
    const [eqMid, setEqMid] = useState(DEFAULT_EQ.eqMid);
    const [eqHigh, setEqHigh] = useState(DEFAULT_EQ.eqHigh);

    const [reverbMix, setReverbMix] = useState(DEFAULT_SPATIAL.reverbMix);
    const [reverbDecay, setReverbDecay] = useState(DEFAULT_SPATIAL.reverbDecay);
    const [echoMix, setEchoMix] = useState(DEFAULT_SPATIAL.echoMix);
    const [echoTime, setEchoTime] = useState(DEFAULT_SPATIAL.echoTime);
    const [echoFeedback, setEchoFeedback] = useState(DEFAULT_SPATIAL.echoFeedback);

    const [playbackRate, setPlaybackRate] = useState(DEFAULT_PLAYBACK.playbackRate);
    const [timeStretch, setTimeStretch] = useState(DEFAULT_PLAYBACK.timeStretch);
    const [loopMode, setLoopMode] = useState(DEFAULT_PLAYBACK.loopMode);
    const [drillMode, setDrillMode] = useState(DEFAULT_PLAYBACK.drillMode);
    const [grainSize, setGrainSize] = useState(DEFAULT_PLAYBACK.grainSize);
    const [restartOnClick, setRestartOnClick] = useState(DEFAULT_PLAYBACK.restartOnClick);

    const toggleLoopMode = useCallback(() => {
        setLoopMode((prev) => {
            const next = !prev;
            if (next) {
                setDrillMode(false);
                setRestartOnClick(false);
            }
            return next;
        });
    }, []);

    const toggleDrillMode = useCallback(() => {
        setDrillMode((prev) => {
            const next = !prev;
            if (next) {
                setLoopMode(false);
                setRestartOnClick(false);
            }
            return next;
        });
    }, []);

    const toggleRestartOnClick = useCallback(() => {
        if (loopMode || drillMode) return;
        setRestartOnClick((prev) => !prev);
    }, [drillMode, loopMode]);

    const resetAudioSettings = useCallback(() => {
        setFilterType(DEFAULT_FILTER.filterType);
        setFilterFreq(DEFAULT_FILTER.filterFreq);
        setFilterQ(DEFAULT_FILTER.filterQ);
        setEqLow(DEFAULT_EQ.eqLow);
        setEqMid(DEFAULT_EQ.eqMid);
        setEqHigh(DEFAULT_EQ.eqHigh);
        setReverbMix(DEFAULT_SPATIAL.reverbMix);
        setReverbDecay(DEFAULT_SPATIAL.reverbDecay);
        setEchoMix(DEFAULT_SPATIAL.echoMix);
        setEchoTime(DEFAULT_SPATIAL.echoTime);
        setEchoFeedback(DEFAULT_SPATIAL.echoFeedback);
        setPlaybackRate(DEFAULT_PLAYBACK.playbackRate);
        setTimeStretch(DEFAULT_PLAYBACK.timeStretch);
        setLoopMode(DEFAULT_PLAYBACK.loopMode);
        setDrillMode(DEFAULT_PLAYBACK.drillMode);
        setGrainSize(DEFAULT_PLAYBACK.grainSize);
        setRestartOnClick(DEFAULT_PLAYBACK.restartOnClick);
    }, []);

    const applySettings = useCallback(({ settings, grainSize: decodedGrainSize }) => {
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
        setGrainSize(decodedGrainSize);
    }, []);

    return {
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
    };
};
