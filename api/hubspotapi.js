import axios from 'axios';
import 'dotenv/config';

// Create the HubSpot API instance
export const hubspotAPI = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}` // Use your API Key from .env
  },
});

export const hubspotAPIFile = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}` // Use your API Key from .env
  },
});
