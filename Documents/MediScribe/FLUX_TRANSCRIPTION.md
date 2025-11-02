# 🔄 FLUX COMPLET DE TRANSCRIPTION - MediScribe

## 📋 Vue d'ensemble

Ce document décrit le flux complet de l'enregistrement audio jusqu'à la transcription finale via Mistral AI.

---

## 🔗 FLUX ARCHITECTURAL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND - AudioRecorder Component                                      │
│    - Enregistrement audio via MediaRecorder API                            │
│    - Format: audio/webm;codecs=opus                                       │
│    - Échantillonnage: 44100 Hz                                             │
│    - Ajustements: echoCancellation, noiseSuppression                      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND - RecordPage Component                                          │
│    - Création consultation dans Supabase                                   │
│    - Récupération clé API Mistral depuis backend                           │
│    - Appel MistralService.transcribeAudio()                                │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. FRONTEND - services.ts / MistralService                                  │
│    - Construction FormData avec fichier audio                              │
│    - Headers: x-user-id, x-api-key                                         │
│    - POST vers: {VITE_API_URL}/api/transcribe                             │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. BACKEND - server.mjs /api/transcribe                                     │
│    Middlewares:                                                              │
│    ✅ csrfProtection - Protection CSRF                                     │
│    ✅ apiLimiter - Rate limiting (20 req/min)                              │
│    ✅ upload.single('file') - Multer file upload (25MB max)               │
│    ✅ validateHeaders(['x-user-id']) - Validation UUID                     │
│    ✅ auditLog.middleware('transcribe_audio') - Audit trail               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. BACKEND - Récupération clé API                                          │
│    - Si x-api-key présente → utilisation directe                          │
│    - Sinon → getApiKey(userId) depuis Supabase                            │
│    - Déchiffrement AES-256 avec VITE_ENCRYPTION_KEY                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. BACKEND - Appel Mistral AI API                                          │
│    POST https://api.mistral.ai/v1/audio/transcriptions                     │
│    - Authorization: Bearer {apiKey}                                        │
│    - Model: voxtral-mini-transcribe-2507                                   │
│    - Language: fr                                                           │
│    - Timeout: 120 secondes (AbortController)                              │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. MISTRAL AI - Transcription                                               │
│    - Traitement audio WebM                                                 │
│    - Retour format: { text: "transcription..." }                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. BACKEND - Traitement réponse                                             │
│    - Parsing: result.text || result.transcription || result.transcript     │
│    - Validation: texte non vide                                            │
│    - Métriques: audio_transcribed, transcription_completed                │
│    - Retour: { transcript: "...", success: true }                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 9. FRONTEND - services.ts / MistralService                                  │
│    - Extraction result.transcript                                           │
│    - Validation texte non vide                                             │
│    - Retour transcription                                                   │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 10. FRONTEND - RecordPage Component                                         │
│     - setTranscript(transcription)                                          │
│     - Affichage pour validation utilisateur                                │
│     - Step: review_transcript                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 POINTS CRITIQUES

### 1. Configuration Requise

#### Backend (`server.mjs`)
```javascript
// Variables d'environnement obligatoires
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_ENCRYPTION_KEY=32+ caractères pour AES-256
SUPABASE_SERVICE_ROLE_KEY=clé service role
```

#### Frontend (`.env.local`)
```javascript
VITE_API_URL=http://localhost:3001  // ou URL production
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=clé anonyme
VITE_ENCRYPTION_KEY=same que backend
```

### 2. Sécurité

- ✅ **CSRF Protection**: Token CSRF requis pour POST
- ✅ **Rate Limiting**: 20 requêtes/minute par IP
- ✅ **Validation**: UUID userId, taille fichier, format
- ✅ **Chiffrement**: AES-256 pour clés API
- ✅ **Audit**: Logs de toutes les transcriptions
- ✅ **CORS**: Origines configurées (localhost + production)

### 3. Gestion Erreurs

#### Niveaux d'erreur :
1. **Frontend** : 
   - Validation blob audio (vide/invalide)
   - Erreur réseau fetch
   - User feedback via toast

2. **Backend** :
   - Fichier manquant → 400
   - Clé API manquante → 400
   - Erreur Mistral → status Mistral + message
   - Timeout → 504 (120s)
   - Erreur serveur → 500

3. **Mistral AI** :
   - Quota dépassé → 429
   - Format invalide → 400
   - Authentification → 401

### 4. Logs & Monitoring

```javascript
// Frontend
console.log('🎬 DÉBUT transcribeAudio')
console.log('📡 Envoi requête transcription à:', url)
console.log('✅ Résultat transcription:', result)

// Backend
console.log('🎯 REQUÊTE TRANSCRIPTION REÇUE!')
console.log('🚀 Appel API Mistral transcription...')
console.log('✅ Transcription réussie, longueur texte:', text.length)

// Winston
advancedLogger.business('transcription_completed', {...})
metricsDashboard.recordBusinessEvent('audio_transcribed', {...})
```

---

## 🧪 TESTS

### Test Manuel

1. **Démarrer serveur** : `npm run server` ou `node server.mjs`
2. **Démarrer frontend** : `npm run dev`
3. **Enregistrer audio** via AudioRecorder
4. **Vérifier logs** console + `api-server.log`
5. **Vérifier métriques** : `/dashboard` ou `logs/metrics-snapshot.json`

### Test API Direct

```bash
# Health check
curl http://localhost:3001/api/health

# Transcription (avec token CSRF)
curl -X POST http://localhost:3001/api/transcribe \
  -H "x-user-id: {uuid}" \
  -H "x-api-key: {mistral-key}" \
  -H "x-csrf-token: {token}" \
  -F "file=@audio.webm"
```

---

## 🐛 DÉBOGAGE

### Problème courant #1 : "Clé API non configurée"

**Symptômes** : Erreur 400, message "Clé API non configurée"

**Solutions** :
1. Vérifier `SUPABASE_SERVICE_ROLE_KEY` dans `.env.server`
2. Vérifier profil utilisateur dans Supabase
3. Vérifier clé chiffrée dans `profiles.personal_mistral_api_key`
4. Vérifier `VITE_ENCRYPTION_KEY` identique frontend/backend

### Problème courant #2 : "Timeout 504"

**Symptômes** : Timeout après 120 secondes

**Solutions** :
1. Réduire durée audio (< 5 minutes recommandé)
2. Augmenter timeout dans `server.mjs` (ligne 613)
3. Vérifier connexion réseau → Mistral AI

### Problème courant #3 : "Erreur CORS"

**Symptômes** : "Not allowed by CORS" dans console

**Solutions** :
1. Vérifier `VITE_API_URL` correcte
2. Vérifier `corsOptions.origin` dans `server.mjs` (lignes 139-188)
3. Ajouter origine frontend si déployé

### Problème courant #4 : "Transcription vide"

**Symptômes** : Pas d'erreur mais transcription = ""

**Solutions** :
1. Vérifier audio non corrompu
2. Vérifier format audio supporté (webm recommandé)
3. Vérifier réponse Mistral dans logs (ligne 657-676)

---

## 📊 MÉTRIQUES & MONITORING

### Dashboard HTML
Accès : `http://localhost:3001/dashboard`

### Métriques Business
- `audio_transcribed` : Nombre transcriptions
- `transcription_completed` : Succès transcriptions
- Temps réponse P95
- Taux d'erreur

### Logs Fichiers
- `logs/app/application-*.log` : Tous les logs
- `logs/app/errors-*.log` : Erreurs uniquement
- `logs/business/metrics-*.log` : Métriques
- `logs/performance/performance-*.log` : Performance

---

## ✅ CHECKLIST FONCTIONNEMENT

- [ ] Serveur démarre sans erreur
- [ ] `/api/health` retourne 200
- [ ] Enregistrement audio fonctionne
- [ ] Upload fichier vers backend
- [ ] Clé API récupérée depuis Supabase
- [ ] Appel Mistral AI réussi
- [ ] Transcription retournée
- [ ] Affichage transcription OK
- [ ] Logs générés correctement
- [ ] Métriques enregistrées

---

## 🚀 PROCHAINES AMÉLIORATIONS

1. **Retry Logic** : Retry automatique sur échec temporaire
2. **Circuit Breaker** : Éviter surcharge Mistral
3. **Queue System** : Gérer pics de trafic
4. **WebSocket** : Streaming transcription en temps réel
5. **Multiple Providers** : Fallback OpenAI si Mistral down

---

*Document généré le ${new Date().toLocaleDateString('fr-FR')}*

