document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotContainer = document.getElementById('chatbotContainer');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotSend = document.getElementById('chatbotSend');

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
        const text = chatbotInput.value.trim();
        if (!text) return;

        // Add user message
        appendMessage('user', text);
        chatbotInput.value = '';

        // Add loading indicator
        const loadingId = appendMessage('bot', 'Digitando...');

        try {
            const response = await fetch(`${window.PEDALA_API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message: text })
            });

            if (!response.ok) throw new Error('Erro na resposta do servidor');

            const data = await response.json();
            updateMessage(loadingId, data.reply || 'Consigo ajudar com aluguel, pagamento, entrega e vistoria.');
        } catch (error) {
            console.error('Chatbot Error:', error);
            updateMessage(loadingId, 'Desculpe, nao consegui falar com a IA agora. Tente novamente em instantes.');
        }
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

    function updateMessage(id, text) {
        const msgDiv = document.getElementById(id);
        if (msgDiv) {
            msgDiv.textContent = text;
        }
        scrollToBottom();
    }

    function scrollToBottom() {
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
});
