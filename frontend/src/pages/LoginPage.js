import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentMember } = useUser();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('activation');

  // État pour l'activation de compte (première connexion)
  const [activationData, setActivationData] = useState({
    nom: '',
    prenom: '',
    code: '' // labagueimperialeXX
  });

  // État pour la connexion normale (email + mot de passe)
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    stayLoggedIn: false
  });

  // État pour la validation du compte (après activation)
  const [showValidation, setShowValidation] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [useTempPassword, setUseTempPassword] = useState(false); // Garder le code temporaire comme MDP
  const [validationData, setValidationData] = useState({
    memberId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Activation du compte (première connexion)
  const handleActivation = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        nom: activationData.nom.trim(),
        prenom: activationData.prenom.trim(),
        temporary_password: activationData.code.trim().toLowerCase()
      });

      const { member, needs_validation } = response.data;

      if (needs_validation) {
        // Compte pas encore validé - afficher le formulaire de validation
        // Pré-remplir le mot de passe avec la clé d'activation (suggéré)
        const codeActivation = activationData.code.trim().toLowerCase();
        setValidationData({
          ...validationData,
          memberId: member.id,
          password: codeActivation,         // Pré-remplir avec la clé
          confirmPassword: codeActivation   // Pré-remplir avec la clé
        });
        setShowValidation(true);
        toast.info('Compte trouvé ! Confirmez votre email et mot de passe.');
      } else {
        // Compte déjà validé - rediriger vers connexion email
        toast.warning('Ce compte est déjà activé. Connectez-vous avec votre email.');
        setActiveTab('connexion');
      }
    } catch (error) {
      console.error('Erreur activation:', error);
      let message = 'Erreur lors de l\'activation';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        // Si c'est un objet (erreur Pydantic), extraire le message
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map(e => e.msg || e).join(', ');
        } else if (detail.msg) {
          message = detail.msg;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Validation du compte (définir email + mot de passe)
  const handleValidation = async (e) => {
    e.preventDefault();

    // Si on utilise le code temporaire, pas besoin de vérifier les mots de passe
    if (!useTempPassword) {
      if (validationData.password !== validationData.confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        return;
      }

      if (validationData.password.length < 4) {
        toast.error('Le mot de passe doit contenir au moins 4 caractères');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/validate-account`, {
        member_id: validationData.memberId,
        email: validationData.email,
        password: useTempPassword ? 'temp' : validationData.password,
        confirm_password: useTempPassword ? 'temp' : validationData.confirmPassword,
        use_temp_password: useTempPassword
      });

      const { member } = response.data;

      // Connecter l'utilisateur (le mode est automatiquement défini par setCurrentMember)
      setCurrentMember(member);

      toast.success('Compte activé avec succès ! Bienvenue !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur validation:', error);
      let message = 'Erreur lors de la validation';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map(e => e.msg || e).join(', ');
        } else if (detail.msg) {
          message = detail.msg;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Connexion normale (email + mot de passe)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: loginData.email,
        password: loginData.password
      });

      const { member } = response.data;

      // Connecter l'utilisateur (le mode est automatiquement défini par setCurrentMember)
      setCurrentMember(member);

      // Si "rester connecté", stocker en localStorage
      if (loginData.stayLoggedIn) {
        localStorage.setItem('rememberedMember', JSON.stringify({
          id: member.id,
          email: loginData.email
        }));
      }

      toast.success(`Bienvenue ${member.prenom} !`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur connexion:', error);
      let message = 'Email ou mot de passe incorrect';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail.map(e => e.msg || e).join(', ');
        } else if (detail.msg) {
          message = detail.msg;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Mot de passe oublié
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        email: forgotPasswordEmail
      });

      // Nouveau message: demande envoyée au président
      if (response.data.demande_creee) {
        toast.success('Votre demande a été envoyée au président. Il vous contactera rapidement avec votre mot de passe.');
      } else if (response.data.demande_existante) {
        toast.info('Une demande est déjà en cours. Le président va vous contacter.');
      } else {
        toast.info(response.data.message || 'Si cet email existe, le président sera notifié.');
      }
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error) {
      // On affiche un message générique pour ne pas révéler si l'email existe
      toast.info('Si cet email existe dans notre base, le président sera notifié.');
      setShowForgotPassword(false);
    } finally {
      setLoading(false);
    }
  };

  // Sélectionner une photo aléatoire
  const randomCigar = Math.floor(Math.random() * 10) + 1;

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center px-4 py-8"
      style={{
        backgroundImage: `url(/assets/cigars/cigar-${randomCigar}.jpg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />

      {/* Contenu */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/assets/logos/logo-principal-transparent.png"
            alt="La Bague Impériale"
            className="w-48 mx-auto mb-4 filter drop-shadow-2xl"
          />
          <h1 className="text-2xl font-serif font-bold text-[#D4A024]">
            LA BAGUE IMPÉRIALE
          </h1>
          <p className="text-gray-400 text-sm">Club Cigare - Espace Membres</p>
        </div>

        {/* Formulaire de validation (après activation) */}
        {showValidation ? (
          <Card className="bg-[#1a1a1a]/95 border-2 border-[#D4A024]/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Finaliser l'activation
              </CardTitle>
              <CardDescription className="text-gray-400">
                Définissez votre email et mot de passe pour sécuriser votre compte
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleValidation} className="space-y-4">
                <div>
                  <Label htmlFor="val-email" className="text-white">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="val-email"
                      type="email"
                      value={validationData.email}
                      onChange={(e) => setValidationData({...validationData, email: e.target.value})}
                      placeholder="votre@email.com"
                      className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                      required
                    />
                  </div>
                </div>

                {/* Option: Garder le code temporaire comme mot de passe */}
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTempPassword}
                      onChange={(e) => setUseTempPassword(e.target.checked)}
                      className="w-4 h-4 mr-3 accent-[#D4A024]"
                    />
                    <span className="text-white text-sm">
                      Garder mon code d'activation comme mot de passe
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 mt-2 ml-7">
                    Votre code <span className="text-[#D4A024] font-mono">labagueimperialeXX</span> deviendra votre mot de passe.
                  </p>
                </div>

                {!useTempPassword && (
                  <>
                    <div>
                      <Label htmlFor="val-password" className="text-white">Nouveau mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="val-password"
                          type="password"
                          value={validationData.password}
                          onChange={(e) => setValidationData({...validationData, password: e.target.value})}
                          placeholder="Minimum 4 caractères"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="val-confirm" className="text-white">Confirmer le mot de passe *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="val-confirm"
                          type="password"
                          value={validationData.confirmPassword}
                          onChange={(e) => setValidationData({...validationData, confirmPassword: e.target.value})}
                          placeholder="Confirmez votre mot de passe"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Conseil mot de passe */}
                    <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                      <p className="text-sm text-gray-300">
                        <span className="text-green-400 font-semibold">💡 Recommandé :</span> Gardez votre <span className="text-white font-mono">clé d'activation</span> comme mot de passe
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Elle est déjà pré-remplie ci-dessus. En cas d'oubli, elle sera facilement récupérable.
                      </p>
                    </div>
                  </>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold font-serif"
                >
                  {loading ? 'Activation...' : 'Activer mon compte'}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowValidation(false)}
                  className="w-full text-gray-400 hover:text-white"
                >
                  Retour
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Tabs Activation / Connexion */
          <Card className="bg-[#1a1a1a]/95 border-2 border-[#D4A024]/50 backdrop-blur-md">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-black/50">
                <TabsTrigger 
                  value="activation" 
                  className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Activation
                </TabsTrigger>
                <TabsTrigger 
                  value="connexion"
                  className="data-[state=active]:bg-[#D4A024] data-[state=active]:text-[#7A2020]"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Connexion
                </TabsTrigger>
              </TabsList>

              {/* Onglet Activation */}
              <TabsContent value="activation">
                <CardHeader>
                  <CardTitle className="text-lg font-serif text-[#D4A024]">
                    Première connexion
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Entrez vos informations et le code reçu du Président
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleActivation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="prenom" className="text-white">Prénom</Label>
                        <Input
                          id="prenom"
                          value={activationData.prenom}
                          onChange={(e) => setActivationData({...activationData, prenom: e.target.value})}
                          placeholder="Jean"
                          className="bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="nom" className="text-white">Nom</Label>
                        <Input
                          id="nom"
                          value={activationData.nom}
                          onChange={(e) => setActivationData({...activationData, nom: e.target.value})}
                          placeholder="Dupont"
                          className="bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="code" className="text-white">Code d'activation</Label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="code"
                          value={activationData.code}
                          onChange={(e) => setActivationData({...activationData, code: e.target.value})}
                          placeholder="labagueimperialeXX"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Code fourni par le Président du club
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold font-serif"
                    >
                      {loading ? 'Vérification...' : 'Activer mon compte'}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>

              {/* Onglet Connexion */}
              <TabsContent value="connexion">
                <CardHeader>
                  <CardTitle className="text-lg font-serif text-[#D4A024]">
                    Connexion
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Connectez-vous avec votre email et mot de passe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-white">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={loginData.email}
                          onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                          placeholder="votre@email.com"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="password" className="text-white">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="password"
                          type="password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          placeholder="Votre mot de passe"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    {/* Rester connecté */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={loginData.stayLoggedIn}
                          onChange={(e) => setLoginData({...loginData, stayLoggedIn: e.target.checked})}
                          className="w-4 h-4 accent-[#D4A024] rounded"
                        />
                        <span className="text-gray-300 text-sm">Rester connecté</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[#D4A024] text-sm hover:underline"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold font-serif"
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        )}

        {/* Lien mode développement */}
        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-300 text-sm underline"
          >
            Mode développement (accès libre)
          </button>
        </div>

        {/* Modal Mot de passe oublié */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#1a1a1a] border-2 border-[#D4A024]/50 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                  <KeyRound className="w-5 h-5 mr-2" />
                  Mot de passe oublié
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Entrez votre email pour recevoir vos identifiants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <Label htmlFor="forgot-email" className="text-white">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="bg-[#D4A024]/10 border border-[#D4A024]/30 rounded-lg p-3">
                    <p className="text-sm text-gray-300">
                      <span className="text-[#D4A024] font-semibold">Rappel :</span> Votre mot de passe par défaut est votre <span className="text-white font-mono">prénom + numéro de membre</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Exemple : fabien1, jacques3, nini4...
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForgotPassword(false)}
                      className="flex-1 border-gray-600 text-gray-300"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold"
                    >
                      {loading ? 'Envoi...' : 'Récupérer'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
