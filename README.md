# Atividades Extras

## Estado e manutenção — 10 de outubro de 2026

O repositório contém a entrada geral e as missões em `fisiologia/`. As frentes de Ética e Pesquisa indicadas na organização são propostas, não pastas já implementadas.

As atividades individuais usam páginas estáticas. As salas compartilhadas dependem de Firebase/Firestore e de suas regras de acesso. Publicar o HTML e publicar as regras são etapas diferentes; para verificar uma sala, confira entrada por QR, participação em dois aparelhos, encerramento e acesso aos resultados. Não há uma suíte automatizada de testes nem workflow de CI neste repositório nesta revisão.


**Estado em 7 de outubro de 2026.** Só a pasta `fisiologia/` está publicada. `etica/` e `pesquisa/` ainda não existem. Licença de uso educacional restrito, revisão nesta data: repositório público não é código aberto.

Missões complementares para as disciplinas do autor. Uma **pasta por disciplina**. A publicação é sempre a branch `main` (GitHub Pages).

**Entrar:** [drmarionascimento.github.io/Atividades-Extras](https://drmarionascimento.github.io/Atividades-Extras/)

```
Atividades-Extras/
  index.html              ← porta de todas as disciplinas
  README.md
  LICENSE.md
  fisiologia/             ← extras de Fisiologia (no ar)
    index.html
    Operacao-*.html
  etica/                  ← ainda não criada
  pesquisa/               ← ainda não criada
```

Não use uma branch com o nome da disciplina. Branch `Fisiologia` parece pasta no GitHub, mas o site lê a `main`.

## Fisiologia

Vitrine: [drmarionascimento.github.io/Atividades-Extras/fisiologia/](https://drmarionascimento.github.io/Atividades-Extras/fisiologia/)

| Laboratório | Arquivo de entrada | Versões avulsas |
|---|---|---|
| Operação Fisiologia Celular · Fase 1 (transporte e potenciais de membrana) | `Operacao-Fisiologia-Celular-Fase-1.html` | — |
| Operação Fisiologia Celular · Fase 2 (laboratório e fisiologia humana) | `Operacao-Fisiologia-Celular-Fase-2.html` | — |
| Operação Unidade Motora (sistema muscular) | `Operacao-Sistema-Muscular.html` | `Operacao-Unidade-Motora*.html` |
| Operação Matriz Óssea | `Operacao-Matriz-Ossea-Lab.html` | `Operacao-Matriz-Ossea*.html` |
| Operação Circuito Fechado | `Operacao-Circuito-Fechado-Lab.html` | `Operacao-Circuito-Fechado*.html` |
| Operação Alvéolo Seguro | `Operacao-Alveolo-Seguro-Lab.html` | `Operacao-Alveolo-Seguro*.html` |
| Operação Fick em Campo | `Operacao-Fick-em-Campo-Lab.html` | `Operacao-Fick-em-Campo*.html` |

As versões avulsas (`com-cronometro`, `sem-cronometro` e a versão simples) continuam na pasta para não quebrar links e QR antigos. `Operacao-Membrana-Sitiada*.html` é uma versão anterior, fora da vitrine. Missões novas desta matéria entram em `fisiologia/`. Outra disciplina = pasta nova no mesmo nível (`etica/`, `pesquisa/`…).

Relacionados: [Fisiologia Interativa](https://github.com/DrMarioNascimento/fisiologia-interativa), [Fisiologia em Fuga](https://github.com/DrMarioNascimento/fisiologia-em-fuga) e [Eita!](https://eita-quiz.web.app/) (quiz-batalha, repositório privado).

## Salas com QR (Firebase)

Os sete laboratórios de `fisiologia/` abrem pela sala, no formato do Laboratório do Pesquisador (Learning-lab/delineamentos):

- **Início:** *Entrar na sala* (equipes) e *🔒 Módulo do Professor* (Google; a conta precisa estar em `config/mestres` → `emails`).
- **Professor:** *Criar sessão* abre o **Painel do Professor**: grade de cartões das equipes (emoji, nome, caso, cadeados) e o placar da partida — **cadeados abertos**, **cadeados fechados** e equipes que concluíram. *Código · QR* abre o modal com QR, link e *Encerrar sessão*; *Configurar* fixa caso e cronômetro para todas. Tocar num cartão mostra tentativas, quantas vezes o cadeado fechou e o último diagnóstico.
- **Equipes:** código (ou QR) → nome da equipe + emoji → laboratório. Sem conta: a entrada é anônima.

Arquivos: `fisiologia/sala-firebase.js` (salas), `fisiologia/qr.js` (QR gerado no próprio navegador), `firestore.rules`.
Projeto Firebase: `atividades-extras-e40b6`.

Gabaritos, senhas e anotações do professor **não entram neste repositório**: tudo que está aqui é público, inclusive pelo endereço do GitHub Pages.

Configuração única no console do Firebase:

1. Firestore Database → criar o banco.
2. Authentication → Sign-in method → ativar **Google** e **Anônimo**.
3. Authentication → Settings → Domínios autorizados → `drmarionascimento.github.io`.
4. Firestore → criar o documento `config/mestres` com o campo `emails` (array) contendo o e-mail do professor.
5. Publicar as regras (republicar sempre que `firestore.rules` mudar): `npx firebase-tools deploy --only firestore:rules` (ou colar `firestore.rules` em Firestore → Regras).

## Autoria

**Autor e titular declarado:** Mário César Nascimento, PhD.

## Licença e uso

Este repositório é disponibilizado para uso educacional e demonstração não comercial. A publicação no GitHub não autoriza copiar, adaptar, redistribuir, republicar, hospedar em outro endereço ou explorar comercialmente o código, as atividades ou os materiais. Consulte [LICENSE.md](LICENSE.md). Revisão documental desta nota: 7 de outubro de 2026.
