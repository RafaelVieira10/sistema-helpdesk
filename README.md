# Balcão – Sistema de Help Desk

Projeto acadêmico: sistema web para abertura e acompanhamento de chamados de suporte técnico.

## Tecnologias
HTML5, CSS3 e JavaScript puro (sem frameworks nem bibliotecas). Os dados são salvos no navegador com `localStorage`.

## Funcionalidades

### Chamados
- Abrir chamado com título, solicitante, categoria, prioridade e descrição (com validação e contador de caracteres)
- Editar e excluir chamados (CRUD completo), com confirmação antes de excluir
- Alterar status (Aberto, Em andamento, Resolvido)
- Atribuir um **técnico responsável**; ao atribuir, um chamado aberto passa para "Em andamento"
- **Comentários** do solicitante ou da equipe técnica, exibidos numa linha do tempo junto com o histórico de alterações

### Prazos (SLA)
Cada prioridade tem um prazo de atendimento:

| Prioridade | Prazo |
|-----------|-------|
| Alta      | 4 horas |
| Média     | 24 horas |
| Baixa     | 72 horas |

Chamados que passam do prazo recebem a etiqueta **"Fora do prazo"** e sobem para o topo da lista. O detalhe do chamado mostra quanto tempo falta ou há quanto tempo o prazo venceu.

### Painel
- Contadores por status e de chamados fora do prazo (clique para filtrar)
- Gráfico de chamados por categoria, separando pendentes e resolvidos (clique numa barra para filtrar)
- Indicadores: tempo médio de resolução, % resolvidos dentro do prazo, prioridade alta pendentes e chamados sem técnico

### Busca e organização
- Buscar por título, solicitante, descrição ou número (ex.: `#3`)
- Filtrar por status, prioridade e categoria, com botão "Limpar filtros"
- Ordenar por prioridade (padrão), mais recentes ou mais antigos
- **Exportar CSV** para abrir no Excel

### Interface
- Layout responsivo (computador e celular)
- Tema claro/escuro: segue o sistema e pode ser trocado pelo botão no topo (a escolha fica salva)
- Atalho de teclado: **N** abre um novo chamado; **Esc** ou clique fora fecha as janelas
- Acessibilidade: navegação por teclado, rótulos para leitores de tela, respeito a "reduzir movimento"
- "Restaurar dados de exemplo" no rodapé, útil para demonstrações

## Como executar
Abra o arquivo `index.html` em qualquer navegador atualizado. Não precisa instalar nada.

## Estrutura
| Arquivo | Conteúdo |
|---------|----------|
| `index.html` | Estrutura da página e janelas (modais) |
| `style.css`  | Estilos, temas claro/escuro e layout responsivo |
| `script.js`  | Regras de negócio, persistência e renderização |
