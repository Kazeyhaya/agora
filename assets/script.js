// ===================================================
// 1. ESTADO GLOBAL E OBJETOS DOM
// ===================================================
let currentUser = null;
let activeChannel = "geral"; 
let viewedUsername = null;
let currentCommunityId = null; 
let currentCommunityName = null; 
let DOM = {};
let LoginDOM = {};
const socket = io({ autoConnect: false });

// ===================================================
// 1.5 FUNÇÕES AUXILIARES
// ===================================================

function escapeHtml(s) {
  if (!s) return "";
  return s.replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[m]));
}

// 👇 NOVA FUNÇÃO (Para renderizar avatares)
// Recebe um elemento (DOM.profileAvatar) e os dados (user, avatar_url)
function renderAvatar(element, { user, avatar_url }) {
  if (!element) return;

  element.innerHTML = ""; // Limpa o texto (ex: "AL")
  
  if (avatar_url) {
    // Se tem URL, coloca como imagem de fundo
    element.style.backgroundImage = `url(${avatar_url})`;
  } else {
    // Se não tem, volta ao texto
    element.style.backgroundImage = 'none';
    const initials = (user || "?").slice(0, 2).toUpperCase();
    element.textContent = escapeHtml(initials);
  }
}

// ===================================================
// 2. LÓGICA DE API E RENDERIZAÇÃO
// ===================================================

async function apiGetPosts() {
  try {
    const response = await fetch(`/api/posts?user=${encodeURIComponent(currentUser)}`);
    if (!response.ok) return;
    const data = await response.json();
    renderPosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts:", err); }
}
async function apiGetExplorePosts() {
  try {
    const response = await fetch('/api/posts/explore'); 
    if (!response.ok) return;
    const data = await response.json();
    renderExplorePosts(data.posts || []); 
  } catch (err) { console.error("Falha ao buscar posts do explorar:", err); }
}
async function apiCreatePost() {
  const text = DOM.feedInput.value.trim();
  if (!text) return;
  DOM.feedSend.disabled = true;
  try {
    await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, text: text }) });
    DOM.feedInput.value = ""; 
    apiGetPosts(); 
  } catch (err) { console.error("Falha ao criar post:", err); }
  DOM.feedSend.disabled = false;
}
async function apiLikePost(postId) {
  try { await fetch(`/api/posts/${postId}/like`, { method: 'POST' }); } catch (err) { console.error("Falha ao dar like:", err); }
} 
async function apiUnlikePost(postId) {
  try { await fetch(`/api/posts/${postId}/unlike`, { method: 'POST' }); } catch (err) { console.error("Falha ao descurtir:", err); }
}
function renderPosts(posts) {
  if (!DOM.postsEl) return;
  if (posts.length === 0) { DOM.postsEl.innerHTML = "<div class='meta' style='padding: 12px;'>O seu feed está vazio.</div>"; return; }
  renderPostList(DOM.postsEl, posts);
}
function renderExplorePosts(posts) {
  if (!DOM.explorePostsEl) return;
  if (posts.length === 0) { DOM.explorePostsEl.innerHTML = "<div class='meta' style='padding: 12px;'>Ainda não há posts na rede.</div>"; return; }
  renderPostList(DOM.explorePostsEl, posts);
}
function renderPostList(containerElement, posts) {
  containerElement.innerHTML = ""; 
  posts.forEach(post => {
    const node = document.createElement("div");
    node.className = "post";
    // Nota: O avatar do post ainda é estático (baseado no nome)
    // Teríamos de fazer um 'join' na BD para buscar o avatar_url de cada 'post.user'
    const postUserInitial = (post.user || "?").slice(0, 2).toUpperCase();
    const postTime = new Date(post.timestamp).toLocaleString('pt-BR');
    
    node.innerHTML = `
      <div class="avatar-display post-avatar" style="background-image: none;">${escapeHtml(postUserInitial)}</div>
      <div>
        <div class="meta"><strong class="post-username" data-username="${escapeHtml(post.user)}">${escapeHtml(post.user)}</strong> • ${postTime}</div>
        <div>${escapeHtml(post.text)}</div>
        <div class="post-actions"><button class="mini-btn" data-like="${post.id}">❤ ${post.likes || 0}</button><button class="mini-btn" data-comment="${post.id}">Comentar</button></div>
        <div class="comments" id="comments-for-${post.id}"></div>
      </div>`;
    containerElement.appendChild(node);
    apiGetComments(post.id);
  });
}
async function apiGetComments(postId) {
  try {
    const res = await fetch(`/api/posts/${postId}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    renderComments(postId, data.comments || []);
  } catch (err) { console.error(`Falha ao buscar comentários para o post ${postId}:`, err); }
}
async function apiCreateComment(postId, text) {
  try {
    await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, text: text }) });
    apiGetComments(postId); 
  } catch (err) { console.error("Falha ao criar comentário:", err); }
}
function renderComments(postId, comments) {
  const container = document.getElementById(`comments-for-${postId}`);
  if (!container) return; 
  if (comments.length === 0) { container.innerHTML = ""; return; }
  container.innerHTML = comments.map(item => `<div class="meta"><strong>${escapeHtml(item.user)}</strong>: ${escapeHtml(item.text)}</div>`).join(""); 
}

// --- Funções de Perfil, Mood, Avatar ---

async function apiGetProfile(username) { 
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(username)}`);
    if (!res.ok) return;
    
    // 'data' agora contém { user, bio, mood, avatar_url }
    const profileData = await res.json(); 
    
    // Atualiza o perfil na Página de Perfil
    if (DOM.profileBioEl) {
      DOM.profileBioEl.textContent = profileData.bio;
    }
    if (DOM.profileMoodEl) {
      DOM.profileMoodEl.textContent = `Mood: ${profileData.mood || "✨"}`;
    }
    // Renderiza o avatar na Página de Perfil
    renderAvatar(DOM.profileAvatarEl, profileData);

    // Atualiza a Userbar (SÓ se for o utilizador atual)
    if (username === currentUser) {
      if (DOM.userbarMood) {
        DOM.userbarMood.textContent = profileData.mood || "✨";
      }
      // Renderiza o avatar na Userbar
      renderAvatar(DOM.userAvatarEl, profileData);
    }

  } catch (err) { 
    console.error("Falha ao buscar perfil:", err);
    if (DOM.profileBioEl) DOM.profileBioEl.textContent = "Erro ao carregar bio.";
    if (DOM.profileMoodEl) DOM.profileMoodEl.textContent = "Mood: (erro)";
  }
} 

async function apiUpdateMood() {
  const currentMood = DOM.userbarMood.textContent;
  const newMood = prompt("Qual é o seu novo mood?", currentMood);
  if (newMood === null || newMood.trim() === "") return;
  const mood = newMood.trim();
  DOM.userbarMood.textContent = "Salvando...";
  try {
    const res = await fetch('/api/profile/mood', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ user: currentUser, mood: mood }) 
    });
    if (!res.ok) throw new Error('Falha ao salvar');
    const data = await res.json();
    DOM.userbarMood.textContent = data.mood;
  } catch (err) {
    console.error("Falha ao salvar mood:", err);
    DOM.userbarMood.textContent = currentMood;
    alert("Não foi possível salvar seu mood.");
  }
}

async function apiUpdateBio() {
  const newBio = prompt("Digite sua nova bio:", DOM.profileBioEl.textContent);
  if (newBio === null || newBio.trim() === "") return; 
  try {
    const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user: currentUser, bio: newBio.trim() }) });
    if (!res.ok) return;
    const data = await res.json();
    if (DOM.profileBioEl) DOM.profileBioEl.textContent = data.bio;
  } catch (err) { console.error("Falha ao salvar bio:", err); }
}

// 👇 NOVA FUNÇÃO (Para fazer o upload do avatar)
async function apiUploadAvatar(event) {
  const file = event.target.files[0];
  if (!file) return; // Nenhum ficheiro selecionado

  // 1. Mostrar que está a carregar
  if (DOM.profileAvatarEl) DOM.profileAvatarEl.textContent = "⏳";
  if (DOM.userAvatarEl) DOM.userAvatarEl.textContent = "⏳";

  // 2. Preparar os dados (FormData é obrigatório para ficheiros)
  const formData = new FormData();
  formData.append('avatar', file); // 'avatar' deve ser o mesmo nome do 'upload.single()'
  formData.append('user', currentUser); // Envia o nome do utilizador

  // 3. Enviar para a API
  try {
    const res = await fetch('/api/profile/avatar', {
      method: 'POST',
      body: formData // Não definimos 'Content-Type', o 'fetch' fá-lo por nós
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Erro do servidor');
    }

    const data = await res.json(); // { avatar_url: "http://..." }

    // 4. Atualizar os avatares na UI com o novo URL
    const profileData = { user: currentUser, avatar_url: data.avatar_url };
    renderAvatar(DOM.profileAvatarEl, profileData);
    renderAvatar(DOM.userAvatarEl, profileData);

  } catch (err) {
    console.error("Falha ao fazer upload do avatar:", err);
    alert(`Erro ao fazer upload: ${err.message}`);
    // Recarrega o perfil antigo em caso de erro
    apiGetProfile(currentUser);
  }
}

// (O resto das funções de API: Testimonials, Community, etc... ficam iguais)
async function apiGetTestimonials(username) { /* ... */ }
function renderTestimonials(testimonials) { /* ... */ }
async function apiCreateTestimonial() { /* ... */ }
async function apiGetCommunityPosts(communityId) { /* ... */ }
function renderCommunityPosts(posts) { /* ... */ }
async function apiGetFollowing(username) { /* ... */ }
function renderFollowing(followingList) { /* ... */ }
async function apiJoinCommunity(communityId, button) { /* ... */ }
async function apiCreateCommunity(name, emoji, button) { /* ... */ }
async function apiGetJoinedCommunities() { /* ... */ }
function renderJoinedCommunities(communities) { /* ... */ }
async function apiGetExploreCommunities() { /* ... */ }
function renderExploreCommunities(communities) { /* ... */ }

// ===================================================
// 3. LÓGICA DO CHAT (Socket.IO)
// (Secção inteira sem mudanças)
// ...
function renderChannel(name) { /* ... */ }
function addMessageBubble({ user, timestamp, message }) { /* ... */ }
function sendChatMessage() { /* ... */ }
socket.on('loadHistory', (messages) => { /* ... */ });
socket.on('newMessage', (data) => { /* ... */ });

// ===================================================
// 4. EVENTOS (Conexões dos Botões)
// (Secção inteira sem mudanças)
// ...
function handlePostClick(e) { /* ... */ }

// ===================================================
// 5. LÓGICA DE TROCA DE VISÃO (Views)
// (Secção inteira sem mudanças)
// ...
function activateView(name, options = {}) { /* ... */ }
function activateCommunityView(name, options = {}) { /* ... */ }

// ===================================================
// 6. LÓGICA DE PERFIL DINÂMICO E SEGUIR
// ===================================================

async function showDynamicProfile(username) {
  if (!username) return;
  
  // Esta função agora carrega bio, mood e avatar
  apiGetProfile(username);
  
  apiGetTestimonials(username);
  apiGetFollowing(username); 
  DOM.profileNameEl.textContent = username;
  
  // Limpa o estilo do avatar do perfil (para o caso de ser o dono)
  DOM.profileAvatarEl.classList.remove('is-owner');
  DOM.avatarUploadLabel.style.display = 'none';

  DOM.editBioBtn.disabled = true; 
  if (username === currentUser) {
    // É O DONO DO PERFIL
    DOM.editBioBtn.textContent = "Editar bio";
    DOM.editBioBtn.onclick = apiUpdateBio; 
    DOM.editBioBtn.disabled = false;
    
    // 👇 NOVO: Mostra o botão de upload e adiciona o 'hover'
    DOM.profileAvatarEl.classList.add('is-owner');
    // (A label está escondida, usamos o clique no próprio avatar)

  } else {
    // É OUTRO UTILIZADOR
    DOM.editBioBtn.disabled = false;
    try {
      const res = await fetch(`/api/isfollowing/${encodeURIComponent(username)}?follower=${encodeURIComponent(currentUser)}`);
      const data = await res.json();
      if (data.isFollowing) {
        DOM.editBioBtn.textContent = "Deixar de Seguir";
        DOM.editBioBtn.onclick = () => apiUnfollow(username);
      } else {
        DOM.editBioBtn.textContent = "Seguir"; 
        DOM.editBioBtn.onclick = () => apiFollow(username);
      }
    } catch (err) {
      console.error("Erro ao verificar 'follow':", err);
      DOM.editBioBtn.textContent = "Erro";
    }
  }
}
async function apiFollow(username) { /* ... */ }
async function apiUnfollow(username) { /* ... */ }


// ===================================================
// 7. INICIALIZAÇÃO (LÓGICA DE LOGIN ATUALIZADA)
// ===================================================

function mapAppDOM() {
    DOM.chatView = document.getElementById("view-chat"); 
    DOM.chatMessagesEl = document.getElementById("messages");
    DOM.chatTopicBadge = document.getElementById("topic");
    DOM.chatInputEl = document.getElementById("composerInput");
    DOM.chatSendBtn = document.getElementById("sendBtn");
    DOM.feedView = document.getElementById("view-feed"); 
    DOM.postsEl = document.getElementById("posts");
    DOM.feedInput = document.getElementById("feedInput");
    DOM.feedSend = document.getElementById("feedSend");
    DOM.feedRefreshBtn = document.getElementById("btn-refresh");
    DOM.exploreView = document.getElementById("view-explore"); 
    DOM.explorePostsEl = document.getElementById("explore-posts");
    DOM.btnExplore = document.getElementById("btn-explore");
    DOM.btnExploreRefresh = document.getElementById("btn-explore-refresh");
    DOM.profileView = document.getElementById("view-profile"); 
    DOM.profileAvatarEl = document.getElementById("profileAvatar");
    DOM.profileNameEl = document.getElementById("profileName");
    DOM.profileBioEl = document.getElementById("profileBio");
    DOM.profileMoodEl = document.getElementById("profileMood");
    DOM.editBioBtn = document.getElementById("editBioBtn");
    
    // 👇 NOVO: IDs do Avatar
    DOM.userAvatarEl = document.getElementById("userAvatar"); // Na userbar
    DOM.avatarUploadInput = document.getElementById("avatar-upload-input");
    DOM.avatarUploadLabel = document.getElementById("avatar-upload-label");

    DOM.userbarMeBtn = document.getElementById("userbar-me");
    DOM.userbarMoodContainer = document.getElementById("userbar-mood-container");
    DOM.userbarMood = document.getElementById("userbar-mood");
    DOM.friendsContainer = document.getElementById("friends"); 
    DOM.testimonialsEl = document.getElementById("testimonials");
    DOM.testimonialInput = document.getElementById("testimonialInput");
    DOM.testimonialSend = document.getElementById("testimonialSend");
    DOM.exploreServersView = document.getElementById("view-explore-servers");
    DOM.exploreServersBtn = document.getElementById("explore-servers-btn");
    DOM.communityListContainer = document.getElementById("community-list-container");
    DOM.joinedServersList = document.getElementById("joined-servers-list"); 
    DOM.createCommunityView = document.getElementById("view-create-community");
    DOM.btnShowCreateCommunity = document.getElementById("btn-show-create-community");
    DOM.btnCancelCreate = document.getElementById("btn-cancel-create");
    DOM.createCommunityForm = document.getElementById("create-community-form");
    DOM.communityChannelBar = document.querySelector('aside.channels'); 
    DOM.communityTopicList = document.getElementById('community-topic-list');
    DOM.communityTopicView = document.getElementById('view-community-topics'); 
    DOM.communityMembersView = document.getElementById('view-community-members'); 
    DOM.communityTabs = document.querySelectorAll('.channels .view-tabs .pill'); 
    DOM.communityChatChannelsList = document.getElementById('community-chat-channels');
    DOM.currentCommunityNameEl = document.getElementById('current-community-name');
    DOM.communityAvatarChannelEl = document.getElementById('community-avatar-channel');
    DOM.communityMembersCountEl = document.getElementById('community-members-count');
    DOM.appEl = document.querySelector(".app");
    DOM.mainHeader = document.querySelector(".header"); 
    DOM.channelsEl = document.querySelector(".channels");
    DOM.viewTabs = document.querySelectorAll(".header .view-tabs .pill"); 
    DOM.serverBtns = document.querySelectorAll(".servers .server"); 
    DOM.homeBtn = document.getElementById("home-btn"); 
    DOM.headerHomeBtn = document.getElementById("header-home-btn"); 
    DOM.views = {
        feed: DOM.feedView,
        chat: DOM.chatView,
        profile: DOM.profileView,
        explore: DOM.exploreView,
        "explore-servers": DOM.exploreServersView,
        "create-community": DOM.createCommunityView,
        "community-topics": DOM.communityTopicView, 
        "community-members": DOM.communityMembersView 
    };
}

function bindAppEvents() {
    DOM.chatSendBtn.addEventListener("click", sendChatMessage);
    DOM.chatInputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChatMessage(); });
    document.querySelectorAll(".channel[data-channel]").forEach(c => c.addEventListener("click", () => renderChannel(c.getAttribute("data-channel"))));
    DOM.postsEl.addEventListener("click", handlePostClick);
    DOM.explorePostsEl.addEventListener("click", handlePostClick); 
    DOM.feedSend.addEventListener("click", apiCreatePost);
    DOM.feedRefreshBtn.addEventListener("click", apiGetPosts);
    DOM.btnExploreRefresh.addEventListener("click", apiGetExplorePosts); 
    DOM.testimonialSend.addEventListener("click", apiCreateTestimonial);
    DOM.viewTabs.forEach(b => b.addEventListener("click", () => { const viewName = b.dataset.view; activateView(viewName); }));
    DOM.btnExplore.addEventListener("click", () => activateView("explore"));
    DOM.userbarMeBtn.addEventListener("click", () => { viewedUsername = currentUser; activateView("profile"); });
    DOM.userbarMoodContainer.addEventListener("click", apiUpdateMood);
    DOM.headerHomeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.homeBtn.addEventListener("click", () => { activateView("feed"); });
    DOM.exploreServersBtn.addEventListener("click", () => { activateView("explore-servers"); });
    
    // 👇 NOVO: Eventos de Upload de Avatar
    // (Liga o 'change' ao input de ficheiro escondido)
    DOM.avatarUploadInput.addEventListener("change", apiUploadAvatar);
    // (Faz com que clicar no avatar do perfil acione o input de ficheiro)
    DOM.profileAvatarEl.addEventListener("click", () => {
      if (DOM.profileAvatarEl.classList.contains('is-owner')) {
        DOM.avatarUploadInput.click();
      }
    });

    DOM.friendsContainer.addEventListener("click", (e) => {
      const friendLink = e.target.closest('.friend-card-name[data-username]');
      if (friendLink) { viewedUsername = friendLink.dataset.username; activateView("profile"); }
    });
    DOM.communityListContainer.addEventListener("click", (e) => {
      const joinButton = e.target.closest('.join-btn[data-community-id]');
      if (joinButton) { const communityId = joinButton.dataset.Id; apiJoinCommunity(communityId, joinButton); }
    });
    DOM.joinedServersList.addEventListener("click", (e) => {
      const communityBtn = e.target.closest('.community-btn[data-community-id]');
      if (communityBtn) { const communityId = communityBtn.dataset.Id; activateCommunityView("topics", { community: communityId }); }
    });
    DOM.btnShowCreateCommunity.addEventListener("click", () => { activateView("create-community"); });
    DOM.btnCancelCreate.addEventListener("click", () => { activateView("explore-servers"); });
    DOM.createCommunityForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("community-name").value.trim();
        const emoji = document.getElementById("community-emoji").value.trim();
        if (!name) return;
        apiCreateCommunity(name, emoji, DOM.createCommunityForm.querySelector('button[type="submit"]'));
    });
    DOM.communityTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const view = tab.dataset.communityView;
            activateCommunityView(view, { community: currentCommunityId });
        });
    });
}

function startApp() {
  console.log('Socket conectado:', socket.id);
  mapAppDOM();
  bindAppEvents();
  
  // Define o nome de utilizador (avatar e mood são carregados pela apiGetProfile)
  document.getElementById("userName").textContent = currentUser;
  
  apiGetJoinedCommunities(); 
  apiGetProfile(currentUser); // Carrega bio, mood e avatar
  
  activateView("feed"); 
  DOM.appEl.hidden = false;
  LoginDOM.view.hidden = true;
}

function handleLoginSubmit(e) {
    e.preventDefault();
    const username = LoginDOM.input.value.trim();
    if (!username) return;
    
    currentUser = username;
    viewedUsername = currentUser;
    localStorage.setItem("agora:user", currentUser);
    
    socket.connect();
}

function checkLogin() {
    LoginDOM.view = document.getElementById('login-view');
    LoginDOM.form = document.getElementById('login-form');
    LoginDOM.input = document.getElementById('login-username-input');
    DOM.appEl = document.querySelector(".app"); 

    const storedUser = localStorage.getItem("agora:user");
    
    socket.on('connect', startApp);

    if (storedUser && storedUser.trim()) {
        currentUser = storedUser.trim();
        viewedUsername = currentUser;
        socket.connect();
    } else {
        LoginDOM.view.hidden = false;
        DOM.appEl.hidden = true;
        LoginDOM.form.addEventListener('submit', handleLoginSubmit);
    }
}

// Inicia todo o processo
checkLogin();