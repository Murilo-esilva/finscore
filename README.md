# FinScore

Controle financeiro pessoal com Score Financeiro, metas, gráficos, insights e gamificação.
SPA modular, sem frameworks pesados, construída com HTML5 + CSS3 + Tailwind CSS + JavaScript
ES6 (módulos nativos) + Firebase (Auth, Firestore, Storage), pronta para GitHub Pages.

Este README acompanha as **Etapas 1 e 2** do plano de entrega incremental do FinScore.

## ✅ O que já está pronto (Etapa 1)

- **Estrutura completa do projeto**, seguindo a arquitetura modular definida no briefing
  (`/css`, `/js/modules`, `/pages`, `/services`, `/components`, `/firebase`).
- **Configuração do Firebase** — `firebase/firebaseConfig.js` (placeholder pronto para suas
  chaves) e `js/modules/firebase.js` (inicialização do SDK modular v10, via CDN/ESM).
- **Regras de segurança do Firestore** — `firebase/firestore.rules`, particionando todos os
  dados por `uid` (ninguém acessa dados de outro usuário).
- **Sistema de autenticação completo**:
  - Login com Google (popup) e com e-mail/senha
  - Cadastro com e-mail/senha (cria automaticamente o documento em `/users/{uid}`)
  - "Esqueci minha senha"
  - Sessão persistente entre recarregamentos (`browserLocalPersistence`)
  - Guarda de rota: qualquer página em `/pages` redireciona para o login se não houver sessão
  - Logout
- **Layout responsivo base**:
  - Sidebar de navegação (desktop fixo, drawer no mobile)
  - Navbar com busca (placeholder), toggle de tema e menu do usuário
  - Dark mode / light mode / automático (segue o sistema), persistido em `localStorage`
  - Componentes reutilizáveis: `toast.js`, `loader.js` (+ skeletons), `modal.js` (com
    confirmação de exclusão pronta para uso futuro)
  - Páginas shell: Dashboard, Gastos, Relatórios, Perfil (com dados reais do usuário) e
    Configurações (com o seletor de tema já funcional)
- **Design system** em `css/variables.css` — paleta, tipografia (Space Grotesk + Inter +
  JetBrains Mono), sombras, glassmorphism discreto e o **Score Ring**, elemento de assinatura
  visual do produto (anel circular que representa o Score de 0 a 100).

## ✅ Etapa 2 — Cadastro e gerenciamento de despesas

- **CRUD completo de gastos** (`js/modules/expenses.js` + `pages/expenses.html`): criar,
  editar e excluir (com modal de confirmação), todos particionados por `uid`.
- **Campos do formulário**: valor, categoria (12 categorias padrão + criação de categorias
  personalizadas, salvas em `users/{uid}.categoriasCustom`), subcategoria, descrição, forma
  de pagamento, data e hora, observações e upload opcional de comprovante (Firebase Storage).
- **Localização automática**: botão que usa `navigator.geolocation` do navegador e resolve
  cidade/estado/país via geocodificação reversa gratuita e sem chave (BigDataCloud, CORS
  liberado para uso client-side) — grava `latitude`, `longitude`, `cidade`, `estado`, `pais`
  e `endereco` no gasto.
- **Busca instantânea, filtros e ordenação**: por descrição/categoria/cidade, categoria,
  forma de pagamento, período (data início/fim) e ordenação por data ou valor — tudo
  client-side, com paginação (8 itens por página).
- **Dashboard conectado a dados reais** (preview): total gasto no mês, quantidade de
  registros, distribuição por categoria (barras de progresso) e os 5 gastos mais recentes.
  O gráfico de pizza interativo (Chart.js) e o Score Financeiro chegam nas próximas etapas.

> Nota de arquitetura: `consultarPorUsuario` traz todos os gastos do usuário (filtrado só
> por `uid`, sem `orderBy` na query) e a ordenação/filtro/paginação acontece no cliente —
> isso evita a necessidade de criar um índice composto no Firestore nesta fase. Para uma
> base de usuários maior, vale revisitar isso com paginação por cursor no servidor.

## 🚧 Ainda não implementado (próximas etapas do plano)

Dashboard completo com Score real, sistema de metas, algoritmo do Score Financeiro, gráficos
interativos (Chart.js), gamificação/conquistas, relatórios e exportações, insights
inteligentes, e o polimento final. Os módulos
`js/modules/{dashboard,goals,score,charts,achievements,maps}.js` já existem como stubs
documentados, prontos para receber essa lógica sem quebrar a arquitetura atual.

## Estrutura de pastas

```
finscore/
├── index.html                 # Login / cadastro
├── assets/{images,icons}/
├── css/
│   ├── variables.css           # Design tokens
│   └── style.css               # Estilos globais (usa Tailwind via CDN em cada página)
├── js/
│   ├── app.js                   # Entry point das páginas autenticadas
│   └── modules/
│       ├── firebase.js          # Inicialização do Firebase SDK
│       ├── auth.js              # Orquestração da UI de login + guarda de rota
│       ├── utils.js             # Helpers (moeda, data, tema, score ring, etc.)
│       └── {expenses,dashboard,goals,score,charts,achievements,maps}.js  # stubs
├── pages/
│   ├── dashboard.html
│   ├── expenses.html
│   ├── reports.html
│   ├── profile.html
│   └── settings.html
├── services/
│   ├── authService.js           # Wrapper sobre Firebase Auth
│   ├── firestore.js             # CRUD genérico + ensureUserDocument
│   └── storageService.js        # Upload/exclusão de arquivos (Storage)
├── components/
│   ├── navbar.js
│   ├── sidebar.js
│   ├── modal.js
│   ├── toast.js
│   └── loader.js
└── firebase/
    ├── firebaseConfig.js         # ⚠️ Preencha com suas chaves
    └── firestore.rules
```

## Como rodar

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/), ative
   **Authentication** (Google + E-mail/senha), **Firestore Database** e **Storage**.
2. Cole suas credenciais em `firebase/firebaseConfig.js`.
3. Publique o conteúdo de `firebase/firestore.rules` em Firestore Database → Regras.
4. Sirva os arquivos como estáticos (GitHub Pages, ou localmente com
   `npx serve .` / extensão "Live Server") — como o projeto usa módulos ES6 (`type="module"`),
   **não abra o `index.html` direto do disco** (`file://`); use sempre um servidor HTTP.
5. Acesse `index.html`, crie uma conta ou entre com Google.

## Notas técnicas

- Sem build step: Tailwind e Firebase são carregados via CDN em cada página.
- `iniciarPagina(paginaAtiva, callback)` (`js/app.js`) é o único ponto de entrada que toda
  página autenticada precisa chamar — ele aplica o tema, protege a rota e injeta o layout.
- Todas as coleções do Firestore são particionadas por `uid`, tanto no código
  (`services/firestore.js`) quanto nas regras (`firebase/firestore.rules`).
