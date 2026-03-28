import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  ChevronRight, 
  MessageCircle, 
  Plus,
  Save,
  Trash2,
  Edit3,
  X,
  BookMarked,
  GraduationCap,
  ArrowUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ToutSurLeCigare = () => {
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  const [guideContent, setGuideContent] = useState('');
  const [sommaire, setSommaire] = useState([]);
  const [parcours, setParcours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // États pour l'édition admin
  const [editMode, setEditMode] = useState(false);
  const [newPartie, setNewPartie] = useState({ numero: '', titre: '', contenu: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  const contentRef = useRef(null);
  const sectionRefs = useRef({});

  useEffect(() => {
    loadGuide();
  }, []);

  // Gérer le scroll pour le bouton "retour en haut"
  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        setShowBackToTop(contentRef.current.scrollTop > 500);
      }
    };
    
    const content = contentRef.current;
    if (content) {
      content.addEventListener('scroll', handleScroll);
      return () => content.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const loadGuide = async () => {
    setLoading(true);
    try {
      // Charger le sommaire
      const sommaireRes = await axios.get(`${API}/guide-cigare/sommaire`);
      setSommaire(sommaireRes.data.parties || []);
      setParcours(sommaireRes.data.parcours || []);

      // Charger toutes les parties
      let fullContent = '';
      for (let i = 1; i <= 11; i++) {
        try {
          const partieRes = await axios.get(`${API}/guide-cigare/partie/${i}`);
          if (partieRes.data.contenu) {
            fullContent += partieRes.data.contenu + '\n\n---\n\n';
          }
        } catch (e) {
          console.log(`Partie ${i} non trouvée`);
        }
      }
      setGuideContent(fullContent);
    } catch (error) {
      console.error('Erreur chargement guide:', error);
      toast.error('Erreur lors du chargement du guide');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (numero) => {
    setActiveSection(numero);
    const element = sectionRefs.current[numero];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const discussWithWinston = (sujet) => {
    // Naviguer vers Winston avec le sujet pré-rempli
    navigate('/assistant', { state: { initialMessage: `Parle-moi de : ${sujet}` } });
  };

  // Rendu du contenu Markdown simplifié
  const renderMarkdown = (content) => {
    if (!content) return null;

    const lines = content.split('\n');
    const elements = [];
    let currentPartie = 0;

    lines.forEach((line, index) => {
      // Détecter les parties pour les ancres
      const partieMatch = line.match(/^## Partie (\d+)/);
      if (partieMatch) {
        currentPartie = parseInt(partieMatch[1]);
      }

      if (line.startsWith('## Partie')) {
        elements.push(
          <h2 
            key={index} 
            ref={el => sectionRefs.current[currentPartie] = el}
            className="text-2xl font-serif font-bold text-[#D4A024] mt-8 mb-4 pb-2 border-b border-[#D4A024]/30 scroll-mt-4"
          >
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-white mt-6 mb-3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={index} className="text-[#D4A024] font-semibold mt-4 mb-2">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      } else if (line.startsWith('- **')) {
        const match = line.match(/- \*\*(.+?)\*\*\s*:?\s*(.*)/);
        if (match) {
          elements.push(
            <div key={index} className="flex gap-2 ml-4 my-1">
              <span className="text-[#D4A024]">•</span>
              <span>
                <strong className="text-white">{match[1]}</strong>
                {match[2] && <span className="text-gray-300"> : {match[2]}</span>}
              </span>
            </div>
          );
        }
      } else if (line.startsWith('- ')) {
        elements.push(
          <div key={index} className="flex gap-2 ml-4 my-1">
            <span className="text-[#D4A024]">•</span>
            <span className="text-gray-300">{line.replace('- ', '')}</span>
          </div>
        );
      } else if (line.match(/^\d+\.\s/)) {
        elements.push(
          <div key={index} className="flex gap-2 ml-4 my-1">
            <span className="text-[#D4A024] font-bold">{line.match(/^\d+/)[0]}.</span>
            <span className="text-gray-300">{line.replace(/^\d+\.\s*/, '')}</span>
          </div>
        );
      } else if (line.startsWith('---')) {
        elements.push(<hr key={index} className="border-[#D4A024]/20 my-8" />);
      } else if (line.trim()) {
        elements.push(
          <p key={index} className="text-gray-300 my-2 leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4A024]"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="text-center md:text-left mb-4">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="w-10 h-10 text-[#D4A024]" />
          Tout sur le cigare
        </h1>
        <p className="text-[#D4A024] text-lg font-serif">
          Le guide complet du club La Bague Impériale
        </p>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar - Sommaire */}
        <Card className="w-72 bg-black/40 border-2 border-[#D4A024]/30 overflow-hidden flex flex-col shrink-0">
          <CardHeader className="py-3 border-b border-[#D4A024]/20">
            <CardTitle className="text-[#D4A024] text-lg flex items-center gap-2">
              <BookMarked className="w-5 h-5" />
              Sommaire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 overflow-y-auto flex-1">
            {/* Parties */}
            <div className="space-y-1">
              {sommaire.map((partie) => (
                <button
                  key={partie.numero}
                  onClick={() => scrollToSection(partie.numero)}
                  className={`w-full text-left p-2 rounded transition-colors flex items-center gap-2 group ${
                    activeSection === partie.numero 
                      ? 'bg-[#D4A024]/30 text-[#D4A024]' 
                      : 'hover:bg-[#D4A024]/10 text-gray-400'
                  }`}
                >
                  <span className="font-bold text-sm w-6">{partie.numero}.</span>
                  <span className="text-sm flex-1 group-hover:text-white">{partie.titre}</span>
                </button>
              ))}
            </div>

            {/* Parcours */}
            <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
              <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider flex items-center gap-2 px-2">
                <GraduationCap className="w-4 h-4" />
                Parcours
              </p>
              {parcours.map((p) => (
                <button
                  key={p.id}
                  onClick={() => scrollToSection(11)}
                  className="w-full text-left p-2 hover:bg-[#D4A024]/10 rounded transition-colors flex items-center gap-2 group"
                >
                  <Badge className={`${
                    p.niveau === 'débutant' ? 'bg-green-600' :
                    p.niveau === 'amateur' ? 'bg-blue-600' :
                    p.niveau === 'confirmé' ? 'bg-purple-600' : 'bg-red-600'
                  } text-white text-xs`}>
                    {p.niveau}
                  </Badge>
                  <span className="text-gray-400 text-xs group-hover:text-white flex-1 truncate">{p.titre}</span>
                </button>
              ))}
            </div>

            {/* Bouton Discuter avec Winston */}
            <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
              <Button
                onClick={() => discussWithWinston('le guide du cigare')}
                className="w-full bg-gradient-to-r from-[#7A2020] to-[#D4A024] hover:from-[#8A3030] hover:to-[#E4B034] text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Discuter avec Winston
              </Button>
            </div>

            {/* Admin: Ajouter une partie */}
            {isAdmin && (
              <div className="mt-4 pt-4 border-t border-[#D4A024]/20">
                <Button
                  onClick={() => setShowAddForm(!showAddForm)}
                  variant="outline"
                  className="w-full border-[#D4A024]/50 text-[#D4A024] hover:bg-[#D4A024]/20"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une partie
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contenu principal */}
        <Card className="flex-1 bg-black/40 border-2 border-[#D4A024]/30 overflow-hidden flex flex-col relative">
          {/* Formulaire d'ajout admin */}
          {isAdmin && showAddForm && (
            <div className="absolute inset-0 bg-black/90 z-20 p-6 overflow-y-auto">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-serif font-bold text-[#D4A024]">Ajouter une nouvelle partie</h3>
                  <Button variant="ghost" onClick={() => setShowAddForm(false)} className="text-gray-400">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Numéro de partie</label>
                      <Input
                        type="number"
                        value={newPartie.numero}
                        onChange={(e) => setNewPartie({...newPartie, numero: e.target.value})}
                        placeholder="12"
                        className="bg-black/50 border-[#D4A024]/30 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-sm mb-1 block">Titre</label>
                      <Input
                        value={newPartie.titre}
                        onChange={(e) => setNewPartie({...newPartie, titre: e.target.value})}
                        placeholder="Titre de la partie"
                        className="bg-black/50 border-[#D4A024]/30 text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-400 text-sm mb-1 block">Contenu (format Markdown)</label>
                    <Textarea
                      value={newPartie.contenu}
                      onChange={(e) => setNewPartie({...newPartie, contenu: e.target.value})}
                      placeholder="### Sous-titre&#10;&#10;Votre contenu ici...&#10;&#10;- Point 1&#10;- Point 2"
                      className="bg-black/50 border-[#D4A024]/30 text-white min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        toast.success('Fonctionnalité à venir : les nouvelles parties seront sauvegardées en base de données');
                        setShowAddForm(false);
                      }}
                      className="bg-[#D4A024] hover:bg-[#C49014] text-black"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddForm(false)}
                      className="border-gray-600 text-gray-400"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contenu du guide */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {/* Introduction */}
            <div className="mb-8 p-6 bg-gradient-to-r from-[#7A2020]/20 to-[#D4A024]/20 rounded-lg border border-[#D4A024]/30">
              <h2 className="text-2xl font-serif font-bold text-white mb-3">Bienvenue dans le Guide du Cigare</h2>
              <p className="text-gray-300 leading-relaxed">
                Ce guide complet en 11 parties vous accompagne dans votre découverte et perfectionnement de l'art du cigare. 
                Du vocabulaire fondamental aux conseils d'expert, explorez chaque aspect de cet univers fascinant.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {sommaire.slice(0, 5).map((partie) => (
                  <Badge 
                    key={partie.numero}
                    className="bg-[#D4A024]/20 text-[#D4A024] border border-[#D4A024]/30 cursor-pointer hover:bg-[#D4A024]/30"
                    onClick={() => scrollToSection(partie.numero)}
                  >
                    {partie.numero}. {partie.titre}
                  </Badge>
                ))}
                <Badge className="bg-gray-700/50 text-gray-400">+{sommaire.length - 5} autres</Badge>
              </div>
            </div>

            {/* Contenu des parties */}
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(guideContent)}
            </div>

            {/* Footer avec bouton Winston */}
            <div className="mt-12 p-6 bg-gradient-to-r from-[#7A2020]/30 to-[#D4A024]/30 rounded-lg border border-[#D4A024]/30 text-center">
              <h3 className="text-xl font-serif text-white mb-3">Des questions sur ce guide ?</h3>
              <p className="text-gray-400 mb-4">Winston est là pour approfondir n'importe quel sujet avec vous.</p>
              <Button
                onClick={() => discussWithWinston('le guide du cigare')}
                className="bg-gradient-to-r from-[#7A2020] to-[#D4A024] hover:from-[#8A3030] hover:to-[#E4B034] text-white text-lg px-8 py-3"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                En discuter avec Winston
              </Button>
            </div>
          </div>

          {/* Bouton retour en haut */}
          {showBackToTop && (
            <Button
              onClick={scrollToTop}
              className="absolute bottom-6 right-6 bg-[#D4A024] hover:bg-[#C49014] text-black rounded-full w-12 h-12 p-0 shadow-lg"
            >
              <ArrowUp className="w-5 h-5" />
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ToutSurLeCigare;
