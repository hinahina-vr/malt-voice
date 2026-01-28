import { useEffect, useRef } from 'react';

export const useBgmPlayer = ({ bgmList, currentBgm, volume }) => {
    const bgmRef = useRef(new Audio());

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
    }, [currentBgm, bgmList]);

    useEffect(() => {
        bgmRef.current.volume = volume / 10;
    }, [volume]);

    return bgmRef;
};
