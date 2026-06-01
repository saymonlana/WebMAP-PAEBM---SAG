# Plano do Sistema de Coleta de Dados em Campo

## Visão Geral

Sistema composto por:
1. **App de coleta (PWA)** — roda no celular do técnico em campo
2. **Servidor** — guarda os dados e sincroniza
3. **WebMap** — mostra os dados em tempo real (já existe)

---

## 1. Como Funciona

```
Técnico em campo
     │
     ▼
App no celular (offline)
  • Marca ponto no mapa
  • Preenche formulário
  • Tira foto
     │
     ▼ (quando tem internet)
     │
Sincroniza com Servidor
     │
     ▼
WebMap atualiza em tempo real
```

- **Offline:** O técnico coleta o dia inteiro sem internet. Os dados ficam salvos no celular.
- **Sincronização:** Quando o celular pegar sinal (4G ou Wi-Fi do escritório), envia tudo automaticamente.
- **Tempo real:** Assim que chega no servidor, aparece no WebMap na hora.

---

## 2. Estrutura do Servidor

O servidor precisa de duas coisas:

| Componente | O que faz | Exemplo |
|---|---|---|
| **Banco de dados** | Guarda os coletas, usuários, projetos | SQLite (PocketBase) ou PostgreSQL |
| **API** | Ponte entre celular e banco | PocketBase ou Node.js |

---

## 3. Opções de Servidor

### Opção A — Servidor Local na Empresa (RECOMENDADO)

**O que é:** Um computador na empresa rodando 24 horas.

| Item | Detalhe |
|---|---|
| Hardware | Qualquer PC velho (Core i3, 4GB RAM, 500GB HD) |
| Software | PocketBase (1 arquivo .exe, sem instalação) |
| Internet | Banda larga da empresa |
| Custo | **R$ 0** (hardware já existe) |
| Manutenção | Alguém ligar o PC e deixar rodando |

**Prós:** Dados 100% na empresa, sem custo, sem cartão de crédito.
**Contras:** Se cair energia ou internet, o sistema de sincronização para (dados no celular continuam seguros).

**Funcionamento:**
- O PocketBase escuta numa porta (ex: `http://192.168.1.100:8090`)
- Os celulares na mesma rede ou pela internet (com No-IP) acessam ele
- O WebMap no Vercel consulta esse servidor

**Para acessar de fora da empresa (celular no campo):**
- Precisa de um DNS grátis tipo No-IP (`minhaempresa.no-ip.org`)
- Roteador da empresa precisa liberar a porta (ex: 8090)

---

### Opção B — Servidor Cloud (VPS)

**O que é:** Um computador alugado na internet.

| Item | Detalhe |
|---|---|
| Provedor | Oracle Cloud (sempre grátis), DigitalOcean, Hostinger |
| Specs mínimas | 1 CPU, 1GB RAM, 25GB SSD |
| Custo | **R$ 0** (Oracle Cloud) ou **R$ 30-60/mês** |
| Manutenção | Zero (o provedor cuida) |

**Oracle Cloud — Plano Sempre Grátis (R$ 0):**
- 2 CPUs AMD + 1GB RAM + 100GB SSD
- **Não precisa de cartão de crédito** se usar conta de email empresarial
- Roda 24h sem pagar nada

**Prós:** Não depende da infraestrutura da empresa, disponível 100% do tempo.
**Contras:** Precisa de alguém com conhecimento básico de Linux pra configurar.

---

### Opção C — Notebook ligado só nos dias de campo

**O que é:** Notebook da empresa que liga apenas quando tem coleta.

| Item | Detalhe |
|---|---|
| Hardware | Qualquer notebook |
| Software | PocketBase |
| Custo | **R$ 0** |

**Funcionamento:**
- Nos dias de campo, alguém liga o notebook e roda o PocketBase
- Os técnicos coletam e sincronizam quando voltam ao escritório
- Desliga no fim do dia

**Prós:** Mais simples, não precisa deixar ligado 24h
**Contras:** Não é tempo-real durante o campo (só sincroniza quando volta)

---

### Tabela Comparativa

| Característica | Local Empresa | Oracle Cloud | Notebook Dias |
|---|---|---|---|
| Custo mensal | R$ 0 | R$ 0 | R$ 0 |
| Cartão de crédito | Não | Depende | Não |
| Tempo real no campo | Sim | Sim | Não |
| Disponibilidade | Horário comercial | 24h | Dias de coleta |
| Dados na empresa | Sim | Não | Sim |
| Conhecimento técnico | Básico | Médio | Básico |

---

## 4. App de Coleta (PWA)

**O que é:** Um aplicativo que roda no celular sem precisar instalar pela loja.

**Funcionalidades:**
- Login com email e senha
- Escolher projeto (PAEBM SAG, outro projeto, etc.)
- Mapa com fundo Google Satellite (mesmo offline)
- Botão "Adicionar Ponto" → marca no mapa
- Formulário configurável por projeto
- Tirar foto pela câmera do celular
- Salvar automático mesmo sem sinal
- Sincronizar quando tiver internet
- Visualizar histórico de coletas do dia

**Como instala:**
1. Abre o link no celular (Chrome ou Edge)
2. O navegador pergunta "Adicionar à tela inicial"
3. Pronto — vira um aplicativo normal

**Quem desenvolve:** Eu (front-end) + configuração do servidor

---

## 5. WebMap (já existe)

O WebMap atual (`https://web-map-paebm-sag.vercel.app`) será adaptado para:
- Além de mostrar os dados, mostrar os **coletas em andamento**
- Atualizar automaticamente (não precisa recarregar a página)
- Filtro por projeto, coletor, data
- Exportar dados coletados em Excel/Shapefile

---

## 6. Passos para Implementar

### Fase 1 — Prova de Conceito (1 semana)
1. [ ] Montar servidor PocketBase no escritório (qualquer PC)
2. [ ] Criar app de coleta simples com um projeto piloto
3. [ ] Testar coleta no celular com um técnico
4. [ ] Ver dados aparecendo no WebMap

### Fase 2 — Expansão (2 semanas)
5. [ ] Configurar acesso remoto (No-IP + roteador)
6. [ ] Criar cadastro de projetos e usuários
7. [ ] Testar com múltiplos técnicos simultaneamente
8. [ ] Ajustar formulários por projeto

### Fase 3 — Produção (1 semana)
9. [ ] Escolher opção de servidor definitiva
10. [ ] Treinar equipe de campo
11. [ ] Iniciar uso real

---

## 7. Próximo Passo

Se quiser seguir, o primeiro passo é **instalar o PocketBase num computador da empresa** pra testar. É um arquivo só, não precisa instalar nada.

Quer que eu comece montando o PocketBase no computador que você está usando agora pra testarmos? Ou prefere marcar um momento pra fazer isso no escritório?
