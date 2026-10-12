# Registro de código reutilizado

## QR temporário — implementação em 12/10/2026

| Campo | Registro |
|---|---|
| Objetivo | Renderizar um QR interoperável no perfil do aluno, sem implementar algoritmos de QR próprios |
| Origem | `electrocicla/martial-arts-manager`, commit `1c05e47bc643fe1e0ee13be09fd73c2ca713dce4`, `src/components/attendance/QRCodeCanvas.tsx` |
| Licença/autoria | MIT; Copyright (c) 2025-2026 Luis Salgado Reyes |
| Destino | `src/components/qr-code-canvas.tsx` |
| Adaptações | Next.js client component, paleta atual, margem de leitura, acessibilidade, fallback de renderização e ausência de logs com token bruto |
| Aviso preservado | `public/licenses/martial-arts-manager-MIT.txt`; atribuição também no componente |
| Decisão | O componente pequeno de canvas já resolve a ligação React/biblioteca; backend D1, timestamps de cliente, branch/admin global e schemas do doador não foram incorporados |

Bibliotecas verificadas no pacote instalado e fixadas no lockfile: `qrcode@1.5.4` (MIT, Ryan Day), `jsqr@1.4.0` (Apache-2.0, projeto jsQR/Cosmo Wolfe e contribuidores), `@types/qrcode@1.5.6` (MIT, Microsoft/DefinitelyTyped). `dijkstrajs` (MIT, Wyatt Baldwin) integra o encoder. Os avisos de runtime são distribuídos em `public/licenses/`; as licenças originais dos pacotes permanecem no npm. jsQR não foi alterado, e não contém arquivo NOTICE no pacote inspecionado.

O scanner usa a biblioteca jsQR porque o detector nativo não está disponível de maneira uniforme nos navegadores móveis. A integração de câmera, sessão e confirmação é própria do Dojo OS. Nenhum código DojoUK/AGPL ou Fitness Platform sem licença foi copiado. TatamiHQ permanece referência de domínio/UI, sem incorporação nesta entrega.

Validação: suite SQL/PGlite, geração e decodificação com as duas bibliotecas, lint/typecheck/build, e testes no PostgreSQL local real com conexões distintas para replay, concorrência, renovação, manual versus QR, expiração após espera e rollback. O QR não substitui o check-in manual nem transforma XP em graduação. Resultados finais e limitações de navegador constam no README e na entrega.

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
