import { type ReactNode } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Check, Info, Minus, PencilLine } from 'lucide-react'
import { Titulo, Subtitulo, Cartao, Dado, Grade } from '../../components/portal/ui'
import { dataBr, dataHoraBr, mascararCpf } from '../../lib/api'
import type { ContextoPortal } from '../../layouts/PortalLayout'

const VAZIO = '—'

/** Sim/Nao com a data em que foi respondido, quando existe. */
function Resposta({ valor, em }: { valor: boolean | null; em?: string | null }): ReactNode {
  if (valor == null) return VAZIO
  return (
    <span className="inline-flex items-center gap-1.5">
      {valor ? (
        <Check className="size-4 text-lp-green-dark" />
      ) : (
        <Minus className="size-4 text-gray-400" />
      )}
      <b className={valor ? 'text-lp-green-dark' : 'text-gray-500'}>{valor ? 'Sim' : 'Não'}</b>
      {valor && em && <span className="text-xs text-gray-400">em {dataHoraBr(em)}</span>}
    </span>
  )
}

/**
 * Dados cadastrais — o espelho do que a landing page capturou, vindo do banco.
 *
 * A tela é de leitura: correções passam pela Secretaria, porque o cadastro já
 * foi para o ERP e para o GenDocs. Isso não é só regra de tela — não existe
 * policy de UPDATE para o candidato (ver `supabase/01-schema.sql`).
 */
export function PortalDados() {
  const { dados: c } = useOutletContext<ContextoPortal>()
  const inscritoEm = dataBr(c.inscrito_em)

  return (
    <>
      <Titulo
        apoio={`Inscrição ${c.protocolo}${c.processo_seletivo ? ` · ${c.processo_seletivo}` : ''} · enviada em ${inscritoEm}`}
      >
        Dados cadastrais
      </Titulo>

      <div className="flex flex-col gap-5">
        <Cartao>
          <Subtitulo>Identificação</Subtitulo>
          <Grade>
            <Dado label="Nome completo" valor={c.nome} largura="sm:col-span-2" />
            <Dado label="CPF" valor={mascararCpf(c.cpf)} />
            <Dado label="RG" valor={c.rg} />
            <Dado label="Órgão expedidor do RG" valor={c.rg_orgao_expedidor ?? VAZIO} />
            <Dado label="Data de nascimento" valor={dataBr(c.nascimento)} />
            <Dado label="Sexo" valor={c.sexo} />
            <Dado
              label="Raça / Cor"
              valor={
                <>
                  {c.raca ?? VAZIO}
                  {c.raca_ppi && (
                    <span className="ml-2 rounded-full bg-lp-primary/10 px-2 py-0.5 text-xs font-bold text-lp-primary-dark">
                      caracteriza PPI
                    </span>
                  )}
                </>
              }
            />
            <Dado label="UF de naturalidade" valor={c.uf_naturalidade} />
            <Dado label="Município de naturalidade" valor={c.municipio_naturalidade} />
          </Grade>
        </Cartao>

        <Cartao>
          <Subtitulo>Contato</Subtitulo>
          <Grade>
            <Dado label="E-mail" valor={c.email} largura="sm:col-span-2" />
            <Dado label="Telefone" valor={`(${c.ddd}) ${c.telefone}`} />
          </Grade>
        </Cartao>

        <Cartao>
          <Subtitulo>Endereço</Subtitulo>
          <Grade>
            <Dado label="CEP" valor={c.cep} />
            <Dado label="Endereço" valor={c.logradouro} largura="sm:col-span-2" />
            <Dado label="Número" valor={c.numero} />
            <Dado label="Complemento" valor={c.complemento} />
            <Dado label="Bairro" valor={c.bairro} />
            <Dado label="Cidade" valor={c.cidade} />
            <Dado label="Estado" valor={c.uf} />
          </Grade>
        </Cartao>

        <Cartao>
          <Subtitulo>Formação e curso</Subtitulo>
          <Grade>
            <Dado label="Escolaridade" valor={c.escolaridade} largura="sm:col-span-2" />
            <Dado label="Ano de conclusão do Ensino Médio" valor={c.ano_conclusao_em} />
            <Dado label="Curso pretendido" valor={c.curso ?? VAZIO} largura="sm:col-span-2" />
            <Dado label="Área de conhecimento" valor={c.area_conhecimento ?? VAZIO} />
            <Dado label="Tipo de formação" valor={c.tipo_formacao ?? VAZIO} />
            <Dado label="Modalidade" valor={c.modalidade ?? VAZIO} />
            <Dado label="Duração" valor={c.duracao ?? VAZIO} />
            <Dado label="Polo (Local de Oferta)" valor={c.polo ?? VAZIO} largura="sm:col-span-2 lg:col-span-1" />
            <Dado
              label="Plano de pagamento"
              valor={
                <>
                  {c.plano ?? VAZIO}
                  {c.plano_percentual != null && (
                    <span className="ml-2 text-xs text-gray-400">
                      {c.tipo_bolsa} · {c.plano_percentual}%
                    </span>
                  )}
                </>
              }
              largura="sm:col-span-2"
            />
            <Dado label="Modalidade de concorrência" valor={c.cota ?? VAZIO} />
            <Dado label="Chamada" valor={c.chamada ?? VAZIO} />
          </Grade>
        </Cartao>

        {/* As quatro respostas que decidem a lista de documentos. É a
            informação mais consequente da inscrição, e até agora o candidato
            não tinha onde conferir o que respondeu. */}
        <Cartao>
          <Subtitulo>Declarações do Sisprouni</Subtitulo>
          <p className="-mt-1 text-sm text-gray-500">
            São elas que definem a sua coleta de documentos. Se alguma estiver diferente do que
            você declarou no Sisprouni, procure a Secretaria antes de enviar a documentação.
          </p>
          <Grade>
            <Dado
              label="Concorre como cotista (PPI)"
              valor={<Resposta valor={c.aceite_cota} em={c.aceite_cota_em} />}
            />
            <Dado
              label="Encerramento de matrícula em outra instituição"
              valor={<Resposta valor={c.declara_encerramento_matricula} />}
            />
            <Dado
              label="Encerramento de outro benefício (FIES / bolsa)"
              valor={<Resposta valor={c.declara_encerramento_beneficio} />}
            />
            <Dado
              label="Professor da rede pública de ensino"
              valor={<Resposta valor={c.declara_professor_rede_publica} />}
            />
            <Dado
              label="Módulo de coleta aberto para você"
              valor={c.modulo_coleta ?? VAZIO}
              largura="sm:col-span-2"
            />
          </Grade>
        </Cartao>

        <Cartao>
          <Subtitulo>Aceites registrados</Subtitulo>
          <Grade>
            <Dado
              label="Contrato e termos do processo seletivo"
              valor={
                <>
                  Aceito em {inscritoEm} ·{' '}
                  <Link to="/aluno/termos" className="text-lp-primary underline">
                    ler os termos
                  </Link>
                </>
              }
              largura="sm:col-span-2"
            />
            <Dado
              label="Contato por SMS, WhatsApp e e-mail"
              valor={
                c.aceite_contato
                  ? `Autorizado em ${dataHoraBr(c.aceite_contato_em ?? c.inscrito_em)}`
                  : 'Não autorizado'
              }
            />
            <Dado
              label="Declaração de cotista"
              valor={
                c.aceite_cota ? (
                  <>
                    Declarada em {dataHoraBr(c.aceite_cota_em ?? c.inscrito_em)} ·{' '}
                    <Link to="/aluno/termos" className="text-lp-primary underline">
                      ver o termo de cota
                    </Link>
                  </>
                ) : (
                  'Não declarada'
                )
              }
            />
            <Dado label="Situação da inscrição" valor={c.status_inscricao ?? VAZIO} />
          </Grade>
        </Cartao>

        <div className="flex items-start gap-2.5 rounded-2xl bg-lp-primary/5 p-4 text-sm leading-relaxed text-gray-600">
          <Info className="mt-0.5 size-4 shrink-0 text-lp-primary" />
          <p>
            <b className="text-gray-800">Precisa corrigir alguma informação?</b> O cadastro já foi enviado ao
            sistema acadêmico e à coleta documental, por isso a alteração passa pela Secretaria ProUni.
            Procure o atendimento com o número do protocolo em mãos.
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <PencilLine className="size-3.5" />
          Dados preenchidos por você na inscrição, em {inscritoEm}.
        </p>
      </div>
    </>
  )
}
