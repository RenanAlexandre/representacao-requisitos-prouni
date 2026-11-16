-- ============================================================================
-- 13 — A visão do analista
--
-- Rode depois do 12.
--
-- Até aqui o GenDocs só tinha o lado do aluno: anexar, ser conferido pela
-- checagem automática, mandar para análise. Faltava o outro lado — a pessoa
-- da Secretaria que abre a coleta, olha documento a documento, aprova ou
-- reprova, e no fim finaliza.
--
-- Duas telas, tiradas dos prints e do HTML salvo
-- "GenDocs - PRIMEIRA TELA DE ANALISE DE UM CANDIDATO, TELA RESUMO.html":
--
--   1. RESUMO — dados do participante e a lista dos documentos com o rótulo
--      de cada um;
--   2. DOCUMENTO — o arquivo, os campos que a leitura automática extraiu com
--      a confiança de cada um, o histórico de uploads, e as ações de
--      aprovação/reprovação manual.
--
-- REGRA CENTRAL: reprovar devolve o documento para o aluno. A coleta que já
-- tinha sido enviada volta a ficar editável, senão o aluno veria "Envio
-- Concluído" e não teria como corrigir o que o analista recusou.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Colunas que faltavam
-- ---------------------------------------------------------------------------

-- Quem finalizou a coleta (o "Finalizado por: --" do cabeçalho).
alter table gendocs_coletas
  add column if not exists finalizada_por text;

-- Cada upload guarda o próprio veredito e quem o deu — é o que a aba
-- "Histórico de Uploads" mostra, uma linha por envio, inclusive os
-- substituídos por um envio posterior.
alter table gendocs_arquivos
  add column if not exists status status_documento not null default 'enviado',
  add column if not exists revisor text;

comment on column gendocs_arquivos.status is
  'Veredito daquele envio. Congelado: um upload novo não reescreve a linha do anterior.';

-- Observações do analista sobre o participante (mockup de edição).
alter table gendocs_participantes
  add column if not exists observacao_1 text,
  add column if not exists observacao_2 text,
  add column if not exists observacao_3 text;

-- Quais campos a leitura automática devolve para este documento. Vazio =
-- documento sem painel lateral de campos.
alter table documentos_exigidos
  add column if not exists campos_ia text[] not null default '{}';

comment on column documentos_exigidos.campos_ia is
  'Campos que o OCR extrai deste documento. Só documentos de identificação (CNH, RG, CPF) têm painel lateral na tela de análise.';

-- Backfill: o arquivo que está vigente herda o status do documento.
update gendocs_arquivos a
   set status = dc.status,
       revisor = coalesce(a.revisor, case when dc.analisado_por is not null then dc.analisado_por else 'GenDocs' end)
  from gendocs_documentos_coleta dc
 where dc.arquivo_id = a.id and a.revisor is null;

update gendocs_arquivos set revisor = 'GenDocs' where revisor is null;


-- ---------------------------------------------------------------------------
-- 2. Templates de campos — só os documentos de identificação
-- ---------------------------------------------------------------------------

update documentos_exigidos de
   set campos_ia = array[
     'Categoria', 'Cadastro de Pessoa Física(CPF)',
     'Data de Nascimento', 'Documento de Identidade',
     'Data de Emissão', 'Data da Primeira Habilitação',
     'Data de Validade', 'Filiação 2',
     'Filiação 1', 'Nacionalidade',
     'Nome', 'Número da Carteira Nacional de Habilitação (CNH)',
     'Número de Registro', 'Órgão Emissor',
     'Tipo de Documento', 'Unidade Federal (UF) Emissor']
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni' and de.nome = 'CNH';

update documentos_exigidos de
   set campos_ia = array[
     'Nome', 'Documento de Identidade',
     'Data de Nascimento', 'Data de Expedição',
     'Filiação 1', 'Filiação 2',
     'Órgão Emissor', 'Unidade Federal (UF) Emissor',
     'Nacionalidade', 'Tipo de Documento']
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni' and de.nome = 'RG';

update documentos_exigidos de
   set campos_ia = array[
     'Nome', 'Cadastro de Pessoa Física(CPF)',
     'Data de Nascimento', 'Tipo de Documento']
  from modulos_gendocs m
 where m.id = de.modulo_id and m.slug = 'prouni' and de.nome = 'CPF';


-- ---------------------------------------------------------------------------
-- 3. Extração simulada
--
-- ⚠️ ANDAIME DE DEMONSTRAÇÃO. Não há OCR nenhum: nada é lido do arquivo. Os
-- valores vêm do cadastro da própria pessoa, para o painel do analista ficar
-- coerente com o resto do protótipo em vez de mostrar dado inventado que
-- contradiz a ficha. A confiança é derivada do nome do campo por hash — fixa
-- entre execuções, e propositalmente nunca 100% em tudo, para a tela mostrar
-- o comportamento de um OCR de verdade.
--
-- Quando um modelo real entrar, esta função sai inteira: quem passa a gravar
-- `ia_extraido` é o modelo, e a tela não muda.
-- ---------------------------------------------------------------------------
create or replace function demo_confianca(p_campo text)
returns numeric
language sql immutable as $$
  -- 95.0 a 100.0, um passo de 0,1 — estável para o mesmo campo.
  select round(95 + (abs(hashtext(p_campo)) % 51) / 10.0, 1);
$$;

create or replace function demo_extrair_campos(p_documento_coleta_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_campos  text[];
  v_campo   text;
  v_nome    text;
  v_cpf     text;
  v_rg      text;
  v_nasc    date;
  v_uf      text;
  v_valor   text;
  v_saida   jsonb := '{}'::jsonb;
begin
  select de.campos_ia, coalesce(c.nome, mb.nome, gp.nome), c.cpf, c.rg,
         coalesce(c.nascimento, mb.nascimento), coalesce(c.uf, 'PR')
    into v_campos, v_nome, v_cpf, v_rg, v_nasc, v_uf
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes gp on gp.id = ct.participante_id
    left join candidatos c on c.id = gp.candidato_id
    left join membros_grupo_familiar mb on mb.id = gp.membro_id
   where dc.id = p_documento_coleta_id;

  if v_campos is null or cardinality(v_campos) = 0 then
    return '{}'::jsonb;
  end if;

  foreach v_campo in array v_campos loop
    v_valor := case v_campo
      when 'Nome' then upper(v_nome)
      when 'Cadastro de Pessoa Física(CPF)' then
        case when v_cpf is null then '—'
             else regexp_replace(v_cpf, '(\d{3})(\d{3})(\d{3})(\d{2})', '\1.\2.\3-\4') end
      when 'Data de Nascimento' then coalesce(to_char(v_nasc, 'DD/MM/YYYY'), '—')
      when 'Documento de Identidade' then coalesce(v_rg, '—')
      when 'Órgão Emissor' then 'SSP ' || v_uf
      when 'Unidade Federal (UF) Emissor' then v_uf
      when 'Nacionalidade' then 'BRASILEIRO(A)'
      when 'Tipo de Documento' then 'DOCUMENTO DE IDENTIFICAÇÃO'
      when 'Categoria' then 'AB'
      -- Os que dependem de dado que o sistema não tem: a demonstração
      -- assume um valor plausível e a confiança denuncia que é leitura.
      when 'Filiação 1' then 'NÃO INFORMADO NO CADASTRO'
      when 'Filiação 2' then 'NÃO INFORMADO NO CADASTRO'
      when 'Data de Emissão' then to_char(current_date - 400, 'DD/MM/YYYY')
      when 'Data de Expedição' then to_char(current_date - 400, 'DD/MM/YYYY')
      when 'Data de Validade' then to_char(current_date + 3000, 'DD/MM/YYYY')
      when 'Data da Primeira Habilitação' then coalesce(to_char(v_nasc + 6600, 'DD/MM/YYYY'), '—')
      when 'Número da Carteira Nacional de Habilitação (CNH)' then
        lpad((abs(hashtext(v_nome)) % 100000000000)::text, 11, '0')
      when 'Número de Registro' then
        lpad((abs(hashtext(v_nome || 'reg')) % 100000000000)::text, 11, '0')
      else '—'
    end;

    v_saida := v_saida || jsonb_build_object(
      v_campo, jsonb_build_object('valor', v_valor, 'confianca', demo_confianca(v_campo)));
  end loop;

  return v_saida;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. O rótulo que o analista lê
--
-- Os quatro que aparecem no print, mais os intermediários. A diferença entre
-- "Aprovado" e "Aprovado Manual" é a origem: o primeiro veio da conferência
-- automática, o segundo de alguém que clicou.
-- ---------------------------------------------------------------------------
create or replace function documento_rotulo_analise(p_documento_coleta_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case dc.status
           when 'aprovado'     then 'Aprovado Manual'
           when 'reprovado'    then 'Reprovado Manual'
           when 'aprovado_ia'  then 'Aprovado'
           when 'reprovado_ia' then 'Reprovado'
           when 'analise'      then 'Em análise'
           when 'enviado'      then 'Aguardando análise'
           else case when documento_resolvido(dc.id)
                     then 'Validado por Equivalência'
                     else 'Envio pendente' end
         end
    from gendocs_documentos_coleta dc where dc.id = p_documento_coleta_id;
$$;


-- ---------------------------------------------------------------------------
-- 5. Tela 1 — resumo da análise
-- ---------------------------------------------------------------------------
create or replace function gendocs_analise_participante(p_participante_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'participante_id', gp.id,
    'nome', gp.nome,
    'email', gp.email,
    'titular', gp.titular,
    'parentesco', gp.parentesco,
    'identificador_externo', gp.identificador_externo,
    'observacao_1', gp.observacao_1,
    'observacao_2', gp.observacao_2,
    'observacao_3', gp.observacao_3,
    'protocolo', g.protocolo,
    'modulo', m.nome,
    'modulo_slug', m.slug,
    'coleta_id', ct.id,
    'status_coleta', ct.status::text,
    'finalizada_por', ct.finalizada_por,
    'finalizada_em', ct.finalizada_em,
    'link_coleta', '/gendocs/coleta/' || m.slug,
    -- Só dá para finalizar quando nenhum obrigatório está em aberto e nada
    -- ficou reprovado esperando o aluno.
    'pode_finalizar', (
      ct.status <> 'finalizada' and not exists (
        select 1 from gendocs_documentos_coleta dc
          join documentos_exigidos de on de.id = dc.documento_id
         where dc.coleta_id = ct.id
           and ((de.obrigatorio and not documento_resolvido(dc.id))
                or dc.status in ('reprovado', 'reprovado_ia')))),
    'documentos', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sequencia)
        from (
          select dc.id as documento_coleta_id, de.sequencia, de.nome,
                 de.obrigatorio, de.descricao,
                 dc.status::text as status,
                 documento_rotulo_analise(dc.id) as rotulo,
                 documento_resolvido(dc.id) as resolvido,
                 dc.analisado_por, dc.analisado_em, dc.motivo_recusa,
                 dc.bypass_ia, dc.ia_aplicada,
                 cardinality(de.campos_ia) > 0 as tem_campos,
                 a.nome_original,
                 (select count(*) from gendocs_arquivos h
                   where h.documento_coleta_id = dc.id) as uploads
            from gendocs_documentos_coleta dc
            join documentos_exigidos de on de.id = dc.documento_id
            left join gendocs_arquivos a on a.id = dc.arquivo_id
           where dc.coleta_id = ct.id
        ) x), '[]'::jsonb))
    from gendocs_participantes gp
    join gendocs_grupos g on g.id = gp.grupo_id
    join modulos_gendocs m on m.id = gp.modulo_id
    join gendocs_coletas ct on ct.participante_id = gp.id
   where gp.id = p_participante_id;
$$;


-- ---------------------------------------------------------------------------
-- 6. Tela 2 — análise de um documento
--
-- `anterior`/`proximo` vêm daqui porque a ordem é a da lista de documentos
-- exigidos, que a tela não conhece sozinha.
-- ---------------------------------------------------------------------------
create or replace function gendocs_analise_documento(p_documento_coleta_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'documento_coleta_id', dc.id,
    'participante_id', gp.id,
    'participante', gp.nome,
    'modulo', m.nome,
    'modulo_slug', m.slug,
    'nome', de.nome,
    'descricao', de.descricao,
    'obrigatorio', de.obrigatorio,
    'status', dc.status::text,
    'rotulo', documento_rotulo_analise(dc.id),
    'resolvido', documento_resolvido(dc.id),
    'motivo_recusa', dc.motivo_recusa,
    'analisado_por', dc.analisado_por,
    'analisado_em', dc.analisado_em,
    'bypass_ia', dc.bypass_ia,
    'ia_aplicada', dc.ia_aplicada,
    'status_coleta', ct.status::text,
    -- Quando o campo foi validado por equivalência, o arquivo que aparece na
    -- tela é o do substituto — é ele que o analista precisa olhar.
    'arquivo', (
      select to_jsonb(y) from (
        select a.nome_original, a.storage_path, a.mime, a.tamanho_bytes,
               a.enviado_em, a.versao, de2.nome as documento_de
          from gendocs_documentos_coleta dc2
          join documentos_exigidos de2 on de2.id = dc2.documento_id
          join gendocs_arquivos a on a.id = dc2.arquivo_id
         where dc2.coleta_id = ct.id
           and (dc2.id = dc.id
                or dc2.documento_id in (select s.documento_id
                                          from documentos_substituicao s
                                         where s.substituido_id = de.id))
           and a.id is not null
         order by (dc2.id = dc.id) desc
         limit 1) y),
    'campos', coalesce(nullif(dc.ia_extraido, '{}'::jsonb), demo_extrair_campos(dc.id)),
    'uploads', coalesce((
      select jsonb_agg(to_jsonb(u) order by u.versao desc)
        from (select a.nome_original, a.revisor, a.enviado_em, a.status::text as status,
                     a.versao, a.tamanho_bytes
                from gendocs_arquivos a where a.documento_coleta_id = dc.id) u), '[]'::jsonb),
    'anterior', (select dc3.id from gendocs_documentos_coleta dc3
                   join documentos_exigidos de3 on de3.id = dc3.documento_id
                  where dc3.coleta_id = ct.id and de3.sequencia < de.sequencia
                  order by de3.sequencia desc limit 1),
    'proximo',  (select dc3.id from gendocs_documentos_coleta dc3
                   join documentos_exigidos de3 on de3.id = dc3.documento_id
                  where dc3.coleta_id = ct.id and de3.sequencia > de.sequencia
                  order by de3.sequencia asc limit 1))
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes gp on gp.id = ct.participante_id
    join modulos_gendocs m on m.id = gp.modulo_id
   where dc.id = p_documento_coleta_id;
$$;


-- ---------------------------------------------------------------------------
-- 7. Ações do analista
-- ---------------------------------------------------------------------------

create or replace function gendocs_aprovar_documento(p_documento_coleta_id uuid, p_revisor text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coleta uuid; v_arquivo uuid;
begin
  select dc.coleta_id, dc.arquivo_id into v_coleta, v_arquivo
    from gendocs_documentos_coleta dc where dc.id = p_documento_coleta_id;

  if v_coleta is null then
    raise exception 'Documento não encontrado' using errcode = 'P0002';
  end if;
  if v_arquivo is null then
    raise exception 'Não há arquivo anexado para aprovar' using errcode = 'P0002';
  end if;

  update gendocs_documentos_coleta
     set status = 'aprovado', analisado_por = p_revisor, analisado_em = now(),
         motivo_recusa = null
   where id = p_documento_coleta_id;

  update gendocs_arquivos set status = 'aprovado', revisor = p_revisor where id = v_arquivo;

  return jsonb_build_object('ok', true, 'rotulo', documento_rotulo_analise(p_documento_coleta_id));
end;
$$;

/**
 * Reprovar devolve o documento ao aluno.
 *
 * Se a coleta já tinha sido enviada (`recebida`), ela volta para `progresso`:
 * sem isso a tela do aluno mostra "Envio Concluído" e ele não tem como
 * corrigir justamente o que foi recusado. `finalizada` não volta — coleta
 * finalizada é ponto final, e reabrir é decisão de quem finalizou.
 */
create or replace function gendocs_reprovar_documento(
  p_documento_coleta_id uuid, p_revisor text, p_motivo text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coleta uuid; v_arquivo uuid; v_status status_coleta; v_reabriu boolean := false;
begin
  select dc.coleta_id, dc.arquivo_id, ct.status
    into v_coleta, v_arquivo, v_status
    from gendocs_documentos_coleta dc
    join gendocs_coletas ct on ct.id = dc.coleta_id
   where dc.id = p_documento_coleta_id;

  if v_coleta is null then
    raise exception 'Documento não encontrado' using errcode = 'P0002';
  end if;
  if v_arquivo is null then
    raise exception 'Não há arquivo anexado para reprovar' using errcode = 'P0002';
  end if;

  update gendocs_documentos_coleta
     set status = 'reprovado', analisado_por = p_revisor, analisado_em = now(),
         motivo_recusa = coalesce(nullif(p_motivo, ''),
           'Reprovado na análise. Envie o documento correto.')
   where id = p_documento_coleta_id;

  update gendocs_arquivos set status = 'reprovado', revisor = p_revisor where id = v_arquivo;

  if v_status = 'recebida' then
    update gendocs_coletas set status = 'progresso', recebida_em = null where id = v_coleta;
    v_reabriu := true;
  end if;

  return jsonb_build_object('ok', true, 'reabriu_coleta', v_reabriu,
                            'rotulo', documento_rotulo_analise(p_documento_coleta_id));
end;
$$;

create or replace function gendocs_finalizar_coleta(p_participante_id uuid, p_revisor text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coleta uuid; v_pendentes int;
begin
  select ct.id into v_coleta from gendocs_coletas ct where ct.participante_id = p_participante_id;
  if v_coleta is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;

  select count(*) into v_pendentes
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where dc.coleta_id = v_coleta
     and ((de.obrigatorio and not documento_resolvido(dc.id))
          or dc.status in ('reprovado', 'reprovado_ia'));

  if v_pendentes > 0 then
    return jsonb_build_object('ok', false, 'pendentes', v_pendentes);
  end if;

  update gendocs_coletas
     set status = 'finalizada', finalizada_em = now(), finalizada_por = p_revisor
   where id = v_coleta;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function gendocs_editar_participante(
  p_participante_id uuid, p_nome text, p_email text,
  p_obs1 text default null, p_obs2 text default null, p_obs3 text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_nome), '') = '' then
    raise exception 'O nome do participante não pode ficar vazio' using errcode = '22023';
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido: %', p_email using errcode = '22023';
  end if;

  update gendocs_participantes
     set nome = trim(p_nome), email = lower(trim(p_email)),
         observacao_1 = nullif(trim(coalesce(p_obs1, '')), ''),
         observacao_2 = nullif(trim(coalesce(p_obs2, '')), ''),
         observacao_3 = nullif(trim(coalesce(p_obs3, '')), '')
   where id = p_participante_id;

  if not found then
    raise exception 'Participante não encontrado' using errcode = 'P0002';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

/**
 * Excluir a coleta apaga o participante junto — no GenDocs os dois são a
 * mesma coisa: participante existe porque tem coleta.
 *
 * O titular do módulo PROUNI não pode ser excluído: seria apagar o candidato
 * do processo por dentro do GenDocs, o que não é decisão desta tela.
 */
create or replace function gendocs_excluir_coleta(p_participante_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_titular boolean; v_perfil perfil_modulo; v_nome text;
begin
  select gp.titular, m.perfil, gp.nome into v_titular, v_perfil, v_nome
    from gendocs_participantes gp
    join modulos_gendocs m on m.id = gp.modulo_id
   where gp.id = p_participante_id;

  if v_nome is null then
    raise exception 'Participante não encontrado' using errcode = 'P0002';
  end if;
  if v_titular and v_perfil = 'prouni' then
    raise exception
      'A coleta principal do titular não pode ser excluída aqui — ela nasce da inscrição.'
      using errcode = '42501';
  end if;

  delete from gendocs_participantes where id = p_participante_id;
  return jsonb_build_object('ok', true, 'excluido', v_nome);
end;
$$;


-- ---------------------------------------------------------------------------
-- 8. Permissões
--
-- Mesma ressalva das outras funções da Secretaria: enquanto não houver login
-- de backoffice, o protótipo entra como `anon`. Quando houver, troque estes
-- grants por `to authenticated` e cheque o papel dentro de cada função — o
-- `p_revisor` que hoje vem da tela passa a vir da sessão.
-- ---------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array[
    'demo_confianca(text)',
    'demo_extrair_campos(uuid)',
    'documento_rotulo_analise(uuid)',
    'gendocs_analise_participante(uuid)',
    'gendocs_analise_documento(uuid)',
    'gendocs_aprovar_documento(uuid,text)',
    'gendocs_reprovar_documento(uuid,text,text)',
    'gendocs_finalizar_coleta(uuid,text)',
    'gendocs_editar_participante(uuid,text,text,text,text,text)',
    'gendocs_excluir_coleta(uuid)'
  ] loop
    execute format('revoke all on function %s from public', f);
  end loop;
end;
$$;

grant execute on function gendocs_analise_participante(uuid)          to anon;
grant execute on function gendocs_analise_documento(uuid)             to anon;
grant execute on function gendocs_aprovar_documento(uuid,text)        to anon;
grant execute on function gendocs_reprovar_documento(uuid,text,text)  to anon;
grant execute on function gendocs_finalizar_coleta(uuid,text)         to anon;
grant execute on function gendocs_excluir_coleta(uuid)                to anon;
grant execute on function gendocs_editar_participante(uuid,text,text,text,text,text) to anon;
