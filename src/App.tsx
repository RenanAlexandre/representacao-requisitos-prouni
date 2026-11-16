import { Routes, Route, Navigate } from 'react-router-dom'

import { Hub } from './pages/Hub'
import { Landing } from './pages/lp/Landing'
import { PaginaContrato } from './pages/Contrato'

import { PortalLayout } from './layouts/PortalLayout'
import { PortalEntrar } from './pages/portal/Entrar'
import { PortalInicio } from './pages/portal/Inicio'
import { PortalDados } from './pages/portal/DadosCadastrais'
import { PortalColetas } from './pages/portal/Coletas'
import { PortalTermos } from './pages/portal/Termos'

import { GenDocsLayout } from './layouts/GenDocsLayout'
import { GdModulos } from './pages/gendocs/Modulos'
import { GdModulo } from './pages/gendocs/Modulo'
import { GdDadosModulo } from './pages/gendocs/DadosModulo'
import { GdDocumentosRegras } from './pages/gendocs/DocumentosRegras'
import { GdParticipantes } from './pages/gendocs/Participantes'
import { GdComunicacoes, GdTextosEmails } from './pages/gendocs/Comunicacoes'
import { GdLayoutEmail } from './pages/gendocs/LayoutEmail'
import { GdRelatorios, GdIntegracoes } from './pages/gendocs/RelatoriosIntegracoes'
import { GdColetaAluno } from './pages/gendocs/ColetaAluno'
import { GdAnaliseResumo, GdAnaliseDocumento } from './pages/gendocs/Analise'

import { ErpLayout } from './layouts/ErpLayout'
import { ErpCandidatos, ErpCandidatoDetalhes } from './pages/erp/Candidatos'
import {
  ErpProcessosSeletivos, ErpProcessoMenu, ErpProcessoDetalhes,
  ErpConcursos, ErpConcursoDetalhes, ErpProcessoCandidatos, ErpTurmas,
} from './pages/erp/ProcessosSeletivos'

export default function App() {
  return (
    <Routes>
      {/* Hub — primeira página do sistema */}
      <Route path="/" element={<Hub />} />

      {/* Landing page de captação */}
      <Route path="/lp" element={<Landing />} />

      {/* O contrato, aberto pelo aceite da landing. Fora do Portal porque
          quem está se inscrevendo ainda não tem login. */}
      <Route path="/contrato" element={<PaginaContrato />} />

      {/* Portal do Candidato — acesso pós-cadastro */}
      <Route path="/aluno/entrar" element={<PortalEntrar />} />
      <Route path="/aluno" element={<PortalLayout />}>
        <Route index element={<PortalInicio />} />
        <Route path="dados" element={<PortalDados />} />
        <Route path="coletas" element={<PortalColetas />} />
        <Route path="termos" element={<PortalTermos />} />
      </Route>

      {/* GenDocs — visão do ALUNO da coleta. Fora do layout de administração:
          o aluno não vê o menu da Secretaria, só a barra azul com o logo. */}
      <Route path="/gendocs/coleta/:slug" element={<GdColetaAluno />} />

      {/* GenDocs — réplica da plataforma (visão da Secretaria) */}
      <Route path="/gendocs" element={<GenDocsLayout />}>
        <Route index element={<GdModulos />} />
        <Route path="modulo/:slug" element={<GdModulo />} />
        <Route path="modulo/:slug/dados" element={<GdDadosModulo />} />
        <Route path="modulo/:slug/documentos" element={<GdDocumentosRegras />} />
        <Route path="modulo/:slug/participantes" element={<GdParticipantes />} />
        {/* Análise: resumo da coleta de uma pessoa e a tela de um documento. */}
        <Route path="modulo/:slug/participantes/:participanteId" element={<GdAnaliseResumo />} />
        <Route
          path="modulo/:slug/participantes/:participanteId/documento/:docId"
          element={<GdAnaliseDocumento />}
        />
        <Route path="modulo/:slug/comunicacoes" element={<GdComunicacoes />} />
        <Route path="modulo/:slug/comunicacoes/layout" element={<GdLayoutEmail />} />
        <Route path="modulo/:slug/comunicacoes/textos" element={<GdTextosEmails />} />
        <Route path="modulo/:slug/relatorios" element={<GdRelatorios />} />
        <Route path="modulo/:slug/integracoes" element={<GdIntegracoes />} />
      </Route>

      {/* ERP UniFatecie — módulo Processos Seletivos (Candidatos e Processos seletivos) */}
      <Route path="/erp" element={<ErpLayout />}>
        <Route index element={<Navigate to="/erp/candidatos" replace />} />

        <Route path="candidatos" element={<ErpCandidatos />} />
        <Route path="candidatos/:id" element={<ErpCandidatoDetalhes />} />

        <Route path="processos-seletivos" element={<ErpProcessosSeletivos />} />
        <Route path="processos-seletivos/:psId/menu" element={<ErpProcessoMenu />} />
        <Route path="processos-seletivos/:psId/detalhes" element={<ErpProcessoDetalhes />} />
        <Route path="processos-seletivos/:psId/concursos" element={<ErpConcursos />} />
        <Route path="processos-seletivos/:psId/concursos/:concursoId" element={<ErpConcursoDetalhes />} />
        <Route path="processos-seletivos/:psId/candidatos" element={<ErpProcessoCandidatos />} />
        <Route path="processos-seletivos/:psId/turmas" element={<ErpTurmas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
