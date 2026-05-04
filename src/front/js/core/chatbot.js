document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');
    let isAwaitingReply = false;

    if (!chatbotToggle || !chatbotContainer) return;

    // Toggle Chatbot
    chatbotToggle.addEventListener('click', () => {
        chatbotContainer.classList.add('active');
        chatbotInput.focus();
    });

    chatbotClose.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
    });

    // Send Message
    const sendMessage = async () => {
        if (isAwaitingReply) return;
        const text = chatbotInput.value.trim();
        if (!text) return;

        // Add user message
        appendMessage('user', text);
        chatbotInput.value = '';
        setInputState(true);

        // Add loading indicator
        const loadingId = appendMessage('bot', 'Digitando...');

        const reply = getLocalReply(text);
        setTimeout(() => {
            updateMessage(loadingId, reply.text);
            if (reply.action === 'catalog') {
                appendMessageHtml('bot', 'Ver catalogo agora &#8594; <a class="chat-link" href="#catalogo">Abrir catalogo</a>');
            }
            setInputState(false);
        }, 350 + Math.min(text.length * 12, 900));
    };

    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    let messageIdCounter = 0;

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${sender}`;
        msgDiv.textContent = text;
        
        const id = `msg-${messageIdCounter++}`;
        msgDiv.id = id;
        
        chatbotMessages.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function appendMessageHtml(sender, html) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `msg ${sender}`;
        msgDiv.innerHTML = html;

        const id = `msg-${messageIdCounter++}`;
        msgDiv.id = id;

        chatbotMessages.appendChild(msgDiv);
        scrollToBottom();
        return id;
    }

    function updateMessage(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            msgDiv.textContent = text;
        }
        scrollToBottom();
    }

    function getLocalReply(text) {
        const normalized = normalizeText(text);
        const recommendation = buildBikeRecommendation(normalized);
        if (recommendation) return recommendation;
        const intents = [
            {
                test: ['escolher', 'escolha', 'recomendar', 'recomendacao', 'indicar', 'sugerir', 'qual bike', 'qual bicicleta', 'modelo ideal', 'bike ideal', 'bicicleta ideal'],
                reply: 'Posso te ajudar a escolher. Voce vai usar mais para trabalho/rotina urbana, lazer/viagem ou trilha?'
            },
            {
                test: ['urbano', 'cidade', 'asfalto', 'trabalho', 'trabalhar', 'rotina', 'deslocamento', 'comute', 'servico', 'emprego', 'escritorio'],
                reply: 'Para uso urbano, recomendo uma bike leve e confortavel. Quer priorizar velocidade, conforto ou custo menor?'
            },
            {
                test: ['lazer', 'passeio', 'parque', 'fim de semana', 'viagem', 'ciclovia'],
                reply: 'Para lazer, uma bike versatil e confortavel funciona bem. Prefere postura mais ereta ou desempenho?'
            },
            {
                test: ['trilha', 'terra', 'montanha', 'off-road', 'acidentado'],
                reply: 'Para trilha, uma bike com pneus mais largos e suspensao e ideal. Vai encarar trilhas leves ou mais pesadas?'
            },
            {
                test: ['preco', 'preco', 'valor', 'plano', 'assinatura', 'mensal', 'semanal', 'quinzenal'],
                reply: 'Os planos variam por modelo (semanal, quinzenal e mensal). Quer que eu indique um plano pelo seu uso (urbano, lazer ou trabalho)?'
            },
            {
                test: ['entrega', 'retirada', 'prazo', 'frete', 'agendar', 'agenda'],
                reply: 'Entregamos em ate 1 dia util e agendamos retirada quando voce precisar. Quer simular a entrega para o seu bairro?'
            },
            {
                test: ['manutencao', 'revisao', 'suporte', 'assistencia', 'quebrou', 'problema'],
                reply: 'A manutencao preventiva esta inclusa. Se tiver problema, abrimos chamado e buscamos a bike em ate 48h.'
            },
            {
                test: ['gps', 'rastreamento', 'roubo', 'seguranca'],
                reply: 'Todas as bikes tem GPS ativo para seguranca e suporte. Posso explicar como funciona o acompanhamento?'
            },
            {
                test: ['cadastro', 'documento', 'cpf', 'rg', 'comprovante'],
                reply: 'Para cadastrar, precisamos apenas de CPF e um endereco valido. Sem comprovante de renda ou fiador.'
            },
            {
                test: ['cancelar', 'cancelamento', 'pausar', 'encerrar'],
                reply: 'Voce pode cancelar a qualquer momento sem multa. Quer que eu explique o passo a passo?'
            },
            {
                test: ['ola', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'eai'],
                reply: 'Oi! Posso ajudar com planos, entrega, manutencao ou cadastro. O que voce precisa?'
            }
        ];

        const match = intents.find(intent => intent.test.some(term => normalized.includes(term)));
        const fallback = 'Consigo ajudar com planos, entrega, manutencao, cadastro e GPS. Sobre o que voce quer saber?';
        return {
            text: match ? match.reply : fallback,
            action: null
        };
    }

    function buildBikeRecommendation(normalized) {
        const bikes = getAvailableBikes();
        if (!bikes.length) return null;

        const preference = detectPreference(normalized);
        if (!preference) return null;

        const filtered = filterBikesByPreference(bikes, preference);
        const selected = selectBikes(filtered, preference);

        if (!selected.length) {
            return {
                text: 'Nao encontrei uma bike desse perfil agora, mas posso sugerir outra categoria se voce quiser.',
                action: null
            };
        }

        const lines = selected.map(bike => formatBikeSuggestion(bike));
        return {
            text: `Sugestoes para voce:\n${lines.join('\n')}`,
            action: 'catalog'
        };
    }

    function getAvailableBikes() {
        const bikes = Array.isArray(window.PEDALA_BIKES) ? window.PEDALA_BIKES : [];
        return bikes.filter(bike => bike && !bike.bloqueada && (bike.quantidadeDisponivel || 0) > 0);
    }

    function detectPreference(text) {
        const preference = { category: '', sort: '' };

        if (text.includes('eletrica')) preference.category = 'eletrica';
        else if (text.includes('dobravel') || text.includes('dobravel')) preference.category = 'dobravel';
        else if (text.includes('infantil') || text.includes('kids')) preference.category = 'infantil';
        else if (text.includes('trilha') || text.includes('mountain') || text.includes('off road') || text.includes('off-road')) preference.category = 'mountain';
        else if (text.includes('speed') || text.includes('road')) preference.category = 'speed';
        else if (text.includes('urbano') || text.includes('cidade') || text.includes('asfalto') || text.includes('trabalho') || text.includes('trabalhar') || text.includes('rotina') || text.includes('servico') || text.includes('emprego') || text.includes('escritorio')) preference.category = 'urbana';
        else if (text.includes('lazer') || text.includes('passeio') || text.includes('ciclovia')) preference.category = 'lazer';

        if (text.includes('barata') || text.includes('economica') || text.includes('custo')) preference.sort = 'low';
        if (text.includes('premium') || text.includes('top') || text.includes('melhor')) preference.sort = 'high';

        if (!preference.category && !preference.sort) return null;
        return preference;
    }

    function filterBikesByPreference(bikes, preference) {
        if (!preference.category) return bikes.slice();

        const category = preference.category;
        return bikes.filter(bike => {
            const value = String(bike.categoria || '').toLowerCase();
            if (category === 'lazer') return !value.includes('mountain') && !value.includes('speed') && !value.includes('eletrica');
            if (category === 'urbana') return value.includes('urb') || value.includes('city') || value.includes('urban');
            if (category === 'mountain') return value.includes('mountain') || value.includes('trilha');
            if (category === 'speed') return value.includes('speed') || value.includes('road');
            return value.includes(category);
        });
    }

    function selectBikes(bikes, preference) {
        const sorted = bikes.slice().sort((a, b) => priceValue(a) - priceValue(b));
        if (preference.sort === 'high') sorted.reverse();
        return sorted.slice(0, 2);
    }

    function priceValue(bike) {
        return Number(bike?.precos?.mensal ?? bike?.precos?.semanal ?? 0) || 0;
    }

    function formatBikeSuggestion(bike) {
        const price = formatMoney(bike?.precos?.mensal);
        const category = String(bike.categoria || '').trim();
        const name = String(bike.nome || 'Modelo');
        return `- ${name} (${category}) a partir de ${price}/mes`;
    }

    function formatMoney(value) {
        if (typeof window.formatCurrency === 'function') return window.formatCurrency(value);
        return `R$ ${Number(value || 0).toFixed(2)}`;
    }

    function setInputState(waiting) {
        isAwaitingReply = waiting;
        if (chatbotInput) chatbotInput.disabled = waiting;
        if (chatbotSend) chatbotSend.disabled = waiting;
    }

    function normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^\p{L}\p{N}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function scrollToBottom() {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
});
