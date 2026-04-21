import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart3, Plus, Trash2, CheckCircle2, Loader2, HelpCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Sondages = () => {
  const { isAdmin, currentUser } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sondages, setSondages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userVotes, setUserVotes] = useState({}); // {sondage_id: {option_index, reponses}}

  // Formulaire de création multi-questions
  const [newSondage, setNewSondage] = useState({
    titre: '',
    questions: [{ question: '', options: ['', ''], type: 'choix_unique' }]
  });

  useEffect(() => {
    loadSondages();
  }, []);

  const loadSondages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/sondages-generiques`);
      setSondages(response.data);
      
      if (currentUser?.id) {
        const votesMap = {};
        for (const sondage of response.data) {
          try {
            const voteRes = await axios.get(`${API}/sondages-generiques/${sondage.id}/mon-vote/${currentUser.id}`);
            if (voteRes.data.hasVoted) {
              votesMap[sondage.id] = {
                option_index: voteRes.data.option_index,
                reponses: voteRes.data.reponses || []
              };
            }
          } catch (e) {}
        }
        setUserVotes(votesMap);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des sondages');
    } finally {
      setLoading(false);
    }
  };

  // ========== GESTION DU FORMULAIRE MULTI-QUESTIONS ==========
  const addQuestion = () => {
    setNewSondage({
      ...newSondage,
      questions: [...newSondage.questions, { question: '', options: ['', ''], type: 'choix_unique' }]
    });
  };

  const removeQuestion = (qi) => {
    if (newSondage.questions.length > 1) {
      setNewSondage({
        ...newSondage,
        questions: newSondage.questions.filter((_, i) => i !== qi)
      });
    }
  };

  const updateQuestion = (qi, field, value) => {
    const updated = [...newSondage.questions];
    updated[qi] = { ...updated[qi], [field]: value };
    // Si on passe en oui_non, forcer les options à Oui/Non
    if (field === 'type' && value === 'oui_non') {
      updated[qi].options = ['Oui', 'Non'];
    }
    setNewSondage({ ...newSondage, questions: updated });
  };

  const addOption = (qi) => {
    const updated = [...newSondage.questions];
    updated[qi].options = [...updated[qi].options, ''];
    setNewSondage({ ...newSondage, questions: updated });
  };

  const removeOption = (qi, oi) => {
    const updated = [...newSondage.questions];
    if (updated[qi].options.length > 2) {
      updated[qi].options = updated[qi].options.filter((_, i) => i !== oi);
      setNewSondage({ ...newSondage, questions: updated });
    }
  };

  const updateOption = (qi, oi, value) => {
    const updated = [...newSondage.questions];
    updated[qi].options[oi] = value;
    setNewSondage({ ...newSondage, questions: updated });
  };

  const handleCreateSondage = async () => {
    try {
      // Valider
      if (!newSondage.titre.trim()) {
        toast.error('Le titre est obligatoire');
        return;
      }
      for (let i = 0; i < newSondage.questions.length; i++) {
        const q = newSondage.questions[i];
        if (!q.question.trim()) {
          toast.error(`La question ${i + 1} est vide`);
          return;
        }
        if (q.options.filter(o => o.trim()).length < 2) {
          toast.error(`La question ${i + 1} doit avoir au moins 2 options`);
          return;
        }
      }

      // Nettoyer les options vides
      const cleanQuestions = newSondage.questions.map(q => ({
        ...q,
        options: q.options.filter(o => o.trim())
      }));

      await axios.post(`${API}/sondages-generiques`, {
        titre: newSondage.titre,
        questions: cleanQuestions
      });

      toast.success('Sondage créé !');
      setDialogOpen(false);
      setNewSondage({
        titre: '',
        questions: [{ question: '', options: ['', ''], type: 'choix_unique' }]
      });
      loadSondages();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  // ========== VOTE MULTI-QUESTIONS ==========
  const [currentVoteAnswers, setCurrentVoteAnswers] = useState({}); // {sondage_id: [{question_index, option_index}]}

  const setVoteAnswer = (sondageId, questionIndex, optionIndex) => {
    const current = currentVoteAnswers[sondageId] || [];
    const updated = current.filter(r => r.question_index !== questionIndex);
    updated.push({ question_index: questionIndex, option_index: optionIndex });
    setCurrentVoteAnswers({ ...currentVoteAnswers, [sondageId]: updated });
  };

  const handleVoteMulti = async (sondageId, questions) => {
    if (!currentUser?.id) {
      toast.error('Vous devez être connecté');
      return;
    }
    const answers = currentVoteAnswers[sondageId] || [];
    if (answers.length < questions.length) {
      toast.error('Répondez à toutes les questions');
      return;
    }

    try {
      await axios.post(`${API}/sondages-generiques/${sondageId}/vote?membre_id=${currentUser.id}`, answers);
      toast.success('Vote enregistré !');
      setUserVotes({ ...userVotes, [sondageId]: { reponses: answers } });
      loadSondages();
    } catch (error) {
      toast.error('Erreur lors du vote');
    }
  };

  // Legacy: vote simple
  const handleVoteLegacy = async (sondageId, optionIndex) => {
    if (!currentUser?.id) return;
    try {
      await axios.post(`${API}/sondages-generiques/${sondageId}/vote?membre_id=${currentUser.id}&option_index=${optionIndex}`);
      toast.success('Vote enregistré !');
      setUserVotes({ ...userVotes, [sondageId]: { option_index: optionIndex } });
      loadSondages();
    } catch (error) {
      toast.error('Erreur lors du vote');
    }
  };

  const handleDeleteSondage = async (sondageId) => {
    if (!window.confirm('Supprimer ce sondage et tous ses votes ?')) return;
    try {
      await axios.delete(`${API}/sondages-generiques/${sondageId}`);
      toast.success('Sondage supprimé');
      loadSondages();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTotalVotes = (votes) => votes ? votes.reduce((sum, v) => sum + v, 0) : 0;
  const getPercentage = (votes, index) => {
    const total = getTotalVotes(votes);
    return total > 0 ? ((votes[index] / total) * 100).toFixed(0) : 0;
  };

  // Partage WhatsApp d'un sondage anonyme
  const handleShareSondageWhatsApp = (sondage) => {
    const appUrl = window.location.origin + '/dashboard';
    const titre = sondage.titre || sondage.question || 'Sondage';
    const nbQuestions = sondage.questions?.length || 1;
    const message = `*La Bague Impériale - Sondage anonyme*\n\n` +
      `Un sondage est en attente de votre réponse :\n` +
      `*${titre}*\n` +
      `${nbQuestions} question(s) à répondre\n\n` +
      `Vos votes sont *strictement anonymes*.\n\n` +
      `Répondez directement depuis votre Dashboard :\n${appUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Déterminer si un sondage est multi-questions ou legacy
  const isMultiQuestion = (sondage) => sondage.questions && sondage.questions.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#D4A024] animate-spin" />
      </div>
    );
  }

  // ========== RENDU D'UN SONDAGE MULTI-QUESTIONS (ADMIN) ==========
  const renderMultiQuestionAdmin = (sondage) => (
    <Card key={sondage.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-serif text-white mb-2">{sondage.titre || 'Sondage'}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-600">{sondage.status === 'active' ? 'Actif' : 'Terminé'}</Badge>
              <span className="text-sm text-gray-400">{sondage.total_votes || 0} vote(s)</span>
              <Badge className="bg-blue-600/50 text-xs">{sondage.questions.length} question(s)</Badge>
              <Badge className="bg-black/40 border border-[#D4A024]/50 text-[#D4A024] text-xs">Anonyme</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {sondage.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:text-green-500 hover:bg-green-900/20"
                onClick={() => handleShareSondageWhatsApp(sondage)}
                data-testid={`share-whatsapp-sondage-${sondage.id}`}
                title="Partager sur WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-900/20" onClick={() => handleDeleteSondage(sondage.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {sondage.questions.map((q, qi) => (
          <div key={qi} className="border border-[#D4A024]/20 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center">
              <HelpCircle className="w-4 h-4 mr-2 text-[#D4A024]" />
              {q.question}
            </h4>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const votes = q.vote_counts || [];
                const total = votes.reduce((s, v) => s + v, 0);
                const count = votes[oi] || 0;
                const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
                return (
                  <div key={oi} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">{opt}</span>
                      <span className="text-[#D4A024] font-semibold">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-[#D4A024] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  // ========== RENDU D'UN SONDAGE LEGACY (ADMIN) ==========
  const renderLegacyAdmin = (sondage) => (
    <Card key={sondage.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-serif text-white mb-2">{sondage.question}</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-600">{sondage.status === 'active' ? 'Actif' : 'Terminé'}</Badge>
              <span className="text-sm text-gray-400">{getTotalVotes(sondage.votes)} vote(s)</span>
              <Badge className="bg-black/40 border border-[#D4A024]/50 text-[#D4A024] text-xs">Anonyme</Badge>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {sondage.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-green-400 hover:text-green-500 hover:bg-green-900/20"
                onClick={() => handleShareSondageWhatsApp(sondage)}
                data-testid={`share-whatsapp-sondage-legacy-${sondage.id}`}
                title="Partager sur WhatsApp"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-500 hover:bg-red-900/20" onClick={() => handleDeleteSondage(sondage.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sondage.options.map((option, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">{option}</span>
                <span className="text-[#D4A024] font-semibold">{sondage.votes?.[index] || 0} ({getPercentage(sondage.votes, index)}%)</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-[#D4A024] h-2 rounded-full transition-all" style={{ width: `${getPercentage(sondage.votes, index)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // ========== RENDU D'UN SONDAGE MULTI-QUESTIONS (MEMBRE) ==========
  const renderMultiQuestionMember = (sondage) => {
    const myVote = userVotes[sondage.id];
    const hasVoted = !!myVote;
    const myReponses = myVote?.reponses || [];

    return (
      <Card key={sondage.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white">{sondage.titre || 'Sondage'}</CardTitle>
          <CardDescription className="text-gray-400">
            {sondage.total_votes || 0} vote(s) {hasVoted ? '- Vous avez voté' : '- En attente de votre réponse'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sondage.questions.map((q, qi) => {
            const myAnswer = myReponses.find(r => r.question_index === qi);
            const pendingAnswer = (currentVoteAnswers[sondage.id] || []).find(r => r.question_index === qi);
            const votes = q.vote_counts || [];
            const totalQ = votes.reduce((s, v) => s + v, 0);

            return (
              <div key={qi} className="border border-[#D4A024]/20 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3 flex items-center text-lg">
                  <HelpCircle className="w-4 h-4 mr-2 text-[#D4A024] flex-shrink-0" />
                  {q.question}
                </h4>

                {!hasVoted ? (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        onClick={() => setVoteAnswer(sondage.id, qi, oi)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          pendingAnswer?.option_index === oi
                            ? 'bg-[#D4A024]/20 border-[#D4A024] text-white'
                            : 'border-[#D4A024]/30 text-gray-300 hover:bg-[#D4A024]/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            pendingAnswer?.option_index === oi ? 'border-[#D4A024] bg-[#D4A024]' : 'border-gray-500'
                          }`}>
                            {pendingAnswer?.option_index === oi && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <span className="text-base">{opt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const count = votes[oi] || 0;
                      const pct = totalQ > 0 ? ((count / totalQ) * 100).toFixed(0) : 0;
                      const isMyChoice = myAnswer?.option_index === oi;
                      return (
                        <div key={oi} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-white">{opt}</span>
                              {isMyChoice && <CheckCircle2 className="w-4 h-4 text-[#D4A024]" />}
                            </div>
                            <span className="text-[#D4A024] font-semibold">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${isMyChoice ? 'bg-[#D4A024]' : 'bg-gray-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Bouton voter */}
          {!hasVoted && (
            <Button
              onClick={() => handleVoteMulti(sondage.id, sondage.questions)}
              disabled={(currentVoteAnswers[sondage.id] || []).length < sondage.questions.length}
              className="w-full bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-bold py-3"
            >
              Envoyer mes réponses
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // ========== RENDU D'UN SONDAGE LEGACY (MEMBRE) ==========
  const renderLegacyMember = (sondage) => {
    const myVote = userVotes[sondage.id];
    const hasVoted = myVote?.option_index !== undefined && myVote?.option_index >= 0;
    const userVoteIndex = myVote?.option_index;

    return (
      <Card key={sondage.id} className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-white">{sondage.question}</CardTitle>
          <CardDescription className="text-gray-400">
            {getTotalVotes(sondage.votes)} vote(s) {hasVoted ? '- Vous avez voté' : '- En attente de votre réponse'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasVoted ? (
            <RadioGroup className="space-y-3">
              {sondage.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg border border-[#D4A024]/30 hover:bg-[#D4A024]/10 cursor-pointer transition" onClick={() => handleVoteLegacy(sondage.id, index)}>
                  <RadioGroupItem value={index.toString()} id={`${sondage.id}-${index}`} />
                  <Label htmlFor={`${sondage.id}-${index}`} className="flex-1 text-white cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {sondage.options.map((option, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-white">{option}</span>
                      {userVoteIndex === index && <CheckCircle2 className="w-4 h-4 text-[#D4A024]" />}
                    </div>
                    <span className="text-[#D4A024] font-semibold">{sondage.votes?.[index] || 0} ({getPercentage(sondage.votes, index)}%)</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${userVoteIndex === index ? 'bg-[#D4A024]' : 'bg-gray-500'}`} style={{ width: `${getPercentage(sondage.votes, index)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ========== VUE ADMIN ==========
  if (isAdmin) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">Sondages</h1>
            <p className="text-[#D4A024] text-lg font-serif">Créer et gérer les sondages</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020] font-serif font-bold" data-testid="create-poll-button">
                <Plus className="w-5 h-5 mr-2" />
                Créer un sondage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#1a1a1a] border-[#D4A024]/30 max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl text-white">Nouveau Sondage Multi-Questions</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Ajoutez plusieurs questions avec chacune ses options
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Titre du sondage */}
                <div>
                  <Label className="text-white">Titre du sondage *</Label>
                  <Input
                    value={newSondage.titre}
                    onChange={(e) => setNewSondage({ ...newSondage, titre: e.target.value })}
                    placeholder="Ex: Cigares Puro Dominicano"
                    className="mt-1 bg-black/40 border-[#D4A024]/30 text-white"
                  />
                </div>

                {/* Questions */}
                {newSondage.questions.map((q, qi) => (
                  <div key={qi} className="border border-[#D4A024]/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[#D4A024] font-semibold">Question {qi + 1}</Label>
                      <div className="flex items-center gap-2">
                        <Select value={q.type} onValueChange={(v) => updateQuestion(qi, 'type', v)}>
                          <SelectTrigger className="w-[140px] bg-black/40 border-[#D4A024]/30 text-white h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a1a] border-[#D4A024]/30">
                            <SelectItem value="choix_unique" className="text-white text-sm">Choix unique</SelectItem>
                            <SelectItem value="oui_non" className="text-white text-sm">Oui / Non</SelectItem>
                          </SelectContent>
                        </Select>
                        {newSondage.questions.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="text-red-400 hover:text-red-300 h-8 px-2">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <Input
                      value={q.question}
                      onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                      placeholder="Ex: Avez-vous aimé le Short Robusto ?"
                      className="bg-black/40 border-[#D4A024]/30 text-white"
                    />

                    {/* Options */}
                    {q.type !== 'oui_non' ? (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(qi, oi, e.target.value)}
                              placeholder={`Option ${oi + 1}`}
                              className="bg-black/60 border-gray-600 text-white text-sm"
                            />
                            {q.options.length > 2 && (
                              <Button variant="ghost" size="sm" onClick={() => removeOption(qi, oi)} className="text-red-400 h-8 px-2">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => addOption(qi)} className="border-[#D4A024]/30 text-[#D4A024] text-xs">
                          <Plus className="w-3 h-3 mr-1" />
                          Ajouter une option
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Les membres répondront Oui ou Non</p>
                    )}
                  </div>
                ))}

                <Button variant="outline" onClick={addQuestion} className="w-full border-[#D4A024]/50 text-[#D4A024] border-dashed">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une question
                </Button>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-gray-600 text-gray-300">Annuler</Button>
                <Button onClick={handleCreateSondage} className="bg-[#D4A024] hover:bg-[#C8941D] text-[#7A2020]">Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {sondages.length === 0 ? (
            <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Aucun sondage créé</p>
              </CardContent>
            </Card>
          ) : (
            sondages.map(s => isMultiQuestion(s) ? renderMultiQuestionAdmin(s) : renderLegacyAdmin(s))
          )}
        </div>
      </div>
    );
  }

  // ========== VUE MEMBRE ==========
  return (
    <div className="space-y-8">
      <div className="text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-2">Sondages</h1>
        <p className="text-[#D4A024] text-lg font-serif">Participez aux sondages du club</p>
      </div>

      <div className="space-y-6">
        {sondages.length === 0 ? (
          <Card className="bg-black/40 border-2 border-[#D4A024]/30 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Aucun sondage actif pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          sondages.map(s => isMultiQuestion(s) ? renderMultiQuestionMember(s) : renderLegacyMember(s))
        )}
      </div>
    </div>
  );
};

export default Sondages;
