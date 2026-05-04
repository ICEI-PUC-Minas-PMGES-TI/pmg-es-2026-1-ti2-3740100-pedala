// @ts-check

async function handleRegister(e) {
    e.preventDefault();
    const err = document.getElementById('regError');
    err.style.display = 'none';

    const senha = document.getElementById('senha').value;
    if (senha !== document.getElementById('confirmarSenha').value) {
        err.textContent = 'As senhas nao conferem.';
        err.style.display = 'block';
        return;
    }

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Criando conta...';

    const body = {
        nome: document.getElementById('nome').value.trim(),
        cpf: document.getElementById('cpf').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        senha,
        endereco: {
            logradouro: document.getElementById('logradouro').value.trim(),
            numero: document.getElementById('numero').value.trim(),
            complemento: document.getElementById('complemento').value.trim(),
            bairro: document.getElementById('bairro').value.trim(),
            cidade: document.getElementById('cidade').value.trim(),
            uf: document.getElementById('uf').value.trim().toUpperCase(),
            cep: document.getElementById('cep').value.trim()
        }
    };

    try {
        const { ok, data } = await apiJson('/auth/register', { method: 'POST', body });
        if (!ok) {
            err.textContent = data.error || 'Erro ao cadastrar.';
            err.style.display = 'block';
            return;
        }

        localStorage.setItem('pedala_token', data.token);
        localStorage.setItem('pedala_user', JSON.stringify(data.usuario));
        window.location.href = 'dashboard.html';
    } catch (e) {
        err.textContent = 'Erro de conexao.';
        err.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar minha conta';
    }
}

window.handleRegister = handleRegister;
document.getElementById('regForm')?.addEventListener('submit', handleRegister);

// CPF mask
document.getElementById('cpf')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 3) v = v.replace(/(\d{3})(\d)/, '$1.$2');
    if (v.length > 7) v = v.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    if (v.length > 11) v = v.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    e.target.value = v;
});

// CEP  ViaCEP
document.getElementById('cep')?.addEventListener('input', async e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 5) v = v.replace(/^(\d{5})(\d)/, '$1-$2');
    e.target.value = v;

    const cleanCep = v.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (data.erro) return;

        document.getElementById('logradouro').value = data.logradouro || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = data.localidade || '';
        document.getElementById('uf').value = data.uf || '';
        document.getElementById('numero').focus();
    } catch (error) {
        console.error('Erro ao buscar CEP', error);
    }
});
