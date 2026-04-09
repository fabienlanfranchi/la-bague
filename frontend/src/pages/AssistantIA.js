import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  User, 
  Bot, 
  RefreshCw,
  Loader2,
  BookOpen,
  Heart,
  GlassWater,
  Award,
  ChevronRight,
  GraduationCap,
  Target,
  Gift
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AssistantIA = () => {
  const { currentMember, isAdmin } = useUser();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showGuideSommaire, setShowGuideSommaire] = useState(false);
  const [showCigarChoice, setShowCigarChoice] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasInitializedFromGuide = useRef(false);

  // ID utilisateur pour l'API - différencie le MODE Président du MODE Membre
  const getUserId = () => {
    if (!currentMember) return 'default-user';
    // IMPORTANT: Utiliser isAdmin (mode actif) ET vérifier si c'est le Président
    // Si l'utilisateur est en MODE Président (isAdmin=true) ET qu'il est le Président du club
    // -> Ajouter _president pour que Winston l'appelle "Président"
    // Sinon (mode Membre) -> Juste l'ID pour que Winston l'appelle par son prénom
    const isPresident = currentMember.fonction?.toLowerCase() === 'président' || 
                        currentMember.is_president === true;
    if (isAdmin && isPresident) {
      return `${currentMember.id}_president`;
    }
    return currentMember.id;
  };
  
  const userId = getUserId();

  // Sommaire du guide pour le menu contextuel
  const guideSommaire = [
    { numero: 1, titre: "Bases, structure, vocabulaire fondamental et histoire" },
    { numero: 2, titre: "Choisir un cigare en pratique" },
    { numero: 3, titre: "Lexique utile du cigare" },
    { numero: 4, titre: "Parler cigare correctement" },
    { numero: 5, titre: "Les grandes marques et leur réputation" },
    { numero: 6, titre: "Les pays du cigare et leurs terroirs" },
    { numero: 7, titre: "Fabrication du cigare" },
    { numero: 8, titre: "Les modules et origine de leurs noms" },
    { numero: 9, titre: "Défauts du cigare, causes et corrections" },
    { numero: 10, titre: "Les accessoires" },
    { numero: 11, titre: "Parcours cigare : débutant, amateur, confirmé, expert" }
  ];

  // Capacités de Winston
  const winstonCapabilities = [
    { icon: GraduationCap, text: "Discuter selon votre niveau", description: "Débutant ? Amateur ? Confirmé ? Expert ? Je m'adapte !" },
    { icon: BookOpen, text: "Guide du Cigare", description: "Expert en terroirs, formats, marques et dégustation" },
    { icon: Heart, text: "Recommandations personnalisées", description: "Basées sur vos goûts, ceux de chaque membre" },
    { icon: GlassWater, text: "Conseil & Association", description: "Quel accord ? Quel moment ? Vais-je aimer ce cigare ?" },
    { icon: Award, text: "Certifié Bague Specialist", description: "Connaissance approfondie des 35 membres et du Club" },
  ];

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger l'historique au démarrage
  useEffect(() => {
    loadChatHistory();
  }, [userId]);

  // Réinitialiser la session quand on change de mode (Membre <-> Président)
  useEffect(() => {
    const resetOnModeChange = async () => {
      if (currentMember) {
        const newUserId = getUserId();
        try {
          await axios.post(`${API}/assistant/reset?user_id=${newUserId}`);
          setMessages([]);
        } catch (error) {
          console.error('Erreur reset session Winston:', error);
        }
      }
    };
    resetOnModeChange();
  }, [isAdmin]);

  // Gérer l'arrivée depuis le guide "Tout sur le cigare"
  useEffect(() => {
    if (location.state?.fromGuide && !hasInitializedFromGuide.current) {
      hasInitializedFromGuide.current = true;
      setShowGuideSommaire(true);
      
      // Ajouter le message de Winston proposant les parties
      const prenom = currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre';
      const guideWelcome = {
        role: 'assistant',
        content: `${prenom}, je vois que vous consultez le guide "Tout sur le cigare" ! 📚\n\nQuelle partie souhaitez-vous approfondir ensemble ?\n\nCliquez sur l'une des parties ci-dessus ou posez-moi directement votre question !`,
        timestamp: new Date().toISOString()
      };
      
      // Ajouter après un court délai pour s'assurer que l'historique est chargé
      setTimeout(() => {
        setMessages(prev => [...prev, guideWelcome]);
      }, 500);
    }
  }, [location.state, currentMember]);

  // Demander une partie du guide
  const askForPartie = (numero, titre) => {
    setShowGuideSommaire(false);
    sendMessage(`Parle-moi de la Partie ${numero} : ${titre}`);
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API}/assistant/history/${userId}`);
      if (response.data && response.data.length > 0) {
        setMessages(response.data.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp
        })));
      } else {
        // Message de bienvenue personnalisé si pas d'historique
        const isPresident = currentMember?.fonction?.toLowerCase() === 'président' || 
                           currentMember?.is_president === true;
        const appellation = isPresident 
          ? 'Monsieur le Président' 
          : (currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre');
        
        setMessages([{
          role: 'assistant',
          content: `Bonjour ${appellation} ! 🎩\n\nJe suis **Winston**, votre concierge personnel et assistant certifié du club **La Bague Impériale**.\n\nJe possède deux certifications :\n• **Bague Specialist** — Je connais parfaitement les 35 membres du club, vos goûts, vos préférences et tout l'historique du club.\n• **Conca Specialist** — Je maîtrise la Carte du Bar pour vous conseiller les meilleurs accords cigare & alcool.\n\n**Comment puis-je vous aider ?**\n\n🎯 **Choix de cigare** — Je vous guide vers LE cigare adapté à votre moment\n📚 **Guide du Cigare** — Terroirs, formats, marques, vocabulaire...\n🥃 **Accords** — Quel whisky, rhum ou cognac avec votre cigare ?\n👥 **Le Club** — Statistiques, préférences des membres, événements\n\nCliquez sur un bouton ci-dessous ou posez-moi directement votre question !`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // Lancer le flow "Choix de cigare"
  const startCigarChoice = () => {
    const isPresident = currentMember?.fonction?.toLowerCase() === 'président' || 
                       currentMember?.is_president === true;
    const appellation = isPresident 
      ? 'Président' 
      : (currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre');
    
    const choixMessage = {
      role: 'assistant',
      content: `${appellation}, je vais vous aider à choisir le cigare parfait pour votre situation ! 🎯\n\n**Première question : Quel est votre profil de fumeur ?**\n\n1️⃣ **Débutant** — Je découvre le cigare\n2️⃣ **Amateur** — J'ai déjà quelques repères\n3️⃣ **Confirmé** — Je maîtrise bien mon sujet\n4️⃣ **Expert** — Grande expérience du cigare\n\nRépondez par le numéro ou le mot (ex: "débutant" ou "1")`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, choixMessage]);
    setShowCigarChoice(true);
  };

  // Lancer le flow "Conseil cadeau"
  const startGiftAdvice = () => {
    const cadeauMessage = {
      role: 'assistant',
      content: `Vous souhaitez offrir un cigare ? Excellente idée ! 🎁\n\n**Parlons d'abord de la personne qui va le recevoir :**\n\n1️⃣ Quel est son **niveau** ? (Débutant, Amateur, Confirmé, Expert)\n2️⃣ Dans quelle **situation** va-t-il/elle le fumer ? (Apéro, Digestif, Journée détente...)\n3️⃣ A-t-il/elle des **préférences** connues ? (Cubain, Non-cubain, Puissant, Léger...)\n\nDites-moi ce que vous savez sur cette personne !`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, cadeauMessage]);
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Sauvegarder le message utilisateur
      await axios.post(`${API}/assistant/save-message?user_id=${userId}&role=user&content=${encodeURIComponent(messageText.trim())}`);

      // Envoyer au backend
      const response = await axios.post(`${API}/assistant/chat`, {
        message: messageText.trim(),
        user_id: userId
      });

      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Sauvegarder la réponse
      await axios.post(`${API}/assistant/save-message?user_id=${userId}&role=assistant&content=${encodeURIComponent(response.data.response)}`);

    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast.error('Erreur de communication avec l\'assistant');
      
      const errorMessage = {
        role: 'assistant',
        content: "Désolé, j'ai rencontré un problème. Peux-tu réessayer ?",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = async () => {
    if (!window.confirm('Réinitialiser la conversation avec Winston ?')) return;
    
    const prenom = currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre';
    
    try {
      await axios.post(`${API}/assistant/reset?user_id=${userId}`);
      setMessages([{
        role: 'assistant',
        content: `Nouvelle conversation ! Comment puis-je vous aider, ${prenom} ?`,
        timestamp: new Date().toISOString()
      }]);
      toast.success('Conversation réinitialisée');
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
    sendMessage(question);
  };

  // Formater le contenu du message (gérer les retours à la ligne)
  const formatMessageContent = (content) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header - plus compact sur mobile */}
      <div className="text-center md:text-left mb-2 md:mb-4">
        <h1 className="text-2xl md:text-5xl font-serif font-bold text-white mb-0 md:mb-2">
          Winston
        </h1>
        <p className="text-[#D4A024] text-sm md:text-lg font-serif">
          Concierge & Assistant IA
        </p>
      </div>

      {/* Capacités de Winston - Carrousel horizontal sur mobile, grille sur desktop */}
      {messages.length <= 1 && (
        <>
          {/* Version mobile - carrousel horizontal compact */}
          <div className="md:hidden mb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2 px-1" style={{ width: 'max-content' }}>
              {winstonCapabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-2 bg-black/40 border border-[#D4A024]/20 rounded-full px-3 py-1.5 whitespace-nowrap">
                  <cap.icon className="w-4 h-4 text-[#D4A024] shrink-0" />
                  <span className="text-white text-xs font-medium">{cap.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Version desktop - grille complète */}
          <div className="hidden md:grid md:grid-cols-5 gap-3 mb-4">
            {winstonCapabilities.map((cap, i) => (
              <div key={i} className="bg-black/40 border border-[#D4A024]/20 rounded-lg p-3 text-center">
                <cap.icon className="w-6 h-6 text-[#D4A024] mx-auto mb-2" />
                <p className="text-white text-sm font-medium">{cap.text}</p>
                <p className="text-gray-400 text-xs mt-1">{cap.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Zone de chat */}
      <Card className="flex-1 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm flex flex-col overflow-hidden relative">
        {/* Header du chat - plus compact sur mobile */}
        <div className="flex items-center justify-between p-2 md:p-5 border-b border-[#D4A024]/20">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center text-white font-serif font-bold text-base md:text-xl">
              W
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm md:text-lg">Winston</h3>
              <div className="flex items-center gap-1 md:gap-2">
                <Badge className="bg-[#7A2020]/80 text-white text-[10px] md:text-xs px-1 md:px-2">Bague Specialist</Badge>
                <p className="text-gray-400 text-[10px] md:text-sm hidden md:block">Concierge du club</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuideSommaire(!showGuideSommaire)}
              className={`text-gray-400 hover:text-white p-1 md:p-2 ${showGuideSommaire ? 'bg-[#D4A024]/20' : ''}`}
              title="Guide du cigare"
            >
              <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetConversation}
              className="text-gray-400 hover:text-white p-1 md:p-2"
              title="Nouvelle conversation"
            >
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            </Button>
          </div>
        </div>

        {/* Boutons d'action rapide */}
        <div className="flex flex-wrap gap-2 px-4 py-2 border-b border-[#D4A024]/20 bg-black/30">
          <Button
            onClick={startCigarChoice}
            className="bg-gradient-to-r from-[#D4A024] to-[#7A2020] hover:from-[#E4B034] hover:to-[#8A3030] text-white text-sm"
            size="sm"
          >
            <Target className="w-4 h-4 mr-2" />
            Choix de cigare
          </Button>
        </div>

        {/* Panneau sommaire du guide */}
        {showGuideSommaire && (
          <div className="border-b border-[#D4A024]/20 p-2 md:p-3 bg-black/50 max-h-[40vh] md:max-h-none overflow-y-auto">
            <p className="text-[#D4A024] text-xs md:text-sm font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Tout sur le cigare - Choisissez une partie :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 md:gap-2">
              {guideSommaire.map((partie) => (
                <button
                  key={partie.numero}
                  onClick={() => askForPartie(partie.numero, partie.titre)}
                  className="text-left p-2 hover:bg-[#D4A024]/20 bg-black/30 md:bg-transparent rounded transition-colors flex items-center gap-2 group text-xs md:text-sm"
                >
                  <span className="text-[#D4A024] font-bold w-5">{partie.numero}.</span>
                  <span className="text-gray-300 md:text-gray-400 group-hover:text-white flex-1">{partie.titre}</span>
                  <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-[#D4A024] shrink-0 hidden md:block" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-3 md:space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 md:gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'user' 
                  ? 'bg-[#7A2020]' 
                  : 'bg-gradient-to-br from-[#D4A024] to-[#7A2020]'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                ) : (
                  <span className="text-white font-serif font-bold text-sm md:text-lg">W</span>
                )}
              </div>

              {/* Bulle de message */}
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 md:px-6 md:py-5 ${
                message.role === 'user'
                  ? 'bg-[#7A2020] text-white rounded-tr-sm'
                  : 'bg-black/60 border border-[#D4A024]/30 text-gray-200 rounded-tl-sm'
              }`}>
                <p className="text-sm md:text-lg leading-relaxed whitespace-pre-wrap">
                  {formatMessageContent(message.content)}
                </p>
              </div>
            </div>
          ))}

          {/* Indicateur de frappe */}
          {isTyping && (
            <div className="flex items-start gap-2 md:gap-3">
              <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center">
                <span className="text-white font-serif font-bold text-sm md:text-lg">W</span>
              </div>
              <div className="bg-black/60 border border-[#D4A024]/30 rounded-2xl rounded-tl-sm px-3 py-2 md:px-5 md:py-4">
                <div className="flex gap-1.5 md:gap-2">
                  <span className="w-2 h-2 md:w-3 md:h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 md:w-3 md:h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 md:w-3 md:h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie - plus compact sur mobile */}
        <div className="p-2 md:p-4 border-t border-[#D4A024]/20">
          <div className="flex gap-2 md:gap-3">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pose ta question..."
              className="flex-1 bg-black/60 border-[#D4A024]/30 text-white placeholder:text-gray-500 text-sm md:text-lg h-10 md:h-14 px-3 md:px-5"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] px-4 md:px-8 h-10 md:h-14"
              data-testid="send-btn"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 md:w-7 md:h-7 animate-spin" />
              ) : (
                <Send className="w-5 h-5 md:w-7 md:h-7" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssistantIA;
