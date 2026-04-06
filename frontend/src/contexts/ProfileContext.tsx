import React, { createContext, useContext, useState, useEffect } from 'react';

interface ProfileContextType {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

  // Read initial from local storage or wait for API
  useEffect(() => {
    const stored = localStorage.getItem('activeProfileId');
    if (stored) {
      setActiveProfileId(stored);
    }
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem('activeProfileId', activeProfileId);
    } else {
      localStorage.removeItem('activeProfileId');
    }
  }, [activeProfileId]);

  return (
    <ProfileContext.Provider value={{ activeProfileId, setActiveProfileId }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
