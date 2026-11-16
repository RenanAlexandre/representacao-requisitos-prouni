-- ============================================================================
-- 20 — Comprovante de residência, histórico separado do certificado,
--      descritivos vindos do FAQ e recurso na primeira recusa
--
-- Rode depois do 19.
--
-- FONTE NOVA: "FAQ PROUNI 2026 1.docx", que o usuário colocou na pasta do
-- projeto. É o material que a UNIFATECIE entrega ao candidato, e por isso vale
-- mais que a lista antiga para o TEXTO de cada documento. Onde ele CONTRADIZ a
-- estrutura que já existe (por exemplo: o FAQ pede um único documento de
-- identificação por pessoa, e não RG + CPF), a contradição foi relatada ao
-- usuário e NÃO resolvida aqui — só o descritivo passou a mencionar as
-- alternativas.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Ajudante: inserir um documento logo abaixo de outro
--
-- `(modulo_id, sequencia)` é único e o índice é conferido linha a linha, então
-- abrir espaço no meio exige subir todo mundo para uma faixa livre e descer
-- depois. Fica como função porque três documentos entram no meio da lista, em
-- dezoito módulos.
-- ---------------------------------------------------------------------------
create or replace function inserir_documento_apos(
  p_modulo_id   uuid,
  p_ancora      text,
  p_nome        text,
  p_obrigatorio boolean,
  p_descricao   text,
  p_aplica_a    text default 'todos',
  p_verifica_ia boolean default true
) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_seq int;
begin
  if exists (select 1 from documentos_exigidos
              where modulo_id = p_modulo_id and nome = p_nome) then
    return false;
  end if;

  select sequencia into v_seq from documentos_exigidos
   where modulo_id = p_modulo_id and nome = p_ancora;
  if v_seq is null then
    return false;   -- o módulo não tem a âncora: não é caso dele
  end if;

  update documentos_exigidos set sequencia = sequencia + 100
   where modulo_id = p_modulo_id and sequencia > v_seq;
  update documentos_exigidos set sequencia = sequencia - 99
   where modulo_id = p_modulo_id and sequencia > 100;

  insert into documentos_exigidos
    (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a, verifica_ia)
  values
    (p_modulo_id, v_seq + 1, p_nome, p_obrigatorio, p_descricao, p_aplica_a, p_verifica_ia);
  return true;
end;
$$;

revoke all on function inserir_documento_apos(uuid, text, text, boolean, text, text, boolean) from public;


-- ---------------------------------------------------------------------------
-- 1. Os três documentos novos, em todos os módulos que fazem sentido
-- ---------------------------------------------------------------------------
do $$
declare
  m record;
  v_residencia text :=
    'Envie UM comprovante recente (até três meses). Valem: conta de água, energia, gás ou ' ||
    'telefone (fixo ou celular); boleto de condomínio, de mensalidade escolar ou de plano de ' ||
    'saúde; fatura de cartão de crédito; IPTU ou IPVA. ' ||
    'EM NOME DO CANDIDATO: quando ele declara independência financeira — mora sozinho e tem ' ||
    'renda própria compatível com o padrão de vida informado. ' ||
    'EM NOME DE ALGUÉM DO GRUPO FAMILIAR: quando o candidato mora com a família. Nesse caso ' ||
    'não é preciso comprovante no nome dele. ' ||
    'IMÓVEL ALUGADO: contrato de locação acompanhado de um comprovante de residência em nome ' ||
    'do proprietário. ' ||
    'IMÓVEL CEDIDO OU SEM CONTRATO: Declaração de Imóvel Cedido preenchida e assinada pelo ' ||
    'proprietário, com firma reconhecida, junto de um comprovante de residência e do documento ' ||
    'de identificação dele.';
  v_certificado text :=
    'Certificado de conclusão emitido pela escola. Muitas escolas emitem o certificado dentro ' ||
    'do próprio histórico — se for o seu caso, envie o mesmo arquivo nos dois campos.';
  v_ausencia text :=
    'Para quem não tem renda nenhuma. Declaração de ausência de renda assinada e com firma ' ||
    'reconhecida em cartório — o modelo é fornecido pelo setor ProUni. Substitui o comprovante ' ||
    'de renda. Vale para cada integrante do grupo familiar com 18 anos ou mais que esteja sem ' ||
    'renda no período.';
begin
  for m in select id, slug from modulos_gendocs where slug like 'prouni%' loop
    -- Comprovante de residência: exigido em TODOS os módulos, logo abaixo do
    -- comprovante de estado civil.
    perform inserir_documento_apos(m.id, 'Comprovante de Estado Civil',
              'Comprovante de Residência', true, v_residencia, 'todos', true);

    -- O histórico deixa de carregar o certificado no mesmo campo.
    update documentos_exigidos
       set nome = 'Histórico do Ensino Médio',
           descricao = 'Histórico escolar completo do Ensino Médio, emitido pela escola. ' ||
                       'Se a escola ainda não emitiu, vale declaração assinada, carimbada e ' ||
                       'em papel timbrado.'
     where modulo_id = m.id and nome = 'Histórico do Ensino Médio + Certificado';

    perform inserir_documento_apos(m.id, 'Histórico do Ensino Médio',
              'Certificado de Conclusão do Ensino Médio', true, v_certificado, 'titular', true);

    -- Sem esta opção, quem não tem renda não teria como cumprir o comprovante
    -- de renda obrigatório. O FAQ prevê o caso; a lista não previa.
    perform inserir_documento_apos(m.id, 'Comprovante de renda - RECIBOS DE ALUGUEL',
              'Declaração de ausência de renda', false, v_ausencia, 'todos', false);
  end loop;
end;
$$;

-- A declaração de ausência de renda cobre o comprovante de renda obrigatório.
insert into documentos_substituicao (documento_id, substituido_id)
select aus.id, hol.id
  from documentos_exigidos aus
  join documentos_exigidos hol
    on hol.modulo_id = aus.modulo_id
   and hol.nome = 'Comprovante de renda - HOLERITE/CONTRACHEQUES'
 where aus.nome = 'Declaração de ausência de renda'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 2. Descritivos reescritos com o FAQ
--
-- Um UPDATE por documento, casando pelo nome em todos os módulos. O texto de
-- isenção de conferência (migração 10) é reaplicado no fim, para não sumir dos
-- declaratórios ao reescrever a descrição.
-- ---------------------------------------------------------------------------
update documentos_exigidos d set descricao = t.texto
  from (values
    ('Ficha de Inscrição',
     'As duas páginas da ficha emitida pelo Sispro, com todos os dados da sua inscrição.'),

    ('RG',
     'Frente e verso no mesmo arquivo. O ProUni aceita um documento de identificação por ' ||
     'pessoa: no lugar do RG valem também Carteira Funcional, Identidade Militar ou Passaporte ' ||
     'emitido no Brasil.'),

    ('CPF',
     'Cartão do CPF ou qualquer documento oficial que traga o número do CPF de forma legível.'),

    ('CNH',
     'Substitui o RG e o CPF quando enviada — o ProUni aceita um documento de identificação ' ||
     'por integrante do grupo familiar. Envie o documento completo, com foto legível.'),

    ('Comprovante de Estado Civil',
     'Certidão de nascimento, de casamento, de união estável, averbação de divórcio ou ' ||
     'certidão de óbito, conforme a sua situação.'),

    ('Carteira de Trabalho - CTPS',
     'CTPS DIGITAL: baixe o PDF completo no aplicativo e envie o arquivo inteiro. ' ||
     'CTPS FÍSICA: envie as páginas de identificação, todas as páginas com registros de ' ||
     'admissão e demissão, e a página logo depois do último registro (mesmo em branco). ' ||
     'Quem nunca teve carteira envia declaração de esclarecimento.'),

    ('Declaração de Imposto de Renda',
     'Declaração completa do último exercício, com o recibo de entrega. Quem não é obrigado a ' ||
     'declarar envia a Certidão Negativa de Débitos da Receita Federal.'),

    ('Comprovante de renda - HOLERITE/CONTRACHEQUES',
     'Para assalariados: CLT, servidor público, cargo comissionado, função gratificada ou ' ||
     'cargo eletivo. RENDA FIXA: os três últimos contracheques. RENDA VARIÁVEL (com comissão ' ||
     'ou hora extra): os seis últimos contracheques.'),

    ('Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS',
     'Para autônomos: declaração de autônomo assinada e com firma reconhecida em cartório ' ||
     '(modelo fornecido pelo setor ProUni). Para profissionais liberais: declaração com o ' ||
     'número de registro no órgão que regulamenta a profissão. Substitui o holerite/contracheque.'),

    ('Comprovante de renda - CONTRATO SOCIAL + DECORE',
     'Para sócios e dirigentes de empresa: os três últimos comprovantes da remuneração mensal ' ||
     '(pró-labore), acompanhados do contrato social. Substitui o holerite/contracheque.'),

    ('Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS',
     'Para aposentados e pensionistas: extrato mais recente do pagamento do benefício, tirado ' ||
     'em meu.inss.gov.br. Substitui o holerite/contracheque.'),

    ('Comprovante de renda - NOTA DE PRODUTOR',
     'Para atividade rural: notas fiscais de venda dos últimos SEIS meses — a renda é apurada ' ||
     'pela média mensal desse período. Substitui o holerite/contracheque.'),

    ('Comprovante de renda - RECIBOS DE ALUGUEL',
     'Para quem recebe aluguel ou arrendamento: contrato registrado em cartório mais os TRÊS ' ||
     'últimos comprovantes de recebimento. Substitui o holerite/contracheque.'),

    ('Documento comprobatório de Raça e Cor - PPI',
     'Declaração de raça e cor assinada, no modelo da Secretaria. Exigida de quem concorre na ' ||
     'modalidade PPI — preto, pardo ou indígena.'),

    ('Documento comprobatório de encerramento de vínculo com outra instituição',
     'Declaração da instituição de ensino superior anterior confirmando o encerramento da ' ||
     'matrícula. A legislação não permite manter matrícula em instituição pública gratuita e ' ||
     'usar a bolsa do ProUni ao mesmo tempo.'),

    ('Documento comprobatório de encerramento do usufruto da bolsa ProUni ou do FIES',
     'Declaração de encerramento emitida pela instituição que concedeu o benefício. Não é ' ||
     'permitido acumular duas bolsas do ProUni ao mesmo tempo.'),

    ('Documento comprobatório de vínculo como professor da rede pública',
     'Declaração ou certidão da secretaria de educação com o vínculo efetivo no magistério da ' ||
     'educação básica pública, junto do último contracheque. Esta modalidade vale apenas para ' ||
     'os cursos de licenciatura, normal superior e pedagogia voltados à formação do magistério ' ||
     'da educação básica.')
  ) as t(nome, texto)
 where d.nome = t.nome;

-- Reaplica o aviso dos declaratórios, que a reescrita acima apagou.
update documentos_exigidos
   set descricao = coalesce(descricao || ' ', '') ||
       'O sistema aceita este anexo sem conferência automática — a responsabilidade pelo conteúdo é sua. ' ||
       'O documento deve representar a realidade: documento incorreto ou que não corresponda à sua situação ' ||
       'gera indeferimento desta etapa do processo.'
 where verifica_ia = false
   and descricao not like '%sem conferência automática%';


-- ---------------------------------------------------------------------------
-- 3. As coletas abertas recebem as linhas dos documentos novos
-- ---------------------------------------------------------------------------
insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
select ct.id, d.id, 'pendente'
  from gendocs_participantes p
  join gendocs_coletas ct on ct.participante_id = p.id
  join documentos_exigidos d on d.modulo_id = p.modulo_id
 where (d.aplica_a = 'todos' or (d.aplica_a = 'titular' and p.titular))
   and not exists (select 1 from gendocs_documentos_coleta x
                    where x.coleta_id = ct.id and x.documento_id = d.id);


-- ---------------------------------------------------------------------------
-- 4. Recurso já na primeira recusa
--
-- Três tentativas eram muitas para uma checagem que confere NOME DE ARQUIVO:
-- quem erra uma vez tende a errar de novo pelo mesmo motivo, e o candidato
-- ficava preso repetindo o envio. Agora a primeira recusa já libera o envio
-- direto para o analista.
-- ---------------------------------------------------------------------------
update configuracoes set valor = '1'::jsonb where chave = 'recusas_ia_para_recurso';


-- ---------------------------------------------------------------------------
-- 5. Coleta enviada não muda mais
--
-- Depois de "Enviar para Análise" o candidato não anexa, não troca e não
-- remove nada — até o analista deferir ou indeferir. Indeferir um documento
-- reabre a coleta (migração 13), e só então ele volta a poder mexer, no item
-- que voltou.
-- ---------------------------------------------------------------------------
create or replace function coleta_editavel(p_documento_coleta_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select ct.status not in ('recebida', 'finalizada')
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
   where dc.id = p_documento_coleta_id;
$$;

create or replace function portal_remover_anexo(p_token uuid, p_documento_coleta_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  if not exists (
    select 1 from gendocs_documentos_coleta dc
      join gendocs_coletas ct on ct.id = dc.coleta_id
      join gendocs_participantes p on p.id = ct.participante_id
      join gendocs_grupos g on g.id = p.grupo_id
     where dc.id = p_documento_coleta_id and g.candidato_id = v_id
       and dc.status <> 'aprovado'
  ) then
    raise exception 'Documento fora do seu grupo ou já aprovado pelo analista'
      using errcode = '42501';
  end if;

  if not coleta_editavel(p_documento_coleta_id) then
    raise exception 'A coleta já foi enviada para análise e não pode mais ser alterada'
      using errcode = '42501';
  end if;

  update gendocs_documentos_coleta
     set arquivo_id = null, enviado_em = null, status = 'pendente',
         motivo_recusa = null, ia_status = null, ia_motivo = null,
         ia_confianca = null, ia_extraido = null, ia_analisado_em = null,
         ia_aplicada = false, bypass_ia = false, bypass_em = null
   where id = p_documento_coleta_id;

  delete from gendocs_arquivos where documento_coleta_id = p_documento_coleta_id;
end;
$$;

revoke all on function coleta_editavel(uuid) from public;
grant execute on function portal_remover_anexo(uuid, uuid) to anon;


-- ---------------------------------------------------------------------------
-- 6. A tabela de demonstração mostra as quatro declarações
-- ---------------------------------------------------------------------------
create or replace function demo_usuarios()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.criado_em desc), '[]'::jsonb)
    from (
      select c.id, c.protocolo, c.nome, c.cpf, c.nascimento,
             c.aceite_cota                    as cota,
             c.declara_encerramento_matricula as encerra_matricula,
             c.declara_encerramento_beneficio as encerra_beneficio,
             c.declara_professor_rede_publica as professor,
             c.created_at                     as criado_em,
             ps.nome                          as processo_seletivo,
             m.nome                           as modulo
        from candidatos c
        left join inscricoes i on i.candidato_id = c.id
        left join concursos cc on cc.id = i.concurso_id
        left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
        left join gendocs_grupos g on g.candidato_id = c.id
        left join gendocs_participantes p on p.grupo_id = g.id and p.titular
        left join modulos_gendocs m on m.id = p.modulo_id
    ) x;
$$;

comment on function demo_usuarios is
  '⚠️ ANDAIME DE DEMONSTRAÇÃO. Devolve CPF e data de nascimento, que são usuário e senha do portal. Derrubar antes de qualquer uso com dado real.';

revoke all on function demo_usuarios() from public;
grant execute on function demo_usuarios() to anon;


-- ---------------------------------------------------------------------------
-- 7. Conferência
-- ---------------------------------------------------------------------------
do $$
declare v_sem_residencia int; v_sem_certificado int; v_limite int;
begin
  select count(*) into v_sem_residencia
    from modulos_gendocs m
   where m.slug like 'prouni%'
     and not exists (select 1 from documentos_exigidos d
                      where d.modulo_id = m.id and d.nome = 'Comprovante de Residência');

  -- O certificado só existe onde havia o histórico (módulos de titular).
  select count(*) into v_sem_certificado
    from modulos_gendocs m
   where m.combinacao is not null
     and not exists (select 1 from documentos_exigidos d
                      where d.modulo_id = m.id
                        and d.nome = 'Certificado de Conclusão do Ensino Médio');

  select (valor #>> '{}')::int into v_limite
    from configuracoes where chave = 'recusas_ia_para_recurso';

  if v_sem_residencia > 0 then
    raise exception '% módulo(s) sem comprovante de residência', v_sem_residencia;
  end if;
  if v_sem_certificado > 0 then
    raise exception '% módulo(s) de titular sem o certificado', v_sem_certificado;
  end if;
  if v_limite <> 1 then
    raise exception 'Limite de recusas deveria ser 1, é %', v_limite;
  end if;

  raise notice 'residência em todos os módulos; certificado nos 16 de titular; recurso na 1ª recusa';
end;
$$;
