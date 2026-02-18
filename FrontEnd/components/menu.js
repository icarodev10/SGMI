// menu.js
export function loadMenu() {

    const tipoUsuario = localStorage.getItem("tipo_usuario");
    const isAdmin = tipoUsuario === "Administrador";
    const isGestor = tipoUsuario === "Gestor";
    const isUser = tipoUsuario === "Usuario";
    const isEmpresa = tipoUsuario === "empresa";

    // Submenu Cadastro
    let cadastroMenu = '';
    if (isAdmin || isGestor || isUser) {
        cadastroMenu += `<li><a class="dropdown-item engrenagem-link" href="../View/Gerenciamento_pecas.html"><i class="fa-solid fa-gear engrenagem-icon"></i> Peças</a></li>`;
    }
    if (isAdmin) {
        cadastroMenu += `
            <li><a class="dropdown-item maquina-link" href="../View/Gerenciamento_maquinas.html"><i class="fa-solid fa-industry maquina-icon"></i> Máquinas <span class="smoke"></span></a></li>
            <li><a class="dropdown-item sensor-link" href="../View/Gerenciamento_Sensores.html"><i class="fa-solid fa-eye sensor-icon"></i> Sensores</a></li>
        `;
    }
    if (isAdmin || isEmpresa) {
        cadastroMenu += `
            <li><a class="dropdown-item usuario-link" href="../View/Cadastro_usuario.html"><i class="fa-solid fa-user-plus usuario-icon"></i> Cadastrar Funcionário</a></li>
            <li><a class="dropdown-item cadastro-user-link" href="../View/Usuario.html"><i class="fa-solid fa-user-secret cadastro-user-icon"></i> Gerenciar Equipe</a></li>
        `;
    }
    if (isAdmin || isGestor) {
        cadastroMenu += `<li><a class="dropdown-item manutencao-link" href="../View/Gerenciamento_ordens_manutencao.html"><i class="fa-solid fa-helmet-safety manutencao-icon"></i> Manutenção</a></li>`;
    }

    const menuHTML = `
        <style>
            /* Ícones animados */
            .engrenagem-icon { transition: transform 0.5s ease; display: inline-block; }
            .engrenagem-icon.girando { transform: rotate(360deg); }

            .maquina-link { position: relative; }
            .smoke { position: absolute; left: 16px; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: rgba(28,27,27,0.7); opacity: 0; pointer-events: none; }
            .maquina-link:hover .smoke { animation: smokeUp 5s infinite; }
            @keyframes smokeUp { 0%{opacity:0;transform:translateY(0) scale(0.5);}30%{opacity:0.6;transform:translateY(-10px) scale(1);}60%{opacity:0.3;transform:translateY(-20px) scale(1.3);}100%{opacity:0;transform:translateY(-30px) scale(1.6);} }

            .sensor-icon { transition: all 10s ease; display: inline-block; }
            .sensor-link:hover .sensor-icon { animation: blinkEye 1s infinite; }
            @keyframes blinkEye { 0%,90%,100%{transform:scaleY(1);}45%,55%{transform:scaleY(0.1);} }

            .usuario-link:hover .usuario-icon { animation: pulseUser 0.6s ease-in-out; }
            @keyframes pulseUser {0%,100%{transform:scale(1);}50%{transform:scale(1.3);color:#2c4b60ff;}}

            .cadastro-user-link:hover .cadastro-user-icon { animation: spyBlink 1s infinite; }
            @keyframes spyBlink {0%,100%{opacity:1;}50%{opacity:0.3;transform:scale(0.9);} }

            .manutencao-link:hover .manutencao-icon { animation: swingHelmet 0.8s ease-in-out infinite; transform-origin: top center; }
            @keyframes swingHelmet {0%{transform:rotate(0deg);}25%{transform:rotate(10deg);}50%{transform:rotate(0deg);}75%{transform:rotate(-10deg);}100%{transform:rotate(0deg);} }

            /* SIDEBAR MOBILE */
            @media (max-width: 1170px) {
                #navbarNavDropdown { display: none !important; }

                .mobile-menu-btn {
                    position: absolute;
                    top: 12px;
                    right: 20px;
                    font-size: 28px;
                    color: #fff;
                    background: #2C3E50;
                    padding: 0 10px ;
                    border-radius: 8px;
                    cursor: pointer;
                    z-index: 2000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                }

                .mobile-sidebar {
                    position: fixed;
                    top: 0;
                    right: -260px;
                    width: 260px;
                    height: 100vh;
                    background: #2C3E50;
                    padding-top: 22px;
                    transition: right 0.3s ease-in-out;
                    z-index: 1500;
                    box-shadow: -4px 0 10px rgba(0,0,0,0.4);
                }

                .mobile-sidebar.open { right: 0; }

                .close-btn {
                    position: absolute;
                    top: 4px;
                    right: 20px;
                    font-size: 26px;
                    color: #fff;
                    cursor: pointer;
                }

                .sidebar-links { list-style: none; padding: 0 15px; }
                .sidebar-links li { margin: 4px 0; }
                .sidebar-links a {
                    color: #fff;
                    text-decoration: none;
                    font-size: 17px;
                    padding: 4px 0;
                    display: block;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .sidebar-links a:hover {
                    color: #fff;
                    text-decoration: none;
                    font-size: 17px;
                    padding: 4px 0;
                    display: block;
                    border-bottom: 1px solid rgba(255,255,255,0.08);
                }
                .sidebar-title { margin-top: 8px; margin-bottom: 2px; font-size: 12px; color: #d1d1d1; text-transform: uppercase; }
            }

            @media (min-width: 1171px) { .mobile-menu-btn, .mobile-sidebar { display: none !important; } }
        </style>

        <nav class="navbar navbar-expand-lg" id="nav-bar-all" style="background-color: #2C3E50; height: 60px; position: relative;">
            <div class="container-fluid">
                <a class="navbar-brand" href="../View/home.html" style="margin-top: 12px;">
                    <img src="../View/img/Logo_text.svg" alt="Logo" style="max-width: 100px; margin-left: 50px;">
                </a>

                <!-- Botão mobile dentro do header -->
                <div id="mobile-menu-btn" class="mobile-menu-btn"><i class="fa-solid fa-bars"></i></div>

                <div class="collapse navbar-collapse justify-content-end" id="navbarNavDropdown">
                    <ul class="navbar-nav align-items-center">
                        <li class="nav-item"><a class="nav-link item-navegacao" href="../View/home.html">Home</a></li>
                        ${(isAdmin || isGestor || isUser) ? `<li class="nav-item"><a class="nav-link item-navegacao" href="../View/Solicitacao_de_manutencao.html">Solicitar Manutenção</a></li>` : ''}
                        ${(isAdmin || isGestor) ? `<li class="nav-item"><a class="nav-link item-navegacao" href="../View/Gerenciamento_Solicitacao.html">Gerir Solicitações</a></li>` : ''}
                        ${cadastroMenu ? `<li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">Cadastro</a><ul class="dropdown-menu">${cadastroMenu}</ul></li>` : ''}
                        ${isAdmin ? `
                            <li class="nav-item dropdown"><a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">Histórico</a>
                                <ul class="dropdown-menu">
                                    <li><a class="dropdown-item" href="../View/Historico.html">Histórico de Ordens</a></li>
                                    <li><a class="dropdown-item" href="../View/HistoricoAtivo.html">Histórico de Ativos</a></li>
                                    <li><a class="dropdown-item" href="../View/HistoricoSensor.html">Histórico de Sensores</a></li>
                                </ul>
                            </li>
                            <li class="nav-item"><a class="nav-link item-navegacao" href="../View/Dashboards.html">Dashboard</a></li>
                        ` : ''}
                        ${(!isEmpresa) ? `
                            <li class="nav-item"><a class="nav-link" href="../View/Perfil.html"><i class="fa-solid fa-user"></i></a></li>
                            <li class="nav-item"><a class="nav-link" href="../View/Notificacao.html"><i class="fa-solid fa-bell"></i></a></li>
                        ` : ''}
                        <li class="nav-item"><a id="logout-button" class="nav-link" href="#"><i class="fa-solid fa-sign-out-alt"></i></a></li>
                    </ul>
                </div>
            </div>
        </nav>

        <!-- SIDEBAR MOBILE -->
        <aside id="mobile-sidebar" class="mobile-sidebar">
            <div class="close-btn"><i class="fa-solid fa-xmark"></i></div>
            <ul class="sidebar-links">
                <li><a href="../View/home.html">Home</a></li>
                ${(isAdmin || isGestor || isUser) ? `<li><a href="../View/Solicitacao_de_manutencao.html">Solicitar Manutenção</a></li>` : ''}
                ${(isAdmin || isGestor) ? `<li><a href="../View/Gerenciamento_Solicitacao.html">Gerir Solicitações</a></li>` : ''}
                ${cadastroMenu ? `<li class="sidebar-title">Cadastro</li>${cadastroMenu}` : ''}
                ${isAdmin ? `<li class="sidebar-title">Histórico</li>
                    <li><a href="../View/Historico.html">Histórico de Ordens</a></li>
                    <li><a href="../View/HistoricoAtivo.html">Histórico de Ativos</a></li>
                    <li><a href="../View/HistoricoSensor.html">Histórico de Sensores</a></li>
                    <li><a href="../View/Dashboards.html">Dashboard</a></li>` : ''}
                ${(!isEmpresa) ? `<li><a href="../View/Perfil.html">Perfil</a></li>
                    <li><a href="../View/Notificacao.html">Notificações</a></li>` : ''}
                <li><a id="logout-mobile" href="#">Sair</a></li>
            </ul>
        </aside>
    `;

    const container = document.getElementById("menu-container");
    if (!container) return console.error("Elemento #menu-container não encontrado.");
    container.innerHTML = menuHTML;

    // Animações
    const engrenagemLink = container.querySelector(".engrenagem-link");
    const engrenagemIcon = container.querySelector(".engrenagem-icon");
    if (engrenagemLink && engrenagemIcon) {
        engrenagemLink.addEventListener("mouseenter", () => engrenagemIcon.classList.add("girando"));
        engrenagemLink.addEventListener("mouseleave", () => engrenagemIcon.classList.remove("girando"));
    }

    // Logout
    container.querySelector('#logout-button')?.addEventListener('click', e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '../View/index.html';
    });

    // Mobile menu
    const btnMobile = container.querySelector("#mobile-menu-btn");
    const sidebarMobile = container.querySelector("#mobile-sidebar");
    const closeMobile = container.querySelector(".close-btn i");
    const logoutMobile = container.querySelector("#logout-mobile");

    if (btnMobile && sidebarMobile && closeMobile) {
        btnMobile.addEventListener("click", () => {
            sidebarMobile.classList.add("open");
            btnMobile.style.display = "none";
        });
        closeMobile.addEventListener("click", () => {
            sidebarMobile.classList.remove("open");
            btnMobile.style.display = "block";
        });
        logoutMobile?.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "../View/index.html";
        });
    }
}
