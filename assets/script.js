// assets/script.js

// --- Utils & Config ---
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const socket = io({ autoConnect: false });
let typingTimeout = null;

// State
const state = {
    user: localStorage.getItem("agora:user"),
    currentChannel: null,
    viewedUser: null,
    communityId: null,
    statusIndex: 0
};

// --- UI Helpers ---
const toast = (msg, type = 'info') => {
    const container = $('#toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = { success: '✅', error: '❌', magic: '✨', info: 'ℹ️' }[type] || 'ℹ️';
    el.innerHTML = `<span>${icon}</span> <span>${escape(msg)}</span>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'fadeOut 0.5s forwards';
        el.addEventListener('animationend', () => el.remove());
    }, 4000);
};

const escape = (s) => !s ? "" : s.replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" })[m]);

const renderAvatar = (el, { user, avatar_url }) => {
    if (!el) return;
    el.innerHTML = "";
    if (avatar_url) {
        el.style.backgroundImage = `url(${avatar_url})`;
    } else {
        el.style.backgroundImage = 'none';
        el.textContent = escape((user || "?").slice(0, 2).toUpperCase());
    }
};

// Modal
const modal = ({ title, val = '', placeholder = '', onSave, isPassword = false }) => {
    const view = $('#input-modal');
    const input = $('#modal-input');
    $('#modal-title').textContent = title;
    input.value = val;
    input.placeholder = placeholder;
    
    let passInput = $('#modal-pass-input');
    if (!passInput) {
        passInput = document.createElement('input');
        passInput.id = 'modal-pass-input';
        passInput.type = 'password';
        passInput.className = 'input';
        passInput.style.width = '100%';
        passInput.style.marginBottom = '10px';
        input.parentNode.insertBefore(passInput, input);
    }
    if (isPassword) {
       input.style.display = 'none'; input.required = false;
       passInput.value = val; passInput.placeholder = placeholder; passInput.style.display = 'block'; passInput.required = true; passInput.focus();
    } else {
       input.style.display = 'block'; input.required = true;
       passInput.style.display = 'none'; passInput.required = false; input.focus();
    }
    view.hidden = false;
    const form = $('#modal-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    newForm.onsubmit = (e) => {
        e.preventDefault();
        const valToSave = isPassword ? $('#modal-pass-input').value.trim() : input.value.trim();
        if (valToSave) onSave(valToSave);
        view.hidden = true;
    };
    $('#modal-cancel-btn').onclick = () => view.hidden = true;
};

// --- API Layer ---
const api = {
    async get(endpoint) {
        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) { console.error(err); return null; }
    },
    async post(endpoint, body) {
        try {
            const headers = {};
            if (!(body instanceof FormData)) {
                headers['Content-Type'] = 'application/json';
                body = JSON.stringify(body);
            }
            const res = await fetch(endpoint, { method: 'POST', headers, body });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro na requisição'); }
            return await res.json();
        } catch (err) { console.error(err); toast(err.message, 'error'); return null; }
    },
    async uploadImage(type, file) {
        const formData = new FormData();
        formData.append(type, file);
        formData.append('user', state.user);
        try {
            const res = await fetch(`/api/profile/${type}`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Erro no upload');
            return await res.json();
        } catch (err) { toast(err.message, 'error'); return null; }
    }
};

// --- Actions ---
const actions = {
    async loadFeed() {
        const data = await api.get(`/api/posts?user=${encodeURIComponent(state.user)}`);
        if (data) ui.renderPosts($('#posts'), data.posts || []);
    },
    async loadExplore() {
        ui.switchView('explore');
        const data = await api.get('/api/posts/explore');
        if (data) ui.renderPosts($('#explore-posts'), data.posts || []);
    },
    async createPost() {
        const input = $('#feedInput');
        const fileInput = $('#feedImageInput');
        const text = input.value.trim();
        if (!text) return;
        
        $('#feedSend').disabled = true;
        $('#feedSend').textContent = "Enviando...";

        const formData = new FormData();
        formData.append('user', state.user);
        formData.append('text', text);
        if (fileInput.files.length > 0) formData.append('image', fileInput.files[0]);

        const res = await api.post('/api/posts', formData);
        $('#feedSend').disabled = false;
        $('#feedSend').textContent = "Publicar";
        
        if (res) {
            input.value = "";
            fileInput.value = "";
            $('#image-preview-container').style.display = 'none';
            actions.loadFeed();
            toast("Post publicado!", "success");
        }
    },
    async loadProfile(username) {
        if (!username) return;
        state.viewedUser = username;
        ui.switchView('profile');
        $('#profileName').textContent = username;
        
        renderAvatar($('#profileAvatar'), { user: username });
        $('#profileCover').style.backgroundImage = 'none';
        
        const [data, following, testimonials] = await Promise.all([
            api.get(`/api/profile/${encodeURIComponent(username)}?viewer=${encodeURIComponent(state.user)}`),
            api.get(`/api/following/${encodeURIComponent(username)}`),
            api.get(`/api/testimonials/${encodeURIComponent(username)}`)
        ]);

        if (data) {
            $('#profileBio').textContent = data.profile.bio || "Sem bio.";
            $('#profileMood').textContent = `Mood: ${data.profile.mood || "✨"}`;
            
            renderAvatar($('#profileAvatar'), data.profile);
            if (data.profile.cover_url) $('#profileCover').style.backgroundImage = `url(${data.profile.cover_url})`;

            ui.renderRatings(data.ratings);
            ui.renderBadges(data.ratings.totals);
            ui.renderVisitors(data.visitors || []);
            
            api.get(`/api/profile/${encodeURIComponent(username)}/vibe`).then(v => {
                if (v && v.vibe) {
                    $('#profileVibeText').textContent = v.vibe.message;
                    $('#profileVibe').style.borderLeftColor = v.vibe.color;
                    $('#profileVibe').hidden = false;
                }
            });

            const isOwner = username === state.user;
            $('#editBioBtn').textContent = isOwner ? "Editar bio" : "Seguir";
            $('#editBioBtn').disabled = false;
            
            if (isOwner) {
                $('#userbar-mood').textContent = data.profile.mood || "✨";
                renderAvatar($('#userAvatar'), data.profile);
                $('#profileAvatar').classList.add('is-owner');
                $('#avatar-upload-label').style.display = 'flex';
                $('#cover-upload-label').style.display = 'block';
                $('#editBioBtn').onclick = actions.editBio;
                $('#ratings-vote-container').hidden = true;
                $('#dmBtn').style.display = 'none';
                $('#testimonial-form-container').hidden = true;
            } else {
                $('#profileAvatar').classList.remove('is-owner');
                $('#avatar-upload-label').style.display = 'none';
                $('#cover-upload-label').style.display = 'none';
                $('#ratings-vote-container').hidden = false;
                $('#dmBtn').style.display = 'flex';
                $('#testimonial-form-container').hidden = false;
                $('#dmBtn').onclick = () => actions.startDM(username);
                api.get(`/api/isfollowing/${encodeURIComponent(username)}?follower=${encodeURIComponent(state.user)}`).then(f => {
                    if (f && f.isFollowing) { $('#editBioBtn').textContent = "Deixar de Seguir"; $('#editBioBtn').onclick = () => actions.toggleFollow(username, false); } 
                    else { $('#editBioBtn').onclick = () => actions.toggleFollow(username, true); }
                });
            }
        }
        if (following) ui.renderList($('#friends'), following.following, 'user');
        if (testimonials) ui.renderTestimonials(testimonials.testimonials);
    },
    async toggleFollow(target, isFollowing) {
        const endpoint = isFollowing ? '/api/follow' : '/api/unfollow';
        const res = await api.post(endpoint, { follower: state.user, following: target });
        if (res) { toast(isFollowing ? `Seguindo ${target}` : `Deixou de seguir ${target}`, "success"); actions.loadProfile(target); }
    },
    async vote(type) {
        const btn = $(`button[data-rating="${type}"]`);
        const isActive = btn.classList.contains('active') || btn.classList.contains('active-negative');
        const endpoint = isActive ? '/api/profile/unrate' : '/api/profile/rate';
        const res = await api.post(endpoint, { from_user: state.user, to_user: state.viewedUser, rating_type: type });
        if (res) { actions.loadProfile(state.viewedUser); toast(isActive ? "Voto removido" : "Voto enviado!", "success"); }
    },
    
    // 👇 CORREÇÃO: GARANTE QUE O ID SEJA SALVO NO ESTADO 👇
    async loadCommunity(id) {
        state.communityId = id; // <--- IMPORTANTE!
        ui.switchView('community');
        const details = await api.get(`/api/community/${id}/details`);
        if (details) {
            $('#community-name-channel').textContent = details.community.name;
            $('#community-avatar-channel').textContent = details.community.emoji;
            const isOwner = details.community.owner_user === state.user;
            $('#btn-edit-community').hidden = !isOwner;
            actions.loadTopics(id);
            actions.loadMembers(id);
        }
    },
    async loadTopics(id) { const data = await api.get(`/api/community/${id}/posts`); if (data) ui.renderTopics(data.posts); },
    async loadMembers(id) { const data = await api.get(`/api/community/${id}/members`); if (data) { ui.renderList($('#community-member-list'), data.members, 'user'); $('#community-members-count').textContent = `${data.members.length} membros`; } },
    async editBio() {
        modal({ title: "Editar Bio", val: $('#profileBio').textContent, onSave: async (bio) => {
            const res = await api.post('/api/profile', { user: state.user, bio: bio });
            if (res) { $('#profileBio').textContent = res.bio; toast("Bio salva!", "success"); }
        }});
    },
    async updateMood() {
        modal({ title: "Novo Mood", val: $('#userbar-mood').textContent, onSave: async (m) => {
            const res = await api.post('/api/profile/mood', { user: state.user, mood: m });
            if(res) {
                $('#userbar-mood').textContent = res.mood;
                if($('#profileMood')) $('#profileMood').textContent = `Mood: ${res.mood}`;
                toast("Mood atualizado!", "success");
            }
        }});
    },
    startDM(target) {
        if (target === state.user) return;
        state.currentChannel = [state.user, target].sort().join('_');
        ui.switchView('chat'); $('#messages').innerHTML = ""; $('#topic').textContent = `@ ${target}`;
        socket.emit('joinChannel', { channel: state.currentChannel, user: state.user });
    }
};

// --- UI Renderers ---
const ui = {
    switchView(viewName) {
        $$('.app > section, .app > main').forEach(el => el.hidden = true);
        const app = $('.app');
        app.classList.remove('view-home', 'view-community');
        $$('.server, .add-btn, .pill').forEach(b => b.classList.remove('active'));
        if (['feed', 'explore', 'profile', 'explore-servers'].includes(viewName)) {
            app.classList.add('view-home'); $('.header').hidden = false; $('.channels').hidden = true;
            if (viewName === 'feed') $('#home-btn').classList.add('active');
            if (viewName === 'explore') $('#btn-explore').classList.add('active');
            if (viewName === 'explore-servers') $('#explore-servers-btn').classList.add('active');
        } else if (viewName === 'community' || viewName === 'chat' || viewName === 'create-topic' || viewName === 'create-community') {
            app.classList.add('view-community'); $('.header').hidden = true; $('.channels').hidden = false;
            
            if (viewName === 'community' || viewName === 'create-topic') {
                const commBtn = $(`.community-btn[data-community-id="${state.communityId}"]`);
                if(commBtn) commBtn.classList.add('active');
                if(viewName === 'community') $('#view-community-topics').hidden = false;
                return;
            }
        }
        const map = { 'feed': 'view-feed', 'explore': 'view-explore', 'profile': 'view-profile', 'explore-servers': 'view-explore-servers', 'chat': 'view-chat', 'create-community': 'view-create-community', 'create-topic': 'view-create-topic' };
        if (map[viewName]) $(`#${map[viewName]}`).hidden = false;
    },
    renderPosts(container, posts) {
        container.innerHTML = posts.length ? "" : "<div class='meta p-4'>Nada por aqui ainda.</div>";
        posts.forEach(p => {
            const node = document.createElement("div");
            node.className = "post";
            const date = new Date(p.timestamp).toLocaleString('pt-BR');
            const editBtn = p.user === state.user ? `<button class="mini-btn" onclick="editPost(${p.id})">Editar</button>` : '';
            const imageHtml = p.image_url ? `<div style="text-align: center; margin-top: 8px;"><img src="${p.image_url}" alt="Imagem do post" class="post-image" onclick="window.open(this.src)"></div>` : '';
            node.innerHTML = `<div class="avatar-display post-avatar"></div><div style="width: 100%;"><div class="meta"><strong class="post-username" data-u="${escape(p.user)}">${escape(p.user)}</strong> • ${date}</div><div id="post-text-${p.id}">${escape(p.text)}</div>${imageHtml}<div class="post-actions"><button class="mini-btn" onclick="likePost(${p.id})">❤ ${p.likes || 0}</button><button class="mini-btn" onclick="commentPost(${p.id})">Comentar</button>${editBtn}</div><div class="comments" id="comments-${p.id}"></div></div>`;
            renderAvatar(node.querySelector('.avatar-display'), p);
            node.querySelector('.post-username').onclick = () => actions.loadProfile(p.user);
            container.appendChild(node);
            api.get(`/api/posts/${p.id}/comments`).then(d => { if(d && d.comments.length) { $(`#comments-${p.id}`).innerHTML = d.comments.map(c => `<div class="meta"><strong>${escape(c.user)}</strong>: ${escape(c.text)}</div>`).join(''); }});
        });
    },
    renderTopics(posts) { ui.renderPosts($('#community-topic-list'), posts); $('#view-community-topics').hidden = false; $('#view-community-members').hidden = true; $$('.view-tabs .pill').forEach(p => p.classList.remove('active')); $$('.view-tabs .pill')[0].classList.add('active'); },
    renderList(container, list, keyName = 'user') { container.innerHTML = list.length ? "" : "<div class='meta'>Lista vazia.</div>"; list.forEach(item => { const el = document.createElement('div'); el.className = 'friend-card'; el.innerHTML = `<div class="avatar-display" style="width:32px;height:32px;border-radius:8px"></div><strong class="friend-card-name" data-u="${item[keyName]}">${escape(item[keyName])}</strong>`; renderAvatar(el.querySelector('.avatar-display'), item); el.querySelector('strong').onclick = () => actions.loadProfile(item[keyName]); container.appendChild(el); }); },
    renderRatings(data) { const container = $('#ratings-display-container'); const totals = data.totals; const myVotes = data.userVotes || []; container.innerHTML = ""; const types = [ { k: 'confiavel', i: '😊', l: 'Confiável' }, { k: 'legal', i: '🧊', l: 'Legal' }, { k: 'divertido', i: '🥳', l: 'Divertido' }, { k: 'falso', i: '🤥', l: 'Falso', neg: true }, { k: 'chato', i: '😴', l: 'Chato', neg: true }, { k: 'toxico', i: '☠️', l: 'Tóxico', neg: true } ]; types.forEach(t => { if (totals[t.k] > 0) { const div = document.createElement('div'); div.className = `rating-item ${t.neg ? 'negative-stat' : ''}`; div.innerHTML = `<span class="rating-icon">${t.i}</span><span class="rating-label">${t.l}</span><span class="rating-count">${totals[t.k]}</span>`; container.appendChild(div); } }); $$('#ratings-vote-container .mini-btn').forEach(btn => { const type = btn.dataset.rating; btn.className = 'mini-btn'; if (myVotes.includes(type)) { btn.classList.add(['falso','chato','toxico'].includes(type) ? 'active-negative' : 'active'); } }); },
    renderBadges(totals) { const container = $('#profile-badges') || (() => { const span = document.createElement('span'); span.id = 'profile-badges'; span.style.marginLeft = '8px'; $('#profileName').parentElement.appendChild(span); return span; })(); container.innerHTML = ''; const badges = [ { k: 'confiavel', i: '🛡️', t: 'Guardião' }, { k: 'legal', i: '🧊', t: 'Gente Boa' }, { k: 'divertido', i: '🎭', t: 'A Lenda' }, { k: 'toxico', i: '☣️', t: 'PERIGO' }, { k: 'falso', i: '🤥', t: 'Pinóquio' }, { k: 'chato', i: '💤', t: 'Soneca' } ]; badges.forEach(b => { if (totals[b.k] > 0) { const s = document.createElement('span'); s.className = 'user-badge'; s.textContent = b.i; s.title = b.t; s.onclick = () => toast(b.t, 'info'); container.appendChild(s); } }); },
    renderVisitors(list) { const container = $('#recent-visitors'); if(!container) return; container.innerHTML = list.length ? "" : "<div class='meta'>Ninguém visitou ainda.</div>"; list.forEach(v => { const el = document.createElement("div"); el.className = "friend-card"; const time = new Date(v.timestamp); const timeStr = time.toDateString() === new Date().toDateString() ? time.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : time.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}); el.innerHTML = `<div class="avatar-display" style="width:32px;height:32px;border-radius:8px"></div><strong class="friend-card-name" data-u="${v.user}">${escape(v.user)}</strong><span style="font-size:0.7rem;color:var(--text-secondary);margin-left:auto">${timeStr}</span>`; renderAvatar(el.querySelector('.avatar-display'), v); el.querySelector('strong').onclick = () => actions.loadProfile(v.user); container.appendChild(el); }); },
    renderTestimonials(list) { const cont = $('#testimonials'); cont.innerHTML = list.length ? "" : "<div class='meta'>Nenhum depoimento ainda.</div>"; list.forEach(item => { const node = document.createElement("div"); node.className = "meta"; node.innerHTML = `<strong>${escape(item.from_user)}</strong>: ${escape(item.text)}`; cont.appendChild(node); }); }
};

const bindEvents = () => {
    $('#login-form').onsubmit = async (e) => { e.preventDefault(); const user = $('#login-username-input').value.trim(); const password = $('#login-password-input').value.trim(); if(user && password) { const res = await api.post('/api/login', { user, password }); if (res && res.success) { state.user = user; localStorage.setItem("agora:user", user); toast(res.message, "success"); init(); } } };
    $('#btn-add-image').onclick = () => $('#feedImageInput').click();
    $('#feedImageInput').onchange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { $('#image-preview').src = ev.target.result; $('#image-preview-container').style.display = 'block'; }; reader.readAsDataURL(file); } };
    $('#btn-remove-image').onclick = () => { $('#feedImageInput').value = ""; $('#image-preview-container').style.display = 'none'; };
    $('#home-btn').onclick = () => { ui.switchView('feed'); actions.loadFeed(); };
    $('#btn-explore').onclick = actions.loadExplore;
    $('#btn-explore-refresh').onclick = actions.loadExplore;
    $('#btn-refresh').onclick = actions.loadFeed;
    $('#explore-servers-btn').onclick = () => { ui.switchView('explore-servers'); api.get(`/api/communities/explore?user_name=${state.user}`).then(d => { if(d) { const cont = $('#community-list-container'); cont.innerHTML = ""; d.communities.forEach(c => { const div = document.createElement('div'); div.className = 'community-card-explore'; div.innerHTML = `<div class="emoji">${c.emoji}</div><div class="community-card-explore-info"><h3>${escape(c.name)}</h3><div class="meta">${escape(c.description)}</div></div><button class="join-btn">Entrar</button>`; div.querySelector('button').onclick = async () => { await api.post('/api/community/join', { user_name: state.user, community_id: c.id }); init(); actions.loadCommunity(c.id); toast(`Bem-vindo a ${c.name}!`, 'success'); }; cont.appendChild(div); }); } }); };
    $('#feedSend').onclick = actions.createPost;
    $('#userbar-mood-container').onclick = actions.updateMood;
    $('#userbar-me').onclick = () => actions.loadProfile(state.user);
    $('#avatar-upload-input').onchange = (e) => api.uploadImage('avatar', e.target.files[0]).then(() => actions.loadProfile(state.user));
    $('#cover-upload-input').onchange = (e) => api.uploadImage('cover', e.target.files[0]).then(() => actions.loadProfile(state.user));
    $$('#ratings-vote-container .mini-btn').forEach(btn => { btn.onclick = () => actions.vote(btn.dataset.rating); });
    $('#testimonialSend').onclick = async () => { const text = $('#testimonialInput').value.trim(); if(!text) return; await api.post('/api/testimonials', { from_user: state.user, to_user: state.viewedUser, text }); $('#testimonialInput').value = ""; actions.loadProfile(state.viewedUser); toast("Depoimento enviado", "success"); };
    $('#btn-show-create-community').onclick = () => ui.switchView('create-community');
    $('#btn-cancel-create').onclick = () => ui.switchView('explore-servers');
    $('#create-community-form').onsubmit = async (e) => { e.preventDefault(); const name = $('#community-name').value; const emoji = $('#community-emoji').value; const res = await api.post('/api/communities/create', { name, emoji, creator: state.user }); if (res) { init(); actions.loadCommunity(res.community.id); toast("Comunidade criada!", 'success'); } };
    $('#sendBtn').onclick = () => { const txt = $('#composerInput').value.trim(); if(txt) { socket.emit('sendMessage', { channel: state.currentChannel || state.activeChannel, user: state.user, message: txt }); $('#composerInput').value = ""; } };
    $('#composerInput').oninput = () => { if($('#composerInput').value.length > 0) socket.emit('typing', { channel: state.currentChannel, user: state.user }); };
    $('#composerInput').onkeydown = (e) => { if(e.key === "Enter") $('#sendBtn').click(); };
    $$('.view-tabs .pill').forEach(pill => { pill.onclick = () => { const view = pill.dataset.communityView; if(view === 'topics') { $('#view-community-topics').hidden = false; $('#view-community-members').hidden = true; } else { $('#view-community-topics').hidden = true; $('#view-community-members').hidden = false; } $$('.view-tabs .pill').forEach(p => p.classList.remove('active')); pill.classList.add('active'); }; });
    
    // 👇 CORREÇÃO AQUI: Adicionando verificação de nulo e debug 👇
    $('#btn-new-topic').onclick = () => {
        console.log("Abrindo criação de tópico. ID:", state.communityId);
        if(state.communityId) {
            ui.switchView('create-topic');
        } else {
            toast("Erro: Comunidade não selecionada.", "error");
        }
    };

    $('#btn-cancel-topic').onclick = () => {
        if(state.communityId) actions.loadCommunity(state.communityId);
    };

    $('#create-topic-form').onsubmit = async (e) => { 
        e.preventDefault(); 
        if(!state.communityId) { toast("Erro: Comunidade inválida.", "error"); return; }
        
        const res = await api.post('/api/community/posts', { 
            community_id: state.communityId, 
            user: state.user, 
            title: $('#topic-title').value, 
            content: $('#topic-content').value 
        }); 
        if(res) { 
            actions.loadCommunity(state.communityId); 
            toast("Tópico criado", "success"); 
            $('#topic-title').value = ""; 
            $('#topic-content').value = ""; 
        } 
    };

    const toggleMenu = () => { const servers = $('.servers'); if(servers) servers.classList.toggle('is-open'); };
    if($('#btn-mobile-menu')) $('#btn-mobile-menu').onclick = toggleMenu;
    if($('#btn-community-menu')) $('#btn-community-menu').onclick = toggleMenu;
    const serversEl = $('.servers');
    if(serversEl) serversEl.onclick = (e) => { if(window.innerWidth <= 640 && (e.target.closest('.server') || e.target.closest('.add-btn'))) toggleMenu(); };
    if($('#btn-edit-community')) { $('#btn-edit-community').onclick = () => { const currentName = $('#community-name-channel').textContent; modal({ title: "Editar Comunidade", val: currentName, onSave: async (newName) => { const res = await api.post(`/api/community/${state.communityId}/update`, { name: newName, emoji: $('#community-avatar-channel').textContent, user: state.user }); if(res) { actions.loadCommunity(state.communityId); toast("Comunidade atualizada!", "success"); } }}); }; }
    if($('#btn-leave-community')) { $('#btn-leave-community').onclick = async () => { if(!confirm("Sair da comunidade?")) return; const res = await api.post('/api/community/leave', { user_name: state.user, community_id: state.communityId }); if(res) { ui.switchView('feed'); init(); toast("Você saiu.", "info"); } }; }
    $('#btn-status').onclick = () => { state.statusIndex = (state.statusIndex + 1) % 3; const classes = ['presence', 'presence busy', 'presence away']; const titles = ['Online', 'Ocupado', 'Ausente']; $('#btn-status').className = classes[state.statusIndex]; $('#btn-status').title = titles[state.statusIndex]; toast(`Status: ${titles[state.statusIndex]}`, 'info'); };
    $('#btn-settings').onclick = () => { modal({ title: "Alterar Senha", placeholder: "Nova senha...", isPassword: true, onSave: async (newPass) => { const res = await api.post('/api/profile/password', { user: state.user, password: newPass }); if(res && res.success) { toast("Senha alterada com sucesso!", "success"); } } }); };
    $('#btn-logout').onclick = () => { if(confirm("Sair do Agora?")) { localStorage.removeItem("agora:user"); window.location.reload(); } };
};

window.likePost = (id) => api.post(`/api/posts/${id}/like`, {}).then(() => actions.loadFeed());
window.commentPost = (id) => { modal({ title: "Comentar", placeholder: "Escreva...", onSave: async (txt) => { await api.post(`/api/posts/${id}/comments`, { user: state.user, text: txt }); actions.loadFeed(); }}); };
window.editPost = (id) => { const txt = $(`#post-text-${id}`).innerText; modal({ title: "Editar", val: txt, onSave: async (newTxt) => { await api.post(`/api/posts/${id}/update`, { user: state.user, text: newTxt }); $(`#post-text-${id}`).innerText = newTxt; }}); };

socket.on('connect', () => console.log('WS Connected'));
socket.on('loadHistory', (msgs) => { $('#messages').innerHTML = ""; msgs.forEach(m => { const div = document.createElement('div'); div.className = 'msg'; div.innerHTML = `<div class="avatar-display" style="width:44px;height:44px;border-radius:12px"></div><div class="bubble"><div class="meta"><strong>${escape(m.user)}</strong></div><div>${escape(m.message)}</div></div>`; renderAvatar(div.querySelector('.avatar-display'), m); $('#messages').appendChild(div); }); $('#messages').scrollTop = $('#messages').scrollHeight; });
socket.on('newMessage', (m) => { if(state.currentChannel) { const div = document.createElement('div'); div.className = 'msg'; div.innerHTML = `<div class="avatar-display" style="width:44px;height:44px;border-radius:12px"></div><div class="bubble"><div class="meta"><strong>${escape(m.user)}</strong></div><div>${escape(m.message)}</div></div>`; renderAvatar(div.querySelector('.avatar-display'), m); $('#messages').appendChild(div); $('#messages').scrollTop = $('#messages').scrollHeight; } });
socket.on('displayTyping', (data) => { const ind = $('#typing-indicator'); if(!ind) return; $('#typer-name').textContent = data.user; ind.hidden = false; if(typingTimeout) clearTimeout(typingTimeout); typingTimeout = setTimeout(() => ind.hidden = true, 3000); });
socket.on('rating_update', (data) => { if(state.viewedUser === data.target_user) actions.loadProfile(state.viewedUser); });

const init = async () => {
    if(!state.user) { $('#login-view').hidden = false; $('.app').hidden = true; return; }
    $('#login-view').hidden = true; $('.app').hidden = false; $('#userName').textContent = state.user;
    socket.connect();
    const data = await api.get(`/api/communities/joined?user_name=${encodeURIComponent(state.user)}`);
    const list = $('#joined-servers-list'); list.innerHTML = "";
    if(data) { data.communities.forEach(c => { const div = document.createElement('div'); div.className = `server community-btn`; div.innerHTML = `<span class="emoji">${c.emoji}</span>`; div.onclick = () => actions.loadCommunity(c.id); div.dataset.communityId = c.id; list.appendChild(div); }); }
    api.get(`/api/profile/${state.user}`).then(d => { if(d) { renderAvatar($('#userAvatar'), d.profile); $('#userbar-mood').textContent = d.profile.mood || "✨ novo"; } });
    ui.switchView('feed'); actions.loadFeed();
};
bindEvents();
init();