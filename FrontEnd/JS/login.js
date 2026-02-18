// login.js 

document.addEventListener('DOMContentLoaded', () => {

  // ===========================
  // Seletores (só após DOM ready)
  // ===========================
  const form = document.getElementById('formCadastro');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const mensagemErroEl = document.getElementById('mensagem-erro');

  // Segurança: se não existir o form (página sem login), não tenta adicionar listeners
  if (form) {
    form.addEventListener('submit', enviarFormulario);
  }

  if (emailInput) emailInput.addEventListener('input', () => mensagemErroEl.textContent = '');
  if (passwordInput) passwordInput.addEventListener('input', () => mensagemErroEl.textContent = '');

  // ===========================
  // Função de envio do formulário
  // ===========================
  function enviarFormulario(event) {
    event.preventDefault();
    if (!form) return;

    const email = emailInput ? emailInput.value : '';
    const senha = passwordInput ? passwordInput.value : '';
    const btnSubmit = form.querySelector('button[type="submit"]');

    mensagemErroEl.textContent = '';
    if (btnSubmit) btnSubmit.textContent = "Verificando...";

    // Ajuste de URL conforme seu backend
    fetch(`http://localhost:5000/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Senha: senha })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errData => {
          throw new Error(errData.error || 'Usuário ou senha inválidos.');
        });
      }
      return response.json();
    })
    .then(data => {
      // SALVAR DADOS (evitar salvar senha em localStorage)
      try {
        localStorage.setItem("ID", data.Id || '');
        localStorage.setItem("Nome", data.Nome || '');
        localStorage.setItem("Email", data.Email ? JSON.stringify(data.Email) : '');
        localStorage.setItem("Telefone", data.Telefone ? JSON.stringify(data.Telefone) : '');
        localStorage.setItem("tipo_usuario", data.Tipo_Usuario || '');

        if (data.Tipo_Usuario === 'empresa') {
          localStorage.setItem("CNPJ", data.CNPJ || '');
          localStorage.removeItem("CPF");
          localStorage.removeItem("Sexo");
        } else {
          localStorage.setItem("CPF", data.cpf ? JSON.stringify(data.cpf) : '');
          localStorage.setItem("Login", data.Login ? JSON.stringify(data.Login) : '');
          localStorage.setItem("Data_Nascimento", data.Data_Nascimento ? JSON.stringify(data.Data_Nascimento) : '');
          localStorage.setItem("Complemento", data.Complemento ? JSON.stringify(data.Complemento) : '');
          localStorage.setItem("CEP", data.cep || '');
          localStorage.setItem("Sexo", data.Sexo || '');
          localStorage.removeItem("CNPJ");
        }
      } catch (err) {
        console.warn("Erro ao salvar localStorage:", err);
      }

      // Redirecionamento
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        window.location.href = "../View/home.html";
      }
    })
    .catch(error => {
      console.error("Erro no login:", error);
      mensagemErroEl.textContent = error.message || "Erro no login";
      if (btnSubmit) btnSubmit.textContent = "Entrar";
    });
  }

  // =========================================================
  // FUNÇÃO: configurarSplash
  // - mostra splash, espera animação, aplica fade, mostra main
  // =========================================================
  function configurarSplash() {
    const splashScreen = document.getElementById('splash-screen');
    const mainScreen = document.getElementById('main-screen');

    if (!splashScreen || !mainScreen) return;

    // tempo total que queremos mostrar o splash (ms)
    const DURACAO_SPLASH_MS = 3000;
    // duração da transição de fade (deve bater com CSS)
    const DURACAO_FADE_MS = 800;

    // Garantir que main está escondido (classe 'hidden' no CSS)
    mainScreen.classList.add('hidden');
    mainScreen.setAttribute('aria-hidden', 'true');

    // Aguarda o window.load para garantir recursos visuais prontos (opcional)
    // Mas como já estamos em DOMContentLoaded, podemos usar setTimeout direto
    setTimeout(() => {
      // aplica classe que faz fade
      splashScreen.classList.add('fade-out');

      // após a duração do fade, removemos o splash e mostramos main
      setTimeout(() => {
        // esconder completamente
        splashScreen.style.display = 'none';

        // mostrar a main
        mainScreen.classList.remove('hidden');
        mainScreen.setAttribute('aria-hidden', 'false');

        // chama iniciarParticulas se existir
        if (typeof window.iniciarParticulas === 'function') {
          try {
            window.iniciarParticulas();
          } catch (err) {
            console.warn('Erro em iniciarParticulas():', err);
          }
        }
      }, DURACAO_FADE_MS);
    }, DURACAO_SPLASH_MS);
  }

  // Executa configuração do splash
  configurarSplash();

}); // fim DOMContentLoaded

document.addEventListener("DOMContentLoaded", () => {

    // Ajustar stroke para desenhar o triângulo
    const triangle = document.getElementById("trianglePath");
    const length = triangle.getTotalLength();
    triangle.style.strokeDasharray = length;
    triangle.style.strokeDashoffset = length;

    // Inicia animação automaticamente (CSS já faz)

    // Controle do splash → login
    setTimeout(() => {
        document.getElementById("splash-screen").classList.add("fade-out");

        setTimeout(() => {
            document.getElementById("splash-screen").style.display = "none";
            document.getElementById("main-screen").classList.remove("hidden");
        }, 900);

    }, 2600);
});

document.addEventListener("DOMContentLoaded", () => {

    // Calcula tamanho real de cada path e aplica dinamicamente
    document.querySelectorAll("#cypher-triangle .svg-draw").forEach(path => {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
    });

    // Mostra e esconde o splash
    setTimeout(() => {
        document.getElementById("splash-screen").classList.add("fade-out");

        setTimeout(() => {
            document.getElementById("splash-screen").style.display = "none";
            document.getElementById("main-screen").classList.remove("hidden");
        }, 850);

    }, 2500);

});

document.addEventListener("DOMContentLoaded", () => {
  // Seleciona todos os paths que devem animar
  const paths = Array.from(document.querySelectorAll("#cypher-triangle .svg-draw"));

  if (paths.length === 0) {
    // nenhum path — nada a fazer
    return;
  }

  // calcula e aplica stroke-dasharray/offset, sem iniciar animação
  paths.forEach(path => {
    try {
      const len = path.getTotalLength();
      // guarda len como var CSS caso queira usar
      path.style.setProperty('--path-len', len);
      // define valores inline (essenciais)
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      // remove qualquer animação presente
      path.classList.remove('animate');
    } catch (err) {
      console.warn('Erro ao calcular length do path', err);
    }
  });

  // força reflow para garantir que o navegador "veja" as mudanças
  void document.getElementById('cypher-triangle').getBoundingClientRect();

  // aplica a classe animate com delays sequenciais
  const baseDelay = 0.12; // segundos antes de começar o primeiro
  const gap = 0.28;       // intervalo entre cada path

  paths.forEach((path, i) => {
    const delay = baseDelay + i * gap;
    // aplica delay inline (preciso para garantir precisão)
    path.style.animationDelay = `${delay}s`;
    // opcional: duração diferente para o triangulo interno
    path.style.animationDuration = (i === 0) ? '1.6s' : '1.2s';
    // adiciona classe que dispara a animação
    path.classList.add('animate');
  });

  // Se você já tem lógica de fade-out no splash, garanta que o fade só comece
  // depois que as animações acabarem. Por exemplo, se quiser iniciar fade 2.8s + delays:
  const totalAnimationTime = baseDelay + (paths.length - 1) * gap + 1.6; // em segundos
  const fadeDelayMs = Math.round(totalAnimationTime * 1000) + 300; // margem extra

  setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.classList.add('fade-out');

    setTimeout(() => {
      if (splash) splash.style.display = 'none';
      const main = document.getElementById('main-screen');
      if (main) main.classList.remove('hidden');
    }, 900); // tempo do fade CSS (match com transition)
  }, fadeDelayMs);

});


