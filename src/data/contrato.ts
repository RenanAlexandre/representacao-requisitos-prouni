/* ==================================================================
 * Contrato de Prestação de Serviços Educacionais — EAD e Semipresencial
 *
 * Transcrição do contrato vigente da UniFatecie (12 páginas), usado em dois
 * lugares: no aceite da landing page, onde o candidato precisa poder LER o que
 * está aceitando, e no Portal do Candidato.
 *
 * Antes disto, os dois pontos apontavam para um texto que nós redigimos a
 * partir do documento de requisitos. Servia para explicar o processo e não
 * servia como contrato — o aceite da inscrição é do contrato de verdade, e é
 * este.
 *
 * REGRA: este arquivo é transcrição, não redação. Se o contrato mudar, troca-se
 * o texto daqui; não se "melhora" a redação de uma cláusula.
 * ================================================================== */

export interface ParagrafoContrato {
  /** "§ 1º", "Parágrafo único", "a)" — vazio nos parágrafos corridos. */
  rotulo?: string
  texto: string
  /** Alíneas e incisos que pendem do parágrafo. */
  itens?: string[]
}

export interface ClausulaContrato {
  titulo: string
  paragrafos: ParagrafoContrato[]
}

export interface SecaoContrato {
  titulo: string
  clausulas: ClausulaContrato[]
}

export const CONTRATO_TITULO =
  'Contrato de Prestação de Serviços Educacionais nas modalidades de Ensino a Distância (EAD) e Semipresencial'

export const CONTRATO_PREAMBULO =
  'CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS, que fazem entre si de um lado a CENTRO ' +
  'UNIVERSITÁRIO UNIFATECIE, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ' +
  '07.724.708/0001-34, com sede à BR 376, Nº 1000, Km 102, Distrito Industrial, CEP 87720-140, na ' +
  'cidade de Paranavaí/PR, entidade mantenedora CENTRO EDUCACIONAL FATECIE LTDA, doravante ' +
  'CONTRATADA, por seu representante legal, e do outro lado o(a) Aluno(a) abaixo identificado(a) ' +
  'CONTRATANTE.'

/** Campos do cabeçalho do contrato, na ordem em que aparecem no documento. */
export const CONTRATO_IDENTIFICACAO = {
  contrato: ['Curso', 'RA', 'Início do curso'],
  aluno: [
    'Nome', 'RG', 'CPF', 'Sexo', 'Estado civil', 'Data de nascimento', 'Idade',
    'Endereço', 'CEP', 'Bairro', 'Telefone', 'Cidade', 'UF',
  ],
  responsavel: [
    'Nome', 'RG', 'CPF', 'Nome do cônjuge', 'RG do cônjuge', 'CPF do cônjuge',
    'Endereço', 'CEP', 'Bairro', 'Telefone', 'Cidade', 'UF',
  ],
} as const

export const CONTRATO_FECHO = [
  'O presente Contrato é celebrado em duas vias, de iguais teor e forma, assinado, neste ato, pelas Partes. Quando firmado por meio eletrônico, o presente Contrato passa a ter eficácia com o “aceito os termos” eletrônico do CONTRATANTE.',
  'Paranavaí/PR, ______ de _____________________ de 20_____.',
]

export const CONTRATO_ADESAO =
  'FICA O PRESENTE CONTRATO E SEUS ANEXOS, ADERIDOS E ACORDADOS ENTRE AS PARTES MEDIANTE A ' +
  'LEITURA E O ACEITE ELETRÔNICO DOS TERMOS CLICANDO NA CAIXA “ACEITO OS TERMOS”.'

export const CONTRATO: SecaoContrato[] = [
  {
    titulo: 'Legislação aplicável',
    clausulas: [
      {
        titulo: 'Cláusula Primeira',
        paragrafos: [
          {
            texto:
              'As partes acima qualificadas, na melhor forma de direito, firmam o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS PARA CURSO DE GRADUAÇÃO NA MODALIDADE DE ENSINO À DISTÂNCIA (EAD) E SEMIPRESENCIAL, com fundamento nos Arts. 206, 207 e 209 da Constituição Federal, na Lei n. 9.394/1996, Lei n. 8.078/1990, Lei n. 9.870/1999 e Lei n. 10.406/2002 e demais dispositivos legais aplicáveis à espécie, que se regerá pelas cláusulas e condições seguintes, cujo cumprimento as partes se obrigam mutuamente.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Do objeto',
    clausulas: [
      {
        titulo: 'Cláusula Segunda',
        paragrafos: [
          {
            texto:
              'O objeto do presente contrato é a prestação de serviços educacionais de nível superior pela CONTRATADA, na modalidade de ensino a distância, em favor do CONTRATANTE, por meio de aulas e demais atividades escolares com base no projeto pedagógico, programas de disciplinas e currículos aprovados pela CONTRATADA, enquanto permanecer matriculado no curso indicado no requerimento inicial de matrícula, comprometendo-se as Partes a cumpri-lo, sempre com base na boa-fé e no equilíbrio contratual.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'No caso de procedimentos realizados via web (site da CONTRATADA), as partes reconhecem a validade e segurança jurídica da produção documental eletrônica e de seu processamento em meio eletrônico, assim como reconhecem a validade do contrato, ao qual atribuem eficácia legal equivalente à de um documento originalmente com suporte físico subscrito pelos contratantes.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Ao firmar o presente contrato, o CONTRATANTE e seu responsável legal/financeiro concordam em submeterem-se aos ditames das fontes legais atinentes à matéria, declarando que tem, portanto, conhecimento da abrangência das relações ora ajustadas.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'Fica ciente o CONTRATANTE que os cursos de graduação das modalidades EAD e Semipresenciais (Híbridos), a CONTRATADA condiciona ao número mínimo de 12 (doze) alunos matriculados por curso e local de oferta para continuidade da matrícula. Caso em algum momento do curso não tenha o número mínimo considerando nesta cláusula, o CONTRATANTE concorda em realizar a transferência do curso contratado para outro curso de área afim disponível na CONTRATADA, com aproveitamento de disciplinas já aprovadas.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'No curso de tecnólogo de segurança pública a efetivação da matrícula está condicionada a comprovação de que o CONTRATANTE é profissional de carreira de segurança pública (Polícia Federal, Polícia Rodoviária Federal, Polícia Civil, Polícia Militar, Corpo de Bombeiros, Agente Penitenciário e Guarda Municipal), apresentando carteira funcional expedida por órgãos públicos devidamente válida.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'Em qualquer curso que exige como pré-requisito uma primeira graduação anterior (cursos de segunda graduação), o CONTRATANTE está obrigado em enviar o diploma e histórico escolar de sua primeira graduação em até 2 (dois) dias úteis após seu cadastro inicial de pré-matrícula na CONTRATADA, sob pena de indeferimento da matrícula a qualquer momento. O envio dos documentos mencionados neste dispositivo deverá ocorrer via portal do aluno através de requerimento eletrônico.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'A orientação técnica sobre a prestação dos serviços de ensino é de inteira responsabilidade da CONTRATADA, especialmente em relação à avaliação e ao rendimento escolar dos alunos, a fixação de carga horária, a grade curricular, a indicação de professores, a modalidade de ensino e a orientação didático-pedagógica, razão pela qual por força da autonomia acadêmica definida em lei, poderá a CONTRATADA a qualquer tempo proceder alterações nas atividades aqui mencionadas, procedendo com a prévia comunicação ao CONTRATANTE, através de qualquer meio de divulgação.',
          },
          {
            rotulo: '§ 7º',
            texto: 'São obrigações da CONTRATADA:',
            itens: [
              'a) disponibilizar material didático e acesso ao ambiente virtual de treinamento através de login e senha gerada pela CONTRATADA após confirmação do pagamento do CONTRATANTE, salvo por motivos de caso fortuito ou força maior;',
              'b) apresentar nos dias e horários previamente agendados as aulas virtuais com o professor titular ou, em caso de força maior, apresentado por outro professor com conhecimento comprovado na área, bem como eventuais alterações pertinentes e justificadas;',
              'c) disponibilizar o serviço de tutoria, que orientará a aprendizagem, durante a duração do curso através de e-mails, mensagens de texto e outras formas de comunicação pelo Ambiente Virtual de Aprendizagem para esclarecimento de dúvidas;',
              'd) coordenar administrativamente e academicamente os cursos, zelando pela sua qualidade e pelo cumprimento das metodologias de educação a distância;',
              'e) informar ao CONTRATANTE, caso houver, as atividades programadas para o curso.',
            ],
          },
          {
            rotulo: '§ 8º',
            texto: 'São obrigações do CONTRATANTE:',
            itens: [
              'a) as informações pessoais e endereço consignados pelo CONTRATANTE, por ocasião da matrícula ou da sua renovação, são de inteira responsabilidade e obrigação exclusiva do CONTRATANTE, bem como as respectivas atualizações, especialmente dos endereços para envio de correspondências escolares e cobranças de mensalidades;',
              'b) possuir equipamentos e softwares, seguindo hardware com requisitos mínimos de máquina com 4 gigabyte de memória ram, com acesso à Internet e ter um e-mail e telefone para permanente contato;',
              'c) responder, no prazo estabelecido pela Coordenação do curso da CONTRATADA, a todas as mensagens recebidas;',
              'd) manter seus dados cadastrais atualizados e com informações verídicas, bem como zelar pela confidencialidade de sua senha e login, de forma a não permitir compartilhamento;',
              'e) não reproduzir, sob qualquer forma o material do curso, sob pena de responder, civil e criminalmente, perante a CONTRATADA e terceiros, nos termos da Lei nº 9.609, de 19 de fevereiro de 1998, por violação da propriedade intelectual, devendo o uso deste ser feito exclusivamente em âmbito privado pelo CONTRATANTE;',
              'f) seguir os padrões de conduta estabelecidos e vigentes na Internet, abstendo-se de: (i) violar a privacidade de outros usuários; (ii) permitir que outras pessoas utilizem seu acesso ao ambiente de treinamento; (iii) utilizar qualquer técnica de invasão ao site que viole a segurança do ambiente de treinamento e de sites relacionados; (iv) agir conscientemente para destruir arquivos ou programas do ambiente de treinamento e de sites relacionados; (v) utilizar os nomes e e-mails dos participantes do curso para fins comerciais; (vi) enviar mensagens que possam ser consideradas obscenas e fora dos padrões éticos e de bons costumes;',
              'g) a realização das atividades práticas em laboratórios virtuais e interativos, quando definidos pela CONTRATADA, conforme o curso e disciplina;',
              'h) realizar as atividades práticas presenciais nos Megas Polos credenciados pela CONTRATADA, que são ambientes preparados e com a estrutura necessária para realização das atividades práticas presenciais, conforme indicação do momento e local pela CONTRATADA;',
              'i) o comparecimento às atividades práticas e/ou estágios obrigatórios presenciais nos Megas Polos e/ou em Ambientes Profissionais conveniados indicados pela CONTRATADA, ciente de que estas atividades poderão ocorrer no período diurno ou noturno, conforme a disponibilidade do Mega Polo e/ou Ambiente Profissional em datas e horários pré-estabelecidos;',
              'j) firmar termo de compromisso, que deverá ser validado pela CONTRATADA, antes da realização de qualquer atividade prática presencial inclusive estágio obrigatório, ficando proibida e invalidada a realização da mesma na ausência do referido termo;',
              'k) o CONTRATANTE tem ciência que caso não tenha Mega Polo em sua localidade, deverá se deslocar às suas expensas para o Mega Polo mais próximo conforme indicação da CONTRATADA;',
              'l) procurar e realizar às suas expensas, os devidos estágios obrigatórios previstos na grade curricular do curso, considerando as atividades propostas mediante assinatura prévio termo de compromisso entre estagiário, parte concedente e instituição de ensino, nos termos da Lei 11.788/2008, e ainda condicionado à avaliação pedagógica da CONTRATADA do correspondente estágio.',
            ],
          },
        ],
      },
    ],
  },

  {
    titulo: 'Da carga horária',
    clausulas: [
      {
        titulo: 'Cláusula Terceira',
        paragrafos: [
          {
            texto:
              'De acordo com as diretrizes curriculares e conseguinte carga horária do curso, poderá a CONTRATADA determinar que o CONTRATANTE cumpra parte da carga horária do curso sob a modalidade de atividades complementares ou atividades de campo dentro e/ou fora de qualquer campus ou polos da CONTRATADA.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Para a integralização da carga horária do curso serão consideradas atividades acadêmicas todas aquelas permitidas pelo MEC e pela legislação vigente.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'A CONTRATADA possui autonomia para ministrar aulas telepresenciais e atividades acadêmicas ou parte delas em horários diferentes daqueles previamente estabelecidos para o curso no qual o CONTRATANTE se matriculou, sem que tais fatos deem ensejo a qualquer tipo de indenização, descontos, benefícios e/ou qualquer tipo de ressarcimento de danos, sejam eles de que natureza for.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'Da mesma forma, por motivos de natureza operacional e acadêmica, poderá a CONTRATADA fixar as datas e horários de provas em dias e horários não necessariamente coincidentes com as datas e horários dos serviços educacionais prestados ao CONTRATANTE, sem que tal fato dê, ao CONTRATANTE, direito de pleitear ou receber qualquer tipo de indenização, descontos, benefícios e/ou qualquer tipo de ressarcimento de danos, sejam eles de que natureza forem.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'O CONTRATANTE declara expressamente neste ato que na hipótese de contratar os serviços após o início do período letivo, tem pleno conhecimento e foi prévia e devidamente informado pela CONTRATADA, que não fará jus a qualquer tipo de reposição de aulas especiais referentes ao período já decorrido desde o início do período letivo, bem como não terá direito a qualquer tipo de indenização, descontos, benefícios e/ou qualquer tipo de ressarcimento de danos, sejam os mesmos de que natureza for.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'Para requerer eventual dispensa/eliminação de disciplinas, o CONTRATANTE deverá realizar requerimento específico disponível no portal do aluno, onde será analisado pelo setor competente sendo o resultado divulgado e demais instruções informados no bojo do próprio requerimento.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'Em caso de deferimento de dispensa de disciplinas, não haverá, em nenhuma hipótese, a diminuição do prazo regimental mínimo para integralização do curso. O fato do CONTRATANTE dispensar disciplinas, não suprime o prazo mínimo da duração do curso para sua conclusão. Assim, caso haja dispensa de disciplinas na grade do CONTRATANTE, o mesmo apenas está desobrigado em cursar as disciplinas dispensadas, porém deverá cumprir o prazo mínimo estabelecido para conclusão do curso.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Do pagamento pelos serviços',
    clausulas: [
      {
        titulo: 'Cláusula Quarta',
        paragrafos: [
          {
            texto:
              'Em contrapartida aos serviços educacionais, o CONTRATANTE efetuará o pagamento do período letivo ou de acordo com o plano financeiro disposto no regulamento de campanha vigente à época da matrícula, desdobrado em mensalidades, mediante pagamento e quitação do respectivo boleto bancário (ou documento de cobrança equivalente) em instituições financeiras autorizadas ao recebimento do mesmo, cujo valor será apurado de acordo com o curso, conforme preço previamente informado em regulamento vigente a assinatura deste contrato, deduzidos possíveis benefícios oriundos de Bolsas de estudo, cujo valor nominativo virá expresso na ficha financeira do CONTRATANTE, sempre disponível no portal do aluno, conforme às campanhas e valores divulgados à época da assinatura do presente contrato, mediante tabelas de valores disponibilizadas no site da instituição.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'O CONTRATANTE deverá verificar em seu portal do aluno o boleto bancário (ou documento de cobrança equivalente) até dois dias antes do seu vencimento por meio do PORTAL DO ALUNO, caso não esteja o documento disponível o CONTRATANTE deverá entrar em contato com o setor competente de atendimento aos alunos para realização dos devidos lançamentos. A não disponibilização do boleto de cobrança não desobrigará o CONTRATANTE do pagamento da mensalidade em dia, uma vez que a segunda via do mesmo estará à disposição do CONTRATANTE em tempo hábil, bem como não o autorizará a pagá-la com atraso, nem exime o CONTRATANTE do pagamento de multa, juros e atualização monetária previstos nas cláusulas seguintes, visto ter a sua disposição os meios necessários para retirada da 2ª via.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'O aluno regularmente matriculado no curso objeto deste Contrato, bem como seu eventual responsável legal/financeiro, assumem solidariamente o irrevogável compromisso de pagar a integralidade do valor da semestralidade letiva, em razão da CONTRATADA disponibilizar ao aluno a respectiva vaga, independentemente do momento da sua matrícula.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'O CONTRATANTE e seu eventual responsável legal/financeiro assumem, solidariamente, a responsabilidade pelo pagamento de todo o valor da obrigação, fracionada de acordo com os meses do período letivo vigente, ainda que não venha a assistir o conteúdo das aulas a ele disponibilizadas pois os serviços estarão à sua disposição. As únicas hipóteses em que o CONTRATANTE estará dispensado de realizar o pagamento do valor são nos casos de requerimento formal através do portal do aluno de trancamento/cancelamento de matrícula solicitados pelo CONTRATANTE à CONTRATADA.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'Em caso de inadimplemento, poderá a CONTRATADA cobrar multa de 2% sobre a parcela devida, juros de mora de 1% ao mês ou fração de mês e atualização monetária, bem como poderá adotar todas as providências legais de cobrança cabíveis, inclusive, inscrever o nome do CONTRATANTE e de seu responsável legal/financeiro em cadastro ou serviços legalmente constituídos e destinados à proteção da cobrança do crédito advindo deste contrato, valendo o presente contrato como título executivo extrajudicial, nos termos do art. 585, II, do CPC, reconhecendo, o CONTRATANTE, desde já, este título, como líquido, certo e exigível, ou, ainda, qualquer tipo de cobrança prevista na legislação brasileira, independentemente de prévia notificação, podendo tais providências serem tomadas isolada, gradativa ou cumulativamente.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'O não comparecimento ou não realização das atividades acadêmicas pelo CONTRATANTE aos atos acadêmicos contratados, bem como o não acesso aos conteúdos disponibilizados pela CONTRATADA ao CONTRATANTE, não o eximirão do pagamento das parcelas, tendo em vista a disponibilidade do serviço colocado à disposição pela CONTRATADA. Da mesma forma, quando o CONTRATANTE contratar os serviços da CONTRATADA após o início do período letivo, não fará jus a nenhum tipo de desconto ou redução do valor total cobrado pelo respectivo período letivo.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'A CONTRATADA cobrará do CONTRATANTE por procedimentos administrativos extraordinários solicitados pessoal ou eletronicamente por este último (tais como segunda via de documentos, expedição de histórico escolar, segunda via de diploma, certificado de conclusão, ementário de disciplinas, declarações especiais personalizadas, entre outros), sendo certo que os valores de tais procedimentos administrativos são disponibilizados ao CONTRATANTE, por divulgação na internet, conforme Portaria MEC 2.864 de 26.08.2005.',
          },
          {
            rotulo: '§ 7º',
            texto:
              'Em caso de abatimento e/ou dispensa de disciplinas devidamente homologada por força de análise curricular pela CONTRATADA mediante prévio requerimento do CONTRATANTE pelo portal do aluno, serão estornadas as mensalidades ao final do curso de forma decrescente, limitadas a 10 (dez) mensalidades independentes se o CONTRATANTE eliminou mais de 10 (dez) disciplinas, considerando a proporção de uma mensalidade por cada disciplina dispensada/eliminada da grade curricular do CONTRATANTE.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Da matrícula',
    clausulas: [
      {
        titulo: 'Cláusula Quinta',
        paragrafos: [
          {
            texto:
              'O presente Contrato tem início no ato da assinatura pelas Partes, subsistindo até a conclusão dos serviços educacionais e o recebimento de sua contraprestação. A matrícula somente será efetivada mediante o pagamento da primeira parcela pelo CONTRATANTE, sendo indispensável para sua efetivação o cumprimento integral de todas as cláusulas contratuais, especialmente a inexistência de débito referente às mensalidades dos períodos anteriores e às taxas administrativas e de biblioteca, conforme disposto no art. 5º da Lei 9.870, de 23 de novembro de 1999.',
          },
          {
            rotulo: '§ 1º',
            texto: 'A renovação da matrícula se fará pelo valor da mensalidade fixada para o novo período, na forma da lei.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Em se tratando de primeira matrícula, o início de vigência deste Contrato ficará condicionado, ainda, à apresentação da documentação exigida pela CONTRATADA para a realização da mesma, bem como o pagamento da primeira parcela.',
          },
          {
            rotulo: '§ 3º',
            texto: 'Será cobrado do CONTRATANTE, a título de matrícula, o valor equivalente a uma mensalidade promocional, apurado da seguinte forma:',
            itens: [
              'I. Ingresso por meio de vestibular: para o CONTRATANTE que cursará o primeiro período, o valor da matrícula corresponderá ao valor estipulado pela CONTRATADA para o 1º período do curso escolhido pelo CONTRATANTE;',
              'II. Renovação de Matrícula: o valor da matrícula será cobrado com base no valor estipulado pela CONTRATADA para o novo período; ou',
              'III. Ingresso por Matrícula Sem Vestibular (MSV) ou Transferência Externa (TE): a cobrança da primeira mensalidade será efetuada considerando-se o valor cobrado pela CONTRATADA para o período letivo correspondente.',
            ],
          },
          {
            rotulo: '§ 4º',
            texto:
              'Para renovar a matrícula acadêmica o CONTRATANTE deverá estar sem débitos anteriores, na forma do art. 5º da Lei nº 9.870/1999. Os débitos existentes terão que ser pagos no ato da matrícula acadêmica, devidamente corrigidos e com os acréscimos contratuais e legais.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'Na hipótese de parcelamento de débito de períodos anteriores (vedada à renovação da matrícula do CONTRATANTE nesta hipótese), o CONTRATANTE matriculado em curso cujas mensalidades sejam determinadas pela quantidade de disciplinas ou créditos contratados, tão somente poderá matricular-se na quantidade máxima de disciplinas ou créditos fixados pela CONTRATADA.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'A CONTRATADA poderá, a seu critério, realizar a renovação automática da matrícula enquanto o CONTRATANTE estiver usufruindo dos serviços educacionais e não houver solicitação formal de cancelamento ou trancamento, nos termos deste contrato. No entanto, a matrícula poderá ser cancelada por parte da CONTRATADA no próximo período letivo caso seja identificado algum impedimento de natureza administrativa, pedagógica ou financeira do aluno.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Dos valores de mensalidades',
    clausulas: [
      {
        titulo: 'Cláusula Sexta',
        paragrafos: [
          {
            texto:
              'O valor das mensalidades será fixado conforme o regulamento de campanha vigente na data da matrícula, sendo a quantidade de parcelas determinada por esse regulamento, independentemente da duração prevista do curso. A CONTRATADA poderá, a seu exclusivo critério e de acordo com sua autonomia universitária conferida pelo art. 207 da Constituição Federal, definir um prazo reduzido para a integralização do curso, sem que isso altere a quantidade de mensalidades estabelecidas no regulamento, podendo haver parcelas a serem pagas mesmo após a conclusão do curso. O valor total do curso será definido exclusivamente pela CONTRATADA e distribuído em mensalidades conforme os critérios financeiros estipulados no regulamento da instituição.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Para os cursos com cobrança de mensalidade fixa de acordo com o regulamento das campanhas, o CONTRATANTE deverá pagar, além dos valores das mensalidades, quantia correspondente às disciplinas excedentes ao número máximo de disciplinas estabelecido para o período do curso, caso a grade curricular do referido curso permita a contratação de disciplinas excedentes.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Os acertos financeiros decorrentes de qualquer alteração acadêmica de matrícula, solicitados dentro do prazo previsto no calendário acadêmico oficial, serão debitados ou creditados cumulativamente no aviso de cobrança subsequente, retroativos à primeira mensalidade e seguintes, tendo por base os valores originais.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'Para os valores promocionais que tratam as campanhas comerciais, o CONTRATANTE deverá observar as condições elencadas em regulamento vigente, onde constarão os valores, descontos e os cursos ofertados, sendo o regulamento parte integrante do presente contrato de prestação de serviços educacionais.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'As parcelas dos cursos dispõem de “desconto de campanha” e “desconto de pontualidade”, que serão embutidos nos descontos que tratam as campanhas por módulos considerando o valor bruto. Em casos de pagamentos após o vencimento da parcela (impontuais), o CONTRATANTE perderá o desconto de pontualidade.',
          },
        ],
      },
      {
        titulo: 'Cláusula Sétima',
        paragrafos: [
          {
            texto:
              'A solicitação de exclusão ou dispensa de disciplinas/créditos, dentro ou fora do prazo do calendário acadêmico oficial, não dará ensejo à devolução dos valores pagos, notadamente para os cursos com mensalidades em valor fixo, bem como, para caso de o CONTRATANTE ser beneficiado pelos Programas de Bolsas Institucionais, de acordo com o regulamento da instituição.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Nos casos de inclusão de disciplinas/créditos após a análise curricular, o acerto financeiro será efetuado retroativo de forma decrescente considerando a duração para integralização do curso.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Em casos de isenção de crédito(s)/disciplina(s) matriculada(s), somente haverá devolução dos valores já pagos relativos ao(s) crédito(s)/disciplina(s) isenta(s) caso não houverem meses suficientes para o correspondente abatimento.',
          },
        ],
      },
      {
        titulo: 'Cláusula Oitava',
        paragrafos: [
          {
            texto:
              'O valor fixado para os serviços educacionais poderá sofrer reajustes e obedecerá a variação de custos educacionais incorridos, conforme previsão constante da Lei nº 9.870/1999 e do Decreto nº 3.274/1999. Os valores das mensalidades serão divulgados na forma e prazo fixados na legislação específica para o correspondente período letivo.',
          },
        ],
      },
      {
        titulo: 'Cláusula Nona',
        paragrafos: [
          {
            texto:
              'Por força de eventual alteração do projeto acadêmico-pedagógico, considerando a autonomia universitária da CONTRATADA por força do art. 207 da CF, o CONTRATANTE declara expressamente neste ato que tem conhecimento e concorda que, na hipótese de repetência de determinada disciplina, poderá ter a forma de cobrança alterada para crédito, caso a forma de cobrança da mesma para o período letivo em questão tenha sido alterada neste sentido.',
          },
          {
            rotulo: 'Parágrafo único',
            texto:
              'Para todos os casos de dependência de disciplinas (reprovadas), o CONTRATANTE deverá requerer através de requerimento específico no portal do aluno a realização das referidas disciplinas novamente, mediante deferimento prévio da CONTRATADA verificando a disponibilidade para oferta, bem como recolher previamente o valor correspondente da disciplina requerida.',
          },
        ],
      },
      {
        titulo: 'Cláusula Décima',
        paragrafos: [
          {
            texto:
              'O presente contrato, no que diz respeito às mensalidades aqui contratadas, no que não contrariar eventuais regulamentos aplicáveis à época da contratação, poderá sofrer alterações em observância às variações de custos, bem como indicadores econômicos para manutenção da prestação dos serviços, respeitando os ciclos de reajustes conforme disposto na Cláusula Oitava.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Da rescisão',
    clausulas: [
      {
        titulo: 'Cláusula Décima Primeira',
        paragrafos: [
          {
            texto:
              'A CONTRATADA poderá rescindir o presente Contrato quando no início das aulas da turma do primeiro período não houver a quantidade mínima de alunos estabelecida neste instrumento, facultado à CONTRATADA o remanejamento da CONTRATANTE para outro curso ou devolução dos valores pagos. Nesta hipótese, obriga-se a CONTRATADA a restituir à CONTRATANTE, mediante prévio requerimento deste, a parcela possivelmente antecipada pelo CONTRATANTE. A restituição prevista nesta cláusula se efetivará no prazo de 20 dias após a data determinada para o início das aulas.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Ainda, será facultado à CONTRATADA rescindir o presente Contrato pela prática de atos de indisciplina por parte do CONTRATANTE ou outros atos previstos do Regimento Interno da CONTRATADA, sendo devidas as mensalidades até a data do efetivo desligamento do CONTRATANTE.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Poderá a CONTRATADA dar por rescindido o presente Contrato na hipótese de inadimplência do CONTRATANTE, com fundamento no art. 5º da Lei 9.870, de 23 de novembro de 1999.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'A CONTRATADA poderá rescindir, imediatamente, o presente contrato, independente de aviso ou notificação, em caso de descumprimento de qualquer das cláusulas constantes do presente contrato ou por descumprimento do Regimento Institucional da UniFatecie, pelo CONTRATANTE.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'Sem prejuízo do direito de cobrar eventuais mensalidades vencidas, a rescisão contratual também se opera pelo deferimento do requerimento de cancelamento da matrícula solicitado pelo CONTRATANTE.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Do trancamento ou cancelamento de matrícula',
    clausulas: [
      {
        titulo: 'Cláusula Décima Segunda',
        paragrafos: [
          {
            texto:
              'O trancamento ou o cancelamento de matrícula, são procedimentos distintos com finalidades específicas, e são os únicos atos eficazes para suspender a cobrança das mensalidades escolares vincendas a partir do mês subsequente ao seu deferimento, remanescendo a obrigação do CONTRATANTE quanto ao pagamento das mensalidades vencidas e ainda não pagas.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Para efetivar o trancamento ou cancelamento de matrícula, o CONTRATANTE deverá estar em dia com as mensalidades devidas até a data da respectiva solicitação ou, alternativamente, firmar um Instrumento de Confissão de Dívida, reconhecendo o seu débito para com a CONTRATADA e acordando a forma de pagamento deste débito.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Ao aluno ingressante não é permitido efetuar trancamento de matrícula sem que ao menos tenha cursado e completado um módulo letivo, sendo-lhe, entretanto, facultado o cancelamento da mesma.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'Ao aluno que já tenha cursado e completado ao menos um módulo letivo, caso solicite o trancamento no decorrer do próximo módulo sem o ter completado, o mesmo não será aproveitado para fins acadêmicos, tampouco haverá devolução de valores pois o que utilizou considera-se serviço prestado, conforme objeto pactuado no presente contrato. Apenas os módulos cursados e concluídos serão aproveitados em eventual retorno do acadêmico considerando o trancamento de matrícula.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'Os pedidos de cancelamento e trancamento devem ser realizados por meio do portal do aluno, utilizando o requerimento específico para cada procedimento. As solicitações serão analisadas pelo setor responsável e somente efetivadas após deferimento, mediante a verificação de eventuais pendências acadêmicas e financeiras.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'No ato de trancamento de matrícula de quaisquer cursos, o aluno deverá programar e informar à CONTRATADA o período durante o qual deseja manter trancada sua matrícula, devendo comparecer semestralmente à unidade da CONTRATADA para renovar o trancamento sob pena de perda imediata da vaga, limitado esse período de trancamento a dois anos e seis meses, consecutivos ou não.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'Em ambos os casos, após a solicitação do requerimento de cancelamento ou trancamento, será aplicada uma multa no valor de R$ 49,90 (quarenta e nove reais e noventa centavos), a ser paga até a data de seu vencimento. Essa cobrança se justifica pela inativação do contrato de prestação de serviços educacionais, pela reserva de vaga do CONTRATANTE e pela disponibilização dos serviços durante o período letivo em que o aluno esteve matriculado.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Da devolução de valores pagos',
    clausulas: [
      {
        titulo: 'Cláusula Décima Terceira',
        paragrafos: [
          {
            texto:
              'Não será devolvida nenhuma das parcelas da anuidade/semestralidade que já houverem sido pagas pelo(a)(s) CONTRATANTE(S), por desistência ou abandono do curso, ou qualquer outro motivo, ressalvada, exclusivamente nos casos de não formação de turma por ausência da quantidade mínima de alunos estipulados neste contrato.',
          },
          {
            rotulo: 'Parágrafo único',
            texto:
              'A diferença entre o valor pago pelo(a) CONTRATANTE e o valor devolvido pela CONTRATADA, nos termos e condições constantes desta cláusula, será destinada ao ressarcimento das despesas de ordem administrativa decorrentes da matrícula e de seu cancelamento, bem como à remuneração dos serviços colocados à disposição do aluno até a data do cancelamento da matrícula.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Da reabertura de matrícula, transferências e isenção',
    clausulas: [
      {
        titulo: 'Cláusula Décima Quarta',
        paragrafos: [
          {
            texto:
              'A reabertura de matrícula fica condicionada ao oferecimento do curso na época da solicitação, assim como a existência de vagas, não sendo garantido ao CONTRATANTE a manutenção da mesma grade curricular que se praticava no momento do trancamento da matrícula.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'Nas transferências internas entre cursos da CONTRATADA, os valores já pagos no curso de origem serão transferidos para o novo curso dentro do mesmo período letivo corrente, desde que a solicitação de transferência seja apresentada até 30 (trinta) dias antes do início das aulas. O CONTRATANTE ficará sujeito às regras e condições do novo curso e/ou novo turno pretendido, especialmente, no que diz respeito aos preços das mensalidades fixadas para cada caso.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'O CONTRATANTE fica ciente, desde já, que é assegurada à CONTRATADA a possibilidade de encerrar as atividades educacionais do campus de origem do seu curso e/ou turno ou de transferir tais atividades para um outro campus localizado num raio de até 100 km do campus original, sendo certo que é facultado ao CONTRATANTE o aproveitamento das disciplinas cursadas em outros cursos.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'A transferência do CONTRATANTE para outra instituição de ensino superior será realizada em prazo suficiente para a efetivação da transferência, e será requerida por meio de requerimento escrito e/ou online do CONTRATANTE ou do seu representante legal, sendo requisito necessário o CONTRATANTE estar devidamente matriculado na CONTRATADA no momento da solicitação. Na solicitação de transferência deverá ser anexada a declaração de vaga na outra instituição (chamada de Guia de Transferência), conforme legislação federal vigente, ficando convencionado que tal procedimento de transferência importará na rescisão automática do presente Contrato.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'A solicitação de transferência não eximirá o CONTRATANTE e/ou seu representante legal/financeiro da responsabilidade pelo pagamento das mensalidades vencidas e acréscimos moratórios até o dia em que solicitar sua transferência para outra instituição de ensino superior.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Disposições gerais',
    clausulas: [
      {
        titulo: 'Cláusula Décima Quinta',
        paragrafos: [
          {
            texto:
              'A CONTRATADA se resguarda no direito de uso da imagem do CONTRATANTE, bem como dos trabalhos acadêmicos por ele realizados, podendo veiculá-los em meios de comunicação, folders ou outro material de comunicação audiovisual elaborado para fins de divulgação de atividades acadêmicas, sem que caiba ao CONTRATANTE qualquer indenização ou remuneração.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'A CONTRATADA se resguarda no direito de emitir o certificado de colação de grau e/ou diploma do CONTRATANTE somente após a conferência do cumprimento de todas as disciplinas e atividades acadêmicas obrigatórias, bem como a entrega de toda documentação necessária para tanto e previamente solicitada pela CONTRATADA. O não cumprimento de todas as obrigações acadêmicas e/ou a não entrega da documentação solicitada, implicará na impossibilidade de expedição dos documentos citados.',
          },
          {
            rotulo: '§ 2º',
            texto:
              'Qualquer requerimento formulado pelo CONTRATANTE à CONTRATADA somente será válido se realizado em formulário próprio e protocolado através do portal do aluno, devidamente direcionado ao setor competente considerando a natureza da demanda, bem como deverá ser firmado exclusivamente pelo próprio CONTRATANTE ou por seu representante legal através de ambiente virtual logado.',
          },
          {
            rotulo: '§ 3º',
            texto:
              'Toda a comunicação entre as partes para tratativas de requerimentos, serão realizadas por meio do portal do aluno, onde a CONTRATADA realizará o deferimento ou indeferimento com justificativas no bojo do próprio requerimento, devendo o CONTRATANTE verificar em seu acesso ao portal do aluno, não sendo admissível a hipótese de ausência de eventuais providências de sua parte.',
          },
          {
            rotulo: '§ 4º',
            texto:
              'A CONTRATADA não se responsabiliza por objetos/valores, de posse do CONTRATANTE ou de propriedade deste, deixados em sala de aula ou em qualquer outra dependência da CONTRATADA. Da mesma forma, a CONTRATADA em nenhuma hipótese responderá por furtos, roubos ou quaisquer tipos de danos em veículos ou outras espécies de bens de posse ou propriedade do CONTRATANTE, e que possam ocorrer nas instalações ou nas adjacências das instalações da CONTRATADA.',
          },
          {
            rotulo: '§ 5º',
            texto:
              'O CONTRATANTE declara, neste ato, ter ciência e concordar com o fato de que todos os materiais acadêmicos indicados e/ou solicitados pelos docentes para estudos curriculares, incluindo cópias reprográficas e materiais para aulas práticas, são de inteira responsabilidade do CONTRATANTE e por este devem ser adquiridos e custeados.',
          },
          {
            rotulo: '§ 6º',
            texto:
              'Quando o serviço educacional contratado contemplar cursos cujo material didático acadêmico venha a ser fornecido pela CONTRATADA, em contrapartida ao pagamento pelo CONTRATANTE das mensalidades, será o mesmo entregue diretamente no endereço eletrônico indicado pelo CONTRATANTE, conforme regulamento que será entregue ao CONTRATANTE no ato da matrícula, razão pela qual responsabiliza-se o CONTRATANTE pelas informações pessoais fornecidas à CONTRATADA, bem como se compromete a atualizá-las em caso de alteração, assumindo total responsabilidade por qualquer comunicação oficial em endereço desatualizado, notadamente quanto a não entrega do material didático no endereço desatualizado.',
          },
        ],
      },
      {
        titulo: 'Cláusula Décima Sexta',
        paragrafos: [
          {
            texto:
              'A CONTRATADA não assume qualquer responsabilidade perante o CONTRATANTE e/ou seu responsável legal/financeiro por quaisquer danos ocasionados por terceiros, aí incluídos “trotes” que o mesmo eventualmente venha a sofrer fora ou nas adjacências do estabelecimento da CONTRATADA, e, ainda, em razão das seguintes situações: inobservância de normas de segurança, das recomendações, instruções e alertas de professores, instrutores e funcionários técnicos administrativos, ou pela não utilização, ou utilização inadequada de equipamentos de proteção individual, ou assemelhados, quando no exercício de atividades acadêmicas que demandarem tal tipo de providência.',
          },
          {
            rotulo: 'Parágrafo único',
            texto:
              'Em caso de dano material ao patrimônio da CONTRATADA ou de terceiros por ela contratados, o CONTRATANTE estará obrigado ao ressarcimento dos danos causados, independentemente de dolo ou culpa, e sem prejuízo da sanção disciplinar aplicável.',
          },
        ],
      },
      {
        titulo: 'Cláusula Décima Sétima',
        paragrafos: [
          {
            texto:
              'A concessão e a manutenção de bolsas de estudo oriundas de convênios ficam condicionadas aos termos e condições estabelecidos neste Contrato, ou em aditamento contratual próprio para disposição dessas condições.',
          },
          {
            rotulo: 'Parágrafo único',
            texto:
              'Em qualquer das modalidades de bolsa, o inadimplemento do CONTRATANTE bolsista por período igual ou superior a 60 (sessenta) dias dará à CONTRATADA o direito de cancelar a respectiva bolsa.',
          },
        ],
      },
      {
        titulo: 'Cláusula Décima Oitava',
        paragrafos: [
          {
            texto:
              'O responsável financeiro pelo CONTRATANTE não poderá ser substituído na vigência deste Contrato, bem como de suas renovações, exceto na ocorrência de eventos como falecimento, ou divórcio ou separação de fato, quando a substituição poderá ocorrer mediante requerimento formal da CONTRATANTE e condicionado à substituição por outro responsável financeiro a depender da aceitação expressa da CONTRATADA.',
          },
        ],
      },
      {
        titulo: 'Cláusula Décima Nona',
        paragrafos: [
          {
            texto:
              'O CONTRATANTE assume total responsabilidade quanto às declarações prestadas neste Contrato e no ato de matrícula, relativas à sua aptidão legal para assistir ou frequentar as aulas de acordo com os requisitos dos cursos, concordando, desde já, que a não entrega dos documentos legais comprobatórios das declarações prestadas poderá acarretar o cancelamento da sua matrícula, rescindindo-se o presente Contrato e encerrando-se a prestação de serviços. Nesta hipótese a CONTRATADA estará isenta de qualquer responsabilidade pelos eventuais danos resultantes do cancelamento.',
          },
          {
            rotulo: '§ 1º',
            texto:
              'O CONTRATANTE declara, desde já, ter pleno conhecimento do regimento interno da CONTRATADA, que foi lido previamente à formalização do presente, razão pela qual concorda que poderá ter seu contrato de prestação de serviços rescindido ou não renovado dentre outras hipóteses:',
            itens: [
              'I. por ato de indisciplina;',
              'II. se for reprovado nas condições previstas no referido regimento;',
              'III. na hipótese de trancamento de matrícula pelo prazo acima descrito.',
            ],
          },
          {
            rotulo: '§ 13',
            texto:
              'O presente Contrato prevalece sobre quaisquer contratos, aditivos ou qualquer espécie de entendimentos anteriores entre as Partes, a respeito do curso especificado no preâmbulo deste Contrato.',
          },
        ],
      },
      {
        titulo: 'Cláusula Vigésima',
        paragrafos: [
          {
            texto:
              'O CONTRATANTE e o representante legal/responsável financeiro declaram ter lido todas as cláusulas deste Contrato e concordarem expressamente com elas.',
          },
        ],
      },
      {
        titulo: 'Cláusula Vigésima Primeira',
        paragrafos: [
          {
            texto:
              'Dentro de padrões aceitáveis e seguindo as melhores práticas de mercado, a CONTRATADA poderá incluir publicidade no seu site ou enviar e-mails com publicidade, sem que isso, contudo prejudique o aprendizado dos alunos ou degrade a qualidade de seus cursos.',
          },
        ],
      },
      {
        titulo: 'Cláusula Vigésima Segunda',
        paragrafos: [
          {
            texto:
              'A CONTRATADA não se responsabiliza por quaisquer problemas técnicos de acesso à Internet ou por problemas de desempenho do provedor da CONTRATANTE, bem como de configurações da rede interna que, eventualmente, precisem de configuração especial para o acesso ao ambiente de treinamento da CONTRATADA. Também, a CONTRATADA não se responsabiliza pela interrupção dos serviços em casos de falta de fornecimento de energia elétrica para o sistema de seu provedor de acesso, falhas nos sistemas de transmissão de acesso à Internet ou de qualquer ação de terceiros que impeçam a prestação de serviço resultante de caso fortuito ou de força maior relacionados no Código Civil Brasileiro.',
          },
        ],
      },
    ],
  },

  {
    titulo: 'Do foro',
    clausulas: [
      {
        titulo: 'Cláusula Vigésima Terceira',
        paragrafos: [
          {
            texto:
              'O relacionamento e, eventual disputa entre as Partes será regido pelas leis da República Federativa do Brasil, sem consideração a qualquer disposição sobre conflito de leis. Fica eleito o foro da comarca da cidade de Paranavaí, estado do Paraná, para dirimir qualquer ação fundada no presente Contrato, renunciando as Partes qualquer outro, por mais privilegiado que venha a ser.',
          },
        ],
      },
    ],
  },
]
