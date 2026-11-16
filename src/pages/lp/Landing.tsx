import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { GlobalBar } from '../../components/GlobalBar'
import {
  Linha, Campo, Entrada, Selecao, Subtitulo, Aceite, SimNao,
  BotaoVoltar, BotaoProximo, BotaoEnviar,
} from '../../components/lp/ui'
import {
  UFS, SEXOS, ANOS_CONCLUSAO, TERMO_COTA,
  buscarCep, municipiosDe, mascaraCpf, mascaraRg, mascaraCep, mascaraDdd, mascaraTelefone, apenasDigitos,
} from '../../data/lp'
import { carregarDominioLanding, type DadosDominioLanding } from '../../lib/dominio'
import {
  dataBr, inscrever, listarChamadas,
  type ChamadaDoProcesso, type ResultadoInscricao,
} from '../../lib/api'

/* ==================================================================
 * Landing page de captação do Processo Seletivo ProUni.
 *
 * O layout é o da referência EvoluiTec (`landing page html e
 * referencias/`): faixa lateral colorida, título, card branco
 * arredondado com o passo-a-passo de três etapas e rodapé.
 *
 * Mudam duas coisas: a identidade (o roxo virou #00BAB4, o verde de
 * etapa concluída virou #069E6E) e os campos, que agora são os do
 * ProUni.
 * ================================================================== */

const ETAPAS = ['1. Seus Dados Pessoais', '2. Endereço', '3. Formação e Curso']

/* A escolaridade não é só um dado do cadastro: ela responde sozinha a uma das
   declarações do Sisprouni e, no caso do professor, encurta a lista de cursos.
   Os dois reconhecimentos vivem aqui para não se espalharem pela tela — o
   rótulo vem do banco (tabela `escolaridades`) e pode ser reescrito, mas o
   trecho testado abaixo é o que a migração 44 garante que ele contém. */
const ehSuperiorCompleto = (e: string) => e.includes('Superior completo')
const ehSuperiorIncompleto = (e: string) => e.includes('Superior incompleto')

interface Formulario {
  /* Etapa 1 — identificação */
  nome: string
  cpf: string
  rg: string
  rgOrgaoExpedidor: string
  nascimento: string
  sexo: string
  raca: string
  /* Declarações do Sisprouni. A combinação delas escolhe UM módulo de coleta:
     quatro booleanos, dezesseis módulos possíveis, uma coleta por candidato. */
  declaraCota: boolean | null
  declaraEncerramentoMatricula: boolean | null
  declaraEncerramentoBeneficio: boolean | null
  declaraProfessorRedePublica: boolean | null
  ufNaturalidade: string
  municipioNaturalidade: string
  email: string
  ddd: string
  telefone: string
  /* Etapa 2 — endereço */
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  /* Etapa 3 — formação e curso */
  escolaridade: string
  anoConclusao: string
  curso: string
  plano: string
  aceiteContrato: boolean
  aceiteContato: boolean
}

const VAZIO: Formulario = {
  nome: '', cpf: '', rg: '', rgOrgaoExpedidor: '', nascimento: '', sexo: '', raca: '',
  declaraCota: null, declaraEncerramentoMatricula: null, declaraEncerramentoBeneficio: null,
  declaraProfessorRedePublica: null,
  ufNaturalidade: '', municipioNaturalidade: '', email: '', ddd: '', telefone: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  escolaridade: '', anoConclusao: '', curso: '', plano: '',
  aceiteContrato: false, aceiteContato: false,
}

/** Estado da consulta de CEP, mostrado abaixo do campo. */
type BuscaCep = 'ocioso' | 'buscando' | 'encontrado' | 'parcial' | 'nao-encontrado' | 'indisponivel'

export function Landing() {
  const [passo, setPasso] = useState(1)
  const [f, setF] = useState<Formulario>(VAZIO)
  const [buscaCep, setBuscaCep] = useState<BuscaCep>('ocioso')

  /* Resultado da inscrição. Enquanto é `null` o formulário está em edição;
     quando chega, a tela vira a confirmação com o protocolo real do banco. */
  const [inscricao, setInscricao] = useState<ResultadoInscricao | null>(null)
  const [enviando, setEnviando] = useState(false)
  /* ANDAIME: qual chamada a demonstração quer forçar. `null` = a de hoje. */
  const [chamadaSimulada, setChamadaSimulada] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  async function enviar() {
    setEnviando(true)
    setErroEnvio(null)
    try {
      const r = await inscrever({
        nome: f.nome,
        cpf: f.cpf,
        rg: f.rg,
        rg_orgao_expedidor: f.rgOrgaoExpedidor.trim().toUpperCase(),
        nascimento: f.nascimento,
        sexo: f.sexo,
        raca: f.raca,
        uf_naturalidade: f.ufNaturalidade,
        municipio_naturalidade: f.municipioNaturalidade,
        email: f.email,
        ddd: f.ddd,
        telefone: f.telefone,
        cep: f.cep,
        logradouro: f.logradouro,
        numero: f.numero,
        complemento: f.complemento,
        bairro: f.bairro,
        cidade: f.cidade,
        uf: f.estado,
        escolaridade: f.escolaridade,
        ano_conclusao: f.anoConclusao,
        curso: f.curso,
        plano: f.plano,
        aceite_contato: f.aceiteContato,
        aceite_cota: f.declaraCota === true,
        declara_encerramento_matricula: f.declaraEncerramentoMatricula === true,
        declara_encerramento_beneficio: f.declaraEncerramentoBeneficio === true,
        declara_professor_rede_publica: f.declaraProfessorRedePublica === true,
        chamada_simulada: chamadaSimulada,
      })
      setInscricao(r)
    } catch (erro: unknown) {
      setErroEnvio(erro instanceof Error ? erro.message : String(erro))
    } finally {
      setEnviando(false)
    }
  }

  /* Raça, escolaridade, curso, polo e plano de pagamento vêm do Supabase —
     ver src/lib/dominio.ts. Carregado uma vez, ao montar a página; o
     formulário só aparece depois de ter as opções (ver `renderizarCard`
     abaixo), senão os selects abririam vazios. */
  const [dominio, setDominio] = useState<DadosDominioLanding | null>(null)
  const [erroDominio, setErroDominio] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let cancelado = false
    setErroDominio(null)
    setDominio(null)

    carregarDominioLanding()
      .then((d) => {
        if (!cancelado) setDominio(d)
      })
      .catch((erro: unknown) => {
        if (!cancelado) setErroDominio(erro instanceof Error ? erro.message : String(erro))
      })

    return () => {
      cancelado = true
    }
  }, [tentativa])

  function set<K extends keyof Formulario>(campo: K, valor: Formulario[K]) {
    setF((v) => ({ ...v, [campo]: valor }))
  }

  /* Trocar a UF de naturalidade invalida o município escolhido. */
  useEffect(() => {
    setF((v) => ({ ...v, municipioNaturalidade: '' }))
  }, [f.ufNaturalidade])

  /* Preenchimento automático do endereço: consulta o ViaCEP a cada CEP
     completo e cancela a chamada anterior se o candidato continuar digitando. */
  useEffect(() => {
    const digitos = apenasDigitos(f.cep)
    if (digitos.length !== 8) {
      setBuscaCep('ocioso')
      return
    }

    const controle = new AbortController()
    setBuscaCep('buscando')

    buscarCep(digitos, controle.signal)
      .then((r) => {
        if (controle.signal.aborted) return
        if (!r.ok) {
          setBuscaCep(r.motivo === 'nao-encontrado' ? 'nao-encontrado' : 'indisponivel')
          return
        }
        /* CEP de logradouro único volta sem rua e sem bairro — o candidato completa. */
        setBuscaCep(r.endereco.logradouro ? 'encontrado' : 'parcial')
        setF((v) => ({
          ...v,
          logradouro: r.endereco.logradouro || v.logradouro,
          bairro: r.endereco.bairro || v.bairro,
          cidade: r.endereco.cidade || v.cidade,
          estado: r.endereco.uf || v.estado,
        }))
      })
      .catch(() => {
        /* Só chega aqui em cancelamento — o resto vira `ok: false`. */
      })

    return () => controle.abort()
  }, [f.cep])

  const validos: Record<number, boolean> = {
    1:
      f.nome.trim().length > 3 &&
      f.cpf.length === 14 &&
      f.rg.trim().length >= 5 &&
      f.rgOrgaoExpedidor.trim().length >= 2 &&
      !!f.nascimento &&
      !!f.sexo &&
      !!f.raca &&
      !!f.ufNaturalidade &&
      !!f.municipioNaturalidade &&
      /\S+@\S+\.\S+/.test(f.email) &&
      f.ddd.length === 2 &&
      apenasDigitos(f.telefone).length >= 8,
    2:
      apenasDigitos(f.cep).length === 8 &&
      f.logradouro.trim().length > 2 &&
      f.numero.trim().length > 0 &&
      f.bairro.trim().length > 1 &&
      f.cidade.trim().length > 1 &&
      !!f.estado,
    3:
      !!f.escolaridade &&
      !!f.anoConclusao &&
      !!f.curso &&
      !!f.plano &&
      f.declaraCota !== null &&
      f.declaraEncerramentoMatricula !== null &&
      f.declaraEncerramentoBeneficio !== null &&
      f.declaraProfessorRedePublica !== null &&
      f.aceiteContrato,
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-white font-lp">
      <GlobalBar />

      {/* Faixa lateral (desktop) */}
      <div className="hidden md:fixed md:left-0 md:top-10 md:flex md:h-[calc(100vh-2.5rem)]">
        <div className="w-16 bg-lp-primary" />
      </div>

      {/* Faixa superior (mobile) */}
      <div className="fixed left-0 right-0 top-10 z-10 h-3 bg-lp-primary md:hidden" />

      <main className="flex flex-grow flex-col justify-center pt-6 md:pt-0">
        <div className="mt-10 flex w-full flex-col items-center gap-4">
          <p className="text-center text-base font-semibold md:text-2xl">
            INSCRIÇÃO — PROCESSO SELETIVO PROUNI
          </p>

          <div className="mb-10 flex w-11/12 flex-col rounded-3xl border border-gray-300 bg-white p-4 shadow md:w-3/5">
            <div className="flex h-full flex-col items-center justify-center gap-4 p-1">
              {erroDominio ? (
                <ErroCarregamento mensagem={erroDominio} tentarDeNovo={() => setTentativa((t) => t + 1)} />
              ) : !dominio ? (
                <CarregandoFormulario />
              ) : (
                <>
                  {/* NÃO é conteúdo do candidato: é a nota que explica ao
                      time por que uma landing só atende três concursos, e o
                      andaime que deixa demonstrar as outras chamadas. */}
                  {!inscricao && (
                    <NotaChamadas simulada={chamadaSimulada} onSimular={setChamadaSimulada} />
                  )}

                  <Stepper passo={passo} />

                  {inscricao ? (
                    <Confirmacao inscricao={inscricao} email={f.email} />
                  ) : (
                    <form className="w-full" onSubmit={(e) => e.preventDefault()}>
                      <div className="w-full px-2 py-2">
                        <div className="flex w-full flex-col gap-5">
                          {passo === 1 && <EtapaDados f={f} set={set} dominio={dominio} />}
                          {passo === 2 && <EtapaEndereco f={f} set={set} busca={buscaCep} />}
                          {passo === 3 && <EtapaCurso f={f} set={set} dominio={dominio} />}
                        </div>
                      </div>

                      {erroEnvio && (
                        <div className="mx-6 mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                          <span>
                            <b>Não foi possível concluir a inscrição.</b> {erroEnvio}
                          </span>
                        </div>
                      )}

                      <div className="mt-4 flex items-center justify-between px-6">
                        {passo > 1 && <BotaoVoltar onClick={() => setPasso(passo - 1)} />}
                        {passo < 3 ? (
                          <BotaoProximo onClick={() => setPasso(passo + 1)} desabilitado={!validos[passo]} />
                        ) : (
                          <BotaoEnviar onClick={enviar} desabilitado={!validos[3] || enviando} enviando={enviando} />
                        )}
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="flex w-full items-center justify-center px-6 py-4 text-center text-xs font-medium text-lp-primary md:text-sm">
        © 2026 UniFatecie · Todos os direitos reservados
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Estados de carregamento das listas de domínio (Supabase)            */
/* ------------------------------------------------------------------ */

function CarregandoFormulario() {
  return (
    <div className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
      <Loader2 className="size-8 animate-spin text-lp-primary" />
      <p className="text-sm text-gray-500">Carregando formulário de inscrição…</p>
    </div>
  )
}

function ErroCarregamento({ mensagem, tentarDeNovo }: { mensagem: string; tentarDeNovo: () => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-3 px-4 py-16 text-center">
      <AlertCircle className="size-8 text-red-500" />
      <p className="text-sm font-semibold text-gray-800">Não foi possível carregar o formulário.</p>
      <p className="max-w-sm text-xs text-gray-500">{mensagem}</p>
      <button
        type="button"
        onClick={tentarDeNovo}
        className="mt-1 rounded-md bg-lp-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-lp-primary-dark"
      >
        Tentar de novo
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Passo-a-passo                                                       */
/* ------------------------------------------------------------------ */

function Stepper({ passo }: { passo: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 pb-2">
      {/* Desktop: as três etapas com os conectores */}
      <div className="hidden items-center justify-between lg:flex">
        {ETAPAS.map((label, i) => {
          const n = i + 1
          const concluida = n < passo
          const atual = n === passo
          return (
            <div key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border-2 font-bold',
                    concluida && 'border-lp-green bg-lp-green text-white',
                    atual && 'border-lp-primary bg-lp-primary text-white',
                    !concluida && !atual && 'border-gray-400 bg-white text-gray-400',
                  )}
                >
                  {n}
                </div>
                <span className="text-sm font-semibold">{label}</span>
              </div>
              {n < ETAPAS.length && (
                <div
                  className={cn('mx-2 h-1 flex-1 rounded-lg', n < passo ? 'bg-lp-green' : 'bg-gray-200')}
                  style={{ width: 150 }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile: só a etapa corrente */}
      <div className="flex w-full flex-col items-center px-4 lg:hidden">
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-lp-primary bg-lp-primary font-bold text-white">
            {passo}
          </div>
          <span className="text-center text-sm font-semibold">{ETAPAS[passo - 1]}</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Etapas                                                              */
/* ------------------------------------------------------------------ */

type SetCampo = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => void

function EtapaDados({
  f,
  set,
  dominio,
}: {
  f: Formulario
  set: SetCampo
  dominio: DadosDominioLanding
}) {
  const nomesRacas = dominio.racas.map((r) => r.nome)

  return (
    <>
      <Subtitulo>Identificação</Subtitulo>

      <Linha>
        <Campo label="Nome Completo *">
          <Entrada
            value={f.nome}
            onChange={(e) => set('nome', e.target.value)}
            placeholder="Digite o seu nome completo"
          />
        </Campo>
      </Linha>

      <Linha>
        <Campo label="CPF *">
          <Entrada
            value={f.cpf}
            onChange={(e) => set('cpf', mascaraCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
        </Campo>
        <Campo label="RG *">
          <Entrada
            value={f.rg}
            onChange={(e) => set('rg', mascaraRg(e.target.value))}
            placeholder="Digite o RG"
          />
        </Campo>
      </Linha>

      <Linha>
        {/* O órgão expedidor é parte do RG: sem ele o documento não identifica
            emissor nenhum, e é o que a análise confere contra o arquivo. */}
        <Campo label="Órgão expedidor do RG *">
          <Entrada
            value={f.rgOrgaoExpedidor}
            onChange={(e) => set('rgOrgaoExpedidor', e.target.value.toUpperCase().slice(0, 20))}
            placeholder="SSP/PR"
          />
        </Campo>
        <div className="w-full" aria-hidden="true" />
      </Linha>

      <Linha>
        <Campo label="Data de Nascimento *">
          <Entrada type="date" value={f.nascimento} onChange={(e) => set('nascimento', e.target.value)} />
        </Campo>
        <Campo label="Sexo *">
          <Selecao
            value={f.sexo}
            onChange={(v) => set('sexo', v)}
            placeholder="Selecione"
            opcoes={SEXOS}
          />
        </Campo>
      </Linha>

      <Linha>
        <Campo label="Raça / Cor *">
          <Selecao
            value={f.raca}
            onChange={(v) => set('raca', v)}
            placeholder="Selecione a raça / cor"
            opcoes={nomesRacas}
          />
        </Campo>

        <div className="hidden w-full md:block" />
      </Linha>

      <Subtitulo>Naturalidade</Subtitulo>

      <Linha>
        <Campo label="UF de Naturalidade *">
          <Selecao
            value={f.ufNaturalidade}
            onChange={(v) => set('ufNaturalidade', v)}
            placeholder="Selecione um estado"
            opcoes={UFS}
          />
        </Campo>
        <Campo label="Município de Naturalidade *">
          <Selecao
            value={f.municipioNaturalidade}
            onChange={(v) => set('municipioNaturalidade', v)}
            placeholder={f.ufNaturalidade ? 'Selecione um município' : 'Selecione uma UF primeiro'}
            opcoes={municipiosDe(f.ufNaturalidade)}
            disabled={!f.ufNaturalidade}
          />
        </Campo>
      </Linha>

      <Subtitulo>Contato</Subtitulo>

      <Linha>
        <div className="w-full space-y-1.5">
          <Campo label="E-mail *">
            <Entrada
              type="email"
              value={f.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="Digite o e-mail"
            />
          </Campo>
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-600">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {/* O texto inteiro precisa ser UM filho do flex. Solto, cada trecho
                (o "Use", o <b>, o resto) vira um item próprio e a frase quebra
                em colunas — foi o que aconteceu antes. */}
            <span>
              Use <b>o mesmo e-mail</b> que você cadastrou no Sisprouni. É por ele que a Secretaria
              confere a sua pré-seleção e envia as comunicações da coleta de documentos.
            </span>
          </p>
        </div>
        {/* DDD e Telefone dividem a segunda coluna. A largura fica no wrapper:
            passar `w-24` para o próprio Campo perderia para o `w-full` dele. */}
        <div className="flex w-full gap-2">
          <div className="w-20 shrink-0">
            <Campo label="DDD *">
              <Entrada
                value={f.ddd}
                onChange={(e) => set('ddd', mascaraDdd(e.target.value))}
                placeholder="44"
                inputMode="numeric"
                className="text-center"
              />
            </Campo>
          </div>
          <div className="min-w-0 flex-1">
            <Campo label="Telefone *">
              <Entrada
                value={f.telefone}
                onChange={(e) => set('telefone', mascaraTelefone(e.target.value))}
                placeholder="99999-9999"
                inputMode="numeric"
              />
            </Campo>
          </div>
        </div>
      </Linha>

    </>
  )
}

/** Recado abaixo do campo de CEP, conforme o retorno do ViaCEP. */
function AvisoCep({ busca }: { busca: BuscaCep }) {
  if (busca === 'ocioso') return null

  const avisos: Record<Exclude<BuscaCep, 'ocioso'>, { texto: string; cor: string; girando: boolean }> = {
    buscando: { texto: 'Buscando o endereço…', cor: 'text-gray-500', girando: true },
    encontrado: { texto: 'Endereço preenchido pelo CEP. Confira e complete o número.', cor: 'text-lp-green', girando: false },
    parcial: { texto: 'CEP de logradouro único — informe a rua e o bairro.', cor: 'text-gray-500', girando: false },
    'nao-encontrado': { texto: 'CEP não encontrado. Preencha o endereço manualmente.', cor: 'text-amber-600', girando: false },
    indisponivel: { texto: 'Não foi possível consultar o CEP agora. Preencha manualmente.', cor: 'text-amber-600', girando: false },
  }

  const a = avisos[busca]
  const Icone = a.girando ? Loader2 : busca === 'encontrado' ? CheckCircle2 : TriangleAlert

  return (
    <p className={cn('flex items-center gap-1.5 text-xs', a.cor)}>
      <Icone className={cn('size-3.5 shrink-0', a.girando && 'animate-spin')} />
      {a.texto}
    </p>
  )
}

function EtapaEndereco({ f, set, busca }: { f: Formulario; set: SetCampo; busca: BuscaCep }) {
  return (
    <>
      <Subtitulo>Endereço residencial</Subtitulo>

      <Linha>
        <div className="w-full space-y-1.5">
          <Campo label="Digite seu CEP *">
            <Entrada
              value={f.cep}
              onChange={(e) => set('cep', mascaraCep(e.target.value))}
              placeholder="00000-000"
              inputMode="numeric"
            />
          </Campo>
          <AvisoCep busca={busca} />
        </div>
        <Campo label="Estado *">
          <Selecao
            value={f.estado}
            onChange={(v) => set('estado', v)}
            placeholder="Selecione um estado"
            opcoes={UFS}
          />
        </Campo>
      </Linha>

      <Linha>
        <Campo label="Endereço *">
          <Entrada
            value={f.logradouro}
            onChange={(e) => set('logradouro', e.target.value)}
            placeholder="Rua, avenida, travessa…"
          />
        </Campo>
        <Campo label="Cidade *">
          <Entrada
            value={f.cidade}
            onChange={(e) => set('cidade', e.target.value)}
            placeholder="Digite a cidade"
          />
        </Campo>
      </Linha>

      <Linha>
        <div className="w-full md:w-1/4">
          <Campo label="Número *">
            <Entrada value={f.numero} onChange={(e) => set('numero', e.target.value)} placeholder="Nº" />
          </Campo>
        </div>
        <Campo label="Complemento">
          <Entrada
            value={f.complemento}
            onChange={(e) => set('complemento', e.target.value)}
            placeholder="Apto, bloco, fundos… (opcional)"
          />
        </Campo>
        <Campo label="Bairro *">
          <Entrada
            value={f.bairro}
            onChange={(e) => set('bairro', e.target.value)}
            placeholder="Digite o bairro"
          />
        </Campo>
      </Linha>
    </>
  )
}

function EtapaCurso({
  f,
  set,
  dominio,
}: {
  f: Formulario
  set: SetCampo
  dominio: DadosDominioLanding
}) {
  /* O termo abre sozinho ao responder "Sim" em cotista — é o que ele promete. */
  const [termoCotaAberto, setTermoCotaAberto] = useState(false)
  /* Qual declaração está pedindo confirmação. Cota tem o termo próprio. */
  const [declarando, setDeclarando] = useState<ChaveDeclaracao | null>(null)
  const racaEhPpi = dominio.racas.some((r) => r.ppi && r.nome === f.raca)

  /* Professor da rede pública: muda a lista de cursos e responde uma declaração. */
  const professor = ehSuperiorCompleto(f.escolaridade)
  const cursandoOutraFaculdade = ehSuperiorIncompleto(f.escolaridade)

  const cursosOfertados = useMemo(
    () => dominio.cursos.filter((c) => !professor || c.licenciatura).map((c) => c.nome),
    [dominio.cursos, professor],
  )

  /**
   * Trocar a escolaridade mexe em mais de um campo.
   *
   * Duas das declarações do Sisprouni são a mesma informação que a
   * escolaridade já deu — quem tem diploma superior só entra como professor da
   * rede pública, e quem está cursando outra faculdade tem matrícula a
   * encerrar. Perguntar de novo abre espaço para o candidato responder
   * diferente aqui e ali, e uma coleta errada é o que sai disso.
   *
   * A limpeza é seletiva: só desfaz o que a escolaridade ANTERIOR tinha
   * preenchido. Resposta dada à mão pelo candidato fica onde está.
   */
  function trocarEscolaridade(nova: string) {
    const antiga = f.escolaridade
    if (nova === antiga) return
    set('escolaridade', nova)

    if (ehSuperiorCompleto(nova)) set('declaraProfessorRedePublica', true)
    else if (ehSuperiorCompleto(antiga)) set('declaraProfessorRedePublica', null)

    if (ehSuperiorIncompleto(nova)) set('declaraEncerramentoMatricula', true)
    else if (ehSuperiorIncompleto(antiga)) set('declaraEncerramentoMatricula', null)

    /* O curso escolhido antes pode não estar mais na lista: virar professor da
       rede pública deixa só as licenciaturas de pé. */
    const aindaVale = dominio.cursos.some(
      (c) => c.nome === f.curso && (!ehSuperiorCompleto(nova) || c.licenciatura),
    )
    if (f.curso && !aindaVale) set('curso', '')
  }

  /* Só existe a bolsa integral: o campo já vem preenchido e travado, em vez de
     oferecer uma escolha que não existe. */
  const planoUnico = dominio.planosPagamento[0] ?? ''
  useEffect(() => {
    if (planoUnico && f.plano !== planoUnico) set('plano', planoUnico)
  }, [planoUnico, f.plano, set])

  return (
    <>
      <Subtitulo>Formação acadêmica</Subtitulo>

      <Linha>
        <Campo label="Escolaridade *">
          <Selecao
            value={f.escolaridade}
            onChange={trocarEscolaridade}
            placeholder="Selecione a escolaridade"
            opcoes={dominio.escolaridades}
          />
          {professor && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <div className="flex flex-col gap-1.5">
                <p>
                  O candidato que seja professor da rede pública de ensino poderá se inscrever
                  exclusivamente para bolsas do Prouni destinadas aos cursos de licenciatura e
                  pedagogia voltados à formação para o magistério da educação básica, conforme
                  disposto no art. 3º do Decreto nº 5.493, de 18 de julho de 2005.
                </p>
                <p>
                  Para fins de enquadramento nessa condição, o candidato deverá comprovar que exerce
                  efetivamente o magistério da educação básica na rede pública de ensino e que
                  integra o quadro de pessoal permanente da respectiva instituição pública.
                </p>
              </div>
            </div>
          )}
        </Campo>
        <Campo label="Ano de conclusão do Ensino Médio *">
          <Selecao
            value={f.anoConclusao}
            onChange={(v) => set('anoConclusao', v)}
            placeholder="Selecione o ano"
            opcoes={ANOS_CONCLUSAO}
          />
        </Campo>
      </Linha>

      <Subtitulo>Curso e pagamento</Subtitulo>

      <Campo label="Curso Pretendido *">
        <Selecao
          value={f.curso}
          onChange={(v) => set('curso', v)}
          placeholder={f.escolaridade ? 'Selecione um curso' : 'Informe a escolaridade primeiro'}
          opcoes={cursosOfertados}
          disabled={!f.escolaridade}
          buscaPlaceholder="Digite parte do nome do curso"
        />
        {professor && (
          <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
            Lista restrita às <b>{cursosOfertados.length} licenciaturas</b> da oferta — são as únicas
            a que o professor da rede pública pode concorrer.
          </p>
        )}
      </Campo>

      <Campo label="Plano de Pagamento *">
        <Selecao
          value={f.plano || planoUnico}
          onChange={(v) => set('plano', v)}
          placeholder="Selecione um plano"
          opcoes={dominio.planosPagamento}
          disabled
        />
      </Campo>

      <Subtitulo>Declarações do Sisprouni</Subtitulo>

      <div className="flex flex-col gap-4 pb-1">
        <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Responda <b>Sim</b> apenas aos itens que você declarou como Sim no <b>Sisprouni</b>. Cada
            &quot;Sim&quot; abre uma coleta de documentos própria, com o comprovante daquela
            situação — responder Sim sem participar da modalidade trava a sua matrícula.
          </span>
        </p>

        <SimNao
          rotulo="Sou cotista"
          descricao="Você foi pré-selecionado em modalidade de cota (PPI) no ProUni."
          valor={f.declaraCota}
          onChange={(v) => {
            set('declaraCota', v)
            if (v) setTermoCotaAberto(true)
          }}
          extra={
            <button
              type="button"
              onClick={() => setTermoCotaAberto(true)}
              className="text-xs text-lp-primary underline"
            >
              ler o termo de comprovação de cota
            </button>
          }
        />

        {f.declaraCota === true && !racaEhPpi && (
          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-amber-600">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              Você declarou cota, mas informou a raça <b>{f.raca}</b> na etapa 1. A cota PPI vale
              para quem declara raça preta, parda ou indígena — confira antes de enviar.
            </span>
          </p>
        )}

        <SimNao
          rotulo="Tenho matrícula a encerrar em outra instituição"
          descricao="Declaração de encerramento de matrícula em outra instituição de ensino."
          valor={f.declaraEncerramentoMatricula}
          onChange={(v) => {
            if (v) setDeclarando('matricula')
            else set('declaraEncerramentoMatricula', false)
          }}
          extra={cursandoOutraFaculdade ? <RespondidoPelaEscolaridade /> : undefined}
        />

        <SimNao
          rotulo="Tenho bolsa ProUni ou FIES a encerrar"
          descricao="Declaração de encerramento do usufruto de benefício de bolsa ProUni ou do FIES."
          valor={f.declaraEncerramentoBeneficio}
          onChange={(v) => {
            if (v) setDeclarando('beneficio')
            else set('declaraEncerramentoBeneficio', false)
          }}
        />

        <SimNao
          rotulo="Sou professor da rede pública"
          descricao="Professor do magistério da educação básica da rede pública, em efetivo exercício."
          valor={f.declaraProfessorRedePublica}
          onChange={(v) => {
            if (v) setDeclarando('professor')
            else set('declaraProfessorRedePublica', false)
          }}
          extra={professor ? <RespondidoPelaEscolaridade /> : undefined}
        />
      </div>

      <Subtitulo>Aceites</Subtitulo>

      <div className="flex flex-col gap-3 pb-2">
        <Aceite checado={f.aceiteContrato} onChange={(v) => set('aceiteContrato', v)}>
          Concordo com o{' '}
          {/* Abre em outra aba para não perder o formulário já preenchido. O
              destino é o contrato em si: quem está preenchendo isto ainda não
              tem acesso ao Portal do Candidato. */}
          <a href="/contrato" target="_blank" rel="noreferrer" className="text-lp-primary underline">
            Contrato de Prestação de Serviços Educacionais
          </a>{' '}
          e com os termos do Processo Seletivo ProUni. *
        </Aceite>
        <Aceite checado={f.aceiteContato} onChange={(v) => set('aceiteContato', v)}>
          Concordo em receber contato via SMS, WhatsApp e e-mail.
        </Aceite>
      </div>

      {declarando && (
        <ModalDeclaracao
          chave={declarando}
          aoConfirmar={() => {
            set(DECLARACOES[declarando].campo, true)
            setDeclarando(null)
          }}
          aoCancelar={() => setDeclarando(null)}
        />
      )}

      {termoCotaAberto && (
        <ModalTermoCota
          jaDeclarado={f.declaraCota === true}
          aoFechar={() => setTermoCotaAberto(false)}
          aoDeclarar={() => {
            set('declaraCota', true)
            setTermoCotaAberto(false)
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Termo de Comprovação de Cota                                        */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Confirmação de cada declaração do Sisprouni                            */
/* ------------------------------------------------------------------ */

/**
 * Responder "Sim" aqui não é preferência: é declaração, e cada uma acrescenta
 * um documento obrigatório à coleta. O modal existe para o candidato ver isso
 * ANTES de confirmar, e não descobrir na hora de anexar.
 *
 * A cota tem tratamento próprio (`ModalTermoCota`), com o termo inteiro.
 */
/**
 * Aviso das declarações que a escolaridade já respondeu.
 *
 * O candidato precisa ver que a resposta foi preenchida por ele mesmo, uma
 * pergunta antes — resposta que aparece sozinha e sem explicação parece erro
 * do formulário. Continua trocável: se ele discordar, o "Não" está ali.
 */
function RespondidoPelaEscolaridade() {
  return (
    <span className="text-xs text-lp-primary-dark">
      Respondido a partir da escolaridade informada.
    </span>
  )
}

type ChaveDeclaracao = 'matricula' | 'beneficio' | 'professor'

const DECLARACOES: Record<
  ChaveDeclaracao,
  { campo: keyof Formulario; titulo: string; situacao: string; documento: string }
> = {
  matricula: {
    campo: 'declaraEncerramentoMatricula',
    titulo: 'Encerramento de matrícula em outra instituição',
    situacao:
      'você está matriculado em outra instituição de ensino superior e vai encerrar essa matrícula para assumir a bolsa do ProUni.',
    documento:
      'Declaração da instituição anterior confirmando o encerramento da matrícula.',
  },
  beneficio: {
    campo: 'declaraEncerramentoBeneficio',
    titulo: 'Encerramento de bolsa ProUni ou FIES',
    situacao:
      'você usufrui hoje de uma bolsa do ProUni ou de financiamento do FIES e vai encerrar esse benefício.',
    documento:
      'Declaração de encerramento emitida pela instituição que concedeu o benefício.',
  },
  professor: {
    campo: 'declaraProfessorRedePublica',
    titulo: 'Professor da rede pública',
    situacao:
      'você é professor do magistério da educação básica da rede pública, em efetivo exercício, e concorre por essa condição.',
    documento:
      'Declaração ou certidão da secretaria de educação com o vínculo efetivo, acompanhada do último contracheque.',
  },
}

function ModalDeclaracao({
  chave,
  aoConfirmar,
  aoCancelar,
}: {
  chave: ChaveDeclaracao
  aoConfirmar: () => void
  aoCancelar: () => void
}) {
  const d = DECLARACOES[chave]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={aoCancelar}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-gray-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={d.titulo}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">{d.titulo}</h2>
          <button
            type="button"
            onClick={aoCancelar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-gray-700">
          Ao responder <b>Sim</b>, você declara que {d.situacao}
        </p>

        <div className="mt-4 rounded-2xl bg-lp-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-lp-primary">
            Documento que passa a ser exigido
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-800">{d.documento}</p>
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Este documento entra na sua coleta e é obrigatório: sem ele a matrícula não é
            concluída. Confirme apenas se você declarou o mesmo no <b>Sisprouni</b>.
          </span>
        </p>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={aoCancelar}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={aoConfirmar}
            className="rounded-md bg-lp-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-lp-primary-dark"
          >
            Confirmo e enviarei o documento
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalTermoCota({
  jaDeclarado,
  aoFechar,
  aoDeclarar,
}: {
  jaDeclarado: boolean
  aoFechar: () => void
  aoDeclarar: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={aoFechar}
      role="presentation"
    >
      <div
        className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-300 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={TERMO_COTA.titulo}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{TERMO_COTA.titulo}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">{TERMO_COTA.abertura}</p>
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {TERMO_COTA.clausulas.map((c) => (
            <article key={c.titulo}>
              <h3 className="text-sm font-bold uppercase tracking-wide text-lp-primary">{c.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{c.texto}</p>
            </article>
          ))}
        </div>

        <blockquote className="mt-5 rounded-2xl bg-lp-primary/5 p-4 text-sm italic leading-relaxed text-gray-800">
          “{TERMO_COTA.declaracao}”
        </blockquote>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={aoFechar}
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50"
          >
            Fechar
          </button>
          {!jaDeclarado && (
            <button
              type="button"
              onClick={aoDeclarar}
              className="rounded-md bg-lp-primary px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-lp-primary-dark"
            >
              Li e declaro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Confirmação                                                         */
/* ------------------------------------------------------------------ */

const SEGUNDOS_REDIRECIONAMENTO = 7

function Confirmacao({ inscricao, email }: { inscricao: ResultadoInscricao; email: string }) {
  const navegar = useNavigate()
  const [restam, setRestam] = useState(SEGUNDOS_REDIRECIONAMENTO)

  /* Contagem regressiva até o Portal do Candidato. O botão continua clicável
     durante a espera — quem não quiser aguardar entra na hora. */
  useEffect(() => {
    const tique = setInterval(() => setRestam((s) => s - 1), 1000)
    return () => clearInterval(tique)
  }, [])

  useEffect(() => {
    if (restam > 0) return
    navegar('/aluno')
  }, [restam, navegar])

  return (
    <div className="flex w-full flex-col items-center gap-5 px-4 py-10 text-center">
      <CheckCircle2 className="size-16 text-lp-green" strokeWidth={1.5} />

      <div>
        <p className="text-xl font-bold md:text-2xl">Inscrição recebida!</p>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Protocolo <b className="text-lp-primary">{inscricao.protocolo}</b>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Processo seletivo: <b>{inscricao.processo}</b>
        </p>
      </div>

      <p className="max-w-xl text-sm leading-relaxed text-gray-600">
        Enviamos para <b>{email}</b> o link de envio da documentação.{' '}
        {inscricao.modulos > 1 ? (
          <>
            Foram abertas <b>{inscricao.modulos} coletas</b> no GenDocs — a do ProUni e as das
            declarações que você marcou como Sim.
          </>
        ) : (
          <>Sua coleta do ProUni já foi aberta no GenDocs.</>
        )}{' '}
        O próximo passo é anexar os documentos seus e do seu grupo familiar dentro do prazo da chamada.
      </p>

      <Link
        to="/aluno"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-lp-primary px-6 py-3 text-sm font-bold text-white transition-all hover:bg-lp-primary-dark"
      >
        Ir para o Portal do Candidato
      </Link>

      <p className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="size-3.5 animate-spin" />
        Redirecionando em {Math.max(restam, 0)}s…
      </p>
    </div>
  )
}

/* ==================================================================
 * Nota de desenvolvimento — as três chamadas
 *
 * O candidato NÃO vê isto. Para ele a landing é uma só e a chamada é
 * consequência da data em que preencheu; ele descobre em qual entrou no
 * Portal, depois de inscrito. Explicar as três janelas antes do formulário
 * só criaria a dúvida "posso escolher?" — e não pode.
 *
 * Quem precisa ver é quem vai implementar. Daí o bloco ser uma nota marcada,
 * do mesmo jeito das outras do protótipo.
 *
 * O SELETOR é andaime puro: sem ele, demonstrar a 2ª chamada exigiria esperar
 * outubro. Escolhida uma chamada que não é a de hoje, a inscrição é gravada
 * com o DIA EQUIVALENTE — o mesmo lugar que hoje ocupa na chamada corrente.
 * A conta vem do banco (`demo_data_equivalente`), não daqui: a tela mostra a
 * data e o cadastro grava a mesma.
 * ================================================================== */

function NotaChamadas({
  simulada,
  onSimular,
}: {
  simulada: string | null
  onSimular: (chamada: string | null) => void
}) {
  const [chamadas, setChamadas] = useState<ChamadaDoProcesso[] | null>(null)
  const [erro, setErro] = useState(false)
  const [aberta, setAberta] = useState(true)

  useEffect(() => {
    let cancelado = false
    listarChamadas()
      .then((c) => { if (!cancelado) setChamadas(c) })
      .catch(() => { if (!cancelado) setErro(true) })
    return () => { cancelado = true }
  }, [])

  if (erro || !chamadas || chamadas.length === 0) return null

  const vigente = chamadas.find((c) => c.vigente) ?? null
  const escolhida = simulada ? chamadas.find((c) => c.chamada === simulada) ?? null : vigente
  const ordinal = vigente?.dia_ordinal ?? null

  return (
    <section className="w-full rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/70 p-4 text-sm text-amber-900/90">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
          Nota de desenvolvimento — não existe no produto final
        </p>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          className="shrink-0 rounded px-2 text-amber-700 transition-colors hover:bg-amber-100"
        >
          {aberta ? 'ocultar' : 'mostrar'}
        </button>
      </div>

      {aberta && (
        <div className="mt-2 flex flex-col gap-3 leading-relaxed">
          <p>
            <b>Esta landing capta para três concursos, não um.</b> São a 1ª chamada, a 2ª chamada
            e a lista de espera do processo seletivo. O formulário é o mesmo nos três casos —{' '}
            <b>quem separa é a data em que o candidato preenche</b>.
          </p>
          <p>
            As janelas são <b>parametrizadas no ERP</b>, em Processos Seletivos › Concursos
            (início e fim de cada concurso). A inscrição consulta esse calendário e entra sozinha
            na chamada aberta; o candidato não escolhe e não vê nada disto. Ele descobre a chamada
            no Portal, depois de inscrito, junto das datas dela.
          </p>

          <ul className="flex flex-col gap-1.5">
            {chamadas.map((c) => (
              <li
                key={c.chamada}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border px-3 py-2',
                  c.vigente ? 'border-amber-500 bg-white' : 'border-amber-300/60 bg-white/50',
                )}
              >
                <span className="font-semibold">{c.nome}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs">
                  <span>
                    {dataBr(c.inicio)} a {dataBr(c.fim)} · {c.dias} dias
                  </span>
                  {c.vigente && (
                    <span className="rounded-full bg-amber-600 px-2 py-0.5 font-bold text-white">
                      aberta hoje
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-md border border-amber-300 bg-white/70 p-3">
            <p className="font-bold">Simular a inscrição em outra chamada</p>
            <p className="mt-1 text-xs leading-relaxed">
              Sem isto, mostrar a 2ª chamada funcionando exigiria esperar outubro. Escolhendo uma
              chamada fechada, a inscrição é gravada com o <b>dia equivalente</b>: hoje é o{' '}
              <b>{ordinal}º dia</b> da chamada corrente, então ela entra no {ordinal}º dia da
              chamada escolhida.
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              <BotaoSimular ativo={simulada === null} onClick={() => onSimular(null)}>
                Chamada de hoje
              </BotaoSimular>
              {chamadas.map((c) => (
                <BotaoSimular
                  key={c.chamada}
                  ativo={simulada === c.chamada}
                  onClick={() => onSimular(c.chamada)}
                >
                  {c.chamada}
                </BotaoSimular>
              ))}
            </div>

            {escolhida && (
              <p className="mt-2 text-xs">
                A inscrição vai constar como feita em{' '}
                <b>{dataBr(escolhida.data_equivalente)}</b> e cair em{' '}
                <b>{escolhida.nome}</b>
                {simulada === null && ' — o comportamento normal, sem simulação'}.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function BotaoSimular({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors',
        ativo
          ? 'border-amber-600 bg-amber-600 text-white'
          : 'border-amber-400 bg-white text-amber-800 hover:bg-amber-100',
      )}
    >
      {children}
    </button>
  )
}
