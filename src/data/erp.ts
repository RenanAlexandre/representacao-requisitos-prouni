/**
 * Dados de demonstração do ERP UniFatecie — módulo Processos Seletivos.
 *
 * `PROCESSOS_SELETIVOS`/`Concurso`/`Turma` saíram daqui: processos seletivos,
 * concursos e turmas agora vêm do Supabase de verdade — ver
 * `src/lib/erp.ts` (`listarProcessosSeletivos`, `useConcursos`, `useTurmas`
 * etc.), usado em `pages/erp/ProcessosSeletivos.tsx`.
 *
 * O que resta aqui (`CANDIDATOS`) continua fixo — é a listagem geral de
 * Candidatos do ERP (`pages/erp/Candidatos.tsx`), fora do escopo dessa troca:
 * são 500 linhas de demonstração (10 reais dos prints + 490 derivadas só
 * para a paginação ter volume), não ligadas a nenhum processo seletivo real
 * do banco.
 */

/* ================================================================== */
/* Candidatos                                                          */
/* ================================================================== */

/* 'Negado' é decisão da Secretaria (não matricular); 'Desistente' é o
   candidato que sai por conta própria. Rótulos diferentes de propósito. */
export type StatusCandidato =
  | 'Matriculado' | 'Desistente' | 'Inscrito' | 'Em análise' | 'Negado'

export interface Endereco {
  endereco: string
  numero: string
  complemento: string
  cep: string
  cidade: string
  bairro: string
  pais: string
  uf: string
  regiao: string
}

export interface Filial {
  nome: string
  tipo: string
  cidadeUf: string
}

export interface Candidato {
  id: string
  nome: string
  cpf: string
  inscricao: string
  email: string
  curso: string
  filialCaptacao: string
  status: StatusCandidato
  concurso: string
  /** Processo seletivo ao qual o candidato pertence (vazio = fora dos listados). */
  processoSeletivoId?: string

  /* --- detalhe --- */
  processoSeletivo: string
  valorOferta: string
  nascimento: string
  genero: string
  raca: string
  enderecoPessoal: Endereco
  enderecoCobranca: Endereco
  telefone: string
  emailAcademico: string
  areaConhecimento: string
  tipoFormacao: string
  modalidade: string
  filialCaptacaoDetalhe: Filial
  filialPraticas: Filial
  planoPagamento: { nome: string; parcelas: string; taxa: string }
  criadoEm: string
  alteradoEm: string
}

const ENDERECO_MARINGA: Endereco = {
  endereco: 'Rua Ivai',
  numero: '111',
  complemento: '--',
  cep: '87005-270',
  cidade: 'Maringá',
  bairro: 'Vila Marumby',
  pais: 'Brasil',
  uf: 'Paraná',
  regiao: 'Sul',
}

/** Campos de detalhe padrão — o print 3/4 mostra este mesmo bloco. */
const DETALHE_PADRAO = {
  processoSeletivo: 'PS POS 2026.1',
  valorOferta: 'R$ 522,50',
  nascimento: '20/01/2026',
  genero: 'Não informado',
  raca: 'Nao declarado',
  enderecoPessoal: ENDERECO_MARINGA,
  enderecoCobranca: ENDERECO_MARINGA,
  telefone: '(11) 1111-111',
  areaConhecimento: 'SAÚDE E BEM-ESTAR',
  tipoFormacao: 'Especialização',
  modalidade: 'EAD',
  filialPraticas: { nome: 'ALTAMIRA - PA', tipo: 'Megapolo', cidadeUf: 'Altamira, PA' } as Filial,
  planoPagamento: { nome: 'Pós - Geral 3', parcelas: '1', taxa: 'Sim' },
  criadoEm: '20/01/2026',
  alteradoEm: '19/08/2026',
}

interface LinhaCandidato {
  id: string
  nome: string
  cpf: string
  inscricao: string
  email: string
  curso: string
  filialCaptacao: string
  cidadeFilial: string
  tipoFilial: string
  status: StatusCandidato
  concurso: string
}

/** As dez linhas do print da listagem de Candidatos. */
const LINHAS: LinhaCandidato[] = [
  { id: '25823', nome: '1234 123', cpf: '527.611.460-93', inscricao: '20/01/2026, 14:19', email: 'dev_11111@exemplo.com', curso: 'ESP. EM SAÚDE OCUPACIONAL: GINÁSTICA LABORAL, ERGONOMIA E PERFORMANCE NO AMBIENTE DE TRABALHO', filialCaptacao: 'ACRELÂNDIA - AC', cidadeFilial: 'Acrelândia, AC', tipoFilial: 'Polo', status: 'Desistente', concurso: 'Vestibular POS/2026.1 - Geral' },
  { id: '25824', nome: 'Aaaaa Pos', cpf: '100.200.300-88', inscricao: '16/06/2026, 10:02', email: 'dev_teste+aws@exemplo.com', curso: 'ESPECIALIZAÇÃO EM EDUCAÇÃO FÍSICA ESCOLAR', filialCaptacao: 'BARREIRINHA - AM', cidadeFilial: 'Barreirinha, AM', tipoFilial: 'Polo', status: 'Desistente', concurso: 'PS POS 2026.6' },
  { id: '25825', nome: 'Aarão Henrique Vasconcelos Fernandes De Faria Correia Neto', cpf: '111.222.333-96', inscricao: '15/05/2026, 19:03', email: 'dev_aaraohenrique@exemplo.com', curso: 'ESPECIALIZAÇÃO EM DIREITO PENAL', filialCaptacao: 'JOÃO PESSOA - PB', cidadeFilial: 'João Pessoa, PB', tipoFilial: 'Megapolo', status: 'Matriculado', concurso: 'Vestibular POS/2026.1 - Geral' },
  { id: '25826', nome: 'Abdias Lemos Da Costa', cpf: '222.333.444-05', inscricao: '11/04/2026, 12:31', email: 'dev_abdiaslemos@exemplo.com', curso: 'ESPECIALIZAÇÃO EM GESTÃO PÚBLICA', filialCaptacao: 'SÃO BENTO DO SUL - SC', cidadeFilial: 'São Bento do Sul, SC', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'Vestibular TÉCNICO/2026.1' },
  { id: '25827', nome: 'Abel Augusto De Moraes', cpf: '333.444.555-08', inscricao: '06/11/2025, 03:10', email: 'dev_abelaugusto@exemplo.com', curso: 'ESPECIALIZAÇÃO EM DIREITO, PSICOLOGIA E SAÚDE MENTAL', filialCaptacao: 'FAZENDA RIO GRANDE - PR', cidadeFilial: 'Fazenda Rio Grande, PR', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'Vestibular POS/2025.2 - Geral' },
  { id: '25828', nome: 'Abner Isaías De Oliveira Prado', cpf: '444.555.666-19', inscricao: '29/01/2026, 12:23', email: 'dev_abnerisaias@exemplo.com', curso: 'ESPECIALIZAÇÃO EM SEGURANÇA PÚBLICA E CIDADANIA', filialCaptacao: 'QUEIMADOS - RJ', cidadeFilial: 'Queimados, RJ', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'Vestibular POS/2026.1 - Geral' },
  { id: '25829', nome: 'Ada Ferraz Santiago', cpf: '555.666.777-20', inscricao: '03/09/2025, 13:25', email: 'dev_adaferraz@exemplo.com', curso: 'MBA EM LIDERANÇA PARA O FUTURO: GESTÃO DE PESSOAS E EQUIPES', filialCaptacao: 'GRAVATAÍ - RS', cidadeFilial: 'Gravataí, RS', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'Vestibular POS/2025.2 - Geral' },
  { id: '25830', nome: 'Adélia Soares Ferraz', cpf: '666.777.888-30', inscricao: '24/11/2025, 19:09', email: 'dev_adeliasoares@exemplo.com', curso: 'ESPECIALIZAÇÃO EM ATENDIMENTO EDUCACIONAL ESPECIALIZADO', filialCaptacao: 'TEFÉ - AM', cidadeFilial: 'Tefé, AM', tipoFilial: 'Polo', status: 'Desistente', concurso: 'Vestibular POS/2025.2 - Geral' },
  { id: '25831', nome: 'Adriano Barreto Aguiar', cpf: '777.888.999-41', inscricao: '02/06/2026, 17:48', email: 'dev_adrianobarreto@exemplo.com', curso: 'ESPECIALIZAÇÃO EM EDUCAÇÃO DO FUTURO', filialCaptacao: 'ALTTERNATIVO - AL', cidadeFilial: 'Alternativo, AL', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'PS POS 2026.6' },
  { id: '25832', nome: 'Adriano Barreto Aguiar', cpf: '777.888.999-41', inscricao: '23/06/2026, 10:21', email: 'dev_adrianobarreto@exemplo.com', curso: 'ESPECIALIZAÇÃO EM DIREITO PENAL', filialCaptacao: 'ABAETETUBA (CAFEZAL) - PA', cidadeFilial: 'Abaetetuba, PA', tipoFilial: 'Polo', status: 'Matriculado', concurso: 'ssasas as' },
]

function montar(l: LinhaCandidato): Candidato {
  return {
    ...DETALHE_PADRAO,
    id: l.id,
    nome: l.nome,
    cpf: l.cpf,
    inscricao: l.inscricao,
    email: l.email,
    curso: l.curso,
    filialCaptacao: l.filialCaptacao,
    status: l.status,
    concurso: l.concurso,
    emailAcademico: l.email,
    filialCaptacaoDetalhe: { nome: l.filialCaptacao, tipo: l.tipoFilial, cidadeUf: l.cidadeFilial },
  }
}

/* --- geração dos demais registros (para a paginação ter volume) ---- */
const NOMES = ['Abner', 'Abraão', 'Adriana', 'Alessandra', 'Aline', 'Amanda', 'Ana Clara', 'André', 'Beatriz', 'Bruna', 'Caio', 'Camila', 'Carlos', 'Cristiane', 'Daniel', 'Débora', 'Eduardo', 'Elaine', 'Fabiana', 'Felipe', 'Gabriel', 'Helena', 'Igor', 'Jéssica', 'Kelly', 'Leandro', 'Marcela', 'Nicolas', 'Patrícia', 'Rodrigo', 'Simone', 'Tatiane', 'Vanessa', 'Wesley']
const SOBRENOMES = ['Da Silva', 'Dos Santos', 'De Oliveira', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Ribeiro', 'Martins', 'Barbosa', 'Cardoso']
const CURSOS = [
  'ESPECIALIZAÇÃO EM DIREITO PENAL',
  'ESPECIALIZAÇÃO EM GESTÃO PÚBLICA',
  'ESPECIALIZAÇÃO EM EDUCAÇÃO FÍSICA ESCOLAR',
  'MBA EM GESTÃO DE PROJETOS E PROCESSOS',
  'ESPECIALIZAÇÃO EM PSICOPEDAGOGIA CLÍNICA E INSTITUCIONAL',
  'ESPECIALIZAÇÃO EM ENFERMAGEM DO TRABALHO',
  'MBA EM LIDERANÇA PARA O FUTURO: GESTÃO DE PESSOAS E EQUIPES',
]
const FILIAIS: Array<[string, string, string]> = [
  ['MARINGÁ - PR', 'Maringá, PR', 'Sede'],
  ['PARANAVAÍ - PR', 'Paranavaí, PR', 'Megapolo'],
  ['CIANORTE - PR', 'Cianorte, PR', 'Polo'],
  ['JOÃO PESSOA - PB', 'João Pessoa, PB', 'Megapolo'],
  ['GRAVATAÍ - RS', 'Gravataí, RS', 'Polo'],
  ['TEFÉ - AM', 'Tefé, AM', 'Polo'],
]
const CONCURSOS_NOMES = ['Vestibular POS/2026.1 - Geral', 'PS POS 2026.6', 'Vestibular POS/2025.2 - Geral', 'Vestibular TÉCNICO/2026.1']
const STATUS: StatusCandidato[] = ['Matriculado', 'Matriculado', 'Desistente', 'Inscrito', 'Matriculado', 'Em análise']

function cpfFalso(i: number) {
  const n = String(100000000 + i * 7919).padStart(9, '0').slice(0, 9)
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${String((i * 13) % 90 + 10)}`
}

function semAcento(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')
}

function derivados(quantidade: number): Candidato[] {
  const out: Candidato[] = []
  for (let i = 0; i < quantidade; i++) {
    const nome = `${NOMES[i % NOMES.length]} ${SOBRENOMES[(i * 5) % SOBRENOMES.length]}`
    const [filial, cidadeUf, tipo] = FILIAIS[i % FILIAIS.length]
    out.push(
      montar({
        id: String(25833 + i),
        nome,
        cpf: cpfFalso(i),
        inscricao: `${String((i % 28) + 1).padStart(2, '0')}/${String((i % 12) + 1).padStart(2, '0')}/2026, ${String(8 + (i % 11)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
        email: `dev_${semAcento(nome)}${i}@exemplo.com`,
        curso: CURSOS[i % CURSOS.length],
        filialCaptacao: filial,
        cidadeFilial: cidadeUf,
        tipoFilial: tipo,
        status: STATUS[i % STATUS.length],
        concurso: CONCURSOS_NOMES[i % CONCURSOS_NOMES.length],
      }),
    )
  }
  return out
}

export const CANDIDATOS: Candidato[] = [...LINHAS.map(montar), ...derivados(490)]

export function getCandidato(id: string) {
  return CANDIDATOS.find((c) => c.id === id)
}

/**
 * Candidatos de um processo seletivo. No ambiente de referência o TESTEGRAD
 * (id 654) não tem candidatos — a tela do print aparece vazia.
 */
export function candidatosDoProcesso(psId: string): Candidato[] {
  return CANDIDATOS.filter((c) => c.processoSeletivoId === psId)
}
