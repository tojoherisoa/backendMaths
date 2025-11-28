# Predictor Academy - Backend

## Description
Backend API pour Predictor Academy. Fournit des services d'analyse de séquences mathématiques et d'extraction de nombres depuis des images via OCR.

## Stack Technique
- **Runtime**: Node.js + TypeScript
- **Framework**: Express
- **ORM**: Prisma (SQL Server)
- **OCR**: Tesseract.js
- **Upload**: Multer

## Installation

```bash
# Installer les dépendances
yarn install

# Générer le client Prisma
yarn prisma:generate

# Pousser le schéma vers la base de données
yarn prisma:push
```

## Configuration

Créer un fichier `.env` :

```env
DATABASE_URL="sqlserver://localhost:1433;database=mathdbeducation;user=sa;password=fredPassword@SqlServer2025;encrypt=true;trustServerCertificate=true"
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Démarrage

```bash
# Mode développement
yarn dev

# Build production
yarn build

# Démarrer en production
yarn start
```

## API Endpoints

### POST /api/session
Créer une nouvelle session d'apprentissage.

**Body:**
```json
{
  "studentName": "John Doe",
  "mode": "EDUCATION"
}
```

### POST /api/predict
Analyser une séquence de nombres et prédire les valeurs suivantes.

**Body:**
```json
{
  "history": [2, 4, 6, 8],
  "sessionId": "uuid"
}
```

**Response:**
```json
{
  "nextValues": [10, 12, 14],
  "confidence": 0.99,
  "isDeterministic": true,
  "type": "ARITHMETIC"
}
```

### POST /api/upload
Extraire des nombres depuis une image via OCR.

**Body:** FormData avec un champ `image`

**Response:**
```json
{
  "success": true,
  "numbers": [1.30, 1.14, 1.16, 1.43, ...],
  "count": 30
}
```

## Structure

```
Back/
├── src/
│   ├── index.ts              # Point d'entrée
│   ├── lib/
│   │   └── prisma.ts         # Client Prisma
│   ├── services/
│   │   ├── predictionService.ts  # Moteur mathématique
│   │   ├── sessionService.ts     # Gestion des sessions
│   │   └── ocrService.ts         # Extraction OCR
│   └── routes/
│       ├── predict.ts
│       ├── session.ts
│       └── upload.ts
├── prisma/
│   └── schema.prisma
└── package.json
```
