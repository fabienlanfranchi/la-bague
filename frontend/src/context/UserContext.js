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
  const [mode, setMode] = useState('member'); // Par défaut: mode membre (plus sécurisé)
  
  // Données du membre actuellement connecté - restaurer immédiatement depuis le cache
  const getInitialMember = () => {
    try {
      // VERSION DU CACHE - Incrémenter pour forcer le nettoyage chez tous les utilisateurs
      const CACHE_VERSION = '2.0';
      const cachedVersion = localStorage.getItem('cacheVersion');
      
      // Si version différente, NETTOYER TOUT le cache
      if (cachedVersion !== CACHE_VERSION) {
        console.log('[AUTH] Nouvelle version détectée, nettoyage du cache...');
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('cacheVersion', CACHE_VERSION);
        return null;
      }
      
      const savedId = localStorage.getItem('currentMemberId') || sessionStorage.getItem('currentMemberId');
      const savedData = localStorage.getItem('currentMemberData') || sessionStorage.getItem('currentMemberData');
      if (savedData && savedId) {
        const parsed = JSON.parse(savedData);
        // VÉRIFICATION: L'ID dans les données doit correspondre à l'ID sauvegardé
        if (parsed.id === savedId) {
          return parsed;
        } else {
          // Incohérence - ne pas charger
          console.warn('[AUTH] Incohérence initiale détectée, nettoyage');
          localStorage.removeItem('currentMemberId');
          localStorage.removeItem('currentMemberData');
          sessionStorage.removeItem('currentMemberId');
          sessionStorage.removeItem('currentMemberData');
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
      
      // Petit délai pour laisser un login en cours se terminer
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Revérifier si un login a eu lieu pendant le délai
      if (hasManualLogin.current) {
        console.log('[AUTH] Login récent détecté, skip du chargement cache');
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
            console.warn('[AUTH] Incohérence détectée: ID cache != ID sauvegardé. Nettoyage...');
            localStorage.removeItem('currentMemberId');
            localStorage.removeItem('currentMemberData');
            sessionStorage.removeItem('currentMemberId');
            sessionStorage.removeItem('currentMemberData');
            // Ne pas charger le cache corrompu, continuer vers le flow normal
          } else {
            // NE PAS utiliser le cache pour l'affichage initial
            // TOUJOURS valider avec le serveur d'abord pour des raisons de sécurité
            hasManualLogin.current = true;
            
            // Rafraîchir les données depuis le serveur ET valider les droits
            axios.get(`${API}/members`, { timeout: 10000 }).then(response => {
              const membersData = response.data || [];
              setMembers(membersData);
              
              // Trouver le membre correspondant à l'ID sauvegardé
              const serverMember = membersData.find(m => m.id === savedMemberId);
              
              if (serverMember) {
                console.log('[AUTH] Membre validé depuis serveur:', serverMember.nom_complet, 'is_president:', serverMember.is_president);
                // Utiliser les données du SERVEUR (pas du cache) pour les droits
                setCurrentMemberState(serverMember);
                setMode(serverMember.is_president ? 'admin' : 'member');
                // Mettre à jour le cache avec les données du serveur
                if (localStorage.getItem('currentMemberId')) {
                  localStorage.setItem('currentMemberData', JSON.stringify(serverMember));
                } else if (sessionStorage.getItem('currentMemberId')) {
                  sessionStorage.setItem('currentMemberData', JSON.stringify(serverMember));
                }
              } else {
                // Le membre n'existe plus - déconnexion
                console.warn('[AUTH] Membre non trouvé sur le serveur, déconnexion');
                localStorage.removeItem('currentMemberId');
                localStorage.removeItem('currentMemberData');
                sessionStorage.removeItem('currentMemberId');
                sessionStorage.removeItem('currentMemberData');
                setCurrentMemberState(null);
              }
              setLoading(false);
            }).catch(err => {
              console.error('Erreur rafraîchissement membres:', err);
              // En cas d'erreur réseau, utiliser le cache mais avec les droits du cache
              // (moins sécurisé mais permet de fonctionner hors ligne)
              setCurrentMemberState(cachedMember);
              setMode(cachedMember.is_president ? 'admin' : 'member');
              setLoading(false);
            });
            
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
    setMode('member'); // Revenir au mode membre après déconnexion
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
