document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle    = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotClose     = document.getElementById('chatbotClose');
    const chatbotMessages  = document.getElementById('chatbotMessages');
    const chatbotInput     = document.getElementById('chatbotInput');
    const chatbotSend      = document.getElementById('chatbotSend');

    if (!chatbotToggle || !chatbotContainer) return;

    let isAwaitingReply  = false;
    let messageIdCounter = 0;

    // Histórico de conversa: [{role: 'user'|'assistant', content: '...'}]
    // Enviado ao backend para manter contexto entre mensagens
    const conversationHistory = [];
    const MAX_HISTORY = 16; // máximo de 8 trocas (user + assistant)

    // ── Chips de Resposta Rápida ───────────────────────────────────────────────
    const QUICK_REPLIES_WELCOME = [
        '🚲 Ver bikes disponíveis',
        '💰 Quanto custa?',
        '📦 Como funciona a entrega?',
        '🛡️ Planos de proteção',
    ];

    const QUICK_REPLY_MAP = [
        { keywords: ['preço','cust','r$','semanal','mensal','quinzenal','valor'],
          chips: ['✅ Como assinar?', '🚲 Ver todos os modelos', '🛡️ Planos de proteção'] },
        { keywords: ['entrega','prazo','endereço','logística','região'],
          chips: ['🚲 Ver bikes', '💰 Qual o preço?', '✅ Como assinar?'] },
        { keywords: ['pagamento','fatura','pagar','pix','cartão','boleto'],
          chips: ['❓ Fatura vencida?', '📋 Abrir chamado', '❌ Como cancelar?'] },
        { keywords: ['cancel','devolução','encerrar','rescindir'],
          chips: ['⏱️ Há taxa de multa?', '🔧 E a manutenção?', '💳 Como funciona o pagamento?'] },
        { keywords: ['manutenção','conserto','defeito','problema','quebrou','chamado','suporte'],
          chips: ['📋 Como abrir chamado?', '🛡️ Meu plano cobre?', '📍 Rastreamento GPS'] },
        { keywords: ['gps','rastreamento','localização','localizar'],
          chips: ['🔧 Manutenção inclusa?', '🛡️ Plano Premium', '✅ Como assinar?'] },
        { keywords: ['seguro','proteção','cobertura','plano basico','plano premium'],
          chips: ['💰 Ver preços', '✅ Como assinar?', '📦 Prazo de entrega'] },
    ];

    function getQuickReplies(botText) {
        const t = botText.toLowerCase();
        for (const entry of QUICK_REPLY_MAP) {
            if (entry.keywords.some(k => t.includes(k))) return entry.chips;
        }
        return [];
    }

    function renderQuickReplies(chips) {
        if (!chips || !chips.length) return;
        const wrap = document.createElement('div');
        wrap.className = 'chat-quick-replies';
        chips.forEach(label => {
            const btn = document.createElement('button');
            btn.className = 'chat-quick-btn';
            btn.textContent = label;
            btn.addEventListener('click', () => {
                // Remove todos os chips antes de enviar
                document.querySelectorAll('.chat-quick-replies').forEach(el => el.remove());
                // Envia como mensagem normal (sem o emoji prefixo)
                const cleanLabel = label.replace(/^[\p{Emoji}\s]+/u, '').trim();
                sendMessage(cleanLabel || label);
            });
            wrap.appendChild(btn);
        });
        chatbotMessages.appendChild(wrap);
        scrollToBottom();
    }

    // ── Open / Close ──────────────────────────────────────────────────────────
    let _welcomeShown = false;

    const openChatbot = () => {
        chatbotContainer.classList.add('active');
        chatbotContainer.setAttribute('aria-hidden', 'false');
        chatbotToggle.setAttribute('aria-expanded', 'true');
        if (chatbotInput) chatbotInput.focus();

        // Mostrar chips de boas-vindas na primeira abertura
        if (!_welcomeShown && chatbotMessages.children.length <= 1) {
            _welcomeShown = true;
            setTimeout(() => renderQuickReplies(QUICK_REPLIES_WELCOME), 350);
        }
    };

    const closeChatbot = () => {
        chatbotContainer.classList.remove('active');
        chatbotContainer.setAttribute('aria-hidden', 'true');
        chatbotToggle.setAttribute('aria-expanded', 'false');
    };

    chatbotToggle.addEventListener('click', openChatbot);
    if (chatbotClose) chatbotClose.addEventListener('click', closeChatbot);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChatbot(); });

    // ── Send ──────────────────────────────────────────────────────────────────
    const sendMessage = async (overrideText) => {
        if (isAwaitingReply) return;
        const text = (overrideText || chatbotInput?.value || '').trim();
        if (!text) return;

        // Remove chips de sugestão pendentes
        document.querySelectorAll('.chat-quick-replies').forEach(el => el.remove());

        appendMessage('user', text);
        if (!overrideText && chatbotInput) chatbotInput.value = '';
        setInputState(true);

        const loadingId = appendTypingIndicator();

        // Adiciona ao histórico local (antes da resposta)
        conversationHistory.push({ role: 'user', content: text });
        if (conversationHistory.length > MAX_HISTORY) {
            conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
        }

        // Histórico excluindo a última mensagem do user (já enviada separado)
        const historyToSend = conversationHistory.slice(0, -1);
        const payload = { message: text };
        if (historyToSend.length > 0) payload.history = historyToSend;

        try {
            const base = (window.PEDALA_API_BASE || '').replace(/\/$/, '');
            const r = await fetch(`${base}/chat`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
                signal:  AbortSignal.timeout(25000)
            });

            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            const reply = d.reply || 'Não consegui responder agora. Tente novamente! 😊';

            removeTypingIndicator(loadingId);
            appendMessage('bot', reply);

            // Adiciona resposta ao histórico
            conversationHistory.push({ role: 'assistant', content: reply });
            if (conversationHistory.length > MAX_HISTORY) {
                conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
            }

            // Mostra chips de resposta rápida relevantes
            const chips = getQuickReplies(reply);
            if (chips.length) setTimeout(() => renderQuickReplies(chips), 150);

        } catch (err) {
            removeTypingIndicator(loadingId);
            const errMsg = err.name === 'TimeoutError' || err.name === 'AbortError'
                ? '⏱️ O assistente demorou demais para responder. Tente novamente!'
                : '😔 Serviço temporariamente indisponível. Tente novamente em instantes.';
            appendMessage('bot', errMsg);
            // Remove a mensagem do user do histórico em caso de erro
            if (conversationHistory.length && conversationHistory.at(-1).role === 'user') {
                conversationHistory.pop();
            }
        }

        setInputState(false);
    };

    if (chatbotSend) chatbotSend.addEventListener('click', () => sendMessage());
    if (chatbotInput) {
        chatbotInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        });
    }

    // ── DOM Helpers ───────────────────────────────────────────────────────────
    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `msg ${sender} msg-fade-in`;
        div.id = `msg-${messageIdCounter++}`;
        if (sender === 'bot') {
            div.innerHTML = renderMarkdown(text);
        } else {
            div.textContent = text;
        }
        chatbotMessages.appendChild(div);
        scrollToBottom();
        return div.id;
    }

    function appendTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'msg bot typing-indicator';
        div.id = `msg-${messageIdCounter++}`;
        div.innerHTML = '<span></span><span></span><span></span>';
        chatbotMessages.appendChild(div);
        scrollToBottom();
        return div.id;
    }

    function removeTypingIndicator(id) {
        document.getElementById(id)?.remove();
    }

    function renderMarkdown(raw) {
        let t = raw
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/^[•\*\-]\s+(.+)$/gm, '<span class="msg-bullet">$1</span>');
        t = t.replace(/^[ \t]+(💰[^\n]+)$/gm, '<span class="msg-price">$1</span>');
        t = t.replace(/^---+$/gm, '<hr class="msg-hr">');
        t = t.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]️?\s.{2,60})$/gmu, '<span class="msg-section">$1</span>');
        t = t.replace(/\n{3,}/g, '\n\n');
        t = t.replace(/\n/g, '<br>');
        t = t.replace(/<\/span><br>/g, '</span>');
        t = t.replace(/<br><span class="msg-bullet">/g, '<span class="msg-bullet">');
        return t;
    }

    function setInputState(waiting) {
        isAwaitingReply = waiting;
        if (chatbotInput) chatbotInput.disabled = waiting;
        if (chatbotSend)  chatbotSend.disabled  = waiting;
    }

    function scrollToBottom() {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
});
