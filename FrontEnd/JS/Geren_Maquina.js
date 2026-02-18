// =================== VARIÁVEIS GLOBAIS DE ESTADO ===================
let currentPage = 1;
const rowsPerPage = 10;
let allAtivos = [];
let ativos = [];
let totalPages = 1;
let ativoParaExcluirId = null;
let ativoAtualID = null;
let modeloParaExcluirId = null;
let ativoParaEditar = null;
let currentModel = null; // referência para remover o modelo anterior


// Variáveis globais para a cena 3D.
let scene, camera, renderer, controls, animationFrameId;
let isModelLoading = false; // <-- trava de segurança

// =================== LÓGICA DO VISUALIZADOR 3D (THREE.JS) ===================

window.abrirVisualizador3D = function (modelPath, assetName) {
    if (isModelLoading) return console.warn("Carregamento em progresso...");
    isModelLoading = true;

    document.getElementById('viewer3DModalLabel').textContent = `Visualizador 3D - ${assetName}`;
    const container = document.getElementById('viewer3DContainer');
    if (!container) {
        isModelLoading = false;
        return console.error('Container 3D não encontrado!');
    }

    const modal = new bootstrap.Modal(document.getElementById('viewer3DModal'));
    modal.show();

    setTimeout(() => init3DScene(container, modelPath), 300);
};

function init3DScene(container, modelPath) {
    cleanup3DScene();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Luzes
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7.5);
    scene.add(dirLight);

    // Controles de órbita
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.autoRotate = false;

    loadModel(modelPath);
    animate();

    window.addEventListener('resize', onWindowResize);
}

async function loadModel(url) {
    const loadingSpinner = document.getElementById('loadingSpinner');
    loadingSpinner.style.pointerEvents = 'none';
    loadingSpinner.style.display = 'flex';
    loadingSpinner.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Carregando...</span></div>';


    // Remove modelo anterior (se houver)
    if (currentModel) {
        scene.remove(currentModel);
        // tenta liberar geometria/materials
        currentModel.traverse((c) => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) {
                    c.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose && m.dispose(); });
                } else {
                    if (c.material.map) c.material.map.dispose();
                    c.material.dispose && c.material.dispose();
                }
            }
        });
        currentModel = null;
    }

    // Helper para centralizar e escalar
    function normalizeAndAddToScene(obj) {
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3()).length();
        if (size > 0) {
            const scaleFactor = 3 / size; // ajuste se quiser outro tamanho padrão
            obj.scale.setScalar(scaleFactor);
        }
        const center = box.getCenter(new THREE.Vector3());
        obj.position.sub(center);
        scene.add(obj);
        currentModel = obj;
    }

    // Detecta extensão (remove query string)
    const cleanUrl = url.split('?')[0];
    const ext = cleanUrl.split('.').pop().toLowerCase();

    try {
        if (ext === 'glb' || ext === 'gltf') {
            const loader = new THREE.GLTFLoader();
            loader.load(
                url,
                (gltf) => {
                    normalizeAndAddToScene(gltf.scene);
                    loadingSpinner.style.display = 'none';
                    loadingSpinner.innerHTML = '';
                    isModelLoading = false;
                },
                (xhr) => {
                    if (xhr.total > 0) console.log(`Carregando: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                },
                (error) => {
                    console.error("Erro ao carregar GLTF/GLB:", error);
                    loadingSpinner.innerHTML = '<p class="text-danger">Erro ao carregar modelo GLTF/GLB.</p>';
                    isModelLoading = false;
                }
            );

        } else if (ext === 'obj') {
            // tenta carregar .mtl com mesmo nome (se existir)
            const mtlUrl = cleanUrl.replace(/\.obj$/i, '.mtl');

            // Verifica se .mtl existe (fetch HEAD ou GET)
            let mtlExists = false;
            try {
                const headResp = await fetch(mtlUrl, { method: 'HEAD' });
                mtlExists = headResp.ok;
            } catch (e) {
                // alguns servidores não suportam HEAD — tentar GET rápido
                try {
                    const getResp = await fetch(mtlUrl, { method: 'GET' });
                    mtlExists = getResp.ok;
                } catch (e2) {
                    mtlExists = false;
                }
            }

            if (mtlExists && window.MTLLoader) {
                const mtlLoader = new THREE.MTLLoader();
                mtlLoader.load(
                    mtlUrl,
                    (materials) => {
                        materials.preload();
                        const objLoader = new THREE.OBJLoader();
                        objLoader.setMaterials(materials);
                        objLoader.load(
                            url,
                            (obj) => {
                                normalizeAndAddToScene(obj);
                                loadingSpinner.style.display = 'none';
                                loadingSpinner.innerHTML = '';
                                isModelLoading = false;
                            },
                            (xhr) => {
                                if (xhr.total > 0) console.log(`Carregando: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                            },
                            (error) => {
                                console.error("Erro ao carregar OBJ com MTL:", error);
                                loadingSpinner.innerHTML = '<p class="text-danger">Erro ao carregar modelo OBJ (+MTL).</p>';
                                isModelLoading = false;
                            }
                        );
                    },
                    null,
                    (err) => {
                        console.warn("Não foi possível carregar MTL ou MTL inválido:", err);
                        // fallback: carregar só o OBJ
                        const objLoader = new THREE.OBJLoader();
                        objLoader.load(
                            url,
                            (obj) => {
                                normalizeAndAddToScene(obj);
                                loadingSpinner.style.display = 'none';
                                loadingSpinner.innerHTML = '';
                            },
                            (xhr) => { if (xhr.total > 0) console.log(`Carregando: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`); },
                            (error2) => {
                                console.error("Erro ao carregar OBJ:", error2);
                                loadingSpinner.innerHTML = '<p class="text-danger">Erro ao carregar modelo OBJ.</p>';
                            }
                        );
                    }
                );

            } else {
                // Sem MTL: carrega apenas o OBJ
                const objLoader = new THREE.OBJLoader();
                objLoader.load(
                    url,
                    (obj) => {
                        normalizeAndAddToScene(obj);
                        loadingSpinner.style.display = 'none';
                        loadingSpinner.innerHTML = '';
                        isModelLoading = false;
                    },
                    (xhr) => {
                        if (xhr.total > 0) console.log(`Carregando: ${(xhr.loaded / xhr.total * 100).toFixed(2)}%`);
                    },
                    (error) => {
                        console.error("Erro ao carregar OBJ:", error);
                        loadingSpinner.innerHTML = '<p class="text-danger">Erro ao carregar modelo OBJ.</p>';
                        isModelLoading = false;
                    }
                );
            }

        } else {
            throw new Error('Tipo de arquivo não suportado: ' + ext);
        }
    } catch (e) {
        console.error("Erro no loadModel:", e);
        loadingSpinner.innerHTML = `<p class="text-danger">${e.message}</p>`;
    } finally {
        // isModelLoading será setado no callback dos loaders; aqui mantemos a garantia de não travar
        // caso precise, você pode setar isModelLoading = false nos handlers de erro/sucesso (já feito).
    }
}


function animate() {
    animationFrameId = requestAnimationFrame(animate);
    if (controls) controls.update();
    if (renderer && scene && camera) renderer.render(scene, camera);
}

function cleanup3DScene() {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', onWindowResize);
    if (renderer) {
        renderer.dispose();
        const container = document.getElementById('viewer3DContainer');
        if (container && renderer.domElement && container.contains(renderer.domElement)) {
            container.removeChild(renderer.domElement);
        }
    }
}

function onWindowResize() {
    const container = document.getElementById('viewer3DContainer');
    if (camera && renderer && container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}


// =================== FUNÇÕES GLOBAIS  ===================

function formatarDataParaBR(dataString) {
    if (!dataString) return '';
    try {
        // Normaliza formatos como "2025-10-08T00:00:00Z"
        const data = new Date(dataString);
        if (isNaN(data)) return ''; // evita "Invalid Date"
        return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) {
        console.error('Erro ao formatar para BR:', e, dataString);
        return '';
    }
}

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    try {
        let data = new Date(dataString);

        // Se a string vier no formato "YYYY-MM-DD", forçamos a UTC
        if (/^\d{4}-\d{2}-\d{2}$/.test(dataString)) {
            data = new Date(`${dataString}T00:00:00Z`);
        }

        // Ajusta fuso horário para não adiantar/atrasar
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
        return data.toISOString().split('T')[0]; // retorna "YYYY-MM-DD"
    } catch (e) {
        console.error('Erro ao formatar para input:', e, dataString);
        return '';
    }
}


// =================== LÓGICA DE SELEÇÃO DE MODELOS ===================

// 1. Função chamada pelo botão da tabela
async function prepararVisualizacao(idAtivo, nomeAtivo) {
    try {
        // Mostra um feedback visual rápido (opcional)
        document.body.style.cursor = 'wait';
        
        // Busca os modelos vinculados a este ativo em tempo real
        const response = await fetch(`http://localhost:5000/ativos/${idAtivo}/modelos3d`);
        const modelos = await response.json();

        document.body.style.cursor = 'default';

        if (!modelos || modelos.length === 0) {
            return exibirMensagemGeral("Nenhum modelo 3D vinculado a este ativo.", "warning");
        }

        // CENÁRIO A: Apenas 1 modelo -> Abre direto
        if (modelos.length === 1) {
            const caminhoCompleto = corrigirCaminho(modelos[0].Arquivo);
            abrirVisualizador3D(caminhoCompleto, nomeAtivo);
        } 
        // CENÁRIO B: Mais de 1 modelo -> Abre modal de escolha
        else {
            abrirModalSelecaoModelo(modelos, nomeAtivo);
        }

    } catch (error) {
        document.body.style.cursor = 'default';
        console.error(error);
        exibirMensagemGeral("Erro ao verificar modelos 3D.", "danger");
    }
}

// 2. Preenche e abre o modal de seleção
function abrirModalSelecaoModelo(modelos, nomeAtivo) {
    const listaContainer = document.getElementById('listaModelosDisponiveis');
    if (!listaContainer) return console.error("Modal de seleção não encontrado no HTML!");

    listaContainer.innerHTML = ''; 

    modelos.forEach((modelo, index) => {
        const item = document.createElement('button');
        item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center mb-2 border rounded';
        
        // Limpa o nome do arquivo para exibição
        const nomeArquivo = modelo.Arquivo.split(/[/\\]/).pop(); 

        item.innerHTML = `
            <div>
                <strong class="text-primary">${modelo.Nome || 'Versão ' + (index + 1)}</strong>
                <div class="text-muted small" style="font-size: 0.85em;">Arquivo: ${nomeArquivo}</div>
            </div>
            <i class="fa-solid fa-chevron-right text-secondary"></i>
        `;

        item.onclick = function() {
            // Fecha o modal de seleção
            const modalEl = document.getElementById('modalSelecaoModelo');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            // Abre o visualizador
            const caminhoCompleto = corrigirCaminho(modelo.Arquivo);
            abrirVisualizador3D(caminhoCompleto, nomeAtivo);
        };

        listaContainer.appendChild(item);
    });

    // Abre o modal usando Bootstrap
    const modalSelecao = new bootstrap.Modal(document.getElementById('modalSelecaoModelo'));
    modalSelecao.show();
}

// 3. Helper para corrigir caminhos (Fundamental para evitar o erro 404)
function corrigirCaminho(nomeArquivo) {
    // Pega apenas o nome do arquivo, ignorando pastas que venham do banco
    const apenasNome = nomeArquivo.split(/[/\\]/).pop();
    // Retorna a rota oficial do app.py
    return `http://localhost:5000/uploads/modelos_3d/${apenasNome}`;
}





// =================== LÓGICA PRINCIPAL (DOM LOADED) ===================
document.addEventListener('DOMContentLoaded', function () {

    // Listener para limpeza do modal 3D
    const viewerModalEl = document.getElementById('viewer3DModal');
    if (viewerModalEl) {
        viewerModalEl.addEventListener('hidden.bs.modal', cleanup3DScene);
    }


});

function formatarDataParaInput(dataString) {
    if (!dataString) return '';
    try {
        const data = new Date(dataString);
        data.setMinutes(data.getMinutes() + data.getTimezoneOffset());
        return data.toISOString().slice(0, 10);
    } catch (e) { return ''; }
}

function exibirMensagemGeral(mensagem, tipo = 'danger', elementoId = 'mensagemErro') {
    const mensagemDiv = document.getElementById(elementoId);
    if (mensagemDiv) {
        mensagemDiv.textContent = mensagem;
        mensagemDiv.className = `alert alert-${tipo}`;
        mensagemDiv.classList.remove('d-none');
        setTimeout(() => {
            mensagemDiv.classList.add('d-none');
        }, 5000);
    } else {
        alert(mensagem);
    }
}

window.exportar = function (formato, scope) {
    // Define os dados base (Tudo ou Página Atual)
    const dadosDaPagina = ativos.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    const dadosParaExportar = scope === 'tudo' ? ativos : dadosDaPagina;

    if (dadosParaExportar.length === 0) {
        return exibirMensagemGeral("Nenhuma máquina para exportar.", "warning");
    }

    const colunas = ["ID", "Nome", "Descrição", "Fabricante", "Modelo", "Nº Série", "Data Aquisição", "Local", "Status"];
    
    // Prepara as linhas de dados formatadas
    const linhas = dadosParaExportar.map(a => [
        a.id_Ativo, 
        a.Nome_Ativo, 
        a.Descricao, 
        a.Fabricante, 
        a.Modelo, 
        a.Numero_Serie, 
        formatarDataParaBR(a.Data_Aquisicao), 
        a.Localizacao, 
        a.Status
    ]);

    // ---------------- EXCEL ----------------
    if (formato === 'excel') {
        const worksheet = XLSX.utils.aoa_to_sheet([colunas, ...linhas]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ativos");
        XLSX.writeFile(workbook, `maquinas_${scope}.xlsx`);

    // ---------------- PDF ----------------
    } else if (formato === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("l", "pt", "a4");
        doc.autoTable({ 
            head: [colunas], 
            body: linhas, 
            headStyles: { fillColor: [52, 58, 64] },
            styles: { fontSize: 7, cellPadding: 3 } // Fonte menor pois tem muitas colunas
        });
        doc.save(`maquinas_${scope}.pdf`);

    // ---------------- CSV ----------------
    } else if (formato === 'csv') {
        const separator = ';';
        let csvContent = "\uFEFF"; // BOM para acentos
        
        // Cabeçalho
        csvContent += colunas.join(separator) + "\n";

        // Linhas
        linhas.forEach(row => {
            const rowString = row.map(item => {
                let text = String(item !== null && item !== undefined ? item : "");
                // Trata quebras de linha e separadores no texto
                if (text.search(separator) !== -1 || text.search(/(\r\n|\n|\r)/) !== -1) {
                    text = `"${text.replace(/"/g, '""')}"`; 
                }
                return text;
            }).join(separator);
            csvContent += rowString + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `maquinas_${scope}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    // ---------------- SVG ----------------
    } else if (formato === 'svg') {
        const rowHeight = 30;
        const colWidth = 90; // Colunas mais estreitas para caber tudo
        const fontSize = 10;
        const headerColor = "#343a40";
        const headerTextColor = "#ffffff";
        const borderColor = "#cccccc";

        const totalWidth = colunas.length * colWidth;
        const totalHeight = (linhas.length + 1) * rowHeight;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" style="font-family: Arial, sans-serif; font-size: ${fontSize}px;">`;

        // Cabeçalho
        colunas.forEach((col, index) => {
            const x = index * colWidth;
            const y = 0;
            svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="${headerColor}" stroke="${borderColor}" />`;
            svgContent += `<text x="${x + 5}" y="${y + 20}" fill="${headerTextColor}" font-weight="bold">${col}</text>`;
        });

        // Dados
        linhas.forEach((row, rowIndex) => {
            const y = (rowIndex + 1) * rowHeight;
            row.forEach((cellData, colIndex) => {
                const x = colIndex * colWidth;
                let cellText = String(cellData !== null && cellData !== undefined ? cellData : "");
                
                // Trunca texto longo
                if (cellText.length > 12) {
                    cellText = cellText.substring(0, 10) + "...";
                }

                svgContent += `<rect x="${x}" y="${y}" width="${colWidth}" height="${rowHeight}" fill="#ffffff" stroke="${borderColor}" />`;
                svgContent += `<text x="${x + 5}" y="${y + 20}" fill="#000000">${cellText}</text>`;
            });
        });

        svgContent += `</svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `maquinas_${scope}.svg`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// =================== LÓGICA PRINCIPAL (EXECUTADA APÓS O DOM CARREGAR) ===================
document.addEventListener('DOMContentLoaded', function () {

    // NOVO: Listener para limpeza do modal 3D
    const viewerModalEl = document.getElementById('viewer3DModal');
    if (viewerModalEl) {
        viewerModalEl.addEventListener('hidden.bs.modal', cleanup3DScene);
    }

    const modalAtualizar = document.getElementById('exampleModalAtualizar');
    modalAtualizar.addEventListener('shown.bs.modal', function () {
        if (ativoParaEditar) {
            console.log("Modal de edição visível. Preenchendo o formulário agora com:", ativoParaEditar);
            document.getElementById('id_ativo').value = ativoParaEditar.id_Ativo;
            document.getElementById('nome_update').value = ativoParaEditar.Nome_Ativo;
            document.getElementById('descricao_update').value = ativoParaEditar.Descricao;
            document.getElementById('fabricante_update').value = ativoParaEditar.Fabricante;
            document.getElementById('modelo_update').value = ativoParaEditar.Modelo;
            document.getElementById('numero_update').value = ativoParaEditar.Numero_Serie;
            document.getElementById('data_update').value = formatarDataParaInput(ativoParaEditar.Data_Aquisicao);
            document.getElementById('local_update').value = ativoParaEditar.Localizacao;
            document.getElementById('status_update').value = ativoParaEditar.Status;
            const fotoPreview = document.getElementById('foto_ativo_preview_update');
            if (ativoParaEditar.Imagem) {
                fotoPreview.src = `data:image/jpeg;base64,${ativoParaEditar.Imagem}`;
                fotoPreview.style.display = 'block';
            } else {
                fotoPreview.style.display = 'none';
            }
        }
    });

    // --- FUNÇÕES DE CARREGAMENTO E RENDERIZAÇÃO ---

    async function carregarAtivos() {
        const tbody = document.getElementById('ativoTableBody');
        tbody.innerHTML = `<tr><td colspan="14" class="text-center">Carregando...</td></tr>`;
        try {
            const response = await fetch('http://localhost:5000/ativos');
            if (!response.ok) throw new Error('Falha ao carregar ativos.');
            allAtivos = await response.json();
            aplicarFiltros();
        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="14" class="text-center text-danger">${error.message}</td></tr>`;
        }
    }

    function renderTableRows() {
        const tbody = document.getElementById('ativoTableBody');
        tbody.innerHTML = "";
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        const dadosPagina = ativos.slice(start, end);

        if (dadosPagina.length === 0) {
            tbody.innerHTML = `<tr><td colspan="14" class="text-center">Nenhuma máquina encontrada.</td></tr>`;
            return;
        }

        dadosPagina.forEach(ativo => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td id="total"></td>
            <td>${ativo.id_Ativo}</td>
            <td>${ativo.Nome_Ativo}</td>
            <td>${ativo.Descricao}</td>
            <td>${ativo.Fabricante}</td>
            <td>${ativo.Modelo}</td>
            <td>${ativo.Numero_Serie}</td>
            <td>${formatarDataParaBR(ativo.Data_Aquisicao)}</td>
            <td>${ativo.Localizacao}</td>
            <td>${ativo.Status}</td>
            <td id="imagemColuna">
                <button id="viewImageBtn" onclick="abrirModalImagem(${ativo.id_Ativo})"><i class="fa-solid fa-image"></i></button>
            </td>
            <td class="text-center align-middle">
                <button class="btn-3d-viewer" onclick="prepararVisualizacao(${ativo.id_Ativo}, '${ativo.Nome_Ativo}')">
                    <i class="fa-solid fa-cubes"></i>
                </button>
            </td>
            <td id="center">
                <button id="deleteBtn" onclick="deletarAtivos(${ativo.id_Ativo})"><i class="fa-solid fa-trash-can"></i></button>
                <button id="editBtn" onclick="abrirModalEdicao(this)"><i class="fa-solid fa-square-pen"></i></button>
                <button id="sensorBtn" onclick="mostrarSensoresDoAtivo(${ativo.id_Ativo})"><i class="fa-solid fa-microchip"></i></button>
                <button id="modeloBtn" onclick="abrirModalModelos3D(${ativo.id_Ativo})"><i class="fa-solid fa-cube"></i></button>
            </td>
        `;
            tbody.appendChild(row);
        });
    }

    function aplicarFiltros() {
        let tempAtivos = [...allAtivos];
        const searchTerm = document.getElementById('search_input').value.toLowerCase();
        const statusAtivo = document.querySelector('#filtroStatusContainer .list-group-item.active');
        if (searchTerm) {
            tempAtivos = tempAtivos.filter(ativo => ativo.Nome_Ativo.toLowerCase().includes(searchTerm));
        }
        if (statusAtivo) {
            const status = statusAtivo.getAttribute('data-status');
            tempAtivos = tempAtivos.filter(ativo => ativo.Status.toLowerCase() === status.toLowerCase());
        }
        ativos = tempAtivos;
        totalPages = Math.ceil(ativos.length / rowsPerPage) || 1;
        createPagination();
        changePage(1);
    }

    function createPagination() {
        const paginationContainer = document.getElementById("paginationLines");
        totalPages = Math.ceil(ativos.length / rowsPerPage) || 1;
        paginationContainer.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = "btn";
            btn.innerHTML = `<hr class="page-line" id="line${i}">`;
            btn.onclick = () => changePage(i);
            paginationContainer.appendChild(btn);
        }
    }

    window.changePage = function (page) {
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        currentPage = page;
        renderTableRows();
        document.querySelectorAll(".page-line").forEach(line => line.classList.remove("active-line"));
        const activeLine = document.getElementById("line" + currentPage);
        if (activeLine) activeLine.classList.add("active-line");
        document.getElementById("prevBtn").disabled = (currentPage === 1);
        document.getElementById("nextBtn").disabled = (currentPage === totalPages || totalPages === 0);
        document.getElementById("content").innerText = `Página ${currentPage}`;
    }





    // --- AÇÕES E MODAIS (CRUD, SENSORES, IMAGENS) ---

    // Deletar Ativo 
    window.deletarAtivos = function (id) {
        const ativo = allAtivos.find(a => a.id_Ativo === id);
        if (!ativo) return;
        ativoParaExcluirId = id;
        document.getElementById('deleteMaquinaName').textContent = ativo.Nome_Ativo;
        new bootstrap.Modal(document.getElementById('deleteModal')).show();
    };

    async function executarExclusao() {
        if (!ativoParaExcluirId) return;
        try {
            const response = await fetch(`http://localhost:5000/delete_ativo/${ativoParaExcluirId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok || !data.affected_rows) throw new Error(data.mensagem || 'Ativo não encontrado ou vinculado.');

            exibirMensagemGeral("Máquina excluída com sucesso!", "success");
            await carregarAtivos();
        } catch (error) {
            exibirMensagemGeral("Erro ao excluir: " + error.message, "danger");
        } finally {
            bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
            ativoParaExcluirId = null;
        }
    }

    window.abrirModalEdicao = function (button) {
        const row = button.closest('tr');
        const ativoId = parseInt(row.cells[1].innerText.trim(), 10);

        // Encontra o ativo e guarda na nossa nova variável global
        ativoParaEditar = allAtivos.find(a => a.id_Ativo === ativoId);

        if (ativoParaEditar) {
            // Apenas manda o modal abrir. O preenchimento acontecerá depois.
            new bootstrap.Modal(document.getElementById('exampleModalAtualizar')).show();
        } else {
            console.error("Não foi possível encontrar o ativo para editar.");
        }
    };



    // Ver Sensores 
    window.mostrarSensoresDoAtivo = async function (idAtivo) {
        try {
            const response = await fetch(`http://localhost:5000/sensores_por_ativo/${idAtivo}`);
            const sensores = await response.json();
            const tbody = document.getElementById('sensorInfoTableBody');
            tbody.innerHTML = '';
            if (sensores.length === 0) {
                tbody.innerHTML = '<tr><td colspan="2">Nenhum sensor vinculado a este ativo.</td></tr>';
            } else {
                sensores.forEach(sensor => {
                    tbody.innerHTML += `<tr><th>ID Sensor</th><td>${sensor.id_Sensor || 'N/A'}</td></tr>
                                        <tr><th>Nome</th><td>${sensor.Nome_Sensor || 'N/A'}</td></tr>
                                        <tr><th>Tipo</th><td>${sensor.Tipo || 'N/A'}</td></tr>
                                        <tr><th>Status</th><td>${sensor.Status || 'N/A'}</td></tr>
                                        <tr><td colspan="2"><hr></td></tr>`;
                });
            }
            new bootstrap.Modal(document.getElementById('sensorModal')).show();
        } catch (error) {
            exibirMensagemGeral('Erro ao carregar dados dos sensores.', 'danger');
        }
    };

    // Ver Imagem 
    window.abrirModalImagem = function (idAtivo) {
        const ativo = allAtivos.find(a => a.id_Ativo === idAtivo);
        if (!ativo || !ativo.Imagem) {
            return exibirMensagemGeral("Este ativo não possui imagem.", "warning");
        }
        document.getElementById('imagemAtivoModal').src = `data:image/jpeg;base64,${ativo.Imagem}`;
        document.getElementById('imagemModal').style.display = 'block';
    }

    window.fecharModalImagem = function () {
        document.getElementById('imagemModal').style.display = 'none';
    }


    // --- LÓGICA PARA MODELOS 3D ---
    let modelosVinculadosAtualmente = [];

    window.abrirModalModelos3D = async function (idAtivo) {
        ativoAtualID = idAtivo;
        document.getElementById('modelosVinculadosBody').innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
        document.getElementById('selectArquivoModelo').innerHTML = '<option>Carregando...</option>';
        new bootstrap.Modal(document.getElementById('modalModelos3D')).show();
        await Promise.all([
            carregarModelosVinculados(idAtivo),
            carregarArquivosParaSelect()
        ]);
    }

    async function carregarModelosVinculados(idAtivo) {
        try {
            const response = await fetch(`http://localhost:5000/ativos/${idAtivo}/modelos3d`);
            modelosVinculadosAtualmente = await response.json();
            const tbody = document.getElementById('modelosVinculadosBody');
            tbody.innerHTML = '';
            if (modelosVinculadosAtualmente.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum modelo vinculado.</td></tr>';
            } else {
                modelosVinculadosAtualmente.forEach(modelo => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${modelo.id_Modelo}</td>
                        <td>${modelo.Nome}</td>
                        <td>${modelo.Arquivo}</td>
                        <td class="text-center align-middle"><button id="deleteBtn" onclick="deletarModelo3D(${modelo.id_Modelo}, '${modelo.Nome_Modelo}')"><i class="fa-solid fa-trash-can"></i></button></td>
                    `;
                    tbody.appendChild(row);
                });
            }
        } catch (error) {
            document.getElementById('modelosVinculadosBody').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Erro ao carregar modelos.</td></tr>';
        }
    }

    async function carregarArquivosParaSelect() {
        try {
            const response = await fetch('http://localhost:5000/arquivos-upload');
            const arquivos = await response.json();
            const select = document.getElementById('selectArquivoModelo');
            select.innerHTML = '<option value="" selected disabled>Selecione um arquivo</option>';
            if (Array.isArray(arquivos) && arquivos.length > 0) {
                arquivos.forEach(arquivo => {
                    select.innerHTML += `<option value="${arquivo}">${arquivo}</option>`;
                });
            } else {
                select.innerHTML = '<option value="" disabled>Nenhum arquivo na pasta uploads</option>';
            }
        } catch (error) {
            document.getElementById('selectArquivoModelo').innerHTML = '<option value="" disabled>Erro ao carregar</option>';
        }
    }

    window.deletarModelo3D = function (idModelo, nomeModelo) {
        // Guarda o ID na variável global
        modeloParaExcluirId = idModelo;

        // Coloca a pergunta de confirmação dentro do corpo do modal genérico
        document.getElementById('confirmModalBody').textContent = `Tem certeza que deseja desvincular o modelo "${nomeModelo}"?`;

        // Abre o modal de confirmação que você adicionou no HTML
        new bootstrap.Modal(document.getElementById('confirmModal')).show();
    }


    async function executarExclusaoModelo3D() {
        if (!modeloParaExcluirId) return;
        try {
            const response = await fetch(`http://localhost:5000/modelos3d/${modeloParaExcluirId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || "Erro desconhecido");
            }
            exibirMensagemGeral("Modelo 3D desvinculado com sucesso.", "success", "mensagemModal3D");
            await carregarModelosVinculados(ativoAtualID); // <-- Atualiza a lista no modal
            // ===================================
            await carregarAtivos(); // <-- Atualiza a tabela principal em segundo plano
            // ===================================

        } catch (error) {
            exibirMensagemGeral("Erro ao desvinculcular modelo: " + error.message, "danger", "mensagemModal3D");
        } finally {
            bootstrap.Modal.getInstance(document.getElementById('confirmModal')).hide();
            modeloParaExcluirId = null;
        }
    }

    // --- EVENT LISTENERS  ---

    // Formulários
    document.getElementById('formulario').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = document.getElementById('save_cadastro');
        const spinner = document.getElementById('loadingSpinnerCadastro');

        // --- Inicia o loading ---
        saveButton.disabled = true;
        spinner.classList.remove('d-none');
        saveButton.textContent = 'Salvando...';

        const formData = new FormData(this);
        if (!formData.get('Nome_Ativo') || !formData.get('Descricao') || !formData.get('Data_Aquisicao')) {
            exibirMensagemGeral("Nome, Descrição e Data de Aquisição são obrigatórios.", "warning", "mensagemErroInserir");
            // --- Reverte o loading em caso de erro ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Save changes';
            return;
        }

        formData.append("table", "ativos");
        formData.append("database", "sgmi");
        try {
            const response = await fetch('http://localhost:5000/insert', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.mensagem || "Erro ao registrar máquina.");

            exibirMensagemGeral("Máquina registrada com sucesso!", "success", "mensagemSucesso");
            await carregarAtivos();
            this.reset();
            bootstrap.Modal.getInstance(document.getElementById('modalCreate')).hide();

        } catch (error) {
            exibirMensagemGeral("Erro: " + error.message, "danger", "mensagemErroInserir");
        } finally {
            // --- Finaliza o loading (sempre executa) ---
            saveButton.disabled = false;
            spinner.classList.add('d-none');
            saveButton.textContent = 'Save changes';
        }
    });
    // Listener para o formulário de atualização de ativo
    document.getElementById('formularioAtualizar').addEventListener('submit', async function (event) {
        event.preventDefault();

        const saveButton = this.querySelector('button[type="submit"]');
        const spinner = document.getElementById('loadingSpinnerUpdate');

        // --- Inicia o loading ---
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';
        }
        spinner.classList.remove('d-none');

        // --- Monta o FormData ---
        const formData = new FormData();
        const id = document.getElementById('id_ativo').value;
        formData.append("id_Ativo", id);
        formData.append("Nome_Ativo", document.getElementById('nome_update').value);
        formData.append("Descricao", document.getElementById('descricao_update').value);
        formData.append("Fabricante", document.getElementById('fabricante_update').value);
        formData.append("Modelo", document.getElementById('modelo_update').value);
        formData.append("Numero_Serie", document.getElementById('numero_update').value);
        formData.append("Data_Aquisicao", document.getElementById('data_update').value);
        formData.append("Localizacao", document.getElementById('local_update').value);
        formData.append("Status", document.getElementById('status_update').value);

        const imagemInput = document.getElementById('foto_ativo_update');
        if (imagemInput && imagemInput.files.length > 0) {
            formData.append("Imagem", imagemInput.files[0]);
        }

        // --- Adiciona o usuário logado para o histórico ---
        const usuarioLogado = localStorage.getItem("Nome") || "sistema";
        formData.append("Usuario", usuarioLogado);

        try {
            const response = await fetch(`http://localhost:5000/update_ativo/${id}`, {
                method: 'PUT',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensagem || "A atualização falhou.");
            }

            exibirMensagemGeral("Ativo atualizado com sucesso!", "success", "mensagemsucesso");
            await carregarAtivos();

            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('exampleModalAtualizar')).hide();
            }, 1500);

        } catch (error) {
            exibirMensagemGeral("Erro: " + error.message, "danger", "mensagemErroEditar");
        } finally {
            // --- Finaliza o loading ---
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Save changes';
            }
            spinner.classList.add('d-none');
        }
    });


    document.getElementById('formNovoModelo').addEventListener('submit', async function (event) {
        event.preventDefault();

        const nomeModelo = document.getElementById('nomeModeloInput').value;
        const arquivoURL = document.getElementById('selectArquivoModelo').value;

        // --- Validação de campos obrigatórios ---
        if (!nomeModelo || !arquivoURL) {
            return exibirMensagemGeral("Por favor, preencha o nome e selecione um arquivo.", "warning", "mensagemModal3D");
        }

        // --- Monta o corpo da requisição ---
        const payload = { Nome: nomeModelo, Arquivo: arquivoURL };

        try {
            const response = await fetch(`http://localhost:5000/ativos/${ativoAtualID}/modelos3d`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.erro || "Erro desconhecido");
            }

            exibirMensagemGeral("Modelo vinculado com sucesso!", "success", "mensagemModal3D");
            this.reset();

            // Atualiza a tabela de modelos
            await carregarModelosVinculados(ativoAtualID);

        } catch (error) {
            exibirMensagemGeral("Erro ao vincular modelo: " + error.message, "danger", "mensagemModal3D");
        }
    });


    // Filtros
    document.getElementById('search_input').addEventListener('input', aplicarFiltros);
    document.querySelectorAll('#filtroStatusContainer .list-group-item').forEach(button => {
        button.addEventListener('click', function () {
            if (this.classList.contains('active')) {
                this.classList.remove('active');
            } else {
                document.querySelectorAll('#filtroStatusContainer .list-group-item').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            }
            aplicarFiltros();
        });
    });
    document.getElementById('limpar_filtros').addEventListener('click', () => {
        document.getElementById('search_input').value = '';
        document.querySelectorAll('#filtroStatusContainer .list-group-item.active').forEach(b => b.classList.remove('active'));
        aplicarFiltros();
    });

    // Outros
    document.getElementById('confirmDeleteBtn').addEventListener('click', executarExclusao);
    document.getElementById('confirmModalBtn').addEventListener('click', executarExclusaoModelo3D);
    document.getElementById("prevBtn").addEventListener("click", () => changePage(currentPage - 1));
    document.getElementById("nextBtn").addEventListener("click", () => changePage(currentPage + 1));
    document.getElementById('closeModalBtn').addEventListener('click', fecharModalImagem);

    // --- INICIALIZAÇÃO ---
    carregarAtivos();
    if (document.getElementById('particles-js')) {
        particlesJS('particles-js', { "particles": { "number": { "value": 50, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#0d6efd" }, "shape": { "type": "circle" }, "opacity": { "value": 0.7, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#0d6efd", "opacity": 0.2, "width": 1 }, "move": { "enable": true, "speed": 1, "direction": "none", "out_mode": "out" } }, "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "grab" } }, "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 0.5 } } } }, "retina_detect": true });
    }
});