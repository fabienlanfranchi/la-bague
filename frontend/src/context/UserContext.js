import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  // Mode : 'admin' (Président) ou 'member' (Membre)
  const [mode, setMode] = useState('member'); // Par défaut membre, pas admin
  
  // Données du membre actuellement connecté
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);

  // Charger les membres au démarrage
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const response = await axios.get(`${API}/members`);
        setMembers(response.data);
        // Ne plus charger Fabien par défaut - l'utilisateur doit se connecter
      } catch (error) {
        console.error('Erreur chargement membres:', error);
      }
    };
    loadMembers();
  }, []);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'admin' ? 'member' : 'admin');
  };

  const isAdmin = mode === 'admin';

  return (
    <UserContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isAdmin,
        currentMember,
        setCurrentMember,
        members,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
