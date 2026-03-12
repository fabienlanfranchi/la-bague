import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
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
  Calendar,
  GlassWater,
  Award
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AssistantIA = () => {
  const { currentMember, isAdmin } = useUser();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ID utilisateur pour l'API
  const userId = currentMember?.id || 'default-user';

  // Capacités de Winston
  const winstonCapabilities = [
    { icon: BookOpen, text: "Guide du Cigare", description: "Expert en terroirs, formats, marques et dégustation" },
    { icon: Heart, text: "Recommandations personnalisées", description: "Basées sur vos goûts, ceux de chaque membre" },
    { icon: GlassWater, text: "Conseil & Association", description: "Quel accord ? Quel moment ? Vais-je aimer ce cigare ?" },
    { icon: Award, text: "Certifié Bague Specialist", description: "Connaissance approfondie des 35 membres et du Club" },
    { icon: Award, text: "Certifié Conca Specialist", description: "Siège du club - Carte Bar à Whisky & Rhumerie" },
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
          content: `Bonjour ${prenom} ! Je suis Winston, votre concierge personnel de La Bague Impériale.\n\nDouble certifié "Bague Specialist" et "Conca Specialist", je connais parfaitement les 35 membres du club et la carte du Bar à Whisky & Rhumerie.\n\nVoici ce que je peux faire pour vous :\n\n📚 Guide du Cigare - Tout savoir sur les terroirs, formats, marques\n💝 Recommandations personnalisées - Basées sur vos goûts et ceux de chaque membre\n🥃 Conseil & Association - Quel whisky avec mon cigare ? Quel moment de la journée ?\n🎯 Prédiction - "Vais-je aimer tel cigare ?" Selon votre Cigarthèque, je peux vous le dire !\n👥 Expertise membres - "Quel cigare non cubain Jacques aime-t-il ?"\n\nComment puis-je vous être utile ?`,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
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
      <Card className="flex-1 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm flex flex-col overflow-hidden">
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
