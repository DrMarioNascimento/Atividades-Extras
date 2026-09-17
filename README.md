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

Os sete laboratórios de `fisiologia/` abrem por uma sala, no mesmo modelo da Mesa do MOSAICO:

- **Professor:** toca em *Abrir uma sala* e entra com o Google. A conta precisa estar em `config/mestres` → `emails`. Aparecem o código, o QR e o painel das equipes (status, cadeados, tentativas, motivo da falha). No painel dá para fixar o caso e o cronômetro para a sala toda.
- **Equipes:** leem o QR (ou digitam o código) e informam o nome da equipe. Não pedem conta: a entrada é anônima.
- **Sem sala:** *Professor: usar sem sala* também passa pelo Google.

Arquivos: `fisiologia/sala-firebase.js` (salas), `fisiologia/qr.js` (QR gerado no próprio navegador), `firestore.rules`.
Projeto Firebase: `atividades-extras-e40b6`.

Configuração única no console do Firebase:

1. Firestore Database → criar o banco.
2. Authentication → Sign-in method → ativar **Google** e **Anônimo**.
3. Authentication → Settings → Domínios autorizados → `drmarionascimento.github.io`.
4. Firestore → criar o documento `config/mestres` com o campo `emails` (array) contendo o e-mail do professor.
5. Publicar as regras: `npx firebase-tools deploy --only firestore:rules` (ou colar `firestore.rules` em Firestore → Regras).
