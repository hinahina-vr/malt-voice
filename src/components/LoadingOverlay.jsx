import React from 'react';

const LoadingOverlay = ({ isLoading, progress }) => {
    if (!isLoading) return null;

    return (
        <div className="loading-overlay">
            <div className="loading-content">
                <img src="/images/loading_bg.jpg" alt="" className="loading-image" />
                <h2>モルト舐め妖精が準備中です…</h2>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>{progress}%</p>
                <p className="loading-text">LOADING AUDIO DATA...</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
