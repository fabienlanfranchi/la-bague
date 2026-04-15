import React from 'react';
import { useUser } from '../context/UserContext';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  MessageCircle, 
  Users,
  HelpCircle,
  Star,
  Wine,
  BarChart3,
  FileText,
  ChevronRight,
  DollarSign,
  PieChart,
  Save,
  ShoppingBag,
  Gamepad2,
  MessageSquare,
  User
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';

const Aide = () => {
  const { isAdmin } = useUser();

  // Sections visibles par tous les membres
  const memberSections = [
    {
      icon: Home,
      title: "Dashboard",
      shortDesc: "Votre tableau de bord personnel avec vos statistiques.",
      details: [
        "Voir votre taux de présence aux événements",
        "Consulter vos étoiles de réputation",
        "Accéder rapidement aux prochains événements",
        "Vue d'ensemble de votre activité au club"
      ]
    },
    {
      icon: Calendar,
      title: "Événements",
      shortDesc: "Consultez et répondez aux événements du club.",
      details: [
        "Voir le prochain événement (Apéro, Repas, Anniversaire...)",
        "Confirmer ou décliner votre présence",
        "Consulter l'historique des saisons passées",
        "Voir qui sera présent à chaque événement"
      ]
    },
    {
      icon: Gamepad2,
      title: "Jeux",
      shortDesc: "Participez aux jeux et animations du club.",
      details: [
        "Découvrir les jeux disponibles",
        "Participer aux animations lors des événements"
      ]
    },
    {
      icon: ShoppingBag,
      title: "Boutique",
      shortDesc: "Accédez à la boutique du club.",
      details: [
        "Découvrir les produits disponibles",
        "Consulter les accessoires cigares"
      ]
    },
    {
      icon: BarChart3,
      title: "Sondages",
      shortDesc: "Participez aux votes et décisions du club.",
      details: [
        "Répondre aux sondages en cours",
        "Voir les résultats des votes passés",
        "Donner votre avis sur les décisions du club"
      ]
    },
    {
      icon: Wine,
      title: "Cigarothèque",
      shortDesc: "Explorez notre catalogue de 651 cigares.",
      details: [
        "Parcourir le catalogue complet (cubains et non-cubains)",
        "Filtrer par marque, pays, puissance, prix",
        "Consulter les fiches détaillées de chaque cigare",
        "Ajouter des cigares à votre collection personnelle",
        "Noter et commenter vos dégustations",
        "Partager une fiche cigare"
      ]
    },
    {
      icon: BookOpen,
      title: "Tout sur le cigare",
      shortDesc: "Guide complet en 11 parties pour tout savoir.",
      details: [
        "Partie 1 : Bases, structure et histoire",
        "Partie 2 : Choisir un cigare en pratique",
        "Partie 3 : Lexique utile",
        "Partie 4 : Parler cigare correctement",
        "Partie 5 : Les grandes marques",
        "Partie 6 : Les pays et terroirs",
        "Partie 7 : Fabrication du cigare",
        "Partie 8 : Les modules (formats)",
        "Partie 9 : Défauts et corrections",
        "Partie 10 : Les accessoires",
        "Partie 11 : Parcours initiatiques par niveau"
      ]
    },
    {
      icon: MessageCircle,
      title: "Winston",
      shortDesc: "Votre assistant IA spécialiste des cigares.",
      details: [
        "Poser toutes vos questions sur les cigares",
        "Obtenir des recommandations personnalisées",
        "Choisir un cigare selon votre niveau et le moment",
        "Découvrir les accords cigare & alcool",
        "Accéder au guide complet 'Tout sur le cigare'",
        "Winston connaît tous les membres du club !"
      ]
    },
    {
      icon: User,
      title: "Profil",
      shortDesc: "Gérez votre compte membre et vos paramètres.",
      details: [
        "Voir vos informations personnelles",
        "Consulter votre numéro de membre et votre ancienneté",
        "Voir l'historique de vos cotisations",
        "Suivre votre taux de présence aux événements",
        "Signaler un paiement au président",
        "Changer votre mot de passe",
        "Se déconnecter de l'application"
      ]
    }
  ];

  // Sections réservées aux admins
  const adminSections = [
    {
      icon: DollarSign,
      title: "Comptabilité",
      shortDesc: "Gérez les finances du club.",
      details: [
        "Suivre les cotisations des membres",
        "Enregistrer les paiements",
        "Gérer les dettes et encaissements",
        "Consulter l'historique financier"
      ]
    },
    {
      icon: Users,
      title: "Membres",
      shortDesc: "Gérez les 35 membres du club.",
      details: [
        "Voir la liste complète des membres",
        "Modifier les informations d'un membre",
        "Gérer les fonctions (Trésorier, etc.)",
        "Suivre les statistiques de présence"
      ]
    },
    {
      icon: MessageSquare,
      title: "Messages",
      shortDesc: "Envoyez des messages aux membres.",
      details: [
        "Rédiger des messages pour le club",
        "Envoyer des notifications",
        "Gérer les communications"
      ]
    },
    {
      icon: PieChart,
      title: "Statistiques",
      shortDesc: "Consultez les statistiques détaillées.",
      details: [
        "Analyser les présences par saison",
        "Voir les tendances du club",
        "Exporter les données"
      ]
    }
  ];

  // Combiner les sections selon le rôle
  const sections = isAdmin ? [...memberSections, ...adminSections] : memberSections;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a0a] to-[#2d1f1f] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <HelpCircle className="w-10 h-10 text-[#D4A024]" />
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">
              Guide d'utilisation
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Découvrez toutes les fonctionnalités de votre espace {isAdmin ? 'administrateur' : 'membre'}
          </p>
        </div>

        {/* Sections membres */}
        <div className="space-y-4">
          {!isAdmin && (
            <h2 className="text-xl font-serif text-[#D4A024] mb-4">Vos fonctionnalités</h2>
          )}
          {isAdmin && (
            <h2 className="text-xl font-serif text-[#D4A024] mb-4">Fonctionnalités membres</h2>
          )}
          
          {memberSections.map((section, index) => (
            <Card key={index} className="bg-black/40 border-[#D4A024]/20 overflow-hidden">
              <CardContent className="p-0">
                <details className="group">
                  <summary className="flex items-center gap-4 p-4 cursor-pointer list-none hover:bg-[#D4A024]/5 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-[#D4A024]/20 flex items-center justify-center shrink-0">
                      <section.icon className="w-6 h-6 text-[#D4A024]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-serif font-bold text-white">{section.title}</h3>
                      <p className="text-gray-400 text-sm">{section.shortDesc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#D4A024] transition-transform group-open:rotate-90" />
                  </summary>
                  
                  <div className="px-4 pb-4 pt-2 border-t border-[#D4A024]/10 bg-black/20">
                    <ul className="space-y-2 ml-16">
                      {section.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-300">
                          <Star className="w-4 h-4 text-[#D4A024] mt-0.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sections admin uniquement */}
        {isAdmin && (
          <div className="space-y-4 mt-8">
            <h2 className="text-xl font-serif text-[#7A2020] mb-4 flex items-center gap-2">
              <span className="bg-[#7A2020] text-white text-xs px-2 py-1 rounded">ADMIN</span>
              Fonctionnalités administrateur
            </h2>
            
            {adminSections.map((section, index) => (
              <Card key={index} className="bg-black/40 border-[#7A2020]/30 overflow-hidden">
                <CardContent className="p-0">
                  <details className="group">
                    <summary className="flex items-center gap-4 p-4 cursor-pointer list-none hover:bg-[#7A2020]/5 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-[#7A2020]/20 flex items-center justify-center shrink-0">
                        <section.icon className="w-6 h-6 text-[#7A2020]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-serif font-bold text-white">{section.title}</h3>
                        <p className="text-gray-400 text-sm">{section.shortDesc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#7A2020] transition-transform group-open:rotate-90" />
                    </summary>
                    
                    <div className="px-4 pb-4 pt-2 border-t border-[#7A2020]/10 bg-black/20">
                      <ul className="space-y-2 ml-16">
                        {section.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-gray-300">
                            <Star className="w-4 h-4 text-[#7A2020] mt-0.5 shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contact */}
        <div className="mt-8 text-center">
          <Card className="bg-[#D4A024]/10 border-[#D4A024]/30">
            <CardContent className="p-6">
              <h3 className="text-xl font-serif font-bold text-white mb-2">
                Besoin d'aide ?
              </h3>
              <p className="text-gray-300">
                Contactez le Président : <span className="text-[#D4A024] font-semibold">Fabien Lanfranchi</span>
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Ou posez vos questions à Winston, notre assistant IA !
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Aide;
