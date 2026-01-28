import React, { useEffect, useRef } from 'react';

const AudioVisualizer = ({ audioCtx, sourceNode, isPro }) => {
    const canvasRef = useRef(null);
    const analyserRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        if (!audioCtx || !sourceNode) return;

        // Create Analyser
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048; // High resolution for smooth curves
        sourceNode.connect(analyser);
        analyserRef.current = analyser;

        return () => {
            try {
                sourceNode.disconnect(analyser);
            } catch (e) { /* ignore */ }
        };
    }, [audioCtx, sourceNode]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const analyser = analyserRef.current;

        const draw = () => {
            if (!analyser) return;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            analyser.getByteTimeDomainData(dataArray); // Use Time Domain for waveform/blob

            const width = canvas.width;
            const height = canvas.height;
            const cx = width / 2;
            const cy = height / 2;
            const radius = Math.min(width, height) / 3;

            ctx.clearRect(0, 0, width, height);

            if (!isPro) return;

            // Get Theme Color
            const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#ff69b4';

            ctx.lineWidth = 2;
            ctx.strokeStyle = themeColor;
            ctx.beginPath();

            const sliceAngle = (Math.PI * 2) / bufferLength;
            let angle = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // Center around 1.0
                const r = radius * (0.8 + (v * 0.4)); // Modulate radius
                // Smooth modulation

                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                angle += sliceAngle;
            }

            ctx.closePath();
            ctx.stroke();

            // Add inner glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = themeColor;

            // Draw a second softer ring
            ctx.beginPath();
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.2;
            for (let i = 0; i < bufferLength; i += 10) { // Skip points for smoother/simpler shape
                const v = dataArray[i] / 128.0;
                const r = radius * (1.1 + (v * 0.2));
                const x = cx + r * Math.cos(i * sliceAngle);
                const y = cy + r * Math.sin(i * sliceAngle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;

            requestRef.current = requestAnimationFrame(draw);
        };

        if (isPro) {
            draw();
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPro]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // init
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!isPro) return null;

    return (
        <canvas
            ref={canvasRef}
            className="visualizer-canvas"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0, // Behind everything
                filter: 'blur(1px)' // Soften edges for abstract feel
            }}
        />
    );
};

export default AudioVisualizer;
