import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  
  // Ref pour savoir si un login manuel a eu lieu (évite d'écraser avec Fabien)
  const hasManualLogin = useRef(false);

  // Fonction pour définir le membre courant et persister en localStorage
  const updateCurrentMember = useCallback((member) => {
    hasManualLogin.current = true; // Marquer qu'un login manuel a eu lieu
    setCurrentMember(member);
    setLoading(false); // S'assurer que loading est false après login
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
      // Si un login manuel a déjà eu lieu, ne pas recharger
      if (hasManualLogin.current) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Vérifier localStorage AVANT l'appel async
      const savedMemberId = localStorage.getItem('currentMemberId');
      
      try {
        // Ajouter un timeout de 10 secondes
        const response = await axios.get(`${API}/members`, { timeout: 10000 });
        const membersData = response.data || [];
        setMembers(membersData);
        
        // Si un login manuel a eu lieu pendant le chargement, ne pas écraser
        if (hasManualLogin.current) {
          setLoading(false);
          return;
        }
        
        if (savedMemberId) {
          // Restaurer le membre sauvegardé depuis localStorage
          const savedMember = membersData.find(m => m.id === savedMemberId);
          if (savedMember) {
            setCurrentMember(savedMember);
            setMode(savedMember.is_president ? 'admin' : 'member');
          } else {
            // Membre non trouvé, charger Fabien par défaut
            localStorage.removeItem('currentMemberId');
            const fabien = membersData.find(m => m.nom_complet?.includes('Fabien Lanfranchi'));
            if (fabien) {
              setCurrentMember(fabien);
              setMode('admin');
            }
          }
        } else {
          // Mode développement : charger Fabien par défaut
          const fabien = membersData.find(m => m.nom_complet?.includes('Fabien Lanfranchi'));
          if (fabien) {
            setCurrentMember(fabien);
            setMode('admin');
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur chargement membres:', err);
        setError('Impossible de se connecter au serveur. Veuillez réessayer.');
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
    hasManualLogin.current = false;
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
