import { encodeSettings } from './settingsCodec';

export const buildShareUrl = ({
    voices,
    playingSounds,
    activeLoopsRef,
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
    timeStretch,
    bpm,
    loopMode,
    drillMode,
    seqTracks,
    seqSteps,
    seqTrackMutes,
    seqTrackRetrig
}) => {
    const code = encodeSettings({
        voices,
        playingSounds,
        activeLoopsRef,
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
        timeStretch,
        bpm,
        loopMode,
        drillMode,
        seqTracks,
        seqSteps,
        seqTrackMutes,
        seqTrackRetrig
    });
    return `${window.location.origin}${window.location.pathname}?p=${code}`;
};

export const buildShareTweetUrl = (shareUrl) => {
    const text = `【モルトバトルサンプラーからのお知らせ】\nドゥンドゥンしようねえ\n${shareUrl}\n\n#モルトバトルサンプラー`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
};
