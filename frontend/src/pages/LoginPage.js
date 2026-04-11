import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LogIn, KeyRound, Eye, EyeOff, Fingerprint, Smartphone, Loader2 } from 'lucide-react';
import axios from 'axios';
import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Clé pour stocker le device token en localStorage
const DEVICE_TOKEN_KEY = 'labague_device_token';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentMember, currentMember } = useUser();
  const [loading, setLoading] = useState(true);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // État pour la clé d'activation
  const [cleActivation, setCleActivation] = useState('');
  const [keyLoading, setKeyLoading] = useState(false);

  // Vérifier si déjà connecté
  useEffect(() => {
    if (currentMember) {
      sessionStorage.setItem('appSessionActive', 'true');
      navigate('/dashboard');
    }
  }, [currentMember, navigate]);

  // Au chargement, vérifier si l'appareil est reconnu
  useEffect(() => {
    const checkDeviceToken = async () => {
      setWebAuthnSupported(browserSupportsWebAuthn());
      
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      
      if (deviceToken) {
        try {
          // Essayer la connexion automatique par device token
          const response = await axios.post(`${API_URL}/api/auth/device-login`, {
            device_token: deviceToken
          });
          
          if (response.data.success) {
            setCurrentMember(response.data.member, true);
            toast.success(`Bienvenue ${response.data.member.nom_complet?.split(' ')[0] || 'membre'} !`);
            navigate('/dashboard');
            return;
          }
        } catch (error) {
          // Token invalide, le supprimer
          localStorage.removeItem(DEVICE_TOKEN_KEY);
          console.log('Appareil non reconnu, afficher le formulaire');
        }
      }
      
      // Si pas de token ou token invalide, afficher le formulaire
      setLoading(false);
      setShowKeyForm(true);
    };
    
    checkDeviceToken();
  }, [navigate, setCurrentMember]);

  // Connexion par Face ID / Touch ID
  const handleFaceIdLogin = async () => {
    if (!webAuthnSupported) {
      toast.error('Face ID / Touch ID non supporté sur cet appareil');
      return;
    }

    setFaceIdLoading(true);
    try {
      // 1. Récupérer les options d'authentification
      const optionsResponse = await axios.post(`${API_URL}/api/webauthn/authenticate/options`, {});
      
      if (!optionsResponse.data.success) {
        throw new Error('Impossible de démarrer l\'authentification');
      }

      // 2. Lancer l'authentification biométrique
      const options = JSON.parse(optionsResponse.data.options);
      const assertion = await startAuthentication({ optionsJSON: options });

      // 3. Vérifier avec le serveur
      const verifyResponse = await axios.post(`${API_URL}/api/webauthn/authenticate/verify`, {
        credential: assertion
      });

      if (verifyResponse.data.success) {
        const member = verifyResponse.data.member;
        setCurrentMember(member, true);
        toast.success(`Bienvenue ${member.prenom || member.nom_complet} !`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur Face ID:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Authentification annulée');
      } else if (error.name === 'InvalidStateError') {
        toast.error('Aucun passkey enregistré. Connectez-vous d\'abord avec votre clé.');
      } else {
        toast.error('Erreur Face ID. Utilisez votre clé d\'activation.');
      }
    } finally {
      setFaceIdLoading(false);
    }
  };

  // Connexion par clé d'activation (prenomlabagueX)
  const handleKeyLogin = async (e) => {
    e.preventDefault();
    
    if (!cleActivation.trim()) {
      toast.error('Entrez votre clé d\'activation');
      return;
    }
    
    setKeyLoading(true);
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/key-login`, {
        cle_activation: cleActivation.trim()
      });
      
      if (response.data.success) {
        // Stocker le device token pour les connexions futures
        if (response.data.device_token) {
          localStorage.setItem(DEVICE_TOKEN_KEY, response.data.device_token);
        }
        
        setCurrentMember(response.data.member, true);
        toast.success(`Bienvenue ${response.data.member.nom_complet?.split(' ')[0] || 'membre'} ! Votre appareil est maintenant mémorisé.`);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      let message = 'Clé d\'activation incorrecte';
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }
      toast.error(message);
    } finally {
      setKeyLoading(false);
    }
  };

  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2a1a1a] to-[#1a1a1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-black/60 backdrop-blur-sm border-[#D4A024]/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-[#D4A024] animate-spin mb-4" />
            <p className="text-white font-serif">Connexion en cours...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] via-[#2a1a1a] to-[#1a1a1a] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/60 backdrop-blur-sm border-[#D4A024]/30">
        <CardHeader className="text-center space-y-4 pb-2">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center">
              <span className="text-4xl font-serif text-white">LBI</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-serif text-[#D4A024]">
            La Bague Impériale
          </CardTitle>
          <CardDescription className="text-gray-400 font-serif">
            Club de cigares depuis 2013
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Option 1: Entrée directe (appareil reconnu) */}
          <Button
            onClick={async () => {
              const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
              if (!deviceToken) {
                toast.error('Appareil non reconnu. Utilisez votre clé ou Face ID.');
                return;
              }
              setKeyLoading(true);
              try {
                const response = await axios.post(`${API_URL}/api/auth/device-login`, {
                  device_token: deviceToken
                });
                if (response.data.success) {
                  setCurrentMember(response.data.member, true);
                  toast.success(`Bienvenue ${response.data.member.nom_complet?.split(' ')[0]} !`);
                  navigate('/dashboard');
                }
              } catch (error) {
                localStorage.removeItem(DEVICE_TOKEN_KEY);
                toast.error('Appareil non reconnu. Utilisez votre clé.');
              } finally {
                setKeyLoading(false);
              }
            }}
            disabled={keyLoading}
            className="w-full h-14 bg-gradient-to-r from-[#D4A024] to-[#B8941D] hover:from-[#C8941D] hover:to-[#A8840D] text-[#7A2020] font-serif font-bold text-lg"
            data-testid="direct-entry-btn"
          >
            {keyLoading ? (
              <Loader2 className="w-6 h-6 mr-3 animate-spin" />
            ) : (
              <LogIn className="w-6 h-6 mr-3" />
            )}
            Entrée directe
          </Button>

          {/* Séparateur */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#D4A024]/30" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-black/60 px-4 text-gray-500 font-serif">ou</span>
            </div>
          </div>

          {/* Option 2: Face ID / Touch ID - Si supporté */}
          {webAuthnSupported && (
            <>
              <Button
                onClick={handleFaceIdLogin}
                disabled={faceIdLoading}
                className="w-full h-14 bg-gradient-to-r from-[#7A2020] to-[#5A1515] hover:from-[#8A3030] hover:to-[#6A2020] text-white font-serif text-lg"
                data-testid="faceid-btn"
              >
                {faceIdLoading ? (
                  <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                ) : (
                  <Fingerprint className="w-6 h-6 mr-3" />
                )}
                {faceIdLoading ? 'Authentification...' : 'Face ID / Touch ID'}
              </Button>

              {/* Séparateur */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#D4A024]/30" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-black/60 px-4 text-gray-500 font-serif">ou</span>
                </div>
              </div>
            </>
          )}

          {/* Option 3: Clé d'activation */}
          <form onSubmit={handleKeyLogin} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cle" className="text-[#D4A024] font-serif flex items-center">
                <KeyRound className="w-4 h-4 mr-2" />
                Clé d'activation
              </Label>
              <div className="relative">
                <Input
                  id="cle"
                  type={showPassword ? 'text' : 'password'}
                  value={cleActivation}
                  onChange={(e) => setCleActivation(e.target.value)}
                  placeholder="labague1"
                  className="bg-black/60 border-[#D4A024]/30 text-white pr-10 h-12 text-lg"
                  autoComplete="current-password"
                  data-testid="cle-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={keyLoading || !cleActivation.trim()}
              variant="outline"
              className="w-full h-12 border-[#D4A024] text-[#D4A024] hover:bg-[#D4A024]/10 font-serif font-bold text-lg"
              data-testid="login-btn"
            >
              {keyLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-5 h-5 mr-2" />
              )}
              Valider
            </Button>
          </form>

          {/* Consigne en dessous */}
          <div className="bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg p-4 mt-4">
            <div className="text-sm text-gray-300 font-serif space-y-2">
              <p><span className="text-[#D4A024] font-medium">• Entrée directe :</span> Si votre téléphone est déjà mémorisé</p>
              <p><span className="text-[#D4A024] font-medium">• Face ID :</span> Si vous l'avez activé</p>
              <p><span className="text-[#D4A024] font-medium">• Clé d'activation :</span> 1ère fois ou nouveau téléphone</p>
              <p className="text-gray-500 text-xs pt-2">Clé = "labague" + votre n° de membre (ex: labague1, labague25)</p>
            </div>
          </div>

          {/* Clé oubliée */}
          <div className="text-center pt-2">
            <p className="text-sm text-gray-500 font-serif">
              Clé oubliée ? Contactez le président.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
