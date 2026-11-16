/**
 * Textos dos termos do Portal do Candidato.
 *
 * Este arquivo já guardou um candidato e um grupo familiar fixos. Não guarda
 * mais: candidato, familiares, coletas e documentos vêm todos do banco, pelas
 * funções de `supabase/04-api.sql`. O que sobrou aqui é texto — as cláusulas
 * e o termo de responsabilidade, que são conteúdo editorial e não dado.
 */

/**
 * Enunciado literal do termo de responsabilidade, transcrito da seção 3.3.2
 * do `DEMONSTRATIVO DE REQUISITOS - GENDOCS PROUNI.docx`. O envio final da
 * documentação só é habilitado depois de marcada a caixa com este texto.
 */
export const TERMO_ACEITE =
  'Declaro que estou ciente e me responsabilizo pelos documentos disponibilizados, assim como aceito que, ao aprovar a documentação, minha matrícula no curso pleiteado seja feita pela IES.'

/**
 * As quatro declarações do Sisprouni, explicadas para quem já se inscreveu.
 *
 * A landing pergunta; o Portal precisa dizer o que a resposta significou. Cada
 * "Sim" acrescentou um documento obrigatório à coleta — é essa ligação que o
 * candidato procura aqui, e ela não estava escrita em lugar nenhum.
 */
export const DECLARACOES_SISPROUNI = {
  cota: {
    titulo: 'Sou cotista',
    significa:
      'Você foi pré-selecionado no ProUni em modalidade de cota e assumiu o compromisso de comprová-la.',
    documento:
      'Declaração de Raça e Cor, para a cota PPI (preto, pardo ou indígena). As demais modalidades seguem a lista documental do edital.',
  },
  matricula: {
    titulo: 'Tenho matrícula a encerrar em outra instituição',
    significa:
      'Você está matriculado em outra instituição de ensino superior e vai encerrar essa matrícula para assumir a bolsa do ProUni.',
    documento:
      'Declaração da instituição anterior confirmando o encerramento da matrícula.',
  },
  beneficio: {
    titulo: 'Tenho bolsa ProUni ou FIES a encerrar',
    significa:
      'Você usufrui hoje de uma bolsa do ProUni ou de financiamento do FIES e vai encerrar esse benefício para assumir a nova bolsa.',
    documento:
      'Declaração de encerramento do usufruto, emitida pela instituição que concedeu o benefício.',
  },
  professor: {
    titulo: 'Sou professor da rede pública',
    significa:
      'Você exerce o magistério da educação básica na rede pública, em efetivo exercício, e concorre por essa condição — que permite concorrer já tendo diploma superior, exclusivamente em licenciatura ou pedagogia.',
    documento:
      'Declaração ou certidão da secretaria de educação com o vínculo efetivo e o quadro permanente, acompanhada do último contracheque.',
  },
} as const

export interface Clausula {
  titulo: string
  paragrafos: string[]
  /**
   * De onde a regra vem. Só duas origens valem: o processo desenhado nesta
   * representação e o FAQ ProUni 2026.1, que é o documento oficial do
   * atendimento.
   */
  fonte: string
}

const CLAUSULAS: Clausula[] = [
  {
    titulo: '1. Objeto',
    fonte: 'Processo desenhado nesta representação',
    paragrafos: [
      'Este termo rege a entrega e a análise da documentação exigida do candidato pré-selecionado no ProUni para efetivar a matrícula na UniFatecie.',
      'A inscrição é feita nesta plataforma; o envio dos arquivos acontece no GenDocs, sistema externo utilizado pela Instituição para a coleta e a análise documental.',
    ],
  },
  {
    titulo: '2. Prazo de envio',
    fonte: 'Processo desenhado nesta representação · janela do concurso parametrizada no ERP',
    paragrafos: [
      'A janela de envio desta chamada é definida pela Secretaria ProUni no momento da abertura do processo.',
      'Encerrado o prazo, o sistema bloqueia novos envios e reenvios. Documentos reprovados só podem ser corrigidos dentro da janela.',
    ],
  },
  {
    titulo: '3. Documentação do grupo familiar',
    fonte: 'FAQ ProUni 2026.1 · grupo familiar e comprovante de residência',
    paragrafos: [
      'Além dos seus próprios documentos, o candidato é responsável por reunir e enviar os documentos de todos os membros declarados na ficha de inscrição do ProUni. As comunicações do processo vão sempre para o e-mail do candidato, que é quem acompanha.',
      'Cada familiar inserido no portal ganha uma coleta própria no GenDocs, com lista de documentos e link próprios. Quem preenche todas elas é você: entra na coleta de cada familiar e anexa os documentos daquela pessoa. Se preferir, pode compartilhar o link de uma coleta com o familiar para que ele mesmo anexe.',
      'O Comprovante de Residência deve estar em nome do candidato ou de um dos membros declarados. Imóvel cedido ou sem contrato de locação exige a Declaração de Imóvel Cedido ou Alugado devidamente preenchida.',
    ],
  },
  {
    titulo: '4. Análise e reprovação',
    fonte: 'FAQ ProUni 2026.1 · análise item a item e reenvio',
    paragrafos: [
      'A Secretaria ProUni aprova ou reprova cada documento individualmente — não o candidato como um todo.',
      'Em caso de reprovação, o candidato é notificado por e-mail com o motivo e pode reenviar o item dentro do prazo estipulado.',
      'O candidato é notificado por e-mail a cada mudança no processo, incluindo aprovações, recusas e ações necessárias.',
    ],
  },
  {
    titulo: '5. Efeito da aprovação',
    fonte: 'Processo desenhado nesta representação · matrícula e alteração contratual',
    paragrafos: [
      TERMO_ACEITE,
      'Aprovada a documentação, o encaminhamento depende do cruzamento com o WAE: candidato sem matrícula no curso pleiteado segue para matrícula automática no sistema acadêmico; candidato já matriculado segue para a conversão da bolsa no contrato vigente.',
    ],
  },
  {
    titulo: '6. Contato e tratamento de dados',
    fonte: 'Aceites da inscrição nesta representação',
    paragrafos: [
      'Ao marcar o aceite de contato na inscrição, o candidato autoriza a UniFatecie a enviar comunicados sobre o processo seletivo por SMS, WhatsApp e e-mail.',
      'Os dados informados são usados exclusivamente na condução deste processo seletivo, na análise documental e na eventual matrícula, e são compartilhados com os sistemas envolvidos (GenDocs, ERP Acadêmico e WAE).',
    ],
  },
]

/**
 * As cláusulas gerais. O prazo vem de fora porque é o único trecho que muda
 * por candidato — ele sai da janela do módulo em que a coleta foi aberta.
 */
export function montarClausulas(prazoInicio: string, prazoFim: string): Clausula[] {
  const temPrazo = prazoInicio !== '--' && prazoFim !== '--'
  if (!temPrazo) return CLAUSULAS

  return CLAUSULAS.map((c) =>
    c.titulo !== '2. Prazo de envio'
      ? c
      : {
          ...c,
          paragrafos: [
            `A janela de envio desta chamada vai de ${prazoInicio} a ${prazoFim}, definida pela Secretaria ProUni no momento da abertura do processo.`,
            c.paragrafos[1],
          ],
        },
  )
}
