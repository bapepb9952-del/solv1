# Registro de código reutilizado

## Estado em 12/10/2026

Nesta alteração de estratégia/documentação, **nenhum código dos quatro candidatos foi incorporado ao produto**. Foram consultados e referenciados arquivos nos snapshots do [mapa de referências](OPEN_SOURCE_REFERENCE.md).

Essa afirmação é limitada a esta alteração. As dependências npm do projeto mantêm suas próprias licenças; este documento não substitui um inventário completo dessas dependências nem relicencia o Dojo OS.

## Registro obrigatório quando houver incorporação

Criar uma entrada por adaptação significativa com:

| Campo | Conteúdo |
|---|---|
| Módulo e objetivo | Problema concreto que o trecho resolve |
| Origem | URL do repositório, commit completo e links dos arquivos |
| Licença | Identificador, arquivo da licença e eventuais avisos específicos |
| Titulares | Copyright original, conforme fonte |
| Destino | Arquivos locais que contêm a adaptação |
| Mudanças | Adaptações ao tenant, Auth, schema, UX, transações e domínio |
| Dependências | Pacotes novos, versões e licenças verificadas |
| Avisos preservados | Caminho da licença completa e notices distribuídos com o trecho |
| Verificação | Testes/comandos executados, resultados e limitações |
| Decisão | Por que a adaptação é melhor que manter o código atual ou usar só uma biblioteca |

Para um trecho MIT, preservar o aviso completo de licença e copyright pertinente; um link sozinho não substitui os avisos exigidos para código distribuído. Se houver arquivo com licença diferente ou código de terceiros embutido, resolver isso antes de incorporá-lo.

Código AGPL ou sem licença explícita não está autorizado para incorporação pela decisão atual. Não declarar aprovação geral de um repositório com base em um componente isolado.
