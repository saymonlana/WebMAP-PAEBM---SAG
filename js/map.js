/* WebMap PAEBM - Santo Antonio do Grama - MG
   Rotina robusta de espacializacao de questionarios */

// =========================================================================
// 1. CONFIGURACAO DO SISTEMA DE COORDENADAS (UTM Zona 23S -> WGS84)
// =========================================================================
proj4.defs("EPSG:31983", "+proj=utm +zone=23 +south +ellps=GRS80 +units=m +no_defs");

function utmToLatLng(x, y) {
    if (x == null || y == null || x === '' || y === '') return null;
    try {
        var nx = parseFloat(x);
        var ny = parseFloat(y);
        if (isNaN(nx) || isNaN(ny)) return null;
        var coords = proj4("EPSG:31983", "EPSG:4326", [nx, ny]);
        return [coords[1], coords[0]];
    } catch (e) {
        return null;
    }
}

// =========================================================================
// 2. VARIAVEIS GLOBAIS DO MAPA
// =========================================================================
var map;
var markerClusterGroup;
var zasLayer;
var zssLayer;
var centroUrbanoLayer;
var allMarkers = [];
var selectedStatus = 'ALL';
var searchTerm = '';
var selectedArea = 'ALL';
var selectedBarragem = 'ALL';

// Centro padrao (Santo Antonio do Grama, MG)
var DEFAULT_CENTER = [-20.252, -42.631];
var DEFAULT_ZOOM = 14;

// Cores por status
var STATUS_CONFIG = {
    'APLICADO':              { color: '#10b981', label: 'Questionário Aplicado' },
    'IMÓVEL EM CONSTRUÇÃO':  { color: '#10b981', label: 'Imóvel em Construção' },
    'PROPRIETARIO AUSENTE':  { color: '#f59e0b', label: 'Proprietário Ausente' },
    'IMÓVEL VAZIO/DESOCUPADO': { color: '#10b981', label: 'Imóvel Vazio/Desocupado' },
    'RECUSADO':              { color: '#ff0033', label: 'Recusado' }
};

function getStatusColor(status) {
    if (!status) return '#10b981';
    var clean = status.trim().toUpperCase();
    return STATUS_CONFIG[clean] ? STATUS_CONFIG[clean].color : '#10b981';
}

// =========================================================================
// 3. INICIALIZACAO DO MAPA
// =========================================================================
function initMap() {
    var googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: 'Google Earth'
    });

    map = L.map('map', {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        layers: [googleSat]
    });

    L.control.scale({ position: 'bottomright', imperial: false }).addTo(map);

    // Norte geografico
    L.Control.NorthArrow = L.Control.extend({
        onAdd: function() {
            var div = L.DomUtil.create('div', 'north-arrow');
            div.innerHTML = '<svg width="36" height="38" viewBox="0 0 36 38"><polygon points="18,2 10,28 18,21 26,28" fill="#a8d5ba" stroke="#0d5c3a" stroke-width="1.5"/><polygon points="18,2 26,28 18,21" fill="#0d5c3a"/><text x="18" y="36" text-anchor="middle" font-size="9" font-weight="700" font-family="Outfit,sans-serif" fill="#d0e8df">N</text></svg>';
            div.title = 'Norte';
            return div;
        }
    });
    new L.Control.NorthArrow({ position: 'bottomleft' }).addTo(map);

    // Camadas poligonais primeiro (ficam ATRAS)
    zasLayer = L.layerGroup().addTo(map);
    zssLayer = L.layerGroup().addTo(map);
    centroUrbanoLayer = L.layerGroup().addTo(map);

    // Pontos por cima (ficam NA FRENTE)
    markerClusterGroup = L.layerGroup();
    map.addLayer(markerClusterGroup);

    L.control.layers(
        { "Google Earth": googleSat },
        { "Questionários": markerClusterGroup, "Centro Urbano": centroUrbanoLayer, "ZSS": zssLayer, "ZAS": zasLayer },
        { position: 'topright', collapsed: false }
    ).addTo(map);

    addMapLegend();
    setupEventListeners();

    map.on('popupopen', function() { hideMapControls(); });
    map.on('popupclose', function() { showMapControls(); });
}

// =========================================================================
// 4. LEGENDA
// =========================================================================
function addMapLegend() {
    var legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        var div = L.DomUtil.create('div', 'map-legend');
        div.innerHTML =
            '<div class="legend-title">Questionários PAEBM - SAG</div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#10b981"></div><span>Aplicado / Construção / Vazio</span></div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div><span>Proprietário Ausente</span></div>' +
        '<div class="legend-item"><div class="legend-dot" style="background:#ff0033"></div><span>Recusado</span></div>' +
            '<div class="legend-item"><div class="legend-color-box" style="border-color:#2471a3;background:rgba(26,82,118,0.15)"></div><span>ZAS</span></div>' +
            '<div class="legend-item"><div class="legend-color-box" style="border-color:#3498db;background:rgba(52,152,219,0.15)"></div><span>ZSS</span></div>' +
            '<div class="legend-item"><div class="legend-color-box" style="border-color:#555555;background:rgba(85,85,85,0.15)"></div><span>Centro Urbano</span></div>';
        return div;
    };
    legend.addTo(map);
}

// =========================================================================
// 5. CARREGAMENTO ROBUSTO DE DADOS
// =========================================================================

// Detecta se coordenadas sao UTM/PROJETADAS e converte para [lat, lng]
function extractLatLng(feature) {
    var geom = feature.geometry;
    var attrs = feature.attributes || {};

    // Caso 1: GeoJSON geometry tipo Point com coordinates
    if (geom && geom.type === 'Point' && geom.coordinates) {
        return [geom.coordinates[1], geom.coordinates[0]];
    }

    // Caso 2: EsriJSON geometry com x, y (UTM -> WGS84)
    if (geom && geom.x != null && geom.y != null) {
        var ll = utmToLatLng(geom.x, geom.y);
        if (ll) return ll;
    }

    // Caso 3: Procurar campos de coordenadas nos atributos
    var coordFieldX = ['x', 'longitude', 'lon', 'lng', 'coord_x', 'coordenada_x', 'coordenadas_x', 'long'];
    var coordFieldY = ['y', 'latitude', 'lat', 'coord_y', 'coordenada_y', 'coordenadas_y'];

    for (var i = 0; i < coordFieldX.length; i++) {
        var fx = coordFieldX[i];
        var fy = coordFieldY[i];
        if (attrs[fx] != null && attrs[fy] != null) {
            // Tentar primeiro como UTM
            var converted = utmToLatLng(attrs[fx], attrs[fy]);
            if (converted) return converted;
            // Se nao converter, tratar como WGS84 direto
            var latN = parseFloat(attrs[fy]);
            var lngN = parseFloat(attrs[fx]);
            if (!isNaN(latN) && !isNaN(lngN) && latN > -90 && latN < 90 && lngN > -180 && lngN < 180) {
                return [latN, lngN];
            }
        }
    }

    // Caso 4: Procurar qualquer par de campos com nomes de coordenada
    var allKeys = Object.keys(attrs);
    for (var k = 0; k < allKeys.length; k++) {
        var key = allKeys[k].toLowerCase();
        if (key.indexOf('lat') >= 0 || key.indexOf('y') === 0) {
            for (var m = 0; m < allKeys.length; m++) {
                var key2 = allKeys[m].toLowerCase();
                if (key2.indexOf('lon') >= 0 || key2.indexOf('lng') >= 0 || key2.indexOf('long') >= 0 || key2.indexOf('x') === 0) {
                    var v1 = parseFloat(attrs[allKeys[k]]);
                    var v2 = parseFloat(attrs[allKeys[m]]);
                    if (!isNaN(v1) && !isNaN(v2)) {
                        if (v1 > -90 && v1 < 90 && v2 > -180 && v2 < 180) {
                            return [v1, v2];
                        }
                        var conv = utmToLatLng(v2, v1);
                        if (conv) return conv;
                    }
                }
            }
        }
    }

    return null;
}

// Converte feature EsriJSON para GeoJSON Feature
function esriToGeoJSON(feature) {
    var props = feature.attributes || {};
    var geom = feature.geometry;
    var geojsonGeom = null;

    if (geom) {
        if (geom.rings) {
            geojsonGeom = { type: 'Polygon', coordinates: geom.rings };
        } else if (geom.paths) {
            geojsonGeom = { type: 'MultiLineString', coordinates: geom.paths };
        } else if (geom.x != null && geom.y != null) {
            var ll = utmToLatLng(geom.x, geom.y);
            if (ll) {
                geojsonGeom = { type: 'Point', coordinates: [ll[1], ll[0]] };
            }
        }
    }

    return { type: 'Feature', geometry: geojsonGeom, properties: props };
}

// Popup para questionarios (com dados de animais agregados)
function createQuestionnairePopup(attrs, residentRecords, animalRecords) {
    var code = attrs.CODIGO || 'SEM CODIGO';
    var name = attrs.NOME_DO_ENTREVISTADO || attrs.NOME || 'NAO DECLARADO';
    var status = attrs.STATUS_DA_PESQUISA || 'NAO ESPECIFICADO';
    var statusColor = getStatusColor(status);
    var id = attrs.OBJECTID || Math.random();

    function v(val) {
        if (val === null || val === undefined || val === 'N/A' || String(val).trim() === '') return '<span style="color:#94a3b8">Nao Informado</span>';
        return val;
    }
    function fmtDate(ts) {
        if (!ts) return '<span style="color:#94a3b8">N/A</span>';
        return new Date(ts).toLocaleDateString('pt-BR') + ' ' + new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    // --- ABA ANIMAIS (agregados de registros duplicados) ---
    var animaisHTML = '';
    if (animalRecords && animalRecords.length > 0) {
        animaisHTML = '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">ANIMAIS REGISTRADOS (' + animalRecords.length + ')</td></tr>';
        animalRecords.forEach(function(ar, idx) {
            var a = ar.attributes || {};
            animaisHTML += '<tr style="border-bottom:1px dashed #e2e8f0"><td class="label-cell" style="vertical-align:top"><b>Animal ' + (idx + 1) + '</b></td><td class="value-cell" style="vertical-align:top">' +
                '<div style="line-height:1.6">' +
                '<b>Nome:</b> ' + v(a.NOME_DO_ANIMAL) + '<br>' +
                '<b>Espécie:</b> ' + v(a.CLASIFICACAO_DECLARADA) + '<br>' +
                '<b>Família:</b> ' + v(a.FAMILIA) + ' | <b>Ordem:</b> ' + v(a.ORDEM) + '<br>' +
                '<b>Científico:</b> ' + v(a.NOME_CIENTIFICO) + '<br>' +
                '<b>Qtd:</b> ' + v(a.QUANTIDADE) + ' | <b>Macho:</b> ' + v(a.QUANTIDADE_MACHO) + ' | <b>Fêmea:</b> ' + v(a.QUANTIDADE_FEMEA) + '<br>' +
                '<b>Porte:</b> ' + v(a.PORTE) + ' | <b>Idade:</b> ' + v(a.IDADE_ANOS) + ' anos<br>' +
                '<b>Castrado:</b> ' + v(a.QUANTIDADE_CASTRADO) + ' | <b>Deficiente:</b> ' + v(a.INTEIRO_DEFICIENTE) + '<br>' +
                '<b>Finalidade:</b> ' + v(a.FINALIDADE_DA_CRIACAO) + '<br>' +
                '<b>Registro:</b> ' + v(a.REGISTRO) + ' | <b>Microchip:</b> ' + v(a.NUMERO_MICROCHIP) + '<br>' +
                '<b>Marcação:</b> ' + v(a.MARCACAO) + ' | <b>Identificação:</b> ' + v(a.IDENTIFICAO_INDIVIDUAL) + '<br>' +
                '<b>Tutor:</b> ' + v(a.NOME_DO_TUTOR) + ' | <b>Doc:</b> ' + v(a.IDENTIDADE_DO_TUTOR) + '<br>' +
                '<b>Contato:</b> ' + v(a.TELEFONE_IDENTIFICACAO) +
                '</div></td></tr>';
        });
    } else {
        animaisHTML =
            '<tr><td class="label-cell">Animais Domesticos?</td><td class="value-cell">' + v(attrs.ANIMAL_DOMESTICO) + '</td></tr>' +
            '<tr><td class="label-cell">Rebanho/Tipo</td><td class="value-cell">' + v(attrs.REBANHO_TIPO_DE_CRIACAO) + '</td></tr>' +
            '<tr><td class="label-cell">Classificacao</td><td class="value-cell">' + v(attrs.CLASIFICACAO_DECLARADA) + '</td></tr>' +
            '<tr><td class="label-cell">Nome Animal</td><td class="value-cell">' + v(attrs.NOME_DO_ANIMAL) + '</td></tr>' +
            '<tr><td class="label-cell">Idade</td><td class="value-cell">' + v(attrs.IDADE_ANOS) + ' anos</td></tr>' +
            '<tr><td class="label-cell">Porte</td><td class="value-cell">' + v(attrs.PORTE) + '</td></tr>' +
            '<tr><td class="label-cell">Qtd Macho/Femea</td><td class="value-cell">' + v(attrs.QUANTIDADE_MACHO) + ' / ' + v(attrs.QUANTIDADE_FEMEA) + '</td></tr>' +
            '<tr><td class="label-cell">Finalidade</td><td class="value-cell">' + v(attrs.FINALIDADE_DA_CRIACAO) + '</td></tr>' +
            '<tr><td class="label-cell">Tutor</td><td class="value-cell">' + v(attrs.NOME_DO_TUTOR) + '</td></tr>';
    }

    // Dados de producao (de registros duplicados ou principal)
    var prodAtrrs = attrs;
    if (animalRecords && animalRecords.length > 0) {
        var pr = animalRecords.find(function(ar) { return ar.attributes.PRODUCAO_AGROPECIARIA && ar.attributes.PRODUCAO_AGROPECIARIA !== 'N/A'; });
        if (pr) prodAtrrs = pr.attributes;
    }
    var prodHTML =
        '<tr><td class="label-cell">Produção Agropecuária?</td><td class="value-cell">' + v(prodAtrrs.PRODUCAO_AGROPECIARIA) + '</td></tr>' +
        '<tr><td class="label-cell">Atividade Produtiva?</td><td class="value-cell">' + v(prodAtrrs.ATIVIDADE_PRODUTIVA) + '</td></tr>' +
        '<tr><td class="label-cell">Qual Atividade</td><td class="value-cell">' + v(prodAtrrs.QUAL_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Descrição</td><td class="value-cell">' + v(prodAtrrs.DESCRICAO_DA_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">CPF Produtor</td><td class="value-cell">' + v(prodAtrrs.CPF_DO_PRODUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">Cod. Cadastro IMA</td><td class="value-cell">' + v(prodAtrrs.CODIGO_CADASTRO_IMA) + '</td></tr>' +
        '<tr><td class="label-cell">Contato Produtor</td><td class="value-cell">' + v(prodAtrrs.CONTATO_PRODUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">Funcionários</td><td class="value-cell">' + v(prodAtrrs.QUANTAS_PESSOAS_TRABALHAM_NESSA_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Benfeitorias</td><td class="value-cell">' + v(prodAtrrs.BENFEITORIAS) + '</td></tr>' +
        '<tr><td class="label-cell">Silvestres/Exóticos?</td><td class="value-cell">' + v(attrs.ANIMAIS_SILVESTRES_E_EXOTICOS) + '</td></tr>';

    // Animais silvestres - buscar em todos os registros
    var silvestreHTML = '';
    var silvestreCount = 0;
    var silvestreList = [];
    
    // Buscar no respondent
    if (attrs.ANIMAIS_SILVESTRES_E_EXOTICOS && String(attrs.ANIMAIS_SILVESTRES_E_EXOTICOS).trim().toUpperCase() === 'SIM') {
        silvestreList.push(attrs);
    }
    // Buscar nos animais
    if (animalRecords) {
        for (var si = 0; si < animalRecords.length; si++) {
            var sa = animalRecords[si].attributes || {};
            if (sa.ANIMAIS_SILVESTRES_E_EXOTICOS && String(sa.ANIMAIS_SILVESTRES_E_EXOTICOS).trim().toUpperCase() === 'SIM') {
                silvestreList.push(sa);
            }
        }
    }
    silvestreCount = silvestreList.length;
    
    if (silvestreCount > 0) {
        silvestreHTML = '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">ANIMAIS SILVESTRES / EXÓTICOS (' + silvestreCount + ')</td></tr>';
        silvestreList.forEach(function(sa, idx) {
            silvestreHTML += '<tr style="border-bottom:1px dashed #e2e8f0"><td class="label-cell" style="vertical-align:top"><b>Silvestre ' + (idx + 1) + '</b></td><td class="value-cell" style="vertical-align:top">' +
                '<div style="line-height:1.6">' +
                '<b>Nome Comum:</b> ' + v(sa.NOME_COMUM) + '<br>' +
                '<b>Familia:</b> ' + v(sa.FAMILIA_) + ' | <b>Ordem:</b> ' + v(sa.ORDEM_) + '<br>' +
                '<b>Nome Cientifico:</b> ' + v(sa.NOME_CIENTIFICO_) + '<br>' +
                '<b>Quantidade:</b> ' + v(sa.QUANTIDADE_) + '<br>' +
                '<b>N. Controle:</b> ' + v(sa.NUMERO_DE_CONTROLE) + '<br>' +
                '<b>Marcação:</b> ' + v(sa.MARCACAO_) + '<br>' +
                '<b>Endereco:</b> ' + v(sa['ENDEREÇO_']) + '<br>' +
                '<b>Tutor:</b> ' + v(sa.NOME_DO_TUTOR_) + '<br>' +
                '<b>Doc Tutor:</b> ' + v(sa.DOC_IDENTIDADE_TUTOR) + '<br>' +
                '<b>Contato Tutor:</b> ' + v(sa.CONTATO_TUTOR) +
                '</div></td></tr>';
        });
    }

    var animalTabContent =
        '<tr><td class="label-cell">Animais Domésticos?</td><td class="value-cell">' + v(attrs.ANIMAL_DOMESTICO) + '</td></tr>' +
        '<tr><td class="label-cell">Rebanho/Tipo</td><td class="value-cell">' + v(attrs.REBANHO_TIPO_DE_CRIACAO) + '</td></tr>' +
        animaisHTML +
        silvestreHTML;

    return '<div class="popup-wrapper" data-id="' + id + '">' +
        '<div class="popup-header" style="background:linear-gradient(135deg,' + statusColor + ',rgba(0,0,0,0.8))">' +
        '<span class="popup-title">' + name + '</span>' +
        '<span class="popup-subtitle">Código: ' + code + '</span>' +
        '<span class="popup-status-badge">' + status + '</span>' +
        '</div>' +
        '<div class="popup-tabs-nav">' +
        '<button class="popup-tab-btn active" onclick="switchPopupTab(this,\'geral\')">Geral</button>' +
        '<button class="popup-tab-btn" onclick="switchPopupTab(this,\'social\')">Social/Saúde</button>' +
        '<button class="popup-tab-btn" onclick="switchPopupTab(this,\'animais\')">Animais</button>' +
        '<button class="popup-tab-btn" onclick="switchPopupTab(this,\'infra\')">Infraestrutura</button>' +
        '<button class="popup-tab-btn" onclick="switchPopupTab(this,\'cultura\')">Cultura</button>' +
        '<button class="popup-tab-btn" onclick="switchPopupTab(this,\'entrevista\')">Entrevista</button>' +
        '</div>' +

        // ABA GERAL
        '<div id="tab-geral-' + id + '" class="popup-tab-content active"><table class="popup-details-table">' +
        '<tr><td class="label-cell">Código</td><td class="value-cell">' + v(attrs.CODIGO) + '</td></tr>' +
        '<tr><td class="label-cell">Status</td><td class="value-cell" style="color:' + statusColor + ';font-weight:600">' + v(attrs.STATUS_DA_PESQUISA) + '</td></tr>' +
        '<tr><td class="label-cell">Nome Entrevistado</td><td class="value-cell">' + v(attrs.NOME_DO_ENTREVISTADO || attrs.NOME) + '</td></tr>' +
        '<tr><td class="label-cell">Proprietário</td><td class="value-cell">' + v(attrs.NOME_DO_PROPRIETARIO) + '</td></tr>' +
        '<tr><td class="label-cell">Vínculo c/ Proprietário</td><td class="value-cell">' + v(attrs.VINCULO_COM_PROPRIETARIO_DA_CASA) + '</td></tr>' +
        '<tr><td class="label-cell">Relação c/ Imóvel</td><td class="value-cell">' + v(attrs.RELACAO_DO_ENTREVISTADO_COM_O_IMOVEL) + '</td></tr>' +
        '<tr><td class="label-cell">Município</td><td class="value-cell">' + v(attrs.MUNICIPIO) + '</td></tr>' +
        '<tr><td class="label-cell">Bairro/Localidade</td><td class="value-cell">' + v(attrs.BAIRRO_LOCALIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Endereço Completo</td><td class="value-cell">' + v(attrs.ENDERECO_COMPLETO) + '</td></tr>' +
        '<tr><td class="label-cell">Área Declarada</td><td class="value-cell">' + v(attrs.AREA_URBANA_OU_ZONA_RURAL_DECLARADA) + '</td></tr>' +
        '<tr><td class="label-cell">Área Classificada</td><td class="value-cell">' + v(attrs.AREA_URBANA_OU_ZONA_RURAL) + '</td></tr>' +
        '<tr><td class="label-cell">Tamanho Propriedade (m2)</td><td class="value-cell">' + v(attrs.TAMANHO_DA_PROPRIEDADE_m2) + '</td></tr>' +
        '<tr><td class="label-cell">Tipo de Uso</td><td class="value-cell">' + v(attrs.TIPO_DE_USO_DO_IMOVEL) + '</td></tr>' +
        '<tr><td class="label-cell">Barragem</td><td class="value-cell">' + v(attrs.BARRAGEM) + '</td></tr>' +
        '<tr><td class="label-cell">Moradores na Residência</td><td class="value-cell">' + v(attrs.QUANTAS_PESSOAS_MORAM_NA_RESIDENCIA) + '</td></tr>' +
        '<tr><td class="label-cell">Observações</td><td class="value-cell">' + v(attrs.OBSERVACOES) + '</td></tr>' +
        '<tr><td class="label-cell">Observações Gerais</td><td class="value-cell">' + v(attrs.OBSERVACOES__) + '</td></tr>' +
        (residentRecords && residentRecords.length > 0 ?
            '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">OUTROS MORADORES (' + residentRecords.length + ')</td></tr>' +
            residentRecords.map(function(rf, ri) {
                var ra = rf.attributes || {};
                return '<tr style="border-bottom:1px dashed #e2e8f0"><td class="label-cell" style="vertical-align:top"><b>Morador ' + (ri + 1) + '</b></td><td class="value-cell" style="vertical-align:top">' +
                    '<div style="line-height:1.6">' +
                    '<b>Nome:</b> ' + v(ra.NOME_DO_ENTREVISTADO || ra.NOME) + '<br>' +
                    '<b>Idade:</b> ' + v(ra.IDADE) + ' anos<br>' +
                    '<b>Gênero:</b> ' + v(ra.GENERO) + '<br>' +
                    '<b>Escolaridade:</b> ' + v(ra.ESCOLARIDADE) + '<br>' +
                    '<b>Estado Civil:</b> ' + v(ra.ESTADO_CIVIL) + '<br>' +
                    '<b>Ocupação:</b> ' + v(ra.OCUPACAO_PROFISSAO) + '<br>' +
                    '<b>Telefone:</b> ' + v(ra.TELEFONE) +
                    '</div></td></tr>';
            }).join('') : '') +
        '</table></div>' +

        // ABA SOCIAL / SAUDE
        '<div id="tab-social-' + id + '" class="popup-tab-content"><table class="popup-details-table">' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">DADOS PESSOAIS</td></tr>' +
        '<tr><td class="label-cell">Nome</td><td class="value-cell">' + v(attrs.NOME_DO_ENTREVISTADO || attrs.NOME) + '</td></tr>' +
        '<tr><td class="label-cell">CPF</td><td class="value-cell">' + v(attrs.CPF_DO_PRODUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">RG</td><td class="value-cell">' + v(attrs.IDENTIDADE_DO_TUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">Idade</td><td class="value-cell">' + v(attrs.IDADE) + ' anos</td></tr>' +
        '<tr><td class="label-cell">Gênero</td><td class="value-cell">' + v(attrs.GENERO) + '</td></tr>' +
        '<tr><td class="label-cell">Escolaridade</td><td class="value-cell">' + v(attrs.ESCOLARIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Estado Civil</td><td class="value-cell">' + v(attrs.ESTADO_CIVIL) + '</td></tr>' +
        '<tr><td class="label-cell">Ocupação/Profissão</td><td class="value-cell">' + v(attrs.OCUPACAO_PROFISSAO) + '</td></tr>' +
        '<tr><td class="label-cell">Descrição Ocupação</td><td class="value-cell">' + v(attrs.DESCRICAO_DA_OCUPACAO) + '</td></tr>' +
        '<tr><td class="label-cell">Telefone</td><td class="value-cell">' + v(attrs.TELEFONE) + '</td></tr>' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">SAÚDE / DEFICIÊNCIA</td></tr>' +
        '<tr><td class="label-cell">Dificuldade de Locomoção</td><td class="value-cell">' + v(attrs.DIFICULDADE_DE_LOCOMOCAO) + '</td></tr>' +
        '<tr><td class="label-cell">Quem tem Dificuldade?</td><td class="value-cell">' + v(attrs.SE_SIM_QUEM) + '</td></tr>' +
        '<tr><td class="label-cell">Especificação Locomoção</td><td class="value-cell">' + v(attrs.ESPECIFICACAO_DA_DIFICULDADE_DE_LOCOMOCAO) + '</td></tr>' +
        '<tr><td class="label-cell">Comorbidades</td><td class="value-cell">' + v(attrs.COMORBIDADES) + '</td></tr>' +
        '<tr><td class="label-cell">Quem tem Comorbidade?</td><td class="value-cell">' + v(attrs.SE_SIM_QUEM_) + '</td></tr>' +
        '<tr><td class="label-cell">Especificação Comorbidade</td><td class="value-cell">' + v(attrs.ESPECIFICACAO_DA_COMORBIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Obs. Sociais</td><td class="value-cell">' + v(attrs.OBSERVACOES) + '</td></tr>' +
        (residentRecords && residentRecords.length > 0 ?
            '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">SAÚDE DOS OUTROS MORADORES</td></tr>' +
            residentRecords.map(function(rf, ri) {
                var ra = rf.attributes || {};
                var hasHealth = ra.COMORBIDADES || ra.DIFICULDADE_DE_LOCOMOCAO || ra.IDADE;
                if (!hasHealth) return '';
                return '<tr style="border-bottom:1px dashed #e2e8f0"><td class="label-cell" style="vertical-align:top"><b>' + v(ra.NOME_DO_ENTREVISTADO || ra.NOME || 'Morador ' + (ri + 1)) + '</b></td><td class="value-cell" style="vertical-align:top">' +
                    '<div style="line-height:1.6">' +
                    '<b>Idade:</b> ' + v(ra.IDADE) + ' anos | <b>Gênero:</b> ' + v(ra.GENERO) + '<br>' +
                    '<b>Comorbidades:</b> ' + v(ra.COMORBIDADES) + (ra.SE_SIM_QUEM_ ? ' (' + v(ra.SE_SIM_QUEM_) + ')' : '') + '<br>' +
                    '<b>Especificação:</b> ' + v(ra.ESPECIFICACAO_DA_COMORBIDADE) + '<br>' +
                    '<b>Dificuldade Locomoção:</b> ' + v(ra.DIFICULDADE_DE_LOCOMOCAO) + (ra.SE_SIM_QUEM ? ' (' + v(ra.SE_SIM_QUEM) + ')' : '') + '<br>' +
                    '<b>Especificação:</b> ' + v(ra.ESPECIFICACAO_DA_DIFICULDADE_DE_LOCOMOCAO) +
                    '</div></td></tr>';
            }).filter(function(h) { return h !== ''; }).join('') : '') +
        '</table></div>' +

        // ABA ANIMAIS / PRODUCAO / SILVESTRES
        '<div id="tab-animais-' + id + '" class="popup-tab-content"><table class="popup-details-table">' +
        animalTabContent +
        '</table></div>' +

        // ABA INFRAESTRUTURA
        '<div id="tab-infra-' + id + '" class="popup-tab-content"><table class="popup-details-table">' +
        '<tr><td class="label-cell">Abastecimento de Água</td><td class="value-cell">' + v(attrs.ABASTECIMANETO_DE_AGUA) + '</td></tr>' +
        '<tr><td class="label-cell">Água é Tratada?</td><td class="value-cell">' + v(attrs.AGUA_TRATADA) + '</td></tr>' +
        '<tr><td class="label-cell">Fonte de Abastecimento</td><td class="value-cell">' + v(attrs.FONTE_DE_ABASTECIMENTO) + '</td></tr>' +
        '<tr><td class="label-cell">Curso d\'Água</td><td class="value-cell">' + v(attrs.CURSO_DAGUA) + '</td></tr>' +
        '<tr><td class="label-cell">Consumo Estimado</td><td class="value-cell">' + v(attrs.ESTIMATIVA_DE_CONSUMO_DE_AGUA) + '</td></tr>' +
        '<tr><td class="label-cell">Quando Falta Água?</td><td class="value-cell">' + v(attrs._QUANDO_FALTA_AGUA_COMO_FAZ_O_ABASTECIMENTO) + '</td></tr>' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">LIXO / RESÍDUOS</td></tr>' +
        '<tr><td class="label-cell">Coleta de Resíduos</td><td class="value-cell">' + v(attrs.COLETA_DE_RESIDUOS_SOLIDOS) + '</td></tr>' +
        '<tr><td class="label-cell">Destino do Lixo</td><td class="value-cell">' + v(attrs.TIPO_DE_DESTINACAO_DO_LIXO) + '</td></tr>' +
        '<tr><td class="label-cell">Obs. Infraestrutura</td><td class="value-cell">' + v(attrs._OBSERVACOES) + '</td></tr>' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">PRODUÇÃO AGROPECUÁRIA</td></tr>' +
        '<tr><td class="label-cell">Produção Agropecuária?</td><td class="value-cell">' + v(prodAtrrs.PRODUCAO_AGROPECIARIA) + '</td></tr>' +
        '<tr><td class="label-cell">Atividade Produtiva?</td><td class="value-cell">' + v(prodAtrrs.ATIVIDADE_PRODUTIVA) + '</td></tr>' +
        '<tr><td class="label-cell">Qual Atividade</td><td class="value-cell">' + v(prodAtrrs.QUAL_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Descrição</td><td class="value-cell">' + v(prodAtrrs.DESCRICAO_DA_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">CPF Produtor</td><td class="value-cell">' + v(prodAtrrs.CPF_DO_PRODUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">Cod. Cadastro IMA</td><td class="value-cell">' + v(prodAtrrs.CODIGO_CADASTRO_IMA) + '</td></tr>' +
        '<tr><td class="label-cell">Contato Produtor</td><td class="value-cell">' + v(prodAtrrs.CONTATO_PRODUTOR) + '</td></tr>' +
        '<tr><td class="label-cell">Funcionários</td><td class="value-cell">' + v(prodAtrrs.QUANTAS_PESSOAS_TRABALHAM_NESSA_ATIVIDADE) + '</td></tr>' +
        '<tr><td class="label-cell">Benfeitorias</td><td class="value-cell">' + v(prodAtrrs.BENFEITORIAS) + '</td></tr>' +
        '</table></div>' +

        // ABA CULTURA
        '<div id="tab-cultura-' + id + '" class="popup-tab-content"><table class="popup-details-table">' +
        '<tr><td class="label-cell">Grupo de Folia de Minas?</td><td class="value-cell">' + v(attrs.PARTICIPA_DE_GRUPO_DE_FOLIA_DE_MINAS) + '</td></tr>' +
        '<tr><td class="label-cell">Toca Viola Caipira?</td><td class="value-cell">' + v(attrs.TOCA_VIOLA_DE_10_CORDAS_VIOLA_CAIPIRA) + '</td></tr>' +
        '<tr><td class="label-cell">Festa do Reinado/Congado?</td><td class="value-cell">' + v(attrs.PARTICIPA_DE_FESTAS_DOS_REINADOS_OU_CONGADOS) + '</td></tr>' +
        '<tr><td class="label-cell">Banda de Musica?</td><td class="value-cell">' + v(attrs.PARTICIPA_DA_BANDA_DE_MUSICA) + '</td></tr>' +
        '<tr><td class="label-cell">Casa de Farinha/Fuba?</td><td class="value-cell">' + v(attrs.TEM_CASA_DE_FARINHA_OU_PRODUZ_FUBA) + '</td></tr>' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">OBSERVAÇÕES GERAIS</td></tr>' +
        '<tr><td class="label-cell">Fotos</td><td class="value-cell">' + v(attrs.FOTOS) + '</td></tr>' +
        '</table></div>' +

        // ABA ENTREVISTA / DADOS
        '<div id="tab-entrevista-' + id + '" class="popup-tab-content"><table class="popup-details-table">' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">ENTREVISTADOR</td></tr>' +
        '<tr><td class="label-cell">Nome Entrevistador</td><td class="value-cell">' + v(attrs.ENTREVISTADOR) + '</td></tr>' +
        '<tr><td class="label-cell" colspan="2" style="background:#f1f5f9;font-weight:700;text-align:center;border-top:2px solid #e2e8f0;padding:8px">DATAS / HORAS DA PESQUISA</td></tr>' +
        '<tr><td class="label-cell">Data 1a Tentativa</td><td class="value-cell">' + fmtDate(attrs.DATA) + '</td></tr>' +
        '<tr><td class="label-cell">Data 2a Tentativa</td><td class="value-cell">' + fmtDate(attrs.DATA_TENTATIVA_2) + '</td></tr>' +
        '<tr><td class="label-cell">Data 3a Tentativa</td><td class="value-cell">' + fmtDate(attrs.DATA_TENTATIVA_3) + '</td></tr>' +
        '<tr><td class="label-cell">Fotos</td><td class="value-cell">' + v(attrs.FOTOS) + '</td></tr>' +
        '</table></div>' +
        '</div>';
}
// =========================================================================
function renderQuestionnaires() {
    console.groupCollapsed('[PAEBM] Renderizando questionarios...');

    if (!questionnairesData || !questionnairesData.features) {
        console.warn('[PAEBM] Dados de questionarios vazios ou invalidos');
        console.groupEnd();
        return;
    }

    var totalFeatures = questionnairesData.features.length;
    console.log('[PAEBM] Total de features no JSON:', totalFeatures);

    markerClusterGroup.clearLayers();
    allMarkers = [];

    // Agregar por CODIGO: entrevistador, moradores e animais
    var groups = {};
    questionnairesData.features.forEach(function(feature) {
        var code = (feature.attributes.CODIGO || '').trim();
        if (!code) return;
        if (!groups[code]) groups[code] = { respondent: null, residents: [], animals: [] };

        var attrs = feature.attributes || {};
        var hasStatus = attrs.STATUS_DA_PESQUISA && String(attrs.STATUS_DA_PESQUISA).trim() !== '';
        var hasAnimal = attrs.NOME_DO_ANIMAL && String(attrs.NOME_DO_ANIMAL).trim() !== '' && String(attrs.NOME_DO_ANIMAL).trim() !== 'null';
        var hasNome = attrs.NOME_DO_ENTREVISTADO && String(attrs.NOME_DO_ENTREVISTADO).trim() !== '' && String(attrs.NOME_DO_ANIMAL).trim() !== 'null';

        if (hasStatus) {
            groups[code].respondent = feature;
        } else if (hasAnimal) {
            groups[code].animals.push(feature);
        } else if (hasNome || attrs.IDADE || attrs.GENERO) {
            groups[code].residents.push(feature);
        } else {
            groups[code].animals.push(feature);
        }
    });

    var totalPoints = 0;
    var totalResidents = 0;
    var totalAnimals = 0;

    Object.keys(groups).forEach(function(code) {
        var group = groups[code];
        var feature = group.respondent;
        if (!feature && group.residents.length > 0) feature = group.residents.shift();
        if (!feature && group.animals.length > 0) feature = group.animals.shift();
        if (!feature) return;

        var latlng = extractLatLng(feature);
        if (!latlng) return;
        if (latlng[0] < -90 || latlng[0] > 90 || latlng[1] < -180 || latlng[1] > 180) return;

        var status = feature.attributes.STATUS_DA_PESQUISA || '';
        var statusColor = getStatusColor(status);

        var marker = L.circleMarker(latlng, {
            radius: 7,
            fillColor: statusColor,
            color: statusColor,
            weight: 0,
            fillOpacity: 0.95,
            pane: 'markerPane'
        });

        marker.bindPopup(createQuestionnairePopup(feature.attributes, group.residents, group.animals), { maxWidth: 400, maxHeight: 500 });
        marker.bindTooltip(code, { permanent: true, direction: 'top', offset: [0, -10], className: 'marker-label' });

        allMarkers.push({ marker: marker, feature: feature, latlng: latlng });
        markerClusterGroup.addLayer(marker);
        totalPoints++;
        totalResidents += group.residents.length;
        totalAnimals += group.animals.length;
    });

    console.log('[PAEBM] ====== RESUMO ======');
    console.log('[PAEBM] Registros totais:', totalFeatures);
    console.log('[PAEBM] Imoveis (pontos):', totalPoints);
    console.log('[PAEBM] Moradores vinculados:', totalResidents);
    console.log('[PAEBM] Animais vinculados:', totalAnimals);
    console.log('[PAEBM] =====================');
    console.groupEnd();

    initStatusFilterUI();
    updateStats();
}

// =========================================================================
// 7. RENDERIZACAO DAS CAMADAS POLIGONAIS (ZAS / ZSS)
// =========================================================================
function renderZas() {
    if (!zasData || !zasData.features) return;
    console.log('[PAEBM] Renderizando ZAS:', zasData.features.length, 'feicoes');
    zasLayer.clearLayers();

    zasData.features.forEach(function(feature) {
        if (!feature.geometry) return;

        // EsriJSON polygons com rings
        if (feature.geometry.rings) {
            var rings = feature.geometry.rings.map(function(ring) {
                return ring.map(function(pt) {
                    return utmToLatLng(pt[0], pt[1]);
                }).filter(function(pt) { return pt !== null; });
            }).filter(function(ring) { return ring.length > 2; });

            if (rings.length > 0) {
                var polygon = L.polygon(rings, {
                    color: '#2471a3',
                    fillColor: '#2471a3',
                    fillOpacity: 0.15,
                    weight: 2
                }).addTo(zasLayer);

                var props = feature.attributes || {};
                polygon.bindPopup(
                    '<div style="padding:10px;font-family:Outfit,sans-serif">' +
                    '<h4 style="color:#2471a3;font-weight:700">ZONA DE SALVAMENTO AUTÔNOMO (ZAS)</h4>' +
                    '<p><b>Estrutura:</b> ' + (props.nome_strut || 'N/A') + '</p>' +
                    '<p><b>Cenario:</b> ' + (props.cenario || 'N/A') + '</p>' +
                    '<p><b>Area:</b> ' + (props.area_ha || 0).toFixed(2) + ' ha</p>' +
                    '</div>'
                );
            }
        }

        // GeoJSON polygons
        if (feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates) {
            var geoRings = feature.geometry.coordinates.map(function(ring) {
                return ring.map(function(coord) { return [coord[1], coord[0]]; });
            });
            L.polygon(geoRings, { color: '#2471a3', fillColor: '#2471a3', fillOpacity: 0.15, weight: 2 }).addTo(zasLayer);
        }
    });
}

function renderZss() {
    if (!zssData || !zssData.features) return;
    console.log('[PAEBM] Renderizando ZSS:', zssData.features.length, 'feicoes');
    zssLayer.clearLayers();

    zssData.features.forEach(function(feature) {
        if (!feature.geometry) return;

        if (feature.geometry.rings) {
            var rings = feature.geometry.rings.map(function(ring) {
                return ring.map(function(pt) {
                    return utmToLatLng(pt[0], pt[1]);
                }).filter(function(pt) { return pt !== null; });
            }).filter(function(ring) { return ring.length > 2; });

            if (rings.length > 0) {
                var polygon = L.polygon(rings, {
                    color: '#3498db',
                    fillColor: '#3498db',
                    fillOpacity: 0.12,
                    weight: 2
                }).addTo(zssLayer);

                var props = feature.attributes || {};
                polygon.bindPopup(
                    '<div style="padding:10px;font-family:Outfit,sans-serif">' +
                    '<h4 style="color:#3498db;font-weight:700">ZONA DE SEGURANÇA SECUNDÁRIA (ZSS)</h4>' +
                    '<p><b>Estrutura:</b> ' + (props.nome_strut || 'N/A') + '</p>' +
                    '<p><b>Cenario:</b> ' + (props.cenario || 'N/A') + '</p>' +
                    '<p><b>Area:</b> ' + (props.area_ha || 0).toFixed(2) + ' ha</p>' +
                    '</div>'
                );
            }
        }

        if (feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates) {
            var geoRings = feature.geometry.coordinates.map(function(ring) {
                return ring.map(function(coord) { return [coord[1], coord[0]]; });
            });
            L.polygon(geoRings, { color: '#3498db', fillColor: '#3498db', fillOpacity: 0.12, weight: 2 }).addTo(zssLayer);
        }
    });
}

function renderCentroUrbano() {
    if (!centroUrbanoData || !centroUrbanoData.features) return;
    console.log('[PAEBM] Renderizando Centro Urbano:', centroUrbanoData.features.length, 'feicoes');
    centroUrbanoLayer.clearLayers();

    centroUrbanoData.features.forEach(function(feature) {
        if (!feature.geometry) return;

        if (feature.geometry.rings) {
            var rings = feature.geometry.rings.map(function(ring) {
                return ring.map(function(pt) {
                    // Dados em WGS84 (wkid:4326): pt[0]=lng, pt[1]=lat
                    return [pt[1], pt[0]];
                });
            }).filter(function(ring) { return ring.length > 2; });

            if (rings.length > 0) {
                var polygon = L.polygon(rings, {
                    color: '#555555',
                    fillColor: '#555555',
                    fillOpacity: 0.15,
                    weight: 2
                }).addTo(centroUrbanoLayer);

                var props = feature.attributes || {};
                polygon.bindPopup(
                    '<div style="padding:10px;font-family:Outfit,sans-serif">' +
                    '<h4 style="color:#555555;font-weight:700">CENTRO URBANO</h4>' +
                    '<p><b>Nome:</b> ' + (props.Name || 'N/A') + '</p>' +
                    '<p><b>Area:</b> ' + (props.Shape_Area || 0).toFixed(6) + ' graus²</p>' +
                    '<p><b>Perimetro:</b> ' + (props.Shape_Length || 0).toFixed(6) + ' graus</p>' +
                    '</div>'
                );
            }
        }
    });
}

// =========================================================================
// 8. AUTO-CENTRALIZACAO
// =========================================================================
function fitAllBounds() {
    var bounds = L.latLngBounds();
    var hasPoints = false;

    allMarkers.forEach(function(item) {
        bounds.extend(item.latlng);
        hasPoints = true;
    });

    zasLayer.eachLayer(function(layer) {
        if (typeof layer.getBounds === 'function') {
            bounds.extend(layer.getBounds());
            hasPoints = true;
        }
    });

    zssLayer.eachLayer(function(layer) {
        if (typeof layer.getBounds === 'function') {
            bounds.extend(layer.getBounds());
            hasPoints = true;
        }
    });

    centroUrbanoLayer.eachLayer(function(layer) {
        if (typeof layer.getBounds === 'function') {
            bounds.extend(layer.getBounds());
            hasPoints = true;
        }
    });

    if (hasPoints && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// =========================================================================
// 9. FUNCAO PRINCIPAL DE CARREGAMENTO
// =========================================================================
var questionnairesData = null;
var zasData = null;
var zssData = null;
var centroUrbanoData = null;

async function tryAutoLoadData() {
    console.log('[PAEBM] Iniciando carregamento automatico de dados...');

    // Tentar usar dados pre-carregados via script tags (compativel file://)
    var preloaded = [
        { data: self.DATA_QUESTIONARIOS, key: 'questionnaires', label: 'Questionarios' },
        { data: self.DATA_ZAS, key: 'zas', label: 'ZAS' },
        { data: self.DATA_ZSS, key: 'zss', label: 'ZSS' },
        { data: self.DATA_CENTRO_URBANO, key: 'centroUrbano', label: 'Centro Urbano' }
    ];

    var loadedCount = 0;

    for (var i = 0; i < preloaded.length; i++) {
        var item = preloaded[i];
        if (item.data && item.data.features) {
            console.log('[PAEBM] OK - ' + item.label + ': ' + item.data.features.length + ' feicoes (script tag)');
            if (item.key === 'questionnaires') {
                questionnairesData = item.data;
                renderQuestionnaires();
            } else if (item.key === 'zas') {
                zasData = item.data;
                renderZas();
            } else if (item.key === 'zss') {
                zssData = item.data;
                renderZss();
            } else if (item.key === 'centroUrbano') {
                centroUrbanoData = item.data;
                renderCentroUrbano();
            }
            loadedCount++;
        }
    }

    // Se nem todos foram carregados, tentar fetch (modo servidor)
    if (loadedCount < preloaded.length) {
        var sources = [
            { url: 'DADOS_COMPILADOS_PAEBM_SAG_JSON.json', key: 'questionnaires', label: 'Questionarios' },
            { url: 'ZAS.json', key: 'zas', label: 'ZAS' },
            { url: 'ZSS.json', key: 'zss', label: 'ZSS' },
            { url: 'CENTRO_URBANO_JSON.json', key: 'centroUrbano', label: 'Centro Urbano' }
        ];

        for (var i = 0; i < sources.length; i++) {
            var src = sources[i];
            // Pular se ja foi carregado via script tag
            if ((src.key === 'questionnaires' && questionnairesData) ||
                (src.key === 'zas' && zasData) ||
                (src.key === 'zss' && zssData) ||
                (src.key === 'centroUrbano' && centroUrbanoData)) continue;
            try {
                console.log('[PAEBM] Carregando ' + src.label + ': ' + src.url);
                var response = await fetch(src.url);
                if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + response.statusText);
                var data = await response.json();

                console.log('[PAEBM] OK - ' + src.label + ': ' + (data.features ? data.features.length : 0) + ' feicoes');

                if (src.key === 'questionnaires') {
                    questionnairesData = data;
                    renderQuestionnaires();
                } else if (src.key === 'zas') {
                    zasData = data;
                    renderZas();
                } else if (src.key === 'zss') {
                    zssData = data;
                    renderZss();
                } else if (src.key === 'centroUrbano') {
                    centroUrbanoData = data;
                    renderCentroUrbano();
                }

                loadedCount++;
            } catch (e) {
                console.error('[PAEBM] ERRO ao carregar ' + src.url + ':', e.message);
            }
        }
    }

    console.log('[PAEBM] Arquivos carregados com sucesso: ' + loadedCount + '/' + preloaded.length);

    if (loadedCount > 0) {
        fitAllBounds();
        closeLoaderModal();
        // Forcar pontos na frente dos poligonos
        map.addLayer(markerClusterGroup);
    } else {
        console.warn('[PAEBM] Nenhum arquivo carregado. Abrindo assistente de upload...');
        showLocalFileLoaderModal();
    }
}

// =========================================================================
// 10. ASSISTENTE DRAG-AND-DROP (fallback)
// =========================================================================
function showLocalFileLoaderModal() {
    var modal = document.getElementById('loaderModal');
    modal.style.display = 'flex';
    var dropzone = document.getElementById('dropzone');
    var fileInput = document.getElementById('fileInput');

    dropzone.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() { handleLocalFiles(fileInput.files); });
    dropzone.addEventListener('dragover', function(e) { e.preventDefault(); });
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        handleLocalFiles(e.dataTransfer.files);
    });
}

function closeLoaderModal() {
    document.getElementById('loaderModal').style.display = 'none';
}

function handleLocalFiles(files) {
    Array.from(files).forEach(function(file) {
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                var name = file.name.toLowerCase();
                if (name.indexOf('dados') >= 0 || name.indexOf('compilados') >= 0 || name.indexOf('question') >= 0) {
                    questionnairesData = data;
                    renderQuestionnaires();
                } else if (name.indexOf('zas') >= 0) {
                    zasData = data;
                    renderZas();
                } else if (name.indexOf('zss') >= 0) {
                    zssData = data;
                    renderZss();
                } else if (name.indexOf('centro_urbano') >= 0) {
                    centroUrbanoData = data;
                    renderCentroUrbano();
                }
                fitAllBounds();
                closeLoaderModal();
            } catch (err) {
                alert('Erro ao processar ' + file.name + ': ' + err.message);
            }
        };
        reader.readAsText(file);
    });
}

// =========================================================================
// 11. FILTROS DA BARRA LATERAL
// =========================================================================
function setupEventListeners() {
    document.getElementById('searchBox').addEventListener('input', function(e) {
        searchTerm = e.target.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        applyFilters();
    });
    document.getElementById('filterArea').addEventListener('change', function(e) {
        selectedArea = e.target.value;
        applyFilters();
    });
    document.getElementById('filterBarragem').addEventListener('change', function(e) {
        selectedBarragem = e.target.value;
        applyFilters();
    });

    // Fechar sidebar ao tocar no mapa (mobile)
    document.getElementById('map').addEventListener('click', function() {
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });
}

function initStatusFilterUI() {
    var counts = getStatusCounts(allMarkers);
    var container = document.getElementById('statusFilterList');
    container.innerHTML = '';

    // Todos os Status = apenas CODIGOS com status reconhecido
    var greenStatuses = ['APLICADO', 'IMÓVEL EM CONSTRUÇÃO', 'IMÓVEL VAZIO/DESOCUPADO'];
    var allRecognized = ['APLICADO', 'IMÓVEL EM CONSTRUÇÃO', 'IMÓVEL VAZIO/DESOCUPADO', 'PROPRIETARIO AUSENTE', 'RECUSADO'];
    var totalReconhecidos = 0;
    allRecognized.forEach(function(s) { totalReconhecidos += counts[s] || 0; });

    var allItem = document.createElement('div');
    allItem.className = 'status-pill-item active';
    allItem.setAttribute('data-status', 'ALL');
    allItem.innerHTML = '<div class="status-pill-left"><div class="status-indicator" style="background:#3b82f6"></div><span>Todos os Status</span></div><div class="status-count">' + totalReconhecidos + '</div>';
    allItem.addEventListener('click', function() { selectStatusFilter('ALL'); });
    container.appendChild(allItem);

    // Filtros especificos
    var aplicadosCount = 0;
    greenStatuses.forEach(function(s) { aplicadosCount += counts[s] || 0; });

    // Contar ausentes que ainda precisam voltar (sem 3a tentativa)
    var ausentesVoltarCount = 0;
    allMarkers.forEach(function(item) {
        var a = item.feature.attributes;
        var st = (a.STATUS_DA_PESQUISA || '').trim().toUpperCase();
        if (st === 'PROPRIETARIO AUSENTE' && !a.DATA_TENTATIVA_3) ausentesVoltarCount++;
    });

    var filtros = [
        { key: 'APLICADO', label: 'Questionários Aplicados', color: '#10b981', count: aplicadosCount },
        { key: 'PROPRIETARIO AUSENTE', label: 'Proprietários Ausentes', color: '#f59e0b', count: counts['PROPRIETARIO AUSENTE'] || 0 },
        { key: 'AUSENTE_VOLTAR', label: 'Ausentes - Ainda Voltar', color: '#f59e0b', count: ausentesVoltarCount },
        { key: 'RECUSADO', label: 'Recusados', color: '#ef4444', count: counts['RECUSADO'] || 0 }
    ];

    filtros.forEach(function(filtro) {
        var item = document.createElement('div');
        item.className = 'status-pill-item';
        item.setAttribute('data-status', filtro.key);
        item.innerHTML = '<div class="status-pill-left"><div class="status-indicator" style="background:' + filtro.color + '"></div><span>' + filtro.label + '</span></div><div class="status-count">' + filtro.count + '</div>';
        item.addEventListener('click', function() { selectStatusFilter(filtro.key); });
        container.appendChild(item);
    });
}

function getStatusCounts(markers) {
    var counts = {};
    markers.forEach(function(item) {
        var status = item.feature.attributes.STATUS_DA_PESQUISA;
        if (status) {
            var clean = status.trim().toUpperCase();
            counts[clean] = (counts[clean] || 0) + 1;
        }
    });
    return counts;
}

function selectStatusFilter(statusKey) {
    selectedStatus = statusKey;
    document.querySelectorAll('#statusFilterList .status-pill-item').forEach(function(item) {
        item.classList.toggle('active', item.getAttribute('data-status') === statusKey);
    });
    applyFilters();
}

function applyFilters() {
    markerClusterGroup.clearLayers();
    var filteredCount = 0;
    var counts = { 'APLICADO': 0 };
    var listContainer = document.getElementById('filteredPointsList');
    listContainer.innerHTML = '';

    allMarkers.forEach(function(item) {
        var attrs = item.feature.attributes;
        var status = attrs.STATUS_DA_PESQUISA ? attrs.STATUS_DA_PESQUISA.trim().toUpperCase() : '';
        var name = (attrs.NOME_DO_ENTREVISTADO || attrs.NOME || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        var code = (attrs.CODIGO || '').toLowerCase();
        var address = (attrs.ENDERECO_COMPLETO || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        var area = (attrs.AREA_URBANA_OU_ZONA_RURAL || attrs.AREA_URBANA_OU_ZONA_RURAL_DECLARADA || '').toUpperCase();
        var dam = (attrs.BARRAGEM || '').toUpperCase().trim();

        var matchStatus = (selectedStatus === 'ALL');
        if (!matchStatus && selectedStatus === 'APLICADO') {
            matchStatus = (status === 'APLICADO' || status === 'IMÓVEL EM CONSTRUÇÃO' || status === 'IMÓVEL VAZIO/DESOCUPADO');
        } else if (!matchStatus && selectedStatus === 'AUSENTE_VOLTAR') {
            matchStatus = (status === 'PROPRIETARIO AUSENTE' && !attrs.DATA_TENTATIVA_3);
        } else if (!matchStatus) {
            matchStatus = (status === selectedStatus);
        }
        var matchSearch = (searchTerm === '' || name.indexOf(searchTerm) >= 0 || code.indexOf(searchTerm) >= 0 || address.indexOf(searchTerm) >= 0);
        var matchArea = (selectedArea === 'ALL' || (selectedArea === 'URBANA' && area.indexOf('URBANA') >= 0) || (selectedArea === 'RURAL' && area.indexOf('RURAL') >= 0));
        var matchDam = (selectedBarragem === 'ALL' || dam === selectedBarragem);

        if (matchStatus && matchSearch && matchArea && matchDam) {
            markerClusterGroup.addLayer(item.marker);
            filteredCount++;
            if (status === 'APLICADO') counts['APLICADO']++;

            var bullet = document.createElement('div');
            bullet.className = 'status-pill-item';
            bullet.style.margin = '4px 0';
            var sc = getStatusColor(attrs.STATUS_DA_PESQUISA);
            bullet.style.borderLeft = '3px solid ' + sc;
            bullet.style.background = sc + '18';
            bullet.innerHTML = '<div class="status-pill-left"><div class="status-indicator" style="background:' + sc + '"></div><div><div style="font-weight:600;font-size:12px;color:var(--text-primary)">' + (attrs.NOME_DO_ENTREVISTADO || attrs.NOME || attrs.STATUS_DA_PESQUISA || 'Sem nome') + '</div><div style="font-size:10px;color:var(--text-muted)">' + (attrs.CODIGO || 'S/Cod') + ' - ' + (attrs.STATUS_DA_PESQUISA || 'N/A') + '</div></div></div>';
            bullet.addEventListener('click', (function(ll, mk) {
                return function() {
                    if (window.innerWidth <= 768) closeSidebar();
                    map.flyTo(ll, 18, { animate: true, duration: 1.2 });
                    setTimeout(function() { mk.openPopup(); }, 1300);
                };
            })(item.latlng, item.marker));
            listContainer.appendChild(bullet);
        }
    });

    updateStats();
    document.getElementById('listTitleText').innerText = 'Resultados (' + filteredCount + ')';

    if (filteredCount === 0) {
        listContainer.innerHTML =                 '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;font-style:italic">Nenhum questionário atende aos filtros.</div>';
    }
}

function updateStats() {
    var greenStatuses = ['APLICADO', 'IMÓVEL EM CONSTRUÇÃO', 'IMÓVEL VAZIO/DESOCUPADO'];
    var counts = { 'APLICADO': 0, 'PROPRIETARIO AUSENTE': 0, 'AUSENTE_VOLTAR': 0, 'RECUSADO': 0, 'TOTAL': 0 };
    var statusValidos = ['APLICADO', 'IMÓVEL EM CONSTRUÇÃO', 'IMÓVEL VAZIO/DESOCUPADO', 'PROPRIETARIO AUSENTE', 'RECUSADO'];
    allMarkers.forEach(function(item) {
        var attrs = item.feature.attributes;
        var status = (attrs.STATUS_DA_PESQUISA || '').trim().toUpperCase();
        if (statusValidos.indexOf(status) >= 0) {
            counts['TOTAL']++;
            if (greenStatuses.indexOf(status) >= 0) counts['APLICADO']++;
            if (status === 'RECUSADO') counts['RECUSADO']++;
            if (status === 'PROPRIETARIO AUSENTE') {
                counts['PROPRIETARIO AUSENTE']++;
                // Se nao tem 3a tentativa, ainda precisa voltar
                if (!attrs.DATA_TENTATIVA_3) {
                    counts['AUSENTE_VOLTAR']++;
                }
            }
        }
    });
    document.getElementById('statTotalVal').innerText = counts['TOTAL'];
    document.getElementById('statAplicadoVal').innerText = counts['APLICADO'];
    document.getElementById('statAusenteVal').innerText = counts['PROPRIETARIO AUSENTE'];
    document.getElementById('statVoltarVal').innerText = counts['AUSENTE_VOLTAR'];
    document.getElementById('statRecusadoVal').innerText = counts['RECUSADO'];
}

// =========================================================================
// 12. TROCA DE ABAS NO POPUP
// =========================================================================
window.switchPopupTab = function(button, tabName) {
    var popupWrapper = button.closest('.popup-wrapper');
    var id = popupWrapper.getAttribute('data-id');
    popupWrapper.querySelectorAll('.popup-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    button.classList.add('active');
    popupWrapper.querySelectorAll('.popup-tab-content').forEach(function(c) { c.classList.remove('active'); });
    var target = popupWrapper.querySelector('#tab-' + tabName + '-' + id);
    if (target) target.classList.add('active');
};

// =========================================================================
// 14. MOBILE SIDEBAR TOGGLE
// =========================================================================
window.toggleSidebar = function() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    var toggle = document.getElementById('mobileToggle');
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('open');
        if (sidebar.classList.contains('open')) {
            toggle.style.left = 'auto';
            toggle.style.right = '12px';
            toggle.querySelector('i').className = 'ti ti-x';
        } else {
            toggle.style.left = '12px';
            toggle.style.right = 'auto';
            toggle.querySelector('i').className = 'ti ti-menu-2';
        }
    } else {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            toggle.style.left = '12px';
            toggle.style.right = 'auto';
            toggle.querySelector('i').className = 'ti ti-menu-2';
        } else {
            toggle.style.left = 'auto';
            toggle.style.right = '12px';
            toggle.querySelector('i').className = 'ti ti-x';
        }
    }
};

function closeSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebarOverlay');
    var toggle = document.getElementById('mobileToggle');
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            toggle.style.left = '12px';
            toggle.style.right = 'auto';
            toggle.querySelector('i').className = 'ti ti-menu-2';
        }
    } else {
        if (!sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            toggle.style.left = '12px';
            toggle.style.right = 'auto';
            toggle.querySelector('i').className = 'ti ti-menu-2';
        }
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

function hideMapControls() {
    if (!isMobile()) return;
    setTimeout(function() {
        var legend = document.querySelector('.map-legend');
        var layers = document.querySelector('.leaflet-control-layers');
        var scale = document.querySelector('.leaflet-control-scale');
        var north = document.querySelector('.north-arrow');
        var zoom = document.querySelector('.leaflet-control-zoom');
        var toggle = document.getElementById('mobileToggle');
        if (legend) legend.style.display = 'none';
        if (layers) layers.style.display = 'none';
        if (scale) scale.style.display = 'none';
        if (north) north.style.display = 'none';
        if (zoom) zoom.style.display = 'none';
        if (toggle) toggle.style.display = 'none';
    }, 150);
}

function showMapControls() {
    var legend = document.querySelector('.map-legend');
    var layers = document.querySelector('.leaflet-control-layers');
    var scale = document.querySelector('.leaflet-control-scale');
    var north = document.querySelector('.north-arrow');
    var zoom = document.querySelector('.leaflet-control-zoom');
    var toggle = document.getElementById('mobileToggle');
    if (legend) legend.style.display = '';
    if (layers) layers.style.display = '';
    if (scale) scale.style.display = '';
    if (north) north.style.display = '';
    if (zoom) zoom.style.display = '';
    if (toggle) toggle.style.display = '';
}

// =========================================================================
// 14. EXPORTACAO
// =========================================================================

function getExportData() {
    if (!questionnairesData || !questionnairesData.features) return [];
    var dateFields = ['DATA', 'DATA_TENTATIVA_2', 'DATA_TENTATIVA_3'];
    var rows = [];
    questionnairesData.features.forEach(function(f) {
        var a = f.attributes || {};
        var ll = extractLatLng(f);
        var row = {
            LATITUDE: ll ? ll[0] : '',
            LONGITUDE: ll ? ll[1] : ''
        };
        Object.keys(a).forEach(function(k) {
            var val = a[k] != null ? a[k] : '';
            if (val && dateFields.indexOf(k) >= 0 && typeof val === 'number' && val > 100000000000) {
                val = new Date(val).toLocaleDateString('pt-BR') + ' ' + new Date(val).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            }
            row[k] = val;
        });
        rows.push(row);
    });
    return rows;
}

function exportExcel() {
    var data = getExportData();
    if (!data.length) return alert('Nenhum dado para exportar.');
    var ws = XLSX.utils.json_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questionarios');
    XLSX.writeFile(wb, 'questionarios_paebm_sag.xlsx');
}

function generateKML(data) {
    var fields = Object.keys(data[0] || {}).filter(function(f) { return f !== 'LATITUDE' && f !== 'LONGITUDE'; });
    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document><name>Questionarios PAEBM - SAG</name>\n';
    data.forEach(function(r) {
        if (!r.LATITUDE && !r.LONGITUDE) return;
        kml += '<Placemark>\n';
        kml += '<name>' + escXml(r.NOME_DO_ENTREVISTADO || r.NOME || r.CODIGO || 'Sem nome') + '</name>\n';
        kml += '<description><![CDATA[';
        kml += '<table>';
        fields.forEach(function(f) {
            var val = r[f] != null ? r[f] : '';
            kml += '<tr><td><b>' + escXml(f) + ':</b></td><td>' + escXml(String(val)) + '</td></tr>';
        });
        kml += '</table>';
        kml += ']]></description>\n';
        kml += '<Point><coordinates>' + r.LONGITUDE + ',' + r.LATITUDE + ',0</coordinates></Point>\n';
        kml += '</Placemark>\n';
    });
    kml += '</Document></kml>';
    return kml;
}

function escXml(s) {
    if (!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function downloadBlob(content, filename, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
}

function exportKML() {
    var data = getExportData();
    if (!data.length) return alert('Nenhum dado para exportar.');
    var kml = generateKML(data);
    downloadBlob(kml, 'questionarios_paebm_sag.kml', 'application/vnd.google-earth.kml+xml');
}

function exportSHP() {
    var data = getExportData();
    if (!data.length) return alert('Nenhum dado para exportar.');
    if (typeof JSZip === 'undefined') return alert('JSZip nao carregado.');

    var fields = Object.keys(data[0]).filter(function(f) { return f !== 'LATITUDE' && f !== 'LONGITUDE'; });
    var numRecords = data.length;
    var hasGeom = 0;
    data.forEach(function(r) { if (r.LATITUDE && r.LONGITUDE) hasGeom++; });

    // --- DBF (atributos) ---
    var fieldInfo = fields.map(function(f) {
        var maxLen = 1;
        data.forEach(function(r) {
            var v = r[f] != null ? String(r[f]) : '';
            if (v.length > maxLen) maxLen = v.length;
        });
        var type = 'C'; // Character by default
        // Check if numeric
        var isNum = true;
        data.forEach(function(r) {
            var v = r[f];
            if (v !== '' && v != null && isNaN(Number(v))) isNum = false;
        });
        if (isNum && maxLen <= 18) type = 'N';
        return { name: f.substring(0, 10), type: type, len: Math.min(maxLen + 1, 254) };
    });

    var headerLen = 32 + fieldInfo.length * 32 + 1;
    var recordLen = 1;
    fieldInfo.forEach(function(f) { recordLen += f.len; });

    function buildDBF() {
        var buf = new ArrayBuffer(headerLen + numRecords * recordLen);
        var dv = new DataView(buf);
        var now = new Date();
        // Version
        dv.setUint8(0, 0x03);
        // Date YY MM DD
        dv.setUint8(1, now.getFullYear() - 1900);
        dv.setUint8(2, now.getMonth() + 1);
        dv.setUint8(3, now.getDate());
        // Num records
        dv.setUint32(4, numRecords, true);
        // Header length
        dv.setUint16(8, headerLen, true);
        // Record length
        dv.setUint16(10, recordLen, true);
        // Reserved
        for (var i = 12; i < 32; i++) dv.setUint8(i, 0);

        // Field descriptors
        var offset = 32;
        fieldInfo.forEach(function(f) {
            for (var j = 0; j < 11; j++) {
                dv.setUint8(offset + j, j < f.name.length ? f.name.charCodeAt(j) : 0);
            }
            dv.setUint8(offset + 11, f.type.charCodeAt(0));
            dv.setUint32(offset + 12, 0, true);
            dv.setUint8(offset + 16, f.len);
            dv.setUint8(offset + 17, 0);
            for (var j = 18; j < 32; j++) dv.setUint8(offset + j, 0);
            offset += 32;
        });
        // Terminator
        dv.setUint8(offset, 0x0D);
        offset++;

        // Records
        for (var ri = 0; ri < numRecords; ri++) {
            dv.setUint8(offset, 0x20); // not deleted
            offset++;
            var r = data[ri];
            fieldInfo.forEach(function(f) {
                var v = r[f.name] != null ? String(r[f.name]) : '';
                if (v.length > f.len) v = v.substring(0, f.len);
                for (var j = 0; j < f.len; j++) {
                    dv.setUint8(offset + j, j < v.length ? v.charCodeAt(j) : (f.type === 'N' ? 0 : 32));
                }
                offset += f.len;
            });
        }
        return buf;
    }

    // --- SHP (geometria) ---
    var shpRecordLen = 24; // 8 header + 4 shapeType + 8 X + 8 Y
    var shpContentSize = shpRecordLen / 2; // in 16-bit words (excluding 8-byte header)

    function buildSHP() {
        var fileLen = 50 + numRecords * (4 + shpContentSize); // 50 = header (100 bytes = 50 words)
        var buf = new ArrayBuffer(fileLen * 2);
        var dv = new DataView(buf);
        // Header
        writeShpHeader(dv, fileLen, 1);
        var recordOffset = 50; // in words
        for (var i = 0; i < numRecords; i++) {
            var r = data[i];
            var recContentLen = shpContentSize;
            dv.setInt32(recordOffset * 2, i + 1, false); // Record number (big endian)
            dv.setInt32(recordOffset * 2 + 4, recContentLen, false); // Content length (big endian)
            var recStart = recordOffset * 2 + 8;
            dv.setInt32(recStart, 1); // ShapeType Point
            dv.setFloat64(recStart + 4, r.LONGITUDE || 0, true); // X
            dv.setFloat64(recStart + 12, r.LATITUDE || 0, true); // Y
            recordOffset += 4 + recContentLen;
        }
        return buf;
    }

    function buildSHX() {
        var numRec = hasGeom;
        var fileLen = 50 + numRec * 4; // 50 words header + 4 words per record
        var buf = new ArrayBuffer(fileLen * 2);
        var dv = new DataView(buf);
        writeShpHeader(dv, fileLen, 1);
        var recordOffset = 50;
        var shpRecOffset = 50; // first record starts at word 50
        for (var i = 0; i < numRecords; i++) {
            var r = data[i];
            if (!r.LATITUDE && !r.LONGITUDE) continue;
            dv.setInt32(recordOffset * 2, shpRecOffset, false); // Offset (big endian)
            dv.setInt32(recordOffset * 2 + 4, shpContentSize, false); // Content length (big endian)
            recordOffset += 4;
            shpRecOffset += 4 + shpContentSize;
        }
        return buf;
    }

    function writeShpHeader(dv, fileLen, shapeType) {
        dv.setInt32(0, 9994, false); // File Code (big endian)
        dv.setInt32(4, 0, false); // Unused
        dv.setInt32(8, 0, false); // Unused
        dv.setInt32(12, 0, false); // Unused
        dv.setInt32(16, 0, false); // Unused
        dv.setInt32(20, 0, false); // Unused
        dv.setInt32(24, 0, false); // Unused
        dv.setInt32(28, 0, false); // Unused
        dv.setInt32(32, 0, false); // Unused
        dv.setInt32(36, 0, false); // Unused
        // Bounding Box (Xmin, Ymin, Xmax, Ymax)
        var xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
        data.forEach(function(r) {
            if (r.LATITUDE && r.LONGITUDE) {
                if (r.LONGITUDE < xmin) xmin = r.LONGITUDE;
                if (r.LATITUDE < ymin) ymin = r.LATITUDE;
                if (r.LONGITUDE > xmax) xmax = r.LONGITUDE;
                if (r.LATITUDE > ymax) ymax = r.LATITUDE;
            }
        });
        dv.setFloat64(36, xmin === Infinity ? 0 : xmin, true);
        dv.setFloat64(44, ymin === Infinity ? 0 : ymin, true);
        dv.setFloat64(52, xmax === -Infinity ? 0 : xmax, true);
        dv.setFloat64(60, ymax === -Infinity ? 0 : ymax, true);
        dv.setFloat64(68, 0, true); // Zmin
        dv.setFloat64(76, 0, true); // Zmax
        dv.setFloat64(84, 0, true); // Mmin
        dv.setFloat64(92, 0, true); // Mmax
        dv.setInt32(100, shapeType, true); // ShapeType (little endian)
    }

    // --- PRJ ---
    var prj = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]]';

    // --- ZIP ---
    var zip = new JSZip();
    zip.file('questionarios.dbf', buildDBF());
    zip.file('questionarios.shp', buildSHP());
    zip.file('questionarios.shx', buildSHX());
    zip.file('questionarios.prj', prj);

    zip.generateAsync({ type: 'blob' }).then(function(blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'questionarios_paebm_sag.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
    });
}

// =========================================================================
// 13. INICIALIZACAO
// =========================================================================
window.onload = function() {
    console.log('[PAEBM] ==========================================');
    console.log('[PAEBM] WebMap PAEBM - Santo Antonio do Grama');
    console.log('[PAEBM] Inicializando...');
    console.log('[PAEBM] ==========================================');

    // Sidebar inicia ABERTA em desktop e mobile
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('open');
        document.getElementById('mobileToggle').style.left = 'auto';
        document.getElementById('mobileToggle').style.right = '12px';
        document.getElementById('mobileToggle').querySelector('i').className = 'ti ti-x';
    } else {
        document.getElementById('mobileToggle').style.left = 'auto';
        document.getElementById('mobileToggle').style.right = '12px';
        document.getElementById('mobileToggle').querySelector('i').className = 'ti ti-x';
    }

    initMap();
    tryAutoLoadData();
};
