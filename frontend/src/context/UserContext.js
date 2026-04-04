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
      const savedId = localStorage.getItem('currentMemberId') || sessionStorage.getItem('currentMemberId');
      const savedData = localStorage.getItem('currentMemberData') || sessionStorage.getItem('currentMemberData');
      if (savedData && savedId) {
        const parsed = JSON.parse(savedData);
        // VÉRIFICATION: L'ID dans les données doit correspondre à l'ID sauvegardé
        if (parsed.id === savedId) {
          return parsed;
        } else {
          // Incohérence - ne pas charger
          console.warn('Incohérence initiale détectée, ignoré');
          return null;
        }
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
    console.log('[AUTH] setCurrentMember appelé:', member?.nom_complet, 'stayLoggedIn:', stayLoggedIn);
    hasManualLogin.current = true; // Marquer qu'un login manuel a eu lieu
    setCurrentMemberState(member);
    setLoading(false); // S'assurer que loading est false après login
    if (member) {
      // TOUJOURS nettoyer les deux storages avant de sauvegarder
      localStorage.removeItem('currentMemberId');
      localStorage.removeItem('currentMemberData');
      sessionStorage.removeItem('currentMemberId');
      sessionStorage.removeItem('currentMemberData');
      
      // Sauvegarder la session SEULEMENT si "Rester connecté" est coché
      if (stayLoggedIn) {
        console.log('[AUTH] Sauvegarde localStorage pour:', member.id);
        localStorage.setItem('currentMemberId', member.id);
        localStorage.setItem('currentMemberData', JSON.stringify(member));
      } else {
        // Session temporaire - utiliser sessionStorage (disparaît à la fermeture du navigateur)
        console.log('[AUTH] Sauvegarde sessionStorage pour:', member.id);
        sessionStorage.setItem('currentMemberId', member.id);
        sessionStorage.setItem('currentMemberData', JSON.stringify(member));
      }
      // Définir automatiquement le mode selon le membre
      setMode(member.is_president ? 'admin' : 'member');
    } else {
      console.log('[AUTH] Déconnexion via setCurrentMember(null)');
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
          
          // VÉRIFICATION DE COHÉRENCE: L'ID dans le cache doit correspondre à l'ID sauvegardé
          if (cachedMember.id !== savedMemberId) {
            console.warn('Incohérence détectée: ID cache != ID sauvegardé. Nettoyage...');
            localStorage.removeItem('currentMemberId');
            localStorage.removeItem('currentMemberData');
            sessionStorage.removeItem('currentMemberId');
            sessionStorage.removeItem('currentMemberData');
            // Ne pas charger le cache corrompu, continuer vers le flow normal
          } else {
            // IMPORTANT: utiliser setCurrentMemberState directement pour ne pas déclencher updateCurrentMember
            setCurrentMemberState(cachedMember);
            setMode(cachedMember.is_president ? 'admin' : 'member');
            hasManualLogin.current = true;
            setLoading(false);
            
            // Rafraîchir les données en arrière-plan SANS toucher à la session
            axios.get(`${API}/members`, { timeout: 10000 }).then(response => {
              const membersData = response.data || [];
              setMembers(membersData);
              // Mettre à jour les données du membre si elles ont changé
              // IMPORTANT: Ne pas appeler setCurrentMember ici pour éviter d'écraser la session
              const updatedMember = membersData.find(m => m.id === savedMemberId);
              if (updatedMember) {
                // Mise à jour silencieuse de l'état et du cache sans déclencher la logique de persistance
                setCurrentMemberState(updatedMember);
                // Préserver le stockage existant (localStorage ou sessionStorage)
                if (localStorage.getItem('currentMemberId')) {
                  localStorage.setItem('currentMemberData', JSON.stringify(updatedMember));
                } else if (sessionStorage.getItem('currentMemberId')) {
                  sessionStorage.setItem('currentMemberData', JSON.stringify(updatedMember));
                }
              }
            }).catch(err => console.error('Erreur rafraîchissement membres:', err));
            
            return;
          }
        } catch (e) {
          // Si les données en cache sont corrompues, continuer normalement
          console.error('Cache corrompu, nettoyage...', e);
          localStorage.removeItem('currentMemberData');
          localStorage.removeItem('currentMemberId');
          sessionStorage.removeItem('currentMemberData');
          sessionStorage.removeItem('currentMemberId');
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
    console.log('[AUTH] Déconnexion - nettoyage complet du cache');
    hasManualLogin.current = false;
    // Nettoyage COMPLET de tous les stockages possibles
    localStorage.removeItem('currentMemberId');
    localStorage.removeItem('currentMemberData');
    localStorage.removeItem('rememberedMember');
    sessionStorage.removeItem('currentMemberId');
    sessionStorage.removeItem('currentMemberData');
    // Aussi nettoyer d'éventuelles clés parasites
    localStorage.removeItem('member');
    localStorage.removeItem('user');
    sessionStorage.removeItem('member');
    sessionStorage.removeItem('user');
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
