# 📧 Configuration de la Vérification Email

## ✅ Statut Actuel

La **vérification email est déjà implémentée dans le code** :
- ✅ Toutes les pages d'inscription vérifient si `authData.session` existe
- ✅ Si absent → email envoyé, utilisateur redirigé vers `/login`
- ✅ Message toast informatif affiché

**Fichiers concernés :**
- `src/pages/Signup.tsx` (lignes 136-143)
- `src/pages/SignupSolo.tsx` (lignes 206-213)
- `src/pages/SignupCabinet.tsx` (lignes 250-257)

## ⚙️ Configuration Requise dans Supabase

### 1. Activer la Vérification Email

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet **MediScribe**
3. Aller dans **Authentication** → **Settings** → **Email Auth**
4. Vérifier que **"Confirm email"** est activé

### 2. Configurer les Templates Email

1. **Authentication** → **Email Templates**
2. Vérifier que le template **"Confirm signup"** est configuré
3. Modifier si nécessaire :

```html
<h2>Bienvenue sur MediScribe !</h2>

<p>Cliquez sur le lien ci-dessous pour confirmer votre adresse email :</p>

<p><a href="{{ .ConfirmationURL }}">Confirmer mon email</a></p>

<p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
```

### 3. Configurer l'URL de Redirection

**Important :** Configurer l'URL de redirection après confirmation

Dans le code d'inscription, ajouter `emailRedirectTo` :

```typescript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: formData.email,
  password: formData.password,
  options: {
    emailRedirectTo: window.location.origin + '/login',
    data: {
      full_name: formData.fullName,
      specialty: formData.specialty,
    },
  },
});
```

### 4. Vérifier les Réglages SMTP

1. **Authentication** → **Settings** → **SMTP Settings**
2. Par défaut, Supabase utilise ses serveurs SMTP (limité)
3. Pour la production, configurer un service SMTP custom :
   - **SendGrid**
   - **AWS SES**
   - **Mailgun**
   - **Postmark**

---

## 🔧 AMÉLIORATION PROPOSÉE

Actuellement, le code vérifie si `!authData.session` mais ne spécifie pas `emailRedirectTo`.

**Proposition :** Ajouter `emailRedirectTo` dans tous les `signUp()` pour redirection après confirmation.

Souhaitez-vous que je mette à jour le code maintenant ? ✅

---

## 🧪 Tester la Vérification

### Test en Développement

1. Créer un compte avec email valide
2. Vérifier console Supabase → **Logs** → **Auth Logs**
3. Vérifier que l'email est envoyé
4. Cliquer sur le lien dans l'email
5. Tenter de se connecter

### Vérifier les Logs

```bash
# Dans console Supabase
Authentication → Logs → Auth Logs

# Chercher:
- "signup" events
- "email_confirmed" events
```

---

## ⚠️ Comportement par Défaut Supabase

Selon la configuration de votre projet Supabase :

- **Si "Confirm email" est DESACTIVÉ** : 
  - ✅ `authData.session` est créée immédiatement
  - ✅ Utilisateur connecté automatiquement
  - ⚠️ Pas de vérification email

- **Si "Confirm email" est ACTIVÉ** :
  - ❌ Pas de `authData.session` créée
  - ✅ Email envoyé automatiquement
  - ✅ Utilisateur doit cliquer sur le lien
  - ✅ Après confirmation → session créée

---

## 📊 Récapitulatif

| Composant | Statut | Action Requise |
|-----------|--------|----------------|
| Code Frontend | ✅ Implémenté | - |
| Gestion session | ✅ Vérifiée | - |
| Templates Email | ⚠️ À vérifier | Configurer dans Supabase |
| Redirection | ⚠️ À améliorer | Ajouter `emailRedirectTo` |
| SMTP | ⚠️ Par défaut | Optionnel pour prod |

**Prochaine étape recommandée :** Ajouter `emailRedirectTo` dans les 3 pages d'inscription.

