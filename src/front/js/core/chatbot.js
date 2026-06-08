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

    // ── Open / Close ──────────────────────────────────────────────────────────
    chatbotToggle.addEventListener('click', () => {
        chatbotContainer.classList.add('active');
        chatbotInput.focus();
    });

    chatbotClose.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
    });

    // ── Send ──────────────────────────────────────────────────────────────────
    const sendMessage = async () => {
        if (isAwaitingReply) return;
        const text = chatbotInput.value.trim();
        if (!text) return;

        appendMessage('user', text);
        chatbotInput.value = '';
        setInputState(true);

        const loadingId = appendMessage('bot', 'Digitando...');

        try {
            const base = (window.PEDALA_API_BASE || '').replace(/\/$/, '');
            const r = await fetch(`${base}/chat`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ message: text }),
                signal:  AbortSignal.timeout(20000)
            });

            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            updateMessage(loadingId, d.reply || 'Não consegui responder agora.');
        } catch (err) {
            if (err.name === 'TimeoutError' || err.name === 'AbortError') {
                updateMessage(loadingId, 'O assistente demorou demais para responder. Tente novamente.');
            } else {
                updateMessage(loadingId, 'Serviço temporariamente indisponível. Tente novamente em instantes.');
            }
        }

        setInputState(false);
    };

    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

    // ── DOM Helpers ───────────────────────────────────────────────────────────
    function appendMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `msg ${sender}`;
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

    function updateMessage(id, text) {
        const div = document.getElementById(id);
        if (div) div.innerHTML = renderMarkdown(text);
        scrollToBottom();
    }

    function renderMarkdown(raw) {
        // 1. Escape HTML to prevent injection
        let t = raw
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // 2. Bold: **text**
        t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

        // 3. Bullet lines: • or * or - at start of line
        t = t.replace(/^[•\*\-]\s+(.+)$/gm, '<span class="msg-bullet">$1</span>');

        // 4. Indented price lines (start with spaces + 💰)
        t = t.replace(/^[ \t]+(💰[^\n]+)$/gm, '<span class="msg-price">$1</span>');

        // 5. Horizontal rule: ---
        t = t.replace(/^---+$/gm, '<hr class="msg-hr">');

        // 6. Emoji-led section headers (line starting with emoji word)
        t = t.replace(/^([\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]️?\s.{2,60})$/gmu, '<span class="msg-section">$1</span>');

        // 7. Line breaks (collapse excess blank lines)
        t = t.replace(/\n{3,}/g, '\n\n');
        t = t.replace(/\n/g, '<br>');

        // 8. Clean up: remove <br> right after block elements
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
