import React from 'react';

const CharacterTabs = ({ character, onSelectCharacter }) => {
    return (
        <div className="char-tabs">
            <div className={`tab hina ${character === 'hinahina' ? 'active' : ''}`} onClick={() => onSelectCharacter('hinahina')}>
                <div className="char-icon-frame"><img src="/images/hina_icon.jpg" className="hina-img" alt="" /></div>ひなひな
            </div>
            <div className={`tab kai ${character === 'kai' ? 'active' : ''}`} onClick={() => onSelectCharacter('kai')}>
                <div className="char-icon-frame"><img src="/images/kai_icon.png" className="kai-img" alt="" /></div>かい
            </div>
            <div className={`tab others ${character === 'others' ? 'active' : ''}`} onClick={() => onSelectCharacter('others')}>
                <div className="char-icon-frame" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333', color: '#fff', fontSize: '1.2rem' }}>?</div>その他
            </div>
        </div>
    );
};

export default CharacterTabs;
