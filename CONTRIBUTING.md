# Contribuindo com o PACP

Obrigado por contribuir com o Padrão Aberto de Catálogo e Precificação.

## Como propor mudanças

1. Abra uma issue descrevendo o problema e o impacto esperado.
2. Envie um PR com escopo claro e foco em compatibilidade.
3. Inclua atualizações consistentes entre:
   - `spec/1.0.0/pacp.md`
   - `spec/1.0.0/pacp.schema.json`
   - `spec/1.0.0/examples/`
4. Execute validação antes de solicitar revisão.

## Checklist do PR

- [ ] Mudança está documentada na spec.
- [ ] Schema atualizado (quando necessário).
- [ ] Exemplos cobrindo cenário novo/alterado.
- [ ] `npm run validate:examples` executado em `tools/validator`.
- [ ] Changelog atualizado em `CHANGELOG.md`.

## Convenções

- Documentação em PT-BR.
- Termos técnicos em inglês quando necessário.
- Linguagem normativa na spec: DEVE, NÃO DEVE, PODE.
- Evite mudanças não relacionadas no mesmo PR.
