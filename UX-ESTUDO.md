# Estudo de UX/UI — Meu Semestre (v1)

## 1. Quem usa e em que contexto
| Persona | Contexto | Necessidade principal |
|---|---|---|
| **Calouro(a)** | Celular, entre aulas, pouca familiaridade com CAGR | Entender a grade e não perder prova |
| **Aluno(a) no limite de faltas** | Celular, 10 s antes/depois da aula | Marcar falta rápido e saber "quantas ainda posso" |
| **Aluno(a) organizado(a)** | Notebook, fim de semana | Planejar estudos, conferir médias, histórico/IAA |

**Conclusões:** o uso é majoritariamente **mobile, curto e recorrente** (micro-sessões de 5–15 s). A tela inicial tem que responder sem nenhum toque: *qual a próxima aula, posso faltar, qual a próxima prova*.

## 2. Problemas da versão anterior
1. **6 abas no rodapé** → alvos pequenos e navegação "por função" (faltas, notas…) obrigava a pular de aba para ver uma mesma disciplina.
2. Importação só no fluxo de criação; não havia como **atualizar** com um print ou um PDF novo.
3. Edição espalhada e pouco descobrível (inputs sempre abertos na tabela de notas = poluição visual).
4. `alert()/confirm()` nativos → quebram o tom visual, sem desfazer.
5. Sem conta → dados presos a um aparelho.

## 3. Decisões de arquitetura de informação
- **Navegação por objeto, não por função.** A unidade mental do aluno é a *disciplina*. Cada disciplina tem uma página com abas internas: **Resumo · Faltas · Notas · Estudos**.
- **Rodapé com 5 destinos** (limite recomendado para bottom nav):
  `Início` · `Agenda` · **`＋ Atualizar`** (botão central em destaque) · `Disciplinas` · `Histórico`
- **Atualizar** é uma aba própria e o ponto de entrada de *toda* automação: enviar print/foto/PDF → IA extrai → **tela de revisão com diferenças** → aplicar só o que o aluno marcar. Nada é gravado sem revisão.
- No desktop (≥ 900 px) o rodapé vira **barra lateral**, com conteúdo em até 2 colunas.

## 4. Padrões de interação
| Padrão | Onde | Por quê |
|---|---|---|
| **Ícone de lápis ✏️** em todo bloco editável | Cabeçalho da disciplina, horários, avaliações, eventos, histórico | Edição descobrível sem poluir a leitura; abre *bottom sheet* com o formulário |
| **Bottom sheet** (modal que sobe de baixo) | Todos os formulários | Alcance do polegar; no desktop vira modal central |
| **Toque único para presença** | Início → aulas de hoje | Ação mais frequente do app em 1 toque |
| **Toast com "Desfazer"** | Faltas, exclusões | Substitui `confirm()`; erro barato de reverter |
| **Revisão por diferenças com checkbox** | Atualizar | Confiança na IA: o aluno vê *antes → depois* |
| **Estados vazios ensinando** | Todas as telas | Cada vazio aponta para a ação que o resolve |
| **Esqueleto/loader com texto de etapa** | Extração por IA | Operação leva 10–40 s; mostrar progresso reduz abandono |

## 5. Sistema visual
- **Tipografia:** Inter (400/500/600/700). Escala: 12 · 14 · 16 · 20 · 28.
- **Cor:** primária azul-índigo `#2846d6` (confiança/acadêmico), superfícies neutras frias. Semânticas: verde (ok), âmbar (atenção), vermelho (risco). Cada disciplina recebe uma **cor de identidade** usada em chips, barras e grade — reconhecimento sem ler.
- **Tema escuro** automático (uso noturno é comum).
- **Raio** 14 px em cartões, 999 px em chips. **Sombras** suaves, 1 nível.
- **Alvos de toque** ≥ 44 px; respeito a `safe-area` (iPhone).
- **Dados como protagonistas:** anel de frequência, barra de "faltas usadas", média grande com situação em chip colorido.

## 6. Acessibilidade
Contraste AA nos textos, foco visível, `aria-label` nos botões de ícone, nada comunicado só por cor (chips têm texto), `prefers-reduced-motion` respeitado.

## 7. Fluxos principais
1. **Onboarding:** Login (Google ou e-mail) → tela "Vamos montar seu semestre" → enviar planos de ensino (vários de uma vez) → revisar → pronto.
2. **Atualização por print:** Atualizar → escolher o que é (Plano de ensino, Calendário/cronograma, Notas, Histórico, Outro) → câmera/galeria/PDF → IA → revisar diferenças → Aplicar.
3. **Dia a dia:** abrir app → Início mostra *agora/próxima aula* com botão Presente/Faltei → alerta se faltas perto do limite → próximas provas.

## 8. Métricas para validar a v1
Tempo até a 1ª disciplina importada (< 2 min), % de importações aplicadas sem edição manual, retenção semanal, nº de faltas marcadas/semana.

## 9. Próximas iterações sugeridas
Notificações de aula/prova (Web Push), compartilhar grade como imagem, sincronização com Google Calendar, simulador "quanto preciso tirar", cálculo de IAA por créditos.
