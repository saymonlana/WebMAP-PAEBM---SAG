# Tecnologias e Ferramentas Utilizadas no WebMap PAEBM

## 1. Linguagens
- **HTML5** — Estrutura da página
- **CSS3** — Estilização e responsividade
- **JavaScript (ES6)** — Lógica do mapa, popups, filtros, exportação

## 2. Bibliotecas de Mapa
- **Leaflet.js 1.9** — Biblioteca principal de mapas (open source)
- **Leaflet.markercluster** — Agrupamento dinâmico de pontos no mapa
- **Proj4.js** — Conversão de coordenadas UTM (fuso 23S) para WGS84

## 3. Bibliotecas de Exportação
- **SheetJS (xlsx)** — Geração de arquivos Excel (.xlsx)
- **JSZip** — Compactação de arquivos (usado no Shapefile .zip)
- **Shapefile gerado manualmente** — Criação de .shp + .shx + .dbf + .prj via ArrayBuffer

## 4. Ícones e Fontes
- **Tabler Icons** — Conjunto de ícones da interface
- **Google Fonts (Outfit)** — Fonte principal do sistema
- **Google Fonts (Inter)** — Fonte do plano em PDF

## 5. Dados
- **Esri JSON** — Formato dos dados de questionários, ZAS e ZSS
- **Google Satellite** — Camada de imagem de satélite de fundo
- **Dados embutidos via <script>** — self.DATA_QUESTIONARIOS, self.DATA_ZAS, self.DATA_ZSS

## 6. Ferramentas de Desenvolvimento
- **VS Code** — Editor de código
- **Git 2.47** — Controle de versão
- **PowerShell 5.1** — Terminal de comandos
- **Node.js** — Para testes e validação de dados localmente

## 7. Hospedagem e Deploy
- **GitHub** — Repositório do código (github.com/saymonlana/WebMAP-PAEBM---SAG)
- **Vercel** — Hospedagem do site (plano Hobby gratuito)
- **GitHub CLI (gh)** — Autenticação e push

## 8. Funcionalidades Implementadas
- Mapa interativo com Google Satellite
- Barra lateral com estatísticas, busca, filtros
- Popup com abas (Geral, Social, Animais, Infraestrutura, Cultura, Entrevista)
- Cores dinâmicas por status no cabeçalho do popup
- Responsividade mobile (sidebar deslizante, controles ocultos no popup)
- Exportação Excel, KML e Shapefile
- Filtros por status, área geográfica e setor/barragem
- Botão toggle para recolher sidebar (desktop e mobile)
- Suporte offline via modal de arrastar/soltar arquivos JSON

## 9. Sistema de Coordenadas
- **UTM Zona 23S (EPSG:31983)** — Dados originais
- **WGS84 (EPSG:4326)** — Conversão para exibição no mapa
