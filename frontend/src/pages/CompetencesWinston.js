import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, GraduationCap, BookOpen, Heart, GlassWater, Award } from 'lucide-react';

/**
 * Certificats de compétences de Winston.
 * Chaque carte utilise un logo dédié placé dans /public/assets/winston-certificates/
 * Remplacez les fichiers PNG/SVG pour personnaliser sans toucher au code.
 */
const competences = [
  {
    id: 'niveau-adaptatif',
    titre: 'Pédagogie Adaptative',
    sousTitre: 'Niveau Débutant à Expert',
    description:
      "Winston ajuste automatiquement son discours à votre niveau de connaissance du cigare. Débutant, amateur, confirmé ou expert : chaque explication est calibrée pour vous être utile sans être déroutante.",
    logo: '/assets/winston-certificates/niveau-adaptatif.png',
    fallbackIcon: GraduationCap,
    accent: '#D4A024',
    certifieLabel: 'Certification Pédagogique',
  },
  {
    id: 'guide-cigare',
    titre: 'Guide du Cigare',
    sousTitre: '',
    description:
      "Terroirs, formats, marques, histoire, vocabulaire, fabrication, défauts et corrections : Winston maîtrise l'ensemble du guide officiel La Bague Impériale pour vous accompagner pas à pas dans la dégustation.",
    logo: '/assets/winston-certificates/guide-cigare.png',
    fallbackIcon: BookOpen,
    accent: '#D4A024',
    certifieLabel: '',
  },
  {
    id: 'recommandations',
    titre: 'Recommandations Personnalisées',
    sousTitre: '',
    description:
      "Winston connaît les goûts et l'historique de chaque membre du club. Ses recommandations sont fondées sur vos préférences réelles et celles des 35 membres de La Bague Impériale.",
    logo: '/assets/winston-certificates/recommandations.png',
    fallbackIcon: Heart,
    accent: '#D4A024',
    certifieLabel: '',
  },
  {
    id: 'accords',
    titre: 'Conca Specialist',
    sousTitre: '',
    description:
      "Quel whisky, rhum, cognac ou armagnac avec votre cigare ? Winston s'appuie sur la Carte du Bar A Conca D'Oru pour vous suggérer les meilleurs accords selon le moment de la journée.",
    logo: '/assets/winston-certificates/accords.png',
    fallbackIcon: GlassWater,
    accent: '#D4A024',
    certifieLabel: '',
  },
  {
    id: 'bague-specialist',
    titre: 'Bague Specialist',
    sousTitre: '',
    description:
      "Statistiques de présence, préférences, anniversaires, événements passés et à venir : Winston est la mémoire vivante de La Bague Impériale depuis sa création en 2013.",
    logo: '/assets/winston-certificates/bague-specialist.png',
    fallbackIcon: Award,
    accent: '#D4A024',
    certifieLabel: '',
  },
];

const CertificateCard = ({ comp }) => {
  const [logoError, setLogoError] = React.useState(false);
  const Fallback = comp.fallbackIcon;

  return (
    <article
      className="certificate-card group relative overflow-hidden rounded-lg border-2 border-[#D4A024]/40 bg-gradient-to-b from-[#1a0a0a] via-black to-[#0a0606] shadow-[0_20px_60px_-15px_rgba(212,160,36,0.25)]"
      data-testid={`competence-card-${comp.id}`}
    >
      {/* Effet brillance qui balaye la carte au survol */}
      <span aria-hidden="true" className="certificate-shine pointer-events-none absolute inset-0 z-20" />

      {/* Filigrane coin haut gauche */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-[#D4A024]/40 rounded-tl-lg z-10 transition-colors duration-500 group-hover:border-[#D4A024]" />
      {/* Filigrane coin bas droit */}
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-[#D4A024]/40 rounded-br-lg z-10 transition-colors duration-500 group-hover:border-[#D4A024]" />

      {/* Sceau certification (haut droit) */}
      <div className="absolute top-4 right-4 z-10 flex flex-col items-center pointer-events-none">
        <div className="relative w-16 h-16 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
          <div className="absolute inset-0 rounded-full border-2 border-[#D4A024]/60 bg-[#7A2020]/30 backdrop-blur-sm flex items-center justify-center">
            <span className="text-[9px] font-serif text-[#D4A024] text-center leading-tight px-1">
              LA BAGUE<br/>IMPÉRIALE
            </span>
          </div>
        </div>
        <span className="mt-1 text-[8px] tracking-widest text-[#D4A024]/80 font-serif">CERTIFIÉ</span>
      </div>

      <div className="relative z-10 px-8 py-10 md:px-12 md:py-14 flex flex-col items-center text-center">
        {/* Logo / Illustration - médaillon plein cercle */}
        <div className="certificate-medal w-40 h-40 md:w-48 md:h-48 mb-6 flex items-center justify-center rounded-full bg-gradient-to-br from-[#D4A024]/10 to-[#7A2020]/10 border border-[#D4A024]/30 overflow-hidden transition-transform duration-500">
          {!logoError ? (
            <img
              src={comp.logo}
              alt={comp.titre}
              className="w-full h-full object-cover"
              onError={() => setLogoError(true)}
              data-testid={`competence-logo-${comp.id}`}
            />
          ) : (
            <Fallback className="w-3/4 h-3/4 text-[#D4A024]" strokeWidth={1.2} />
          )}
        </div>

        {/* Titre principal */}
        <p className="text-xs tracking-[0.3em] text-[#D4A024]/70 font-serif mb-2">
          CERTIFICAT DE COMPÉTENCE
        </p>
        <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-1">
          {comp.titre}
        </h2>
        {comp.sousTitre && (
          <p className="text-[#D4A024] text-base font-serif italic mb-6">
            {comp.sousTitre}
          </p>
        )}

        {/* Séparateur orné */}
        <div className="flex items-center gap-3 w-full max-w-xs mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4A024]/60 to-transparent" />
          <div className="w-2 h-2 rotate-45 bg-[#D4A024]" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#D4A024]/60 to-transparent" />
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-md mb-8">
          {comp.description}
        </p>

        {/* Label certification (masqué si vide) */}
        {comp.certifieLabel && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-[#D4A024]/50 bg-black/40">
            <Award className="w-4 h-4 text-[#D4A024]" />
            <span className="text-[#D4A024] text-xs tracking-widest font-serif">
              {comp.certifieLabel.toUpperCase()}
            </span>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-[#D4A024]/20 w-full max-w-xs">
          <p className="text-white font-serif text-lg italic">Winston</p>
          <p className="text-gray-500 text-[10px] tracking-widest mt-1">
            CONCIERGE &middot; LA BAGUE IMPÉRIALE &middot; DEPUIS 2013
          </p>
        </div>
      </div>
    </article>
  );
};

const CompetencesWinston = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* En-tête */}
      <div className="mb-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/assistant-ia')}
          className="text-gray-400 hover:text-[#D4A024] mb-6"
          data-testid="back-to-winston-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à Winston
        </Button>
        <div className="text-center md:text-left">
          <p className="text-[#D4A024]/80 text-sm tracking-[0.3em] font-serif mb-2">
            LA BAGUE IMPÉRIALE &middot; CONCIERGERIE
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-3">
            Les compétences de Winston
          </h1>
          <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto md:mx-0">
            Winston, concierge officiel du club, vous présente ses cinq domaines de compétence
            certifiés. Chaque carte est un engagement sur la qualité du conseil qui vous est rendu.
          </p>
        </div>
      </div>

      {/* Grille de certificats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {competences.map((comp) => (
          <CertificateCard key={comp.id} comp={comp} />
        ))}
      </div>

      {/* Pied de page officiel */}
      <div className="mt-12 text-center">
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-12 h-px bg-[#D4A024]/40" />
          <span className="text-[#D4A024]/70 text-xs tracking-[0.3em] font-serif">
            DOCUMENT OFFICIEL
          </span>
          <div className="w-12 h-px bg-[#D4A024]/40" />
        </div>
        <p className="text-gray-500 text-xs">
          La Bague Impériale &middot; Club fondé en 2013 &middot; Certifications émises par la Conciergerie Winston
        </p>
      </div>
    </div>
  );
};

export default CompetencesWinston;
