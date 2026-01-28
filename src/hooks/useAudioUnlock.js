import { useEffect } from 'react';

export const useAudioUnlock = (audioCtxRef) => {
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
        };
    }, [audioCtxRef]);
};
