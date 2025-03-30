import React, { useState } from 'react';
import { 
    FaMicrophone, 
    FaFolder, 
    FaSearch, 
    FaMicrochip,
    FaCommentDots,
    FaVolumeUp,
    FaExchangeAlt,
    FaUserFriends,
    FaFolderOpen,
    FaDesktop
} from 'react-icons/fa';
import { IoSettings } from 'react-icons/io5';
import styles from './Sidebar.module.css';

const Sidebar = ({ onNavigate }) => {
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Define colors for each sidebar item
    const iconColors = {
        voice: '#FF5757',      // Red for voice features
        folder: '#4CAF50',     // Green for folders
        search: '#2196F3',     // Blue for search
        hardware: '#FF9800'    // Orange for hardware
    };

    const sidebarItems = [
        {
            id: 'voice',
            icon: <FaMicrophone style={{ color: iconColors.voice }} />,
            options: [
                { id: 'text-to-speech', icon: <FaCommentDots style={{ color: iconColors.voice }} />, label: 'Text to Speech' },
                { id: 'text-to-sfx', icon: <FaVolumeUp style={{ color: iconColors.voice }} />, label: 'Text to SFX' },
                { id: 'voice-changer', icon: <FaExchangeAlt style={{ color: iconColors.voice }} />, label: 'Voice Changer' },
                { id: 'voice-cloning', icon: <FaUserFriends style={{ color: iconColors.voice }} />, label: 'Voice Cloning' }
            ]
        },
        {
            id: 'folder',
            icon: <FaFolder style={{ color: iconColors.folder }} />,
            options: [
                { id: 'my-models', icon: <FaFolderOpen style={{ color: iconColors.folder }} />, label: 'My Models' }
            ]
        },
        {
            id: 'search',
            icon: <FaSearch style={{ color: iconColors.search }} />,
            options: [
                { id: 'search-models', icon: <FaSearch style={{ color: iconColors.search }} />, label: 'Search Models' }
            ]
        },
        {
            id: 'hardware',
            icon: <FaMicrochip style={{ color: iconColors.hardware }} />,
            options: [
                { id: 'system-info', icon: <FaDesktop style={{ color: iconColors.hardware }} />, label: 'System Info' },
                { id: 'runtimes', icon: <IoSettings style={{ color: iconColors.hardware }} />, label: 'Runtimes' }
            ]
        }
    ];

    const handleIconClick = (itemId) => {
        setActiveDropdown(activeDropdown === itemId ? null : itemId);
    };

    const handleOptionClick = (option) => {
        // Call the navigation callback with the selected option
        if (onNavigate) {
            onNavigate(option.id);
        }
        // Optionally close the dropdown after selection
        setActiveDropdown(null);
    };

    return (
        <div className={styles.sidebar}>
            {sidebarItems.map((item) => (
                <div 
                    key={item.id}
                    className={styles.sidebarIcon}
                    onClick={() => handleIconClick(item.id)}
                >
                    {item.icon}
                    {activeDropdown === item.id && (
                        <div className={styles.dropdown}>
                            {item.options.map((option) => (
                                <div 
                                    key={option.id} 
                                    className={styles.option}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOptionClick(option);
                                    }}
                                >
                                    {option.icon}
                                    <span>{option.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default Sidebar; 