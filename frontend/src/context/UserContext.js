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
  
  // Données du membre actuellement connecté - restaurer immédiatement depuis le cache
  const getInitialMember = () => {
    try {
      const savedData = localStorage.getItem('currentMemberData') || sessionStorage.getItem('currentMemberData');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (e) {
      console.error('Erreur lecture cache membre:', e);
    }
    return null;
  };
  
  const [currentMemberState, setCurrentMemberState] = useState(getInitialMember);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(!getInitialMember()); // Pas de loading si déjà en cache
  const [error, setError] = useState(null);
  
  // Ref pour savoir si un login manuel a eu lieu (évite d'écraser avec Fabien)
  const hasManualLogin = useRef(!!getInitialMember());

  // Fonction pour définir le membre courant et persister en localStorage
  const setCurrentMember = useCallback((member, stayLoggedIn = true) => {
    hasManualLogin.current = true; // Marquer qu'un login manuel a eu lieu
    setCurrentMemberState(member);
    setLoading(false); // S'assurer que loading est false après login
    if (member) {
      // Sauvegarder la session SEULEMENT si "Rester connecté" est coché
      if (stayLoggedIn) {
        localStorage.setItem('currentMemberId', member.id);
        localStorage.setItem('currentMemberData', JSON.stringify(member));
      } else {
        // Session temporaire - utiliser sessionStorage (disparaît à la fermeture du navigateur)
        sessionStorage.setItem('currentMemberId', member.id);
        sessionStorage.setItem('currentMemberData', JSON.stringify(member));
        // Nettoyer localStorage pour ne pas persister
        localStorage.removeItem('currentMemberId');
        localStorage.removeItem('currentMemberData');
      }
      // Définir automatiquement le mode selon le membre
      setMode(member.is_president ? 'admin' : 'member');
    } else {
      localStorage.removeItem('currentMemberId');
      localStorage.removeItem('currentMemberData');
      sessionStorage.removeItem('currentMemberId');
      sessionStorage.removeItem('currentMemberData');
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
      
      // Vérifier localStorage ET sessionStorage AVANT l'appel async
      const savedMemberId = localStorage.getItem('currentMemberId') || sessionStorage.getItem('currentMemberId');
      const savedMemberData = localStorage.getItem('currentMemberData') || sessionStorage.getItem('currentMemberData');
      
      // Si on a les données du membre en cache, les utiliser immédiatement
      if (savedMemberId && savedMemberData) {
        try {
          const cachedMember = JSON.parse(savedMemberData);
          // IMPORTANT: utiliser setCurrentMemberState directement pour ne pas déclencher updateCurrentMember
          setCurrentMemberState(cachedMember);
          setMode(cachedMember.is_president ? 'admin' : 'member');
          hasManualLogin.current = true;
          setLoading(false);
          
          // Rafraîchir les données en arrière-plan
          axios.get(`${API}/members`, { timeout: 10000 }).then(response => {
            const membersData = response.data || [];
            setMembers(membersData);
            // Mettre à jour les données du membre si elles ont changé
            const updatedMember = membersData.find(m => m.id === savedMemberId);
            if (updatedMember) {
              setCurrentMember(updatedMember);
              localStorage.setItem('currentMemberData', JSON.stringify(updatedMember));
            }
          }).catch(err => console.error('Erreur rafraîchissement membres:', err));
          
          return;
        } catch (e) {
          // Si les données en cache sont corrompues, continuer normalement
          localStorage.removeItem('currentMemberData');
        }
      }
      
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
            localStorage.setItem('currentMemberData', JSON.stringify(savedMember));
          } else {
            // Membre non trouvé, supprimer les données corrompues
            localStorage.removeItem('currentMemberId');
            localStorage.removeItem('currentMemberData');
            // NE PAS charger de membre par défaut - rediriger vers login
            setCurrentMember(null);
          }
        } else {
          // Pas de session sauvegardée - NE PAS charger de membre par défaut
          // L'utilisateur doit se connecter
          setCurrentMember(null);
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
    localStorage.removeItem('currentMemberData');
    localStorage.removeItem('rememberedMember');
    sessionStorage.removeItem('currentMemberId');
    sessionStorage.removeItem('currentMemberData');
    setCurrentMemberState(null);
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
        currentMember: currentMemberState,
        setCurrentMember,
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
