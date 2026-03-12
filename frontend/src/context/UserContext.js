import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [mode, setMode] = useState('admin');
  
  // Données du membre actuellement connecté
  const [currentMember, setCurrentMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction pour définir le membre courant et persister en localStorage
  const updateCurrentMember = useCallback((member) => {
    setCurrentMember(member);
    if (member) {
      localStorage.setItem('currentMemberId', member.id);
      // Définir automatiquement le mode selon le membre
      setMode(member.is_president ? 'admin' : 'member');
    } else {
      localStorage.removeItem('currentMemberId');
    }
  }, []);

  // Charger les membres au démarrage
  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await axios.get(`${API}/members`);
        const membersData = response.data || [];
        setMembers(membersData);
        
        // Vérifier si un membre était connecté (persisté en localStorage)
        const savedMemberId = localStorage.getItem('currentMemberId');
        
        if (savedMemberId) {
          // Restaurer le membre sauvegardé
          const savedMember = membersData.find(m => m.id === savedMemberId);
          if (savedMember) {
            setCurrentMember(savedMember);
            setMode(savedMember.is_president ? 'admin' : 'member');
          } else {
            // Membre non trouvé, charger Fabien par défaut (mode développement)
            const fabien = membersData.find(m => m.nom_complet?.includes('Fabien Lanfranchi'));
            if (fabien) {
              setCurrentMember(fabien);
              setMode('admin');
            }
          }
        } else {
          // Pas de membre sauvegardé, charger Fabien par défaut (mode développement)
          const fabien = membersData.find(m => m.nom_complet?.includes('Fabien Lanfranchi'));
          if (fabien) {
            setCurrentMember(fabien);
            setMode('admin');
          }
        }
      } catch (err) {
        console.error('Erreur chargement membres:', err);
        setError('Impossible de se connecter au serveur. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'admin' ? 'member' : 'admin');
  };

  // Fonction de déconnexion
  const logout = useCallback(() => {
    localStorage.removeItem('currentMemberId');
    localStorage.removeItem('rememberedMember');
    setCurrentMember(null);
    setMode('admin');
  }, []);

  const isAdmin = mode === 'admin';

  return (
    <UserContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isAdmin,
        currentMember,
        setCurrentMember: updateCurrentMember,
        members,
        loading,
        error,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
