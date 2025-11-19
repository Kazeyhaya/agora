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
    communityId: null
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

const modal = ({ title, val = '', placeholder = '', onSave }) => {
    const view = $('#input-modal');
    const input = $('#modal-input');
    
    $('#modal-title').textContent = title;
    input.value = val;
    input.placeholder = placeholder;
    view.hidden = false;
    input.focus();

    // Remove listeners antigos para evitar duplicidade (Clean Code)
    const form = $('#modal-form');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.onsubmit = (e) => {
        e.preventDefault();
        const cleanVal = input.value.trim();
        if (cleanVal) onSave(cleanVal);
        view.hidden = true;
    };
    
    // Rebind cancel button
    $('#modal-cancel-btn').onclick = () => view.hidden = true;
};

// --- API Layer ---
const api = {
    async get(endpoint) {
        try {
            const res = await fetch(endpoint);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.error(err);
            return null;
        }
    },

    async post(endpoint, body) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro na requisição');
            }
            return await res.json();
        } catch (err) {
            console.error(err);
            toast(err.message, 'error');
            return null;
        }
    },
    
    async upload(file) {
        const formData = new FormData();
        formData.append('avatar', file);
        formData.append('user', state.user);
        
        try {
            const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Erro no upload');
            return await res.json();
        } catch (err) {
            toast(err.message, 'error');
            return null;
        }
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
        const text = input.value.trim();
        if (!text) return;
        
        $('#feedSend').disabled = true;
        const res = await api.post('/api/posts', { user: state.user, text });
        $('#feedSend').disabled = false;
        
        if (res) {
            input.value = "";
            actions.loadFeed();
            toast("Post publicado!", "success");
        }
    },

    async loadProfile(username) {
        if (!username) return;
        state.viewedUser = username;
        ui.switchView('profile');

        // Reset UI
        $('#profileName').textContent = username;
        renderAvatar($('#profileAvatar'), { user: username });
        $('#profileVibe').hidden = true;
        
        // Parallel fetching (Performance)
        const [data, following, testimonials] = await Promise.all([
            api.get(`/api/profile/${encodeURIComponent(username)}?viewer=${encodeURIComponent(state.user)}`),
            api.get(`/api/following/${encodeURIComponent(username)}`),
            api.get(`/api/testimonials/${encodeURIComponent(username)}`)
        ]);

        if (data) {
            $('#profileBio').textContent = data.profile.bio;
            $('#profileMood').textContent = `Mood: ${data.profile.mood || "✨"}`;
            renderAvatar($('#profileAvatar'), data.profile);
            
            ui.renderRatings(data.ratings);
            ui.renderBadges(data.ratings.totals);
            ui.renderVisitors(data.visitors || []);
            
            // Vibe do dia
            api.get(`/api/profile/${encodeURIComponent(username)}/vibe`).then(v => {
                if (v && v.vibe) {
                    $('#profileVibeText').textContent = v.vibe.message;
                    $('#profileVibe').style.borderLeftColor = v.vibe.color;
                    $('#profileVibe').hidden = false;
                }
            });

            // Owner controls
            const isOwner = username === state.user;
            $('#editBioBtn').textContent = isOwner ? "Editar bio" : "Seguir";
            $('#editBioBtn').disabled = false;
            
            if (isOwner) {
                $('#userbar-mood').textContent = data.profile.mood || "✨";
                renderAvatar($('#userAvatar'), data.profile);
                $('#profileAvatar').classList.add('is-owner');
                $('#editBioBtn').onclick = actions.editBio;
                $('#ratings-vote-container').hidden = true;
                $('#dmBtn').style.display = 'none';
                $('#testimonial-form-container').hidden = true;
            } else {
                $('#profileAvatar').classList.remove('is-owner');
                $('#ratings-vote-container').hidden = false;
                $('#dmBtn').style.display = 'flex';
                $('#testimonial-form-container').hidden = false;
                $('#dmBtn').onclick = () => actions.startDM(username);
                
                // Check follow
                api.get(`/api/isfollowing/${encodeURIComponent(username)}?follower=${encodeURIComponent(state.user)}`)
                    .then(f => {
                        if (f && f.isFollowing) {
                            $('#editBioBtn').textContent = "Deixar de Seguir";
                            $('#editBioBtn').onclick = () => actions.toggleFollow(username, false);
                        } else {
                            $('#editBioBtn').onclick = () => actions.toggleFollow(username, true);
                        }
                    });
            }
        }
        
        if (following) ui.renderList($('#friends'), following.following, 'user');
        if (testimonials) ui.renderTestimonials(testimonials.testimonials);
    },

    async toggleFollow(target, isFollowing) {
        const endpoint = isFollowing ? '/api/follow' : '/api/unfollow';
        const res = await api.post(endpoint, { follower: state.user, following: target });
        if (res) {
            toast(isFollowing ? `Seguindo ${target}` : `Deixou de seguir ${target}`, "success");
            actions.loadProfile(target);
        }
    },

    async vote(type) {
        const btn = $(`button[data-rating="${type}"]`);
        const isActive = btn.classList.contains('active') || btn.classList.contains('active-negative');
        const endpoint = isActive ? '/api/profile/unrate' : '/api/profile/rate';
        
        const res = await api.post(endpoint, { from_user: state.user, to_user: state.viewedUser, rating_type: type });
        if (res) {
            actions.loadProfile(state.viewedUser);
            toast(isActive ? "Voto removido" : "Voto enviado!", "success");
        }
    },

    async loadCommunity(id) {
        state.communityId = id;
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

    async loadTopics(id) {
        const data = await api.get(`/api/community/${id}/posts`);
        if (data) ui.renderTopics(data.posts);
    },
    
    async loadMembers(id) {
        const data = await api.get(`/api/community/${id}/members`);
        if (data) {
            ui.renderList($('#community-member-list'), data.members, 'user');
            $('#community-members-count').textContent = `${data.members.length} membros`;
        }
    },

    async editBio() {
        modal({
            title: "Editar Bio",
            val: $('#profileBio').textContent,
            onSave: async (bio) => {
                const res = await api.post('/api/profile', { user: state.user, bio });
                if (res) {
                    $('#profileBio').textContent = res.bio;
                    toast("Bio salva!", "success");
                }
            }
        });
    },

    startDM(target) {
        if (target === state.user) return;
        state.currentChannel = [state.user, target].sort().join('_');
        
        ui.switchView('chat');
        $('#messages').innerHTML = "";
        $('#topic').textContent = `@ ${target}`;
        
        socket.emit('joinChannel', { channel: state.currentChannel, user: state.user });
    }
};

// --- UI Renderers ---
const ui = {
    switchView(viewName) {
        // Hide all sections
        $$('.app > section, .app > main').forEach(el => el.hidden = true);
        
        // Manage Layout classes
        const app = $('.app');
        app.classList.remove('view-home', 'view-community');
        
        // Reset sidebar active states
        $$('.server, .add-btn, .pill').forEach(b => b.classList.remove('active'));

        // Logic
        if (['feed', 'explore', 'profile', 'explore-servers'].includes(viewName)) {
            app.classList.add('view-home');
            $('.header').hidden = false;
            $('.channels').hidden = true;
            
            if (viewName === 'feed') $('#home-btn').classList.add('active');
            if (viewName === 'explore') $('#btn-explore').classList.add('active');
            if (viewName === 'explore-servers') $('#explore-servers-btn').classList.add('active');
            
        } else if (viewName === 'community' || viewName === 'chat') {
            app.classList.add('view-community');
            $('.header').hidden = true;
            $('.channels').hidden = false;

            if (viewName === 'community') {
                $(`.community-btn[data-community-id="${state.communityId}"]`)?.classList.add('active');
                // Show topics by default
                $('#view-community-topics').hidden = false;
                return;
            }
        }

        // Show target view
        const map = {
            'feed': 'view-feed',
            'explore': 'view-explore',
            'profile': 'view-profile',
            'explore-servers': 'view-explore-servers',
            'chat': 'view-chat'
        };
        if (map[viewName]) $(`#${map[viewName]}`).hidden = false;
    },

    renderPosts(container, posts) {
        container.innerHTML = posts.length ? "" : "<div class='meta p-4'>Nada por aqui ainda.</div>";
        
        posts.forEach(p => {
            const node = document.createElement("div");
            node.className = "post";
            
            const date = new Date(p.timestamp).toLocaleString('pt-BR');
            const editBtn = p.user === state.user ? `<button class="mini-btn" onclick="editPost(${p.id})">Editar</button>` : '';

            node.innerHTML = `
                <div class="avatar-display post-avatar"></div>
                <div>
                    <div class="meta"><strong class="post-username" data-u="${escape(p.user)}">${escape(p.user)}</strong> • ${date}</div>
                    <div id="post-text-${p.id}">${escape(p.text)}</div>
                    <div class="post-actions">
                        <button class="mini-btn" onclick="likePost(${p.id})">❤ ${p.likes || 0}</button>
                        <button class="mini-btn" onclick="commentPost(${p.id})">Comentar</button>
                        ${editBtn}
                    </div>
                    <div class="comments" id="comments-${p.id}"></div>
                </div>
            `;
            
            renderAvatar(node.querySelector('.avatar-display'), p);
            // Click handlers
            node.querySelector('.post-username').onclick = () => actions.loadProfile(p.user);
            container.appendChild(node);

            // Load comments async
            api.get(`/api/posts/${p.id}/comments`).then(d => {
                if(d && d.comments.length) {
                    $(`#comments-${p.id}`).innerHTML = d.comments.map(c => 
                        `<div class="meta"><strong>${escape(c.user)}</strong>: ${escape(c.text)}</div>`
                    ).join('');
                }
            });
        });
    },

    renderTopics(posts) {
        ui.renderPosts($('#community-topic-list'), posts);
        $('#view-community-topics').hidden = false;
        $('#view-community-members').hidden = true;
        $$('.view-tabs .pill').forEach(p => p.classList.remove('active'));
        $$('.view-tabs .pill')[0].classList.add('active'); // Tab topics
    },

    renderList(container, list, keyName = 'user') {
        container.innerHTML = list.length ? "" : "<div class='meta'>Lista vazia.</div>";
        list.forEach(item => {
            const el = document.createElement('div');
            el.className = 'friend-card';
            el.innerHTML = `<div class="avatar-display" style="width:32px;height:32px;border-radius:8px"></div>
                            <strong class="friend-card-name" data-u="${item[keyName]}">${escape(item[keyName])}</strong>`;
            renderAvatar(el.querySelector('.avatar-display'), item);
            el.querySelector('strong').onclick = () => actions.loadProfile(item[keyName]);
            container.appendChild(el);
        });
    },

    renderRatings(data) {
        const container = $('#ratings-display-container');
        const totals = data.totals;
        const myVotes = data.userVotes || [];
        
        container.innerHTML = "";
        
        const types = [
            { k: 'confiavel', i: '😊', l: 'Confiável' },
            { k: 'legal', i: '🧊', l: 'Legal' },
            { k: 'divertido', i: '🥳', l: 'Divertido' },
            { k: 'falso', i: '🤥', l: 'Falso', neg: true },
            { k: 'chato', i: '😴', l: 'Chato', neg: true },
            { k: 'toxico', i: '☠️', l: 'Tóxico', neg: true }
        ];

        types.forEach(t => {
            if (totals[t.k] > 0) {
                const div = document.createElement('div');
                div.className = `rating-item ${t.neg ? 'negative-stat' : ''}`;
                div.innerHTML = `<span class="rating-icon">${t.i}</span>
                                 <span class="rating-label">${t.l}</span>
                                 <span class="rating-count">${totals[t.k]}</span>`;
                container.appendChild(div);
            }
        });

        // Update Buttons State
        $$('#ratings-vote-container .mini-btn').forEach(btn => {
            const type = btn.dataset.rating;
            btn.className = 'mini-btn'; // reset
            if (myVotes.includes(type)) {
                btn.classList.add(['falso','chato','toxico'].includes(type) ? 'active-negative' : 'active');
            }
        });
    },

    renderBadges(totals) {
        const container = $('#profile-badges') || (() => {
            const span = document.createElement('span');
            span.id = 'profile-badges';
            span.style.marginLeft = '8px';
            $('#profileName').parentElement.appendChild(span);
            return span;
        })();
        
        container.innerHTML = '';
        const badges = [
            { k: 'confiavel', i: '🛡️', t: 'Guardião' },
            { k: 'legal', i: '🧊', t: 'Gente Boa' },
            { k: 'divertido', i: '🎭', t: 'A Lenda' },
            { k: 'toxico', i: '☣️', t: 'PERIGO' },
            { k: 'falso', i: '🤥', t: 'Pinóquio' },
            { k: 'chato', i: '💤', t: 'Soneca' }
        ];

        badges.forEach(b => {
            if (totals[b.k] > 0) {
                const s = document.createElement('span');
                s.className = 'user-badge';
                s.textContent = b.i;
                s.onclick = () => toast(b.t, 'info');
                container.appendChild(s);
            }
        });
    },
    
    renderVisitors(list) {
        const container = $('#recent-visitors');
        if(!container) return;
        container.innerHTML = list.length ? "" : "<div class='meta'>Ninguém visitou ainda.</div>";
        
        list.forEach(v => {
            const el = document.createElement("div");
            el.className = "friend-card";
            
            const time = new Date(v.timestamp);
            const timeStr = time.toDateString() === new Date().toDateString() 
                ? time.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) 
                : time.toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});

            el.innerHTML = `
                <div class="avatar-display" style="width:32px;height:32px;border-radius:8px"></div>
                <strong class="friend-card-name" data-u="${v.user}">${escape(v.user)}</strong>
                <span style="font-size:0.7rem;color:var(--text-secondary);margin-left:auto">${timeStr}</span>
            `;
            renderAvatar(el.querySelector('.avatar-display'), v);
            el.querySelector('strong').onclick = () => actions.loadProfile(v.user);
            container.appendChild(el);
        });
    },

    renderTestimonials(list) {
        const cont = $('#testimonials');
        cont.innerHTML = list.length ? "" : "<div class='meta'>Nenhum depoimento ainda.</div>";
        list.forEach(item => {
            const node = document.createElement("div");
            node.className = "meta"; 
            node.innerHTML = `<strong>${escape(item.from_user)}</strong>: ${escape(item.text)}`;
            cont.appendChild(node);
        });
    }
};

// --- Event Binding ---
const bindEvents = () => {
    // Auth
    $('#login-form').onsubmit = (e) => {
        e.preventDefault();
        const user = $('#login-username-input').value.trim();
        if(user) {
            state.user = user;
            localStorage.setItem("agora:user", user);
            init();
        }
    };

    // Navigation
    $('#home-btn').onclick = () => { ui.switchView('feed'); actions.loadFeed(); };
    $('#btn-explore').onclick = actions.loadExplore;
    $('#btn-explore-refresh').onclick = actions.loadExplore;
    $('#btn-refresh').onclick = actions.loadFeed;
    $('#explore-servers-btn').onclick = () => {
        ui.switchView('explore-servers');
        api.get(`/api/communities/explore?user_name=${state.user}`).then(d => {
            if(d) {
                const cont = $('#community-list-container');
                cont.innerHTML = "";
                d.communities.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'community-card-explore';
                    div.innerHTML = `<div class="emoji">${c.emoji}</div>
                        <div class="community-card-explore-info"><h3>${escape(c.name)}</h3><div class="meta">${escape(c.description)}</div></div>
                        <button class="join-btn">Entrar</button>`;
                    div.querySelector('button').onclick = async () => {
                        await api.post('/api/community/join', { user_name: state.user, community_id: c.id });
                        init(); // Reload sidebar
                        actions.loadCommunity(c.id);
                        toast(`Bem-vindo a ${c.name}!`, 'success');
                    };
                    cont.appendChild(div);
                });
            }
        });
    };

    // Posting
    $('#feedSend').onclick = actions.createPost;
    $('#userbar-mood-container').onclick = () => {
        modal({ title: "Novo Mood", val: $('#userbar-mood').textContent, onSave: async (m) => {
            const r = await api.post('/api/profile/mood', { user: state.user, mood: m });
            if(r) $('#userbar-mood').textContent = r.mood;
        }});
    };
    
    // Profile
    $('#userbar-me').onclick = () => actions.loadProfile(state.user);
    $('#avatar-upload-input').onchange = (e) => api.upload(e.target.files[0]).then(() => actions.loadProfile(state.user));
    
    // Ratings
    $$('#ratings-vote-container .mini-btn').forEach(btn => {
        btn.onclick = () => actions.vote(btn.dataset.rating);
    });

    // Testimonials
    $('#testimonialSend').onclick = async () => {
        const text = $('#testimonialInput').value.trim();
        if(!text) return;
        await api.post('/api/testimonials', { from_user: state.user, to_user: state.viewedUser, text });
        $('#testimonialInput').value = "";
        actions.loadProfile(state.viewedUser); // Reload to see
        toast("Depoimento enviado", "success");
    };

    // Community Creation
    $('#btn-show-create-community').onclick = () => ui.switchView('create-community');
    $('#btn-cancel-create').onclick = () => ui.switchView('explore-servers');
    $('#create-community-form').onsubmit = async (e) => {
        e.preventDefault();
        const name = $('#community-name').value;
        const emoji = $('#community-emoji').value;
        const res = await api.post('/api/communities/create', { name, emoji, creator: state.user });
        if (res) {
            init();
            actions.loadCommunity(res.community.id);
            toast("Comunidade criada!", 'success');
        }
    };
    
    // Chat / Typing
    $('#sendBtn').onclick = () => {
        const txt = $('#composerInput').value.trim();
        if(txt) {
            socket.emit('sendMessage', { channel: state.currentChannel || state.activeChannel, user: state.user, message: txt });
            $('#composerInput').value = "";
        }
    };
    $('#composerInput').oninput = () => {
        if($('#composerInput').value.length > 0) socket.emit('typing', { channel: state.currentChannel, user: state.user });
    };
    $('#composerInput').onkeydown = (e) => { if(e.key === "Enter") $('#sendBtn').click(); };
    
    // Community Sub-nav
    $$('.view-tabs .pill').forEach(pill => {
        pill.onclick = () => {
            const view = pill.dataset.communityView;
            if(view === 'topics') {
                $('#view-community-topics').hidden = false;
                $('#view-community-members').hidden = true;
            } else {
                $('#view-community-topics').hidden = true;
                $('#view-community-members').hidden = false;
            }
            $$('.view-tabs .pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        };
    });
    
    // Create Topic
    $('#btn-new-topic').onclick = () => ui.switchView('create-topic');
    $('#btn-cancel-topic').onclick = () => actions.loadCommunity(state.communityId);
    $('#create-topic-form').onsubmit = async (e) => {
        e.preventDefault();
        const res = await api.post('/api/community/posts', {
            community_id: state.communityId, user: state.user,
            title: $('#topic-title').value, content: $('#topic-content').value
        });
        if(res) {
            actions.loadCommunity(state.communityId);
            toast("Tópico criado", "success");
            $('#topic-title').value = ""; $('#topic-content').value = "";
        }
    };

    // Mobile Menu
    const toggleMenu = () => $('.servers').classList.toggle('is-open');
    if($('#btn-mobile-menu')) $('#btn-mobile-menu').onclick = toggleMenu;
    if($('#btn-community-menu')) $('#btn-community-menu').onclick = toggleMenu;
    $('.servers').onclick = (e) => { if(window.innerWidth <= 640 && (e.target.closest('.server') || e.target.closest('.add-btn'))) toggleMenu(); };
};

// --- Global Functions for HTML access (onclick) ---
window.likePost = (id) => api.post(`/api/posts/${id}/like`, {}).then(() => actions.loadFeed()); // Simple reload
window.commentPost = (id) => {
    modal({ title: "Comentar", placeholder: "Escreva...", onSave: async (txt) => {
        await api.post(`/api/posts/${id}/comments`, { user: state.user, text: txt });
        actions.loadFeed(); // Refresh
    }});
};
window.editPost = (id) => {
    const txt = $(`#post-text-${id}`).innerText;
    modal({ title: "Editar", val: txt, onSave: async (newTxt) => {
        await api.post(`/api/posts/${id}/update`, { user: state.user, text: newTxt });
        $(`#post-text-${id}`).innerText = newTxt;
    }});
};

// --- Socket Events ---
socket.on('connect', () => console.log('WS Connected'));
socket.on('loadHistory', (msgs) => {
    $('#messages').innerHTML = "";
    msgs.forEach(m => {
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<div class="avatar-display" style="width:44px;height:44px;border-radius:12px"></div>
                         <div class="bubble"><div class="meta"><strong>${escape(m.user)}</strong></div><div>${escape(m.message)}</div></div>`;
        renderAvatar(div.querySelector('.avatar-display'), m);
        $('#messages').appendChild(div);
    });
    $('#messages').scrollTop = $('#messages').scrollHeight;
});
socket.on('newMessage', (m) => {
    if(state.currentChannel) { // Check if we are in chat view
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<div class="avatar-display" style="width:44px;height:44px;border-radius:12px"></div>
                         <div class="bubble"><div class="meta"><strong>${escape(m.user)}</strong></div><div>${escape(m.message)}</div></div>`;
        renderAvatar(div.querySelector('.avatar-display'), m);
        $('#messages').appendChild(div);
        $('#messages').scrollTop = $('#messages').scrollHeight;
    }
});
socket.on('displayTyping', (data) => {
    const ind = $('#typing-indicator');
    if(!ind) return;
    $('#typer-name').textContent = data.user;
    ind.hidden = false;
    if(typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => ind.hidden = true, 3000);
});
socket.on('rating_update', (data) => {
    if(state.viewedUser === data.target_user) actions.loadProfile(state.viewedUser);
});

// --- Init ---
const init = async () => {
    if(!state.user) {
        $('#login-view').hidden = false;
        $('.app').hidden = true;
        return;
    }
    $('#login-view').hidden = true;
    $('.app').hidden = false;
    $('#userName').textContent = state.user;
    socket.connect();
    
    // Sidebar
    const data = await api.get(`/api/communities/joined?user_name=${encodeURIComponent(state.user)}`);
    const list = $('#joined-servers-list');
    list.innerHTML = "";
    if(data) {
        data.communities.forEach(c => {
            const div = document.createElement('div');
            div.className = `server community-btn`;
            div.innerHTML = `<span class="emoji">${c.emoji}</span>`;
            div.onclick = () => actions.loadCommunity(c.id);
            div.dataset.communityId = c.id;
            list.appendChild(div);
        });
    }
    
    // My Avatar
    api.get(`/api/profile/${state.user}`).then(d => {
        if(d) renderAvatar($('#userAvatar'), d.profile);
    });

    // FIX: Switch to Home view correctly
    ui.switchView('feed');
    actions.loadFeed();
};

// Start
bindEvents();
init();