import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = {
  // Obtenir tous les membres
  getMembers: async () => {
    const response = await axios.get(`${API}/members`);
    return response.data;
  },

  // Obtenir un membre par ID
  getMember: async (id) => {
    const response = await axios.get(`${API}/members/${id}`);
    return response.data;
  },

  // Créer un nouveau membre
  createMember: async (memberData) => {
    const response = await axios.post(`${API}/members`, memberData);
    return response.data;
  },

  // Mettre à jour un membre
  updateMember: async (id, memberData) => {
    const response = await axios.put(`${API}/members/${id}`, memberData);
    return response.data;
  },

  // Supprimer un membre
  deleteMember: async (id) => {
    const response = await axios.delete(`${API}/members/${id}`);
    return response.data;
  },

  // Importer plusieurs membres
  importMembers: async (members) => {
    const response = await axios.post(`${API}/members/import`, { members });
    return response.data;
  },
};
