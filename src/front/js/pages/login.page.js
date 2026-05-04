// @ts-check

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    const errEl = document.getElementById('loginError');

    btn.disabled = true;
    btn.textContent = 'Entrando...';
    errEl.style.display = 'none';

    try {
        const { ok, data } = await apiJson('/auth/login', {
            method: 'POST',
            body: {
                email: document.getElementById('email').value.trim(),
                senha: document.getElementById('senha').value
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
        errEl.textContent = 'Erro de conexao com o servidor.';
        errEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar na Pedala';
    }
}

window.handleLogin = handleLogin;
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
