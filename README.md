# Controle Financeiro (PWA)

App de controle financeiro pessoal em Real (R$), com trava por PIN. Funciona no
navegador do PC e pode ser instalado como app no iPhone (Adicionar à Tela de Início).

## Como funciona a segurança e os dados

- **Seus dados NÃO vão para a internet.** Ficam salvos apenas no navegador do
  aparelho onde você usa o app (tecnologia `localStorage`).
- Se você hospedar o app, o que fica público é só a **interface vazia** — nenhum
  lançamento seu é publicado.
- O acesso é protegido por um **PIN de 4 dígitos** (guardado como hash, não em texto puro).
- Faça **backups** de vez em quando (botão "Exportar backup") para não perder dados
  ao limpar o navegador ou trocar de aparelho.

> Observação: o PIN protege a abertura do app. Ele **não** criptografa os dados no
> armazenamento — isso está previsto para uma versão futura.

## Funcionalidades

- Trava por PIN (você cria na primeira abertura)
- Lançamento rápido: valor, descrição, categoria, data, receita/despesa
- Navegação por mês
- Dashboard: saldo, receitas, despesas e gasto por categoria
- Editar e excluir lançamentos
- Exportar / importar backup (arquivo `.json`)
- Funciona offline (PWA)

## Testar no computador

Como o app usa Service Worker, ele precisa ser servido por um servidor local
(abrir o arquivo com duplo clique não ativa o modo PWA, mas o app funciona mesmo assim).

Servidor local rápido com Python:

```powershell
# dentro da pasta controle-financeiro
python -m http.server 8080
```

Depois abra no navegador: http://localhost:8080

## Instalar no iPhone

O iPhone precisa acessar o app por um link **https**. Duas opções:

### Opção A — Hospedar grátis (recomendado)

1. Suba a pasta `controle-financeiro` no **Netlify** (arraste a pasta em
   https://app.netlify.com/drop) ou no **GitHub Pages**.
2. Você recebe um link `https://...`.
3. No iPhone, abra esse link no **Safari**.
4. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
5. Pronto: vira um ícone e abre em tela cheia, offline.

### Opção B — Rede local (sem hospedar)

1. Rode `python -m http.server 8080` no PC.
2. Descubra o IP do PC (`ipconfig`), ex: `192.168.0.10`.
3. No iPhone (mesma rede Wi-Fi), abra `http://192.168.0.10:8080`.
   (O modo "app em tela cheia" do iOS funciona melhor com https, então a Opção A é preferível.)

## Estrutura

```
controle-financeiro/
├── index.html      # estrutura da tela
├── styles.css      # visual
├── app.js          # lógica (PIN, lançamentos, dashboard, backup)
├── manifest.json   # config do PWA
├── sw.js           # service worker (offline)
├── icons/          # ícones do app
└── README.md
```
