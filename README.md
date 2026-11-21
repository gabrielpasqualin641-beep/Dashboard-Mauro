# Dashboard de Performance · Marlon Mattedi (CONTROLE 2.0)

Dashboard **somente leitura** da operação de tráfego: gasto, vendas reais e retorno
por país, funil, campanha e anúncio; diagnóstico automático de onde estamos errando
(17 regras); e o que pausar, manter ou escalar.

Publicada no **GitHub Pages**: https://gabrielpasqualin641-beep.github.io/Dashboard-Mauro/

## Como funciona

O GitHub Pages só hospeda arquivos estáticos (não há servidor) e o repositório é
público. Por isso:

1. **Um GitHub Action agendado** (`.github/workflows/atualizar.yml`, a cada 15 min)
   busca Meta Ads e Hotmart com os tokens guardados nos **Secrets** do repositório.
   A página nunca vê token nenhum.
2. O Action **criptografa** os dados (AES-256-GCM, chave derivada da senha com
   PBKDF2-SHA-256 e 600.000 iterações, salt e IV aleatórios a cada execução) e
   publica só o arquivo cifrado `data/dados.enc.json`, direto como artefato do
   Pages. **Nada de dados é commitado no Git**, nem cifrado.
3. A página pede a senha, **descriptografa no navegador** e calcula tudo ali
   (funis, KPIs, as 17 regras, bonificação). A senha fica só em memória: recarregar
   a aba pede de novo. Senha errada não descriptografa nada.

```
Secrets ──► GitHub Action (scripts/coletar.ts) ──► out/data/dados.enc.json ──► GitHub Pages
                 Meta Ads (BR, US), Hotmart                                       │
                                                                 navegador: senha → AES-GCM → telas
```

O que **nunca** acontece: token, client secret, Basic, senha ou ID de conta em
arquivo commitado, no site publicado ou no log do Action (o coletor registra cada
Secret com `::add-mask::` e loga só contagens); dado de comprador (nome, e-mail,
telefone, documento) em qualquer lugar. O e-mail vira `sha256(e-mail + SALT_HASH)`,
usado só para cruzar Express → 2.0. Antes de publicar, `npm run verificar` varre o
`out/` e derruba o deploy se achar token do Meta, o valor de algum Secret ou campos
de dado pessoal.

Somente leitura: o coletor só faz GET. Os únicos POSTs (token OAuth da Hotmart e
relatório assíncrono de Insights do Meta) são leitura por definição e estão numa
lista fechada em `coletor/http.ts`; qualquer outro é recusado antes de sair. Há
teste para isso.

## Passo a passo (dono do repositório)

1. **Settings › Pages › Build and deployment › Source: "GitHub Actions".**
2. **Settings › Secrets and variables › Actions › New repository secret**, um por um:

   | Secret | O que é |
   |---|---|
   | `META_ACCESS_TOKEN` | Token do usuário do sistema com `ads_read` (veja abaixo) |
   | `META_AD_ACCOUNT_BR` | ID da conta de anúncios BR (`act_…`) |
   | `META_AD_ACCOUNT_US` | ID da conta de anúncios US (`act_…`) |
   | `HOTMART_CLIENT_ID` | Credencial da API Hotmart |
   | `HOTMART_CLIENT_SECRET` | Credencial da API Hotmart |
   | `HOTMART_BASIC` | Token Basic da credencial Hotmart (com ou sem o prefixo `Basic `) |
   | `DASHBOARD_PASSWORD` | Senha de acesso à dashboard (longa) |
   | `SALT_HASH` | Texto aleatório longo, ex.: `openssl rand -hex 32` |

3. **Actions › Atualizar dashboard › Run workflow** para a primeira carga.
4. Abrir https://gabrielpasqualin641-beep.github.io/Dashboard-Mauro/, entrar com a
   senha e conferir a aba **Conexões** (cada fonte com status, motivo e o que fazer).
5. **Trocar o token do Meta:** no Business Manager › Usuários do sistema ›
   `dashboard-leitura`, revogue o token antigo, gere um novo (só `ads_read`,
   expiração **Nunca**), atualize o Secret `META_ACCESS_TOKEN` e rode o workflow.
6. **Trocar a senha:** atualize o Secret `DASHBOARD_PASSWORD` e rode o workflow. A
   senha antiga deixa de funcionar na próxima atualização (quem estiver com a aba
   aberta é levado de volta à tela de senha).

> **Atualização:** o agendamento do GitHub pode atrasar alguns minutos em horários
> de pico; na prática a dashboard atualiza a cada **15 a 30 minutos**. A página
> confere o arquivo a cada 5 minutos e mostra "Dados de HH:MM" no topo: amarelo se
> tiver mais de 1 hora, vermelho com mais de 3 horas (o Action pode ter falhado —
> veja a aba Actions). O GitHub também desliga agendamentos de repositórios sem
> atividade por 60 dias; se isso acontecer, reative em Actions.

### Token do Meta (usuário do sistema `dashboard-leitura`)

1. business.facebook.com › **Configurações do negócio › Usuários › Usuários do sistema › Adicionar** (`dashboard-leitura`, função *Funcionário*).
2. **Atribuir ativos**: as duas contas de anúncio com **Ver desempenho** (nada de *Gerenciar*).
3. Se não houver, crie um app em developers.facebook.com (tipo *Empresa*) e vincule ao Business.
4. **Gerar novo token** › escolha o app › marque **só `ads_read`** › expiração **Nunca**.
5. Cole no Secret `META_ACCESS_TOKEN`.

A versão da Graph API é fixada no workflow (`META_API_VERSION: v27.0`).

### Credenciais da Hotmart

app.hotmart.com › **Ferramentas › Credenciais Hotmart (Developers) › Criar
credencial › API Hotmart**. Copie Client ID, Client Secret e Basic para os Secrets.
O coletor usa só `GET /payments/api/v1/sales/history` (últimos 90 dias).

Carrinho abandonado não entra: a Hotmart só entrega por webhook (exigiria servidor).
A aba Hotmart tem o link para o painel da Hotmart.

### Google Ads

Fica fora da coleta por enquanto: a aba Google Ads mostra "Conector não configurado".

## Rodar localmente

```bash
npm install
cp .env.example .env.local      # mesmas chaves dos Secrets (fora do Git)
npm run coletar                 # gera public/data/dados.enc.json (ou out/data/ se já houver build)
npm run dev                     # http://localhost:3000 → tela de senha
```

Sem credenciais, para ver as telas com **dados fictícios** (faixa laranja "DADOS DE
EXEMPLO" em toda a interface):

```bash
DASHBOARD_PASSWORD=qualquer npm run coletar:exemplo
```

O modo exemplo é recusado dentro do GitHub Actions: nunca é publicado.

Site igual ao do Pages:

```bash
NEXT_PUBLIC_BASE_PATH=/Dashboard-Mauro npm run build
npm run coletar                 # grava em out/data/
npm run verificar               # varre out/ atrás de segredos e dados pessoais
```

Testes e checagem de tipos:

```bash
npm test
npm run lint
```

### Conferência com o Gerenciador de Anúncios

```bash
npm run conferir -- 2026-11-14 2026-11-20 BR
```

Soma gasto e impressões no nível da conta e no nível de anúncio (o que a dashboard
usa) e compara com a referência do Gerenciador (R$2.942,78 e 62.926 impressões).
Diferenças comuns: fuso da conta de anúncios diferente de America/Sao_Paulo ou
janela de atribuição do Gerenciador diferente de 7 dias clique + 1 dia visualização.

## Configuração da operação

- **`config/operacao.ts`** — produtos (preencha o código real do Express no lugar de
  `EXPRESS_ID`), funis com as regras do **nome da campanha**
  (`MM | PAÍS | FUNIL | OBJETIVO | PÁGINA`) e os **`sck`** da Hotmart, eventos do quiz
  e funil de referência por país. Campanha fora do padrão vira `nao-classificada` e
  aparece no Diagnóstico.
- **`config/metas.ts`** — verba mensal, ticket, taxa da Hotmart, ROAS de empate e de
  escala, cortes, limites de frequência, bonificação (`bonusPercentual`,
  `bonusBaseMensal`) e os limiares de cada regra.

Mudou um desses arquivos? O push na `main` já dispara o workflow e republica.

## Telas

| Aba | O que mostra |
|---|---|
| Visão geral | Cartões com variação vs período anterior, ritmo da verba, investimento e ROAS real por dia, tabela por funil com status, selo de divergência Meta × Hotmart |
| Funis | Impressões → cliques → página → (quiz) → checkout → compra, com taxa por etapa e diagnóstico |
| Criativos | Tabela ordenável, sparklines de 14 dias, ação sugerida, agrupamento por conceito |
| Diagnóstico | Os 17 alertas, ordenados por verba em risco |
| Hotmart | Vendas por produto e por sck, reembolsos, order bump, Express → 2.0 |
| Google Ads | "Conector não configurado" (fase 2) |
| Bonificação | Memória de cálculo do mês (meses dentro dos 90 dias coletados) |
| Conexões | Status de cada fonte, motivo, o que fazer e link para rodar o workflow |

Filtros: período (hoje, 7, 14, 30 dias, mês atual, personalizado dentro dos 90 dias
coletados) e país (Todos / BR / US). Com US os valores ficam em US$.

## Estrutura

```
.github/workflows/atualizar.yml   coleta + build + publicação no Pages (a cada 15 min)
scripts/coletar.ts                coletor (Action ou local)
scripts/conferir.ts               conferência com o Gerenciador
coletor/                          Meta, Hotmart, câmbio, criptografia (só Node, só leitura)
lib/                              cálculos no navegador: painel, regras, bonificação, descriptografia
config/                           operacao.ts e metas.ts
app/(painel)/                     telas
tests/                            Vitest (regras, criptografia, coletor, privacidade, publicação)
```
