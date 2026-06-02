# FUTM 1.0

Jogo de futebol online com Next.js + Supabase + Vercel.

---

## 1. Supabase — configurar o banco

1. Acessa [supabase.com](https://supabase.com) e cria um projeto novo
2. Vai em **SQL Editor** → **New query**
3. Cola o conteúdo do arquivo `supabase/schema.sql` e clica em **Run**
4. Vai em **Project Settings → API** e copia:
   - `Project URL`
   - `anon public` key

---

## 2. Configurar variáveis de ambiente

Abre o arquivo `.env.local` e substitui com seus valores reais:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

---

## 3. Rodar local (Windows Terminal)

```powershell
cd futm
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 4. Subir no GitHub

```powershell
git init
git add .
git commit -m "futm v1.0"
git branch -M main
git remote add origin https://github.com/SEU_USER/futm.git
git push -u origin main
```

---

## 5. Deploy no Vercel

```powershell
npm i -g vercel
vercel
```

Quando pedir, responde:
- Set up and deploy? **Y**
- Which scope? escolhe seu usuário
- Link to existing project? **N**
- Project name: **futm**
- In which directory? **./**
- Override settings? **N**

Depois adiciona as env vars no Vercel:

```powershell
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel --prod
```

Pronto! Você tem um link público pra mandar pro time.

---

## Estrutura

```
futm/
├── src/
│   ├── app/
│   │   ├── page.tsx        ← jogo completo
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── lib/
│       └── supabase.ts     ← cliente Supabase
├── supabase/
│   └── schema.sql          ← cole no SQL Editor
├── .env.local              ← suas keys (não sobe pro git)
└── package.json
```
