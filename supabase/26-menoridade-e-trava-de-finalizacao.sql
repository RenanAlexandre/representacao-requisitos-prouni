-- ============================================================================
-- 26 — Filho(a), os dois módulos de menoridade e a trava de finalização
--
-- Rode depois do 25.
--
-- QUATRO COISAS
-- -------------
-- 1. "Filho(a)" entra na lista de parentesco. Era o grau mais comum num grupo
--    familiar e o único que faltava.
--
-- 2. Ao inserir um familiar, o candidato responde se aquela pessoa TEM RG e
--    CPF. Para o menor de idade a resposta decide o módulo: quem tem leva
--    RG + CPF + residência; quem não tem leva certidão de nascimento +
--    residência. Menor de idade com frequência ainda não tirou RG, e pedir o
--    que não existe trava a inscrição da família inteira.
--
-- 3. O módulo de menoridade vira dois. O que já existia continua sendo o de
--    quem tem RG e CPF; o novo é o da certidão.
--
-- 4. Finalizar a coleta passa a exigir parecer do analista em TODO item que
--    tenha arquivo, e nenhum indeferido. "Aprovado" pela conferência
--    automática deixa de valer como parecer: quem finaliza é gente.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Filho(a) na lista de parentesco
--
-- Entra logo depois de Mãe, empurrando o resto. O `if not exists` é o que
-- torna a migração repetível: sem ele, rodar duas vezes empurraria de novo.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from parentescos where codigo = 'filho') then
    update parentescos set ordem = ordem + 1 where ordem >= 5;
    insert into parentescos (codigo, nome, ordem) values ('filho', 'Filho(a)', 5);
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. Os dois módulos de menoridade
--
-- O que existia fica com RG + CPF + residência e ganha sufixo no nome, porque
-- a partir de agora há dois e o nome sozinho não distinguia. O novo pede a
-- certidão de nascimento no lugar da identificação.
--
-- A certidão é inserida direto no módulo novo, e não copiada do módulo base
-- pelo nome como as demais: ela não existe na lista do titular — um candidato
-- ao ProUni é maior de idade e apresenta RG.
-- ---------------------------------------------------------------------------
update modulos_gendocs
   set nome = 'PROUNI: Familiares menoridade — RG e CPF',
       descricao = 'Coleta documental dos membros do grupo familiar com menos de 18 anos que '
                || 'já possuem RG e CPF. Identificação e comprovante de residência — menor de '
                || 'idade não comprova renda.'
 where slug = 'prouni-familiares-menoridade';

do $$
declare
  v_base       uuid;
  v_novo       uuid;
  v_chamada    text;
  v_inicio     date;
  v_fim        date;
  v_certidao   text :=
    'Certidão de nascimento do menor, legível e inteira. Vale a via original ou uma segunda '
 || 'via emitida pelo cartório; o que importa é aparecerem o nome completo, a data de '
 || 'nascimento e a filiação. Envie este documento quando o menor ainda não tiver RG e CPF.';
  v_residencia text;
begin
  select id, chamada, envio_inicio, envio_fim
    into v_base, v_chamada, v_inicio, v_fim
    from modulos_gendocs where slug = 'prouni';

  if v_base is null then
    raise exception 'Módulo base "prouni" não encontrado';
  end if;

  -- O texto do comprovante de residência tem uma fonte só: o do módulo base.
  select descricao into v_residencia
    from documentos_exigidos
   where modulo_id = v_base and nome = 'Comprovante de Residência';

  if v_residencia is null then
    raise exception 'O módulo base não tem Comprovante de Residência — rode a migração 20 antes';
  end if;

  insert into modulos_gendocs
    (slug, nome, descricao, perfil, chamada, envio_inicio, envio_fim,
     situacao, ativo, destaque, link_preenchimento, combinacao)
  values
    ('prouni-familiares-menoridade-certidao',
     'PROUNI: Familiares menoridade — certidão de nascimento',
     'Coleta documental dos membros do grupo familiar com menos de 18 anos que ainda não '
     || 'possuem RG e CPF. A certidão de nascimento faz as vezes da identificação.',
     'familiar_menor', v_chamada, v_inicio, v_fim, 'Iniciado', true, true, 'N/A', null)
  on conflict (slug) do nothing;

  select id into v_novo
    from modulos_gendocs where slug = 'prouni-familiares-menoridade-certidao';

  insert into modulos_sla (modulo_id, status, horas)
  select v_novo, s.status, s.horas from modulos_sla s where s.modulo_id = v_base
  on conflict do nothing;

  insert into documentos_exigidos
    (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a, verifica_ia, campos_ia)
  values
    (v_novo, 1, 'Certidão de Nascimento', true, v_certidao, 'todos', true,
     array['Nome', 'Data de Nascimento', 'Filiação 1', 'Filiação 2']),
    (v_novo, 2, 'Comprovante de Residência', true, v_residencia, 'todos', true, '{}')
  on conflict do nothing;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. A idade escolhe o módulo, a identificação desempata entre os menores
--
-- Para o maior de idade a resposta não muda o módulo: RG e CPF são exigidos
-- de qualquer forma, e quem tem CNH cobre os dois pela equivalência que já
-- existe. A tela avisa isso na hora de escolher.
-- ---------------------------------------------------------------------------
drop function if exists modulo_do_familiar(boolean);

create or replace function modulo_do_familiar(
  p_maior_de_idade   boolean,
  p_tem_identificacao boolean default true
) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_slug text;
begin
  v_slug := case
    when p_maior_de_idade                     then 'prouni-familiares-maioridade'
    when coalesce(p_tem_identificacao, true)  then 'prouni-familiares-menoridade'
    else 'prouni-familiares-menoridade-certidao'
  end;

  select id into v_id from modulos_gendocs where slug = v_slug and ativo;
  if v_id is null then
    raise exception 'Módulo de familiar "%" não encontrado ou inativo', v_slug
      using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

-- A assinatura de quatro argumentos sai ANTES da nova entrar: com as duas
-- vivas, chamar com quatro argumentos ficaria ambíguo (a nova tem default no
-- quinto) e o Postgres recusaria a chamada.
drop function if exists portal_inserir_familiar(uuid, text, date, text);

create or replace function portal_inserir_familiar(
  p_token             uuid,
  p_nome              text,
  p_nascimento        date,
  p_parentesco        text,
  p_tem_identificacao boolean default true
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id      uuid := sessao_candidato(p_token);
  v_membro  uuid;
  v_grupo   uuid;
  v_codigo  text;
  v_email   text;
  v_maior   boolean := maior_de_idade(p_nascimento);
  v_modulo  uuid;
begin
  select codigo into v_codigo from parentescos where nome = p_parentesco;
  if v_codigo is null then
    raise exception 'Parentesco inválido: %', p_parentesco using errcode = '22023';
  end if;

  insert into membros_grupo_familiar (candidato_id, nome, nascimento, parentesco_codigo)
  values (v_id, p_nome, p_nascimento, v_codigo)
  returning id into v_membro;

  v_grupo := garantir_grupo(v_id);
  select c.email into v_email from candidatos c where c.id = v_id;

  v_modulo := modulo_do_familiar(v_maior, p_tem_identificacao);

  -- O e-mail continua sendo o do titular: o familiar não tem e-mail próprio
  -- no sistema, e é o candidato quem acompanha o processo.
  perform gendocs_abrir_coleta(v_grupo, v_modulo, false, null, v_membro,
                               p_nome, v_email, p_parentesco, v_maior);

  return jsonb_build_object(
    'membro_id', v_membro,
    'maior_de_idade', v_maior,
    'tem_identificacao', coalesce(p_tem_identificacao, true),
    'modulo', (select nome from modulos_gendocs where id = v_modulo),
    'email_notificacao', v_email);
end;
$$;

revoke all on function modulo_do_familiar(boolean, boolean) from public;
revoke all on function portal_inserir_familiar(uuid, text, date, text, boolean) from public;
grant execute on function portal_inserir_familiar(uuid, text, date, text, boolean) to anon;


-- ---------------------------------------------------------------------------
-- 4. Finalizar exige parecer em tudo, e nada indeferido
--
-- A regra anterior era "nenhum obrigatório em aberto e nada reprovado". Ela
-- deixava finalizar uma coleta em que a conferência automática aprovou e
-- ninguém olhou — e o opcional anexado podia ficar sem parecer nenhum, porque
-- a contagem só olhava obrigatórios.
--
-- A regra nova, em uma frase: todo item COM ARQUIVO precisa estar aprovado
-- pelo analista, e todo obrigatório precisa estar resolvido.
--
--   • arquivo + reprovado/reprovado_ia  -> indeferido, o candidato reenvia
--   • arquivo + qualquer outro <> aprovado -> falta o parecer (inclui
--     'aprovado_ia': conferência automática não é parecer)
--   • obrigatório sem envio e sem substituto aceito -> falta o documento
--
-- Devolve a lista, não só a contagem: um botão desabilitado sem motivo é o
-- tipo de tela que faz o analista abrir chamado.
-- ---------------------------------------------------------------------------
create or replace function coleta_pendencias_finalizacao(p_coleta_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('nome', x.nome, 'motivo', x.motivo) order by x.sequencia),
    '[]'::jsonb)
    from (
      select de.sequencia, de.nome,
             case
               when dc.arquivo_id is not null and dc.status in ('reprovado', 'reprovado_ia')
                 then 'indeferido — aguardando reenvio do candidato'
               when dc.arquivo_id is not null and dc.status <> 'aprovado'
                 then 'sem parecer do analista'
               when de.obrigatorio and not documento_resolvido(dc.id)
                 then 'obrigatório sem envio'
             end as motivo
        from gendocs_documentos_coleta dc
        join documentos_exigidos de on de.id = dc.documento_id
       where dc.coleta_id = p_coleta_id
    ) x
   where x.motivo is not null;
$$;

comment on function coleta_pendencias_finalizacao is
  'O que impede a finalização desta coleta, item a item. Vazio = pode finalizar.';

create or replace function gendocs_finalizar_coleta(p_participante_id uuid, p_revisor text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_coleta uuid; v_status status_coleta; v_pendencias jsonb;
begin
  select ct.id, ct.status into v_coleta, v_status
    from gendocs_coletas ct where ct.participante_id = p_participante_id;

  if v_coleta is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;

  if v_status = 'finalizada' then
    return jsonb_build_object('ok', false, 'pendentes', 0, 'itens', '[]'::jsonb,
                              'motivo', 'Esta coleta já está finalizada');
  end if;

  v_pendencias := coleta_pendencias_finalizacao(v_coleta);

  if jsonb_array_length(v_pendencias) > 0 then
    return jsonb_build_object('ok', false,
                              'pendentes', jsonb_array_length(v_pendencias),
                              'itens', v_pendencias);
  end if;

  update gendocs_coletas
     set status = 'finalizada', finalizada_em = now(), finalizada_por = p_revisor
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'pendentes', 0, 'itens', '[]'::jsonb);
end;
$$;

-- A tela do analista lê a mesma regra, para o botão desabilitado e o erro do
-- clique nunca discordarem.
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
    'pendencias', coleta_pendencias_finalizacao(ct.id),
    'pode_finalizar', (ct.status <> 'finalizada'
                       and jsonb_array_length(coleta_pendencias_finalizacao(ct.id)) = 0),
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

revoke all on function coleta_pendencias_finalizacao(uuid) from public;
grant execute on function gendocs_finalizar_coleta(uuid, text) to anon;
grant execute on function gendocs_analise_participante(uuid) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_menor_rg   int;
  v_menor_cert int;
  v_docs_cert  text;
  v_filho      int;
  v_modulos    int;
begin
  select count(*) into v_filho from parentescos where codigo = 'filho';

  select count(*) into v_menor_rg from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id
   where m.slug = 'prouni-familiares-menoridade';

  select count(*), string_agg(d.nome, ', ' order by d.sequencia)
    into v_menor_cert, v_docs_cert
    from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id
   where m.slug = 'prouni-familiares-menoridade-certidao';

  select count(*) into v_modulos from modulos_gendocs where slug like 'prouni%' and ativo;

  if v_filho <> 1 then
    raise exception 'Parentesco Filho(a) não entrou';
  end if;
  if v_menor_rg <> 3 then
    raise exception 'Menoridade com RG deveria ter 3 documentos, tem %', v_menor_rg;
  end if;
  if v_menor_cert <> 2 then
    raise exception 'Menoridade com certidão deveria ter 2 documentos, tem % (%)',
      v_menor_cert, v_docs_cert;
  end if;

  raise notice 'módulos ProUni ativos: % | menoridade certidão: %', v_modulos, v_docs_cert;
end;
$$;
