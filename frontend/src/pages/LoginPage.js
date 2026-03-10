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
  const { setCurrentMember, setIsAdmin } = useUser();
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
    password: ''
  });

  // État pour la validation du compte (après activation)
  const [showValidation, setShowValidation] = useState(false);
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
        setValidationData({
          ...validationData,
          memberId: member.id
        });
        setShowValidation(true);
        toast.info('Compte trouvé ! Veuillez définir votre email et mot de passe.');
      } else {
        // Compte déjà validé - rediriger vers connexion email
        toast.warning('Ce compte est déjà activé. Connectez-vous avec votre email.');
        setActiveTab('connexion');
      }
    } catch (error) {
      console.error('Erreur activation:', error);
      const message = error.response?.data?.detail || 'Erreur lors de l\'activation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Validation du compte (définir email + mot de passe)
  const handleValidation = async (e) => {
    e.preventDefault();

    if (validationData.password !== validationData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (validationData.password.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/validate-account`, {
        member_id: validationData.memberId,
        email: validationData.email,
        password: validationData.password
      });

      const { member } = response.data;

      // Connecter l'utilisateur
      setCurrentMember(member);
      setIsAdmin(member.numero_membre === 1); // Fabien = admin

      toast.success('Compte activé avec succès ! Bienvenue !');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur validation:', error);
      const message = error.response?.data?.detail || 'Erreur lors de la validation';
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

      setCurrentMember(member);
      setIsAdmin(member.numero_membre === 1);

      toast.success(`Bienvenue ${member.prenom} !`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur connexion:', error);
      const message = error.response?.data?.detail || 'Email ou mot de passe incorrect';
      toast.error(message);
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

                <div>
                  <Label htmlFor="val-password" className="text-white">Mot de passe *</Label>
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
      </div>
    </div>
  );
};

export default LoginPage;
