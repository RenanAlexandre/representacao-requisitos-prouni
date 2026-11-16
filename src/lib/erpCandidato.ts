import { buscarCandidatoErp, dataBr, dataHoraBr, mascararCpf } from './api'
import type { Candidato, Endereco, StatusCandidato } from '../data/erp'

/* ==================================================================
 * Ponte entre o candidato do banco e o formato que a ficha do ERP já
 * desenha.
 *
 * A tela de Detalhes é réplica de `Candidatos_Detalhes.html` e espera a
 * interface `Candidato`. Em vez de reescrever o JSX, o registro do banco é
 * traduzido para essa mesma forma — assim a réplica continua fiel e o dado
 * passa a ser real.
 * ================================================================== */

const VAZIO = '--'

function texto(v: unknown): string {
  const s = v == null ? '' : String(v)
  return s.trim() === '' ? VAZIO : s
}

function endereco(r: Record<string, unknown>): Endereco {
  const cep = texto(r.cep)
  return {
    endereco: texto(r.logradouro),
    numero: texto(r.numero),
    complemento: texto(r.complemento),
    cep: cep !== VAZIO && cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep,
    cidade: texto(r.cidade),
    bairro: texto(r.bairro),
    pais: 'Brasil',
    uf: texto(r.uf),
    regiao: VAZIO,
  }
}

/**
 * Busca o candidato no banco e devolve no formato da ficha.
 * `null` quando o id não é um candidato do banco (ex.: as linhas dos prints,
 * que têm id numérico e continuam vindo de `src/data/erp.ts`).
 */
export async function candidatoDoBanco(id: string): Promise<Candidato | null> {
  const r = (await buscarCandidatoErp(id)) as Record<string, unknown> | null
  if (!r) return null

  const end = endereco(r)
  const polo = texto(r.polo)
  const cidadeUf =
    r.polo_cidade && r.polo_uf ? `${r.polo_cidade}, ${r.polo_uf}` : VAZIO

  return {
    id: String(r.id),
    nome: texto(r.nome),
    cpf: mascararCpf(String(r.cpf ?? '')),
    inscricao: dataHoraBr(r.created_at as string),
    email: texto(r.email),
    curso: texto(r.curso),
    filialCaptacao: polo,
    status: (texto(r.status) === VAZIO ? 'Inscrito' : String(r.status)) as StatusCandidato,
    concurso: texto(r.concurso),

    processoSeletivo: texto(r.processo_seletivo),
    /* Não há oferta ligada à inscrição da landing — o valor entra quando a
       Secretaria vincular curso × polo × turno no concurso. */
    valorOferta: VAZIO,
    nascimento: dataBr(r.nascimento as string),
    genero: texto(r.sexo),
    raca: texto(r.raca),
    enderecoPessoal: end,
    enderecoCobranca: end,
    telefone: r.ddd && r.telefone ? `(${r.ddd}) ${r.telefone}` : VAZIO,
    emailAcademico: texto(r.email),
    areaConhecimento: texto(r.area_conhecimento),
    tipoFormacao: texto(r.tipo_formacao),
    modalidade: texto(r.modalidade),
    filialCaptacaoDetalhe: { nome: polo, tipo: texto(r.polo_tipo), cidadeUf },
    filialPraticas: { nome: polo, tipo: texto(r.polo_tipo), cidadeUf },
    planoPagamento: { nome: texto(r.plano_pagamento), parcelas: VAZIO, taxa: VAZIO },
    criadoEm: dataBr(r.created_at as string),
    alteradoEm: dataBr(r.updated_at as string),
  }
}
