export const DEFAULT_FILTER = {
    filterType: 'lowpass',
    filterFreq: 100,
    filterQ: 1
};

export const DEFAULT_EQ = {
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0
};

export const DEFAULT_SPATIAL = {
    reverbMix: 0,
    reverbDecay: 2.0,
    echoMix: 0,
    echoTime: 0.3,
    echoFeedback: 0.4
};

export const DEFAULT_PLAYBACK = {
    playbackRate: 1.0,
    timeStretch: 1.0,
    loopMode: false,
    drillMode: false,
    grainSize: 0.4,
    restartOnClick: false
};

export const DEFAULT_BPM = 120;
export const DEFAULT_TAP_WINDOW_MS = 2000;
export const DEFAULT_TAP_MIN_BPM = 40;
export const DEFAULT_TAP_MAX_BPM = 300;

export const DEFAULT_SEQ_TRACKS = 4;
export const DEFAULT_SEQ_STEPS = 16;

export const DEFAULT_SEQ_TRACK_FX = {
    filterType: 'lowpass',
    filterFreq: 100,
    filterQ: 1,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    reverbMix: 0,
    reverbDecay: 2.0,
    echoMix: 0,
    echoTime: 0.3,
    echoFeedback: 0.4,
    playbackRate: 1.0,
    timeStretch: 1.0,
    volume: 1.0
};

export const createDefaultSeqTracks = (count = DEFAULT_SEQ_TRACKS) => (
    Array(count).fill(null)
);

export const createDefaultSeqSteps = (tracks = DEFAULT_SEQ_TRACKS, steps = DEFAULT_SEQ_STEPS) => (
    Array.from({ length: tracks }, () => Array(steps).fill(false))
);

export const createDefaultSeqTrackFx = (count = DEFAULT_SEQ_TRACKS) => (
    Array.from({ length: count }, () => ({ ...DEFAULT_SEQ_TRACK_FX }))
);

export const createDefaultSeqTrackMutes = (count = DEFAULT_SEQ_TRACKS) => (
    Array(count).fill(false)
);

export const createDefaultSeqTrackRetrig = (count = DEFAULT_SEQ_TRACKS) => (
    Array(count).fill(false)
);
