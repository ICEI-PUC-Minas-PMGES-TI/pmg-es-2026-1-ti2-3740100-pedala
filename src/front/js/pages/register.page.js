// @ts-check

function _fieldErr(id, msg) {
    const el = document.getElementById('err-' + id);
    const input = document.getElementById(id);
    if (el) el.textContent = msg || '';
    if (input) input.classList.toggle('error', !!msg);
}

function _clearErrors() {
    ['nome','cpf','email','telefone','senha','confirmarSenha',
     'logradouro','numero','bairro','cidade','uf'].forEach(id => _fieldErr(id, ''));
}

async function handleRegister(e) {
    e.preventDefault();
    _clearErrors();
    const err = document.getElementById('regError');
    err.style.display = 'none';

    const nome     = document.getElementById('nome').value.trim();
    const cpf      = document.getElementById('cpf').value.trim();
    const email    = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const senha    = document.getElementById('senha').value;
    const conf     = document.getElementById('confirmarSenha').value;
    const logr     = document.getElementById('logradouro').value.trim();
    const numero   = document.getElementById('numero').value.trim();
    const bairro   = document.getElementById('bairro').value.trim();
    const cidade   = document.getElementById('cidade').value.trim();
    const uf       = document.getElementById('uf').value.trim();

    let hasError = false;
    function flag(id, msg) { _fieldErr(id, msg); hasError = true; }

    if (!nome)                       flag('nome',     'Nome obrigatório.');
    if (!cpf || cpf.replace(/\D/g,'').length !== 11)
                                     flag('cpf',      'CPF inválido.');
    if (!email || !email.includes('@')) flag('email', 'E-mail inválido.');
    if (!telefone)                   flag('telefone', 'Telefone obrigatório.');
    if (!senha || senha.length < 6)  flag('senha',    'Mínimo 6 caracteres.');
    if (senha !== conf)              flag('confirmarSenha', 'Senhas não conferem.');
    if (!logr)                       flag('logradouro', 'Logradouro obrigatório.');
    if (!numero)                     flag('numero',   'Número obrigatório.');
    if (!bairro)                     flag('bairro',   'Bairro obrigatório.');
    if (!cidade)                     flag('cidade',   'Cidade obrigatória.');
    if (!uf || uf.length !== 2)      flag('uf',       'UF inválida (2 letras).');

    if (hasError) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.textContent = 'Criando conta...';

    const body = {
        nome, cpf, email, telefone, senha,
        endereco: {
            logradouro: logr, numero,
            complemento: document.getElementById('complemento').value.trim(),
            bairro, cidade,
            uf: uf.toUpperCase(),
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
    } catch (_e) {
        err.textContent = 'Erro de conexao.';
        err.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Criar minha conta';
    }
}

window.handleRegister = handleRegister;
document.getElementById('regForm')?.addEventListener('submit', handleRegister);

// Clear inline error on focus
['nome','cpf','email','telefone','senha','confirmarSenha',
 'logradouro','numero','bairro','cidade','uf'].forEach(id => {
    document.getElementById(id)?.addEventListener('focus', () => _fieldErr(id, ''));
});

// CPF mask
document.getElementById('cpf')?.addEventListener('input', e => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 3) v = v.replace(/(\d{3})(\d)/, '$1.$2');
    if (v.length > 7) v = v.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    if (v.length > 11) v = v.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, '$1.$2.$3-$4');
    e.target.value = v;
});

// CEP mask and auto-fill ViaCEP
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
