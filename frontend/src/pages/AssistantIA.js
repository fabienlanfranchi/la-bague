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

  // ID utilisateur pour l'API - différencie membre vs admin pour Fabien
  const getUserId = () => {
    if (!currentMember) return 'default-user';
    // Si c'est Fabien en mode admin, utiliser un ID différent
    if (currentMember.is_president && isAdmin) {
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
        // Message de bienvenue si pas d'historique
        const prenom = currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre';
        setMessages([{
          role: 'assistant',
          content: `Bonjour ${prenom} ! Je suis Winston, votre concierge personnel de La Bague Impériale. 🎩\n\n**Voici ce que je peux faire pour vous :**\n\n🎯 **Choix de cigare** — Je vous guide vers LE cigare adapté à votre profil et votre moment\n📚 **Guide du Cigare** — Tout savoir sur les terroirs, formats, marques\n🎁 **Conseil cadeau** — Offrir le bon cigare à quelqu'un\n🥃 **Accords** — Quel whisky, rhum ou cognac avec votre cigare ?\n🎓 **Parcours par niveau** — Débutant, Amateur, Confirmé ou Expert ?\n\nCliquez sur **"Choix de cigare"** ci-dessus ou posez-moi directement votre question !`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  };

  // Lancer le flow "Choix de cigare"
  const startCigarChoice = () => {
    const prenom = currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre';
    const choixMessage = {
      role: 'assistant',
      content: `${prenom}, je vais vous aider à choisir le cigare parfait pour votre situation ! 🎯\n\n**Première question : Quel est votre profil de fumeur ?**\n\n1️⃣ **Débutant** — Je découvre le cigare\n2️⃣ **Amateur** — J'ai déjà quelques repères\n3️⃣ **Confirmé** — Je maîtrise bien mon sujet\n4️⃣ **Expert** — Grande expérience du cigare\n\nRépondez par le numéro ou le mot (ex: "débutant" ou "1")`,
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
      {/* Header */}
      <div className="text-center md:text-left mb-4">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">
          Winston
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Concierge & Assistant IA
        </p>
      </div>

      {/* Capacités de Winston (affiché au début) */}
      {messages.length <= 1 && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {winstonCapabilities.map((cap, i) => (
            <div key={i} className="bg-black/40 border border-[#D4A024]/20 rounded-lg p-3 text-center">
              <cap.icon className="w-6 h-6 text-[#D4A024] mx-auto mb-2" />
              <p className="text-white text-sm font-medium">{cap.text}</p>
              <p className="text-gray-400 text-xs mt-1">{cap.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Zone de chat */}
      <Card className="flex-1 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm flex flex-col overflow-hidden relative">
        {/* Header du chat */}
        <div className="flex items-center justify-between p-5 border-b border-[#D4A024]/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center text-white font-serif font-bold text-xl">
              W
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">Winston</h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-[#7A2020]/80 text-white text-xs">Bague Specialist</Badge>
                <p className="text-gray-400 text-sm">Concierge du club</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuideSommaire(!showGuideSommaire)}
              className={`text-gray-400 hover:text-white ${showGuideSommaire ? 'bg-[#D4A024]/20' : ''}`}
              title="Guide du cigare"
            >
              <BookOpen className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="default"
              onClick={resetConversation}
              className="text-gray-400 hover:text-white"
              title="Nouvelle conversation"
            >
              <RefreshCw className="w-5 h-5" />
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
          <Button
            onClick={startGiftAdvice}
            variant="outline"
            className="border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20 text-sm"
            size="sm"
          >
            <Gift className="w-4 h-4 mr-2" />
            Conseil cadeau
          </Button>
        </div>

        {/* Panneau sommaire du guide */}
        {showGuideSommaire && (
          <div className="border-b border-[#D4A024]/20 p-3 bg-black/50">
            <p className="text-[#D4A024] text-sm font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Tout sur le cigare - Choisissez une partie :
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {guideSommaire.map((partie) => (
                <button
                  key={partie.numero}
                  onClick={() => askForPartie(partie.numero, partie.titre)}
                  className="text-left p-2 hover:bg-[#D4A024]/20 rounded transition-colors flex items-center gap-2 group text-sm"
                >
                  <span className="text-[#D4A024] font-bold w-5">{partie.numero}.</span>
                  <span className="text-gray-400 group-hover:text-white flex-1 truncate">{partie.titre}</span>
                  <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-[#D4A024] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'user' 
                  ? 'bg-[#7A2020]' 
                  : 'bg-gradient-to-br from-[#D4A024] to-[#7A2020]'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <span className="text-white font-serif font-bold text-lg">W</span>
                )}
              </div>

              {/* Bulle de message */}
              <div className={`max-w-[85%] rounded-2xl px-6 py-5 ${
                message.role === 'user'
                  ? 'bg-[#7A2020] text-white rounded-tr-sm'
                  : 'bg-black/60 border border-[#D4A024]/30 text-gray-200 rounded-tl-sm'
              }`}>
                <p className="text-lg leading-relaxed whitespace-pre-wrap">
                  {formatMessageContent(message.content)}
                </p>
              </div>
            </div>
          ))}

          {/* Indicateur de frappe */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center">
                <span className="text-white font-serif font-bold text-lg">W</span>
              </div>
              <div className="bg-black/60 border border-[#D4A024]/30 rounded-2xl rounded-tl-sm px-5 py-4">
                <div className="flex gap-2">
                  <span className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-3 h-3 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="p-4 border-t border-[#D4A024]/20">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pose-moi une question sur les cigares ou le club..."
              className="flex-1 bg-black/60 border-[#D4A024]/30 text-white placeholder:text-gray-500 text-lg h-14 px-5"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] px-8 h-14"
              data-testid="send-btn"
            >
              {isLoading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Send className="w-7 h-7" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssistantIA;
