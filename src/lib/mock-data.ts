import type { Episode, Idea, AbsurdVote } from "./types";

export const seedEpisodes: Episode[] = [
  {
    id: "ep-1",
    number: 1,
    title: "Le Pilote — Premier Verre",
    date: "2025-03-12",
    place: "Bar à Vin, Le Marais",
    cover: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&q=80",
    reviews: {
      samuel: {
        rating: 5,
        favoriteMoment: "Quand elle a ri à ma blague pourrie sur les sommeliers",
        awkwardMoment: "J'ai renversé un peu de vin sur la table. Classique.",
        funnyQuote: "« Tu ressembles vaguement à un acteur de série turque. »",
        summary: "Soirée parfaite. On a parlé pendant 4h sans voir le temps passer.",
        wouldRedo: "yes",
        song: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
      },
      mathilde: {
        rating: 4,
        favoriteMoment: "Sa tête quand il a réalisé que je connaissais le vin mieux que lui",
        awkwardMoment: "Le silence après sa blague sur les sommeliers",
        funnyQuote: "« Promis je bois pas autant d'habitude. »",
        summary: "Charmant. Un peu nerveux mais c'est mignon. À refaire.",
        wouldRedo: "yes",
        song: "",
      },
    },
  },
  {
    id: "ep-2",
    number: 2,
    title: "Le Cliffhanger — Cinéma Mystère",
    date: "2025-03-22",
    place: "MK2 Bibliothèque",
    cover: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80",
    reviews: {
      samuel: {
        rating: 4,
        favoriteMoment: "Sa main dans la mienne pendant la scène flippante",
        awkwardMoment: "J'ai sursauté plus fort qu'elle.",
        funnyQuote: "« Tu cries comme ma grand-mère. »",
        summary: "Film moyen, compagnie excellente.",
        wouldRedo: "yes",
        song: "",
      },
    },
  },
  {
    id: "ep-3",
    number: 3,
    title: "Le Spin-off — Brunch Dominical",
    date: "2025-04-06",
    place: "Holybelly, 10e",
    cover: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80",
    reviews: {},
  },
];

export const seedIdeas: Idea[] = [
  {
    id: "id-1",
    title: "Escape Game thématique horreur",
    description: "Voir qui pleure en premier.",
    proposedBy: "Samuel",
    status: "voting",
    likes: ["Mathilde"],
    dislikes: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "id-2",
    title: "Cours de poterie raté",
    description: "Façon Ghost mais on rigole de nous-mêmes.",
    proposedBy: "Mathilde",
    status: "selected",
    likes: ["Samuel", "Mathilde"],
    dislikes: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "id-3",
    title: "Pique-nique au cimetière du Père-Lachaise",
    description: "Goth date énergie.",
    proposedBy: "Samuel",
    status: "voting",
    likes: [],
    dislikes: ["Mathilde"],
    createdAt: new Date().toISOString(),
  },
  {
    id: "id-4",
    title: "Karaoké gênant à Belleville",
    description: "Obligatoire au moins une chanson en duo.",
    proposedBy: "Amis Samuel",
    status: "scheduled",
    likes: ["Samuel", "Mathilde", "Amis Samuel"],
    dislikes: [],
    createdAt: new Date().toISOString(),
  },
];

export const seedAbsurdVotes: AbsurdVote[] = [
  {
    id: "v-1",
    question: "Quel est l'épisode le plus likely à devenir un meme ?",
    options: ["E01 Premier Verre", "E02 Cinéma Mystère", "Aucun, c'est tous des chefs-d'œuvre"],
    votes: {},
  },
  {
    id: "v-2",
    question: "Si cette série avait un narrateur, ce serait :",
    options: ["David Attenborough", "Stéphane Bern", "La voix de Koh-Lanta", "Gad Elmaleh (sans son accord)"],
    votes: {},
  },
  {
    id: "v-3",
    question: "Quel renouvellement pour la saison 2 ?",
    options: ["Renouvelée 🎉", "En pause créative", "Spin-off avec les amis", "Annulée par la chaîne"],
    votes: {},
  },
];