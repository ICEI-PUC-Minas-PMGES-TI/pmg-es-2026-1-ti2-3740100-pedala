// @ts-check

/**
 * @template {HTMLElement} T
 * @param {string} id
 * @param {new () => T} ExpectedElement
 * @returns {T}
 */
function getRequiredElement(id, ExpectedElement) {
    const element = document.getElementById(id);
    if (!(element instanceof ExpectedElement)) {
        throw new Error(`Elemento #${id} não encontrado ou inválido.`);
    }
    return element;
}

/**
 * @param {Event} e
 */
async function handleLogin(e) {
    e.preventDefault();
    const btn = getRequiredElement('submitBtn', HTMLButtonElement);
    const errEl = getRequiredElement('loginError', HTMLDivElement);
    const emailInput = getRequiredElement('email', HTMLInputElement);
    const passwordInput = getRequiredElement('senha', HTMLInputElement);

    btn.disabled = true;
    btn.textContent = 'Entrando...';
    errEl.style.display = 'none';

    try {
        const { ok, data } = await apiJson('/auth/login', {
            method: 'POST',
            body: {
                email: emailInput.value.trim(),
                senha: passwordInput.value
            }
        });

        if (!ok) {
            errEl.textContent = data.error || 'Erro ao entrar.';
            errEl.style.display = 'block';
            return;
        }

        localStorage.setItem('pedala_token', data.token);
        localStorage.setItem('pedala_user', JSON.stringify(data.usuario));
        const dest = data.usuario.role === 'admin'
            ? 'admin.html'
            : data.usuario.role === 'funcionario'
                ? 'employee.html'
                : 'dashboard.html';
        window.location.href = dest;
    } catch (e) {
        errEl.textContent = 'Erro de conexão com o servidor.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar';
    }
}

document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
