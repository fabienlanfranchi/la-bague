import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  RefreshCw,
  Loader2,
  MessageCircle,
  Lightbulb,
  Wine,
  Users,
  Calendar
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

  // Questions suggérées
  const suggestedQuestions = [
    { icon: Wine, text: "Conseille-moi un cigare que je n'ai pas encore fumé", color: "text-[#D4A024]" },
    { icon: Lightbulb, text: "Quel est mon cigare préféré ?", color: "text-purple-400" },
    { icon: Users, text: "Quel est le cigare préféré de Fabien ?", color: "text-blue-400" },
    { icon: Calendar, text: "Quels sont les prochains événements du club ?", color: "text-green-400" },
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
          content: `Bonjour ${prenom} ! 👋\n\nJe suis l'assistant IA de La Bague Impériale. Je connais le club, tous les membres, et je suis expert en cigares.\n\nJe peux t'aider à :\n• Trouver des cigares qui correspondent à tes goûts\n• Répondre à tes questions sur les cigares\n• Te donner des infos sur le club et les membres\n\nComment puis-je t'aider ?`,
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
    if (!window.confirm('Réinitialiser la conversation ?')) return;
    
    const prenom = currentMember?.prenom || currentMember?.nom_complet?.split(' ')[0] || 'cher membre';
    
    try {
      await axios.post(`${API}/assistant/reset?user_id=${userId}`);
      setMessages([{
        role: 'assistant',
        content: `Conversation réinitialisée ! Comment puis-je t'aider, ${prenom} ?`,
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
          Assistant IA
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Votre conseiller personnel pour le cigare
        </p>
      </div>

      {/* Zone de chat */}
      <Card className="flex-1 bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Header du chat */}
        <div className="flex items-center justify-between p-4 border-b border-[#D4A024]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Assistant La Bague Impériale</h3>
              <p className="text-gray-400 text-sm">Expert cigares & club</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetConversation}
            className="text-gray-400 hover:text-white"
            title="Nouvelle conversation"
          >
            <RefreshCw className="w-4 h-4" />
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                message.role === 'user' 
                  ? 'bg-[#7A2020]' 
                  : 'bg-gradient-to-br from-[#D4A024] to-[#7A2020]'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bulle de message */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#7A2020] text-white rounded-tr-sm'
                  : 'bg-black/60 border border-[#D4A024]/30 text-gray-200 rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {formatMessageContent(message.content)}
                </p>
              </div>
            </div>
          ))}

          {/* Indicateur de frappe */}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4A024] to-[#7A2020] flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-black/60 border border-[#D4A024]/30 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-[#D4A024] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Questions suggérées (si peu de messages) */}
        {messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-gray-400 text-xs mb-2">Questions suggérées :</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedQuestion(q.text)}
                  className="border-[#D4A024]/30 text-gray-300 hover:bg-[#D4A024]/10 text-xs"
                  disabled={isLoading}
                >
                  <q.icon className={`w-3 h-3 mr-1 ${q.color}`} />
                  {q.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Zone de saisie */}
        <div className="p-4 border-t border-[#D4A024]/20">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pose-moi une question sur les cigares ou le club..."
              className="flex-1 bg-black/60 border-[#D4A024]/30 text-white placeholder:text-gray-500"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] px-4"
              data-testid="send-btn"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AssistantIA;
