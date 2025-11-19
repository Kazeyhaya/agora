Agora. 
Plataforma Social com Comunidades e Chat

Uma aplicação full‑stack inspirada em Discord/Orkut, com feed social, comunidades, fórum, chat em tempo real e perfis personalizáveis.

🚀 Funcionalidades Principais

* **Feed social** com posts, comentários e likes
* **Explorar** posts de toda a rede
* **Perfis completos** com bio, mood, avatar e avaliações
* **Depoimentos** entre usuários
* **Sistema de seguidores**
* **Comunidades** (criar, entrar, sair)
* **Fórum interno** dentro de cada comunidade
* **Chat privado em tempo real** com Socket.io
* **Uploads de avatar**
* **Vibe do dia** (função extra de sorte/diversão)

🧪 Tecnologias Utilizadas

Frontend

* HTML5
* CSS3 (tema escuro moderno)
* JavaScript puro
* Interface responsiva estilo Discord

Backend

* Node.js
* Express.js
* Socket.io (mensagens diretas)

Banco de Dados

* PostgreSQL
* Múltiplas tabelas (posts, comunidades, comentários, mensagens, avaliações, etc.)

📁 Estrutura do Projeto

```
📦 raiz do projeto
 ┣ 📂 assets         # CSS, imagens e scripts
 ┣ 📂 src
 ┃ ┣ 📂 models       # db.js e comunicação com PostgreSQL
 ┃ ┣ 📂 routes       # Rotas da API REST
 ┃ ┣ 📂 socket       # Handler do Socket.io
 ┃ ┗ server.js       # Servidor principal
 ┣ agora.html        # Página principal SPA
 ┗ README.md
```

🧩 Funcionalidades Detalhadas

👤 Perfis

* Avatar (upload de imagem)
* Mood editável
* Bio personalizada
* Avaliações: Confiável, Legal, Divertido
* Depoimentos públicos
* Lista de amigos (seguindo)

📝 Feed Social

* Criar posts
* Curtir e descurtir
* Comentar
* Editar posts
* Ver posts de quem você segue

🌐 Explorar

* Ver posts da rede toda
* Encontrar novas pessoas

🧭 Comunidades

* Criar comunidade com nome + emoji
* Entrar/sair
* Ver membros
* Tópicos do fórum
* Criar posts dentro da comunidade

💬 Chat Direto (DM)

* Mensagens em tempo real via Socket.io
* Histórico salvo no banco
* Interface moderna com avatar e timestamps

🗄️ Banco de Dados

Estrutura principal das tabelas (simplificada):

* **profiles**: bio, mood, avatar
* **posts**: feed principal
* **comments**: comentários de posts
* **follows**: seguir usuários
* **testimonials**: depoimentos
* **profile_ratings**: avaliações
* **communities**: comunidades criadas
* **community_members**: membros
* **community_posts**: tópicos
* **messages**: chat privado

Tudo é criado automaticamente por `setupDatabase()`.

▶️ Como Rodar o Projeto

1. Instalar dependências

```
npm install
```

2. Configurar variáveis de ambiente

Crie um arquivo `.env` com:

```
DATABASE_URL=postgres://usuario:senha@host:5432/nome_banco
```

3. Iniciar o servidor

```
npm start
```

O app inicia em:

```
http://localhost:3000
```

🧪 Scripts Úteis

* `npm start` — inicia o servidor com banco já configurado
* `npm run dev` — inicia com nodemon (se configurado)

🛠️ Melhorias Futuras

* Sistema de notificações
* Página de registro/login real
* Publicação de imagens nos posts
* Comunidades privadas
* Sistema de permissões (admin/mod)

📜 Licença

Projeto livre para uso e estudo.
