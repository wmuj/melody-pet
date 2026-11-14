import React, { useEffect, useState } from 'react';
import { PetStage } from './pages/PetStage';
import { SettingsWorkshop } from './pages/SettingsWorkshop';

export const App: React.FC = () => {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, '') || 'pet');

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace(/^#/, '') || 'pet');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (route === 'settings') {
    return <SettingsWorkshop />;
  }
  return <PetStage />;
};
