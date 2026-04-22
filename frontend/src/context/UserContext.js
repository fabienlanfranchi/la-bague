import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Envoyer le cookie JWT httpOnly sur toutes les requêtes API
axios.defaults.withCredentials = true;

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
  const [loading, setLoading] = useState(true); // Toujours valider côté serveur au démarrage
  const [error, setError] = useState(null);
  
  // Ref pour savoir si un login manuel a eu lieu
  const hasManualLogin = useRef(false);

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

  // Charger les membres au démarrage + valider l'identité via /auth/me (JWT serveur-autoritaire)
  useEffect(() => {
    const purgeAll = () => {
      try {
        localStorage.removeItem('currentMemberId');
        localStorage.removeItem('currentMemberData');
        localStorage.removeItem('labague_device_token');
        sessionStorage.removeItem('currentMemberId');
        sessionStorage.removeItem('currentMemberData');
        sessionStorage.removeItem('appSessionActive');
      } catch (e) { /* ignore */ }
    };

    const loadAuth = async () => {
      // Si un login manuel en cours, ne pas interférer
      if (hasManualLogin.current) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1) VÉRITÉ SERVEUR : /auth/me via cookie JWT httpOnly
      let authoritativeMember = null;
      try {
        const meRes = await axios.get(`${API}/auth/me`, { timeout: 8000 });
        if (meRes.data?.success && meRes.data.member) {
          authoritativeMember = meRes.data.member;
        }
      } catch (_) {
        // Pas de session JWT valide → on purgera
      }

      // 2) Charger la liste des membres (pour le mode admin, etc.)
      let membersData = [];
      try {
        const listRes = await axios.get(`${API}/members`, { timeout: 10000 });
        membersData = listRes.data || [];
        setMembers(membersData);
      } catch (err) {
        console.error('Erreur chargement liste membres:', err);
        setError('Impossible de se connecter au serveur. Veuillez réessayer.');
      }

      if (authoritativeMember) {
        // Le serveur confirme une identité. Prendre la version fraîche de la liste si disponible.
        const fresh = membersData.find(m => m.id === authoritativeMember.id) || authoritativeMember;

        // Réconcilier le cache local avec la vérité serveur
        const cachedId = localStorage.getItem('currentMemberId') || sessionStorage.getItem('currentMemberId');
        if (cachedId && cachedId !== fresh.id) {
          console.warn('[AUTH] Incohérence détectée - cache=%s, serveur=%s. Purge.', cachedId, fresh.id);
          purgeAll();
        }
        localStorage.setItem('currentMemberId', fresh.id);
        localStorage.setItem('currentMemberData', JSON.stringify(fresh));
        setCurrentMemberState(fresh);
        setMode(fresh.is_president ? 'admin' : 'member');
        hasManualLogin.current = true;
      } else {
        // Pas d'identité confirmée par le serveur → purger le cache et forcer login
        const hadCache = localStorage.getItem('currentMemberId') || sessionStorage.getItem('currentMemberId');
        if (hadCache) {
          console.warn('[AUTH] Pas de session JWT valide, purge du cache obsolète.');
          purgeAll();
        }
        setCurrentMemberState(null);
      }
      setLoading(false);
    };

    loadAuth();
  }, []);

  const toggleMode = () => {
    setMode(prevMode => prevMode === 'admin' ? 'member' : 'admin');
  };

  // Fonction de déconnexion
  const logout = useCallback(async () => {
    console.log('[AUTH] Déconnexion - nettoyage complet du cache');
    hasManualLogin.current = false;
    sessionStorage.removeItem('appSessionActive');
    
    // Supprimer le device token côté serveur
    const deviceToken = localStorage.getItem('labague_device_token');
    if (deviceToken) {
      try {
        await axios.post(`${API_URL}/api/auth/remove-device`, { device_token: deviceToken });
      } catch (e) {
        console.log('Erreur suppression device token:', e);
      }
    }

    // Effacer le cookie JWT côté serveur (source de vérité)
    try {
      await axios.post(`${API}/auth/logout-jwt`);
    } catch (e) {
      console.log('Erreur logout JWT:', e);
    }
    
    // Nettoyage COMPLET de tous les stockages possibles
    localStorage.removeItem('currentMemberId');
    localStorage.removeItem('currentMemberData');
    localStorage.removeItem('rememberedMember');
    localStorage.removeItem('labague_device_token'); // Device token
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
