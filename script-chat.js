// ============================================================
// CHAT PAGE
// ============================================================
let CHAT_CHANNEL = 1; // active channel id
let CHAT_BEFORE_PUSH = 0; // unread count snapshot for badge

function renderChat() {
  if (!STATE.user) { showLogin(); return; }
  if (!CHAT_CHANNEL) CHAT_CHANNEL = STATE.chatChannels[0]?.id || 1;
  const channel = STATE.chatChannels.find(c => c.id === CHAT_CHANNEL) || STATE.chatChannels[0];
  const messages = STATE.chatMessages.filter(m => m.channel_id === CHAT_CHANNEL).sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  // Pre-render messages
  const msgsHtml = messages.map(m => renderChatMessage(m)).join('');

  document.getElementById('page-chat').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <button id="chat-channels-toggle" onclick="toggleChatSidebar()" style="width:36px;height:36px;border-radius:10px;background:var(--surface);border:1px solid var(--border);color:var(--text);cursor:pointer;font-size:16px;flex-shrink:0">☰</button>
      <div style="flex:1;min-width:0">
        <div style="font-size:17px;font-weight:800;display:flex;align-items:center;gap:6px">
          <span>${channel.icon}</span>
          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(channel.name)}</span>
        </div>
        <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(channel.description || '')}</div>
      </div>
    </div>

    <!-- Channels sidebar (slide-in) -->
    <div id="chat-sidebar" style="position:fixed;top:0;left:0;bottom:0;width:280px;background:var(--surface);border-right:1px solid var(--border);z-index:200;transform:translateX(-100%);transition:transform 0.3s ease;display:flex;flex-direction:column;box-shadow:4px 0 24px rgba(0,0,0,0.4)">
      <div style="padding:18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:15px;font-weight:800">Canales</div>
        <button onclick="toggleChatSidebar()" style="width:28px;height:28px;border-radius:8px;background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:16px">✕</button>
      </div>
      <div style="flex:1;overflow-y:auto;padding:8px">
        ${STATE.chatChannels.map(c => {
          const isActive = c.id === CHAT_CHANNEL;
          const unread = STATE.chatMessages.filter(m => m.channel_id === c.id && m.user_id !== STATE.user.id).slice(-1)[0];
          return `
            <div onclick="setChatChannel(${c.id});toggleChatSidebar()" style="padding:12px 14px;border-radius:10px;cursor:pointer;margin-bottom:4px;background:${isActive?(c.color||'#ff4444')+'22':'transparent'};border:1px solid ${isActive?(c.color||'#ff4444')+'66':'transparent'};display:flex;align-items:center;gap:10px;transition:all 0.2s" onmouseover="if(!${isActive})this.style.background='rgba(255,255,255,0.04)'">
              <div style="width:36px;height:36px;border-radius:10px;background:${c.color||'#ff4444'}33;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${c.icon}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700">${escHtml(c.name)}</div>
                <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.description || '')}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="padding:12px;border-top:1px solid var(--border);font-size:10px;color:var(--text3);text-align:center">5 canales · ${STATE.chatMessages.length} mensajes</div>
    </div>
    <div id="chat-sidebar-backdrop" onclick="toggleChatSidebar()" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:199;backdrop-filter:blur(4px)"></div>

    <!-- Messages list -->
    <div id="chat-messages" style="display:flex;flex-direction:column;gap:8px;min-height:50vh;max-height:60vh;overflow-y:auto;padding:8px 4px;margin-bottom:8px;-webkit-overflow-scrolling:touch">
      ${msgsHtml || `<div style="text-align:center;padding:40px 20px;color:var(--text3)"><div style="font-size:48px;margin-bottom:8px">${channel.icon}</div><div style="font-size:13px">Sin mensajes en este canal</div><div style="font-size:11px;margin-top:6px">Sé el primero en escribir</div></div>`}
    </div>

    <!-- Quick emoji bar -->
    <div style="display:flex;gap:4px;padding:6px 0;overflow-x:auto;scrollbar-width:none;margin-bottom:6px">
      ${['👍','🔥','🏍️','😂','❤️','👀','💪','🍕','☕','⛽','🛣️','🌧️','🛠️','👋','😎','💯','🎉','🚀','👊','🤙'].map(e => `<button onclick="appendChatEmoji('${e}')" style="flex-shrink:0;width:34px;height:34px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;font-size:18px;padding:0;display:flex;align-items:center;justify-content:center;transition:transform 0.15s" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">${e}</button>`).join('')}
    </div>

    <!-- Mention suggestion popup -->
    <div id="mention-popup" style="display:none;position:relative;max-height:160px;overflow-y:auto;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;box-shadow:0 -4px 16px rgba(0,0,0,0.3)"></div>

    <!-- Input row -->
    <div style="display:flex;gap:6px;align-items:flex-end;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:6px 6px 6px 12px">
      <textarea id="chat-input" rows="1" placeholder="Mensaje en #${channel.name}..." onkeydown="handleChatKeydown(event)" oninput="autoGrowChatInput(this);handleMentionInput(this)" style="flex:1;background:transparent;border:none;outline:none;color:var(--text);font-size:14px;font-family:inherit;resize:none;max-height:120px;padding:8px 4px;line-height:1.4"></textarea>
      <button onclick="sendChatMessage()" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff4444,#ff8800);border:none;color:#fff;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(255,68,68,0.4)">➤</button>
    </div>
  `;
  // Scroll to bottom
  setTimeout(() => {
    const m = document.getElementById('chat-messages');
    if (m) m.scrollTop = m.scrollHeight;
  }, 50);
  bindChatNotifications();
}

function toggleChatSidebar() {
  const sb = document.getElementById('chat-sidebar');
  const bd = document.getElementById('chat-sidebar-backdrop');
  if (!sb) return;
  const isOpen = sb.style.transform === 'translateX(0%)';
  sb.style.transform = isOpen ? 'translateX(-100%)' : 'translateX(0%)';
  if (bd) bd.style.display = isOpen ? 'none' : 'block';
}

function setChatChannel(id) {
  CHAT_CHANNEL = id;
  renderChat();
}

function renderChatMessage(m) {
  const author = STATE.users.find(u => u.id === m.user_id) || { username: '?', id: 0, is_admin: false };
  const isMe = STATE.user && m.user_id === STATE.user.id;
  // Convert @mentions into highlighted spans
  const content = escHtml(m.content).replace(/@(\w+)/g, '<span style="color:var(--accent);font-weight:700;background:rgba(255,68,68,0.1);padding:1px 4px;border-radius:4px">@$1</span>');
  // Time
  let t = '';
  try {
    const d = new Date(m.created_at.replace(' ', 'T'));
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) t = 'ahora';
    else if (diff < 3600) t = Math.floor(diff/60) + 'm';
    else if (diff < 86400) t = Math.floor(diff/3600) + 'h';
    else t = Math.floor(diff/86400) + 'd';
  } catch(e) { t = ''; }

  return `
    <div style="display:flex;gap:8px;align-items:flex-start;${isMe?'flex-direction:row-reverse':''}">
      ${renderAvatar(author, 32)}
      <div style="max-width:75%;${isMe?'text-align:right':''}">
        <div style="font-size:10px;color:var(--text3);margin-bottom:2px;${isMe?'text-align:right':''}">
          <span style="font-weight:700;color:var(--text2)">${escHtml(author.username)}</span>
          ${author.is_admin ? '<span style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;padding:0 4px;border-radius:3px;font-size:8px;font-weight:800;margin-left:2px">ADMIN</span>' : ''}
          <span style="margin-left:4px">${t}</span>
        </div>
        <div style="display:inline-block;padding:8px 12px;border-radius:14px;${isMe?'background:linear-gradient(135deg,#ff4444,#ff8800);color:#fff;border-bottom-right-radius:4px':'background:var(--surface2);color:var(--text);border-bottom-left-radius:4px'};font-size:13px;line-height:1.45;word-wrap:break-word;text-align:left">
          ${content}
        </div>
      </div>
    </div>
  `;
}

function appendChatEmoji(e) {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  inp.value += e;
  inp.focus();
  autoGrowChatInput(inp);
}

function autoGrowChatInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(120, el.scrollHeight) + 'px';
}

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

let MENTION_FILTER = '';
function handleMentionInput(el) {
  const cursor = el.selectionStart;
  const text = el.value.substring(0, cursor);
  const match = text.match(/@(\w*)$/);
  if (!match) {
    document.getElementById('mention-popup').style.display = 'none';
    return;
  }
  MENTION_FILTER = match[1].toLowerCase();
  const candidates = STATE.users.filter(u => u.username.toLowerCase().includes(MENTION_FILTER)).slice(0, 6);
  if (candidates.length === 0) {
    document.getElementById('mention-popup').style.display = 'none';
    return;
  }
  const popup = document.getElementById('mention-popup');
  popup.innerHTML = candidates.map(u => `
    <div onclick="insertMention('${u.username}')" style="padding:8px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:background 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='transparent'">
      ${renderAvatar(u, 26)}
      <span style="font-size:13px;font-weight:600">${u.username}</span>
    </div>
  `).join('');
  popup.style.display = 'block';
}
function insertMention(name) {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const cursor = inp.selectionStart;
  const text = inp.value.substring(0, cursor);
  const replaced = text.replace(/@\w*$/, '@' + name + ' ');
  inp.value = replaced + inp.value.substring(cursor);
  document.getElementById('mention-popup').style.display = 'none';
  inp.focus();
  autoGrowChatInput(inp);
}

function sendChatMessage() {
  if (!STATE.user) { toast('Inicia sesion'); return; }
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  const content = inp.value.trim();
  if (!content) return;
  const msg = {
    id: Date.now() % 1000000,
    channel_id: CHAT_CHANNEL,
    user_id: STATE.user.id,
    content,
    created_at: new Date().toISOString(),
    recipient_id: null,
  };
  STATE.chatMessages.push(msg);
  // Notify mentioned users
  const mentions = content.match(/@(\w+)/g) || [];
  mentions.forEach(m => {
    const username = m.substring(1);
    const target = STATE.users.find(u => u.username === username);
    if (target && target.id !== STATE.user.id) {
      STATE.notifications.push({
        id: Date.now() + Math.random(),
        user_id: target.id,
        actor_id: STATE.user.id,
        type: 'mention',
        message: STATE.user.username + ' te menciono en #' + (STATE.chatChannels.find(c => c.id === CHAT_CHANNEL)?.name || 'chat'),
        link: '/chat',
        read: false,
        created_at: new Date().toISOString()
      });
    }
  });
  saveState();
  inp.value = '';
  autoGrowChatInput(inp);
  renderChat();
  bsNotifyAll('💬 ' + (STATE.user?.username || 'Alguien') + ' en el chat', content, 'chat');
}

function bindChatNotifications() {
  // Browser notification permission (soft request, only after a user action)
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
  // In-app: when user is on chat page, listen to new messages and visual ping
  window.__chatBound = true;
}

