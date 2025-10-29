// Vercel serverless adaptation du server.mjs principal
// Import et adaptation du serveur Express pour Vercel

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Import de server.mjs (adaptation nécessaire)
// Note: Le fichier server.mjs principal doit être adapté pour export

export default async function handler(req, res) {
  // Adapter le serveur Express pour fonctionner comme function serverless
  // Cette approche nécessite une refactorisation de server.mjs
  
  res.status(200).json({ 
    message: 'MediScribe API sur Vercel',
    status: 'Configuration requise pour adaptation serverless'
  });
}
