# Issue Tracker

**Tipo**: Markdown local

Esta é a config de tracker das skills de engenharia. Toda a documentação de
processo do repo (specs, tickets, ADRs, esta config) vive sob `.specs/` — não
há `docs/` nem `.scratch/`.

Issues e specs de feature vivem em `.specs/features/<feature>/`, uma pasta por
feature, seguindo a convenção já usada pelo repo (simulator-mvp,
replicas-rw-mix, worker-and-naming, custom-brief).

Arquivos por feature:

- `spec.md` — a spec/PRD (produzida por `to-spec`)
- `design.md` — decisões de design e seams (produzida por `to-tickets`)
- `tasks.md` — tickets tracer-bullet com edges de bloqueio (produzida por `to-tickets`)
- `validation.md` — validação da implementação (produzida por `implement`)

Não há GitHub Issues no fluxo. A label `ready-for-agent` é representada por um
campo `status: ready-for-agent` no cabeçalho do `spec.md`.

Decisões arquiteturais ficam em `.specs/STATE.md` (tabela de ADRs).

PRs como superfície de request: desligado.
