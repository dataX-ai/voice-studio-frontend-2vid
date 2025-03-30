import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ModelSearch from './components/ModelSearch';
import SystemInfo from './components/SystemInfo';
import MyModels from './components/MyModels';
import InitializationPage from './components/InitializationPage';
import ComingSoon from './components/ComingSoon';
import TextToSpeech from './components/TextToSpeech';
import styles from './App.module.css';

const App = () => {
  const [currentView, setCurrentView] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const handleNavigation = (viewId) => {
    setCurrentView(viewId);
  };

  const handleInitializationComplete = () => {
    setIsInitialized(true);
  };

  const renderView = () => {
    switch (currentView) {
      case 'search-models':
        return <ModelSearch />;
      case 'my-models':
        return <MyModels />;
      case 'system-info':
        return <SystemInfo />;
      case 'text-to-speech':
        return <TextToSpeech />;
      case 'text-to-sfx':
        return <ComingSoon pageName="Text to SFX" />;
      case 'voice-changer':
        return <ComingSoon pageName="Voice Changer" />;
      case 'voice-cloning':
        return <ComingSoon pageName="Voice Cloning" />;
      case 'runtimes':
        return <ComingSoon pageName="Runtimes" />;
      default:
        return (
          <div className={styles.welcomeView}>
            <h1>Welcome to Voice Studio</h1>
            <p>Select an option from the sidebar to get started</p>
          </div>
        );
    }
  };

  if (!isInitialized) {
    return <InitializationPage onInitializationComplete={handleInitializationComplete} />;
  }

  return (
    <div className={styles.app}>
      <Sidebar onNavigate={handleNavigation} />
      <main className={styles.mainContent}>
        {renderView()}
      </main>
    </div>
  );
};

export default App; 