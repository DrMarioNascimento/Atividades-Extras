# Atividades extras

Uma **pasta por disciplina**. A publicação é sempre a branch `main` (GitHub Pages).

```
Atividades-Extras/
  index.html              ← porta de todas as disciplinas
  README.md
  fisiologia/             ← só extras de Fisiologia
    index.html
    Operacao-Alveolo-Seguro.html
    Operacao-Alveolo-Seguro-sem-cronometro.html
  etica/                  ← quando houver
  pesquisa/               ← quando houver
```

Não use uma branch com o nome da disciplina. Branch `Fisiologia` parece pasta no GitHub, mas o site lê a `main`.

## Fisiologia

- [Pasta](https://drmarionascimento.github.io/Atividades-Extras/fisiologia/)
- [Alvéolo Seguro](https://drmarionascimento.github.io/Atividades-Extras/fisiologia/Operacao-Alveolo-Seguro.html)
- [Alvéolo Seguro sem cronômetro](https://drmarionascimento.github.io/Atividades-Extras/fisiologia/Operacao-Alveolo-Seguro-sem-cronometro.html)

Missões novas desta matéria entram em `fisiologia/`. Outra disciplina = pasta nova no mesmo nível (`etica/`, `pesquisa/`…).

Autor: Mário César Nascimento.

## Salas com QR (Firebase)

Os sete laboratórios de `fisiologia/` abrem pela sala, no formato do Laboratório do Pesquisador (Learning-lab/delineamentos):

- **Início:** *Entrar na sala* (equipes) e *🔒 Módulo do Professor* (Google; a conta precisa estar em `config/mestres` → `emails`).
- **Professor:** *Criar sessão* abre o **Painel do Professor**: grade de cartões das equipes (emoji, nome, caso, cadeados) e o placar da partida — **cadeados abertos**, **cadeados fechados** e equipes que concluíram. *Código · QR* abre o modal com QR, link e *Encerrar sessão*; *Configurar* fixa caso e cronômetro para todas. Tocar num cartão mostra tentativas, quantas vezes o cadeado fechou e o último diagnóstico.
- **Equipes:** código (ou QR) → nome da equipe + emoji → laboratório. Sem conta: a entrada é anônima.

Arquivos: `fisiologia/sala-firebase.js` (salas), `fisiologia/qr.js` (QR gerado no próprio navegador), `firestore.rules`.
Projeto Firebase: `atividades-extras-e40b6`.

Configuração única no console do Firebase:

1. Firestore Database → criar o banco.
2. Authentication → Sign-in method → ativar **Google** e **Anônimo**.
3. Authentication → Settings → Domínios autorizados → `drmarionascimento.github.io`.
4. Firestore → criar o documento `config/mestres` com o campo `emails` (array) contendo o e-mail do professor.
5. Publicar as regras (republicar sempre que `firestore.rules` mudar): `npx firebase-tools deploy --only firestore:rules` (ou colar `firestore.rules` em Firestore → Regras).

## Licença e uso

Este repositório é disponibilizado para uso educacional e demonstração não comercial. A publicação no GitHub não autoriza copiar, adaptar, redistribuir, republicar, hospedar em outro endereço ou explorar comercialmente o código, as atividades ou os materiais. Consulte [LICENSE.md](LICENSE.md).

**Autor:** Mário César Nascimento, PhD.
