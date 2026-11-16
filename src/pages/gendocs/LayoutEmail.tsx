import { useState, type ReactNode } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { FaRotateLeft, FaRotateRight, FaBold, FaItalic, FaUnderline, FaLink, FaChevronDown } from 'react-icons/fa6'
import { GdModuloHeader } from '../../layouts/GenDocsLayout'
import { GdButton, GdFloatField } from '../../components/gendocs/ui'
import { getModulo } from '../../data/gendocs'

/**
 * "Layout do E-mail" — formulário à esquerda, pré-visualização viva à direita.
 * Réplica de `GenDocs - tela layout email.html` (print 12). O editor de texto
 * rico do original (CKEditor) está representado por uma barra de ferramentas
 * inerte + área de digitação — é uma representação de requisitos, não o editor.
 */
export function GdLayoutEmail() {
  const { slug = '' } = useParams()
  const m = getModulo(slug)

  const [corCabecalho, setCorCabecalho] = useState('#1C3F73')
  const [corBotao, setCorBotao] = useState('#4B91E2')
  const [corTextoBotao, setCorTextoBotao] = useState('#FFFFFF')
  const [raio, setRaio] = useState(16)
  const [padding, setPadding] = useState(16)
  const [corRodape, setCorRodape] = useState('#1C3F73')
  const [textoRodape, setTextoRodape] = useState('')

  if (!m) return <Navigate to="/gendocs" replace />

  const inputBase =
    'w-full rounded-lg border border-gray-500 px-4 py-3 text-gray-800 outline-none transition-colors placeholder:text-gray-300 focus:border-gd-blue'

  return (
    <div className="flex w-full flex-col gap-6 p-10 px-20 text-gd-gray-100 transition-all">
      <GdModuloHeader nome={m.nome} />

      <div className="flex w-full flex-col gap-6 p-6 transition-all">
        <div className="flex w-full items-center gap-2 transition-all">
          <b className="text-gd-gray-400">Comunicação e E-mails</b>
          <b className="text-gd-gray-400">&gt;</b>
          <b className="text-xl text-gd-blue">Layout do E-mail</b>
        </div>

        <div className="flex w-full items-start gap-8 transition-all">
          {/* Formulário */}
          <div className="flex max-h-[80vh] w-full flex-1 flex-col gap-6 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all">
            <div>
              <h2 className="text-xl font-bold text-gd-blue-200">Configurações e Temática do E-mail</h2>
              <p className="mt-2 text-sm text-gray-500">
                Aqui você fará a configuração e padronização do cabeçalho, rodapé e botão dos seus e-mails.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Todos os e-mails enviados pela sua empresa terão o padrão configurado aqui!
              </p>
            </div>

            <div className="flex w-full flex-col gap-4 transition-all">
              <span className="text-sm font-semibold text-blue-500">Cabeçalho do e-mail</span>

              <GdFloatField label="Logo para o cabeçalho">
                <input className={`${inputBase} cursor-pointer`} placeholder="Selecione o arquivo" readOnly />
              </GdFloatField>

              <CampoCor label="Cor do Cabeçalho" valor={corCabecalho} onChange={setCorCabecalho} />
            </div>

            <div className="flex w-full flex-col gap-4 transition-all">
              <span className="text-sm font-semibold text-blue-500">Customização do Botão</span>
              <CampoCor label="Cor de fundo do botão" valor={corBotao} onChange={setCorBotao} />
              <CampoCor label="Cor do texto do botão" valor={corTextoBotao} onChange={setCorTextoBotao} />

              <div className="flex w-full items-center gap-4 transition-all">
                <GdFloatField label="Arredondamento Borda">
                  <input
                    type="number"
                    className={inputBase}
                    value={raio}
                    onChange={(e) => setRaio(Number(e.target.value))}
                  />
                </GdFloatField>
                <GdFloatField label="Espaçamento interno">
                  <input
                    type="number"
                    className={inputBase}
                    value={padding}
                    onChange={(e) => setPadding(Number(e.target.value))}
                  />
                </GdFloatField>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4 border-t border-gray-100 pt-4 transition-all">
              <span className="text-sm font-semibold text-blue-500">Rodapé do e-mail</span>

              <GdFloatField label="Logo para o Rodapé">
                <input className={`${inputBase} cursor-pointer`} placeholder="Selecione o arquivo" readOnly />
              </GdFloatField>

              <CampoCor label="Cor do Rodapé" valor={corRodape} onChange={setCorRodape} />

              <div className="flex w-full flex-col gap-2 transition-all">
                <span className="text-sm font-semibold text-gd-blue-100">Texto do rodapé</span>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50 px-2 py-1.5 text-gray-600">
                    <BotaoEditor><FaRotateLeft /></BotaoEditor>
                    <BotaoEditor><FaRotateRight /></BotaoEditor>
                    <span className="mx-1 h-5 w-px bg-gray-300" />
                    <BotaoEditor>
                      <span className="flex items-center gap-1 text-xs">
                        A<span className="text-[9px]">I</span>
                        <FaChevronDown className="size-2.5" />
                      </span>
                    </BotaoEditor>
                    <BotaoEditor><FaBold /></BotaoEditor>
                    <BotaoEditor><FaItalic /></BotaoEditor>
                    <BotaoEditor><FaUnderline /></BotaoEditor>
                    <BotaoEditor><FaLink /></BotaoEditor>
                  </div>
                  <textarea
                    value={textoRodape}
                    onChange={(e) => setTextoRodape(e.target.value)}
                    placeholder="Digite o texto do rodapé aqui..."
                    className="min-h-[200px] w-full bg-white p-4 text-black outline-none placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pré-visualização */}
          <div className="sticky top-6 flex w-full flex-1 flex-col gap-4 transition-all">
            <span className="font-bold text-gd-blue-200">Visualização:</span>
            <div className="w-full overflow-hidden rounded-lg border bg-gray-50 shadow-lg">
              <div className="flex h-16 items-center px-4" style={{ backgroundColor: corCabecalho }} />
              <div className="flex justify-start bg-white p-12">
                <button
                  className="transition-all"
                  style={{
                    backgroundColor: corBotao,
                    color: corTextoBotao,
                    borderRadius: `${raio}px`,
                    padding: `${padding}px`,
                  }}
                >
                  Botão
                </button>
              </div>
              <div
                className="flex flex-col items-center gap-4 p-8 text-center text-white"
                style={{ backgroundColor: corRodape }}
              >
                <div className="w-full max-w-none whitespace-pre-wrap text-sm">{textoRodape}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex w-full max-w-[50%] items-center justify-between transition-all">
          <GdButton className="h-10 px-12 text-sm">Salvar</GdButton>
          <button className="flex h-10 items-center justify-center rounded-md border-2 border-blue-500 bg-transparent px-12 text-sm font-semibold text-blue-500 shadow-sm transition-all hover:bg-blue-50">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

function BotaoEditor({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex size-7 items-center justify-center rounded transition-colors hover:bg-gray-200 [&_svg]:size-3.5"
    >
      {children}
    </button>
  )
}

/** Campo de cor: texto + amostra circular com <input type="color"> por cima. */
function CampoCor({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
}) {
  return (
    <GdFloatField label={label}>
      <input
        type="text"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-500 px-4 py-3 pr-12 text-gray-800 outline-none transition-colors focus:border-gd-blue"
      />
      <div className="absolute right-3 flex items-center gap-2">
        <div
          className="relative h-6 w-6 rounded-full border border-gray-200 shadow-sm"
          style={{ backgroundColor: valor }}
        >
          <input
            type="color"
            value={valor}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </div>
    </GdFloatField>
  )
}
