# Processo de Desenvolvimento do WebMap PAEBM

## Fase 1 — Preparação do Ambiente
1. Instalação do Git (v2.47.1) no Windows
2. Instalação do GitHub CLI (gh)
3. Criação do repositório no GitHub
4. Configuração do Vercel (conectado ao GitHub, auto-deploy ativo)

## Fase 2 — Estrutura do Projeto
5. Organização dos arquivos: index.html, css/style.css, js/map.js
6. Dados JSON embutidos via <script> para evitar CORS
7. Bibliotecas baixadas localmente: leaflet.js, markercluster.js, proj4.js

## Fase 3 — Mapa Base
8. Inicialização do Leaflet com Google Satellite
9. Controles: zoom, escala, seta norte
10. Conversão UTM → WGS84 com Proj4.js

## Fase 4 — Camadas de Dados
11. Carregamento dos questionários (Esri JSON → GeoJSON)
12. Agrupamento por código (entrevistado + moradores + animais)
13. Agrupamento de pontos com MarkerCluster
14. Polígonos ZAS e ZSS (estilo outline)

## Fase 5 — Popup de Informações
15. Popup com abas (Geral, Social, Animais, Infraestrutura, Cultura, Entrevista)
16. Cores do cabeçalho por status (verde/aplicado, amarelo/ausente, vermelho/recusado)
17. Formatação de datas

## Fase 6 — Barra Lateral
18. Estatísticas (cards com totais)
19. Busca por nome/código/endereço
20. Filtros: área geográfica, setor/barragem, status da pesquisa
21. Lista de resultados clicáveis (voa para o ponto e abre popup)

## Fase 7 — Responsividade Mobile
22. Botão toggle ☰ com sidebar deslizante
23. Overlay transparente para fechar sidebar
24. Legendas, controles e zoom compactados
25. Popup adaptado (92vw, 65vh)
26. Esconder controles ao abrir popup
27. Fechar sidebar ao tocar no mapa
28. Botão de exportação dentro da área de scroll

## Fase 8 — Exportação de Dados
29. Excel (SheetJS) — todos os campos originais
30. KML — pontos com atributos em tabela HTML
31. Shapefile (.shp+.shx+.dbf+.prj) gerado via ArrayBuffer

## Fase 9 — Ajustes Finais
32. Sidebar inicia fechada no desktop
33. Botão toggle visível também no desktop
34. Zoom centralizado abaixo do toggle
35. Datas com hora nos popups e exportação

## Tecnologias Utilizadas (resumo)

| Categoria | Tecnologia |
|---|---|
| Mapa | Leaflet.js |
| Projeção | Proj4.js |
| Dados | Esri JSON |
| Exportação Excel | SheetJS |
| Exportação SHP | ArrayBuffer (manual) |
| Compactação | JSZip |
| Ícones | Tabler Icons |
| Fontes | Google Fonts (Outfit) |
| Hospedagem | Vercel (gratuito) |
| Versionamento | Git + GitHub |
