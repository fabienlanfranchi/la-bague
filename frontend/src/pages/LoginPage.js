import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { LogIn, UserPlus, KeyRound, Mail, Lock, User, Hash } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentMember } = useUser();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('activation');

  // État pour l'activation de compte (Prénom + Nom + Numéro membre)
  const [activationData, setActivationData] = useState({
    nom: '',
    prenom: '',
    numeroMembre: ''
  });

  // État pour la connexion normale (email + mot de passe)
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    stayLoggedIn: false
  });

  // État pour la création de mot de passe (première connexion après activation)
  const [showPasswordCreation, setShowPasswordCreation] = useState(false);
  const [passwordCreationData, setPasswordCreationData] = useState({
    memberId: '',
    memberName: '',
    memberNumero: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // État pour mot de passe oublié
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  // Générer le mot de passe par défaut suggéré
  const getDefaultPassword = (prenom, numero) => {
    const prenomClean = prenom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
    return `${prenomClean}labague${numero}`;
  };

  // Activation du compte (Prénom + Nom + Numéro membre)
  const handleActivation = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/activate`, {
        nom: activationData.nom.trim(),
        prenom: activationData.prenom.trim(),
        numero_membre: parseInt(activationData.numeroMembre)
      });

      const { member, needs_password } = response.data;

      if (needs_password) {
        // Première fois - demander de créer un mot de passe
        const suggestedPassword = getDefaultPassword(activationData.prenom, activationData.numeroMembre);
        setPasswordCreationData({
          memberId: member.id,
          memberName: member.nom_complet,
          memberNumero: activationData.numeroMembre,
          email: member.email || '',
          password: suggestedPassword,
          confirmPassword: suggestedPassword
        });
        setShowPasswordCreation(true);
        toast.info('Compte trouvé ! Créez votre mot de passe.');
      } else {
        // Compte déjà activé
        toast.warning('Ce compte est déjà activé. Connectez-vous avec votre email.');
        setActiveTab('connexion');
      }
    } catch (error) {
      console.error('Erreur activation:', error);
      let message = 'Membre non trouvé. Vérifiez vos informations.';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
        }
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Création du mot de passe (après activation)
  const handlePasswordCreation = async (e) => {
    e.preventDefault();

    if (passwordCreationData.password !== passwordCreationData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordCreationData.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/create-password`, {
        member_id: passwordCreationData.memberId,
        email: passwordCreationData.email,
        password: passwordCreationData.password
      });

      const { member } = response.data;

      // Connecter l'utilisateur
      setCurrentMember(member);

      toast.success('Compte activé avec succès ! Bienvenue !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur création mot de passe:', error);
      let message = 'Erreur lors de la création du mot de passe';
      if (error.response?.data?.detail) {
        message = error.response.data.detail;
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

      // Connecter l'utilisateur (avec ou sans persistence selon "Rester connecté")
      setCurrentMember(member, loginData.stayLoggedIn);

      toast.success(`Bienvenue ${member.nom_complet?.split(' ')[0] || 'membre'} !`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur connexion:', error);
      let message = 'Email ou mot de passe incorrect';
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          message = detail;
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

      if (response.data.demande_creee) {
        toast.success('Votre mot de passe a été réinitialisé. Le président va vous contacter avec votre nouveau mot de passe.');
      } else if (response.data.demande_existante) {
        toast.info('Une demande est déjà en cours. Le président va vous contacter.');
      } else {
        toast.info(response.data.message || 'Si cet email existe, le président sera notifié.');
      }
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error) {
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

        {/* Formulaire de création de mot de passe (après activation) */}
        {showPasswordCreation ? (
          <Card className="bg-[#1a1a1a]/95 border-2 border-[#D4A024]/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-[#D4A024] flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Créer votre mot de passe
              </CardTitle>
              <CardDescription className="text-gray-400">
                Bienvenue <span className="text-white">{passwordCreationData.memberName}</span> !
                <br />Choisissez votre mot de passe pour finaliser l'activation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordCreation} className="space-y-4">
                <div>
                  <Label htmlFor="val-email" className="text-white">Votre email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="val-email"
                      type="email"
                      value={passwordCreationData.email}
                      onChange={(e) => setPasswordCreationData({...passwordCreationData, email: e.target.value})}
                      placeholder="votre@email.com"
                      className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="val-password" className="text-white">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="val-password"
                      type="password"
                      value={passwordCreationData.password}
                      onChange={(e) => setPasswordCreationData({...passwordCreationData, password: e.target.value})}
                      placeholder="Votre mot de passe"
                      className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="val-confirm" className="text-white">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      id="val-confirm"
                      type="password"
                      value={passwordCreationData.confirmPassword}
                      onChange={(e) => setPasswordCreationData({...passwordCreationData, confirmPassword: e.target.value})}
                      placeholder="Confirmer le mot de passe"
                      className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPasswordCreation(false)}
                    className="flex-1 border-gray-600 text-gray-300"
                  >
                    Retour
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold"
                  >
                    {loading ? 'Activation...' : 'Activer mon compte'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Onglets Activation / Connexion */
          <Card className="bg-[#1a1a1a]/95 border-2 border-[#D4A024]/50 backdrop-blur-md">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 bg-black/50">
                <TabsTrigger 
                  value="activation" 
                  className="data-[state=active]:bg-[#D4A024]/20 data-[state=active]:text-[#D4A024]"
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  Activation
                </TabsTrigger>
                <TabsTrigger 
                  value="connexion"
                  className="data-[state=active]:bg-[#D4A024]/20 data-[state=active]:text-[#D4A024]"
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
                    Entrez vos informations pour activer votre compte
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
                      <Label htmlFor="numero" className="text-white">Numéro de membre</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <Input
                          id="numero"
                          type="number"
                          min="1"
                          value={activationData.numeroMembre}
                          onChange={(e) => setActivationData({...activationData, numeroMembre: e.target.value})}
                          placeholder="1"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Numéro fourni par le Président du club
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
                          name="email"
                          type="email"
                          autoComplete="email"
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
                          name="password"
                          type="password"
                          autoComplete="current-password"
                          value={loginData.password}
                          onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                          placeholder="Votre mot de passe"
                          className="pl-10 bg-black/50 border-[#D4A024]/30 text-white"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={loginData.stayLoggedIn}
                            onChange={(e) => setLoginData({...loginData, stayLoggedIn: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-5 h-5 rounded border-2 border-gray-500 bg-black/50 peer-checked:bg-[#D4A024] peer-checked:border-[#D4A024] transition-colors flex items-center justify-center">
                            {loginData.stayLoggedIn && (
                              <svg className="w-3 h-3 text-[#7A2020]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-gray-400 group-hover:text-gray-300">Rester connecté</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-[#D4A024] hover:underline"
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
                  Entrez votre email. Votre mot de passe sera réinitialisé et le président vous contactera.
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
                      <span className="text-[#D4A024] font-semibold">Info :</span> Votre mot de passe sera réinitialisé au format par défaut 
                      <span className="text-white font-mono ml-1">prénomlabagueX</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Le président vous contactera pour vous le communiquer.
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
                      {loading ? 'Envoi...' : 'Réinitialiser'}
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
