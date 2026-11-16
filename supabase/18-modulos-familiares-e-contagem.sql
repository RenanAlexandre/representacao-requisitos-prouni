-- ============================================================================
-- 18 — Módulos dos familiares + contagem pelos obrigatórios
--
-- Rode depois do 17.
--
-- DUAS COISAS
-- -----------
-- 1. O familiar sai do módulo do titular e ganha módulo próprio, por idade:
--    maior de 18 leva a lista completa (identificação, estado civil, trabalho
--    e renda); menor de 18 leva só identificação e estado civil. São os
--    módulos 17 e 18 — os 16 de combinação continuam sendo do titular.
--
-- 2. A contagem de documentos passa a ser sobre os OBRIGATÓRIOS.
--    "3 de 14" era mentira: dos 14, cinco são comprovantes de renda
--    alternativos que existem justamente para NÃO serem enviados junto. O
--    denominador honesto é o que a pessoa realmente precisa entregar.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. Um nome só para o documento de estado civil
--
-- A lista dos familiares pede "comprovante de estado civil" e a do titular
-- dizia só "Estado Civil". É o mesmo documento; dois nomes para a mesma coisa
-- quebrariam o casamento por nome que as migrações usam para mover gente
-- entre módulos.
-- ---------------------------------------------------------------------------
update documentos_exigidos set nome = 'Comprovante de Estado Civil'
 where nome = 'Estado Civil';


-- ---------------------------------------------------------------------------
-- 1. Os dois módulos de familiar
-- ---------------------------------------------------------------------------
do $$
declare
  v_base    uuid;
  v_chamada text;
  v_inicio  date;
  v_fim     date;
  v_maior   uuid;
  v_menor   uuid;
begin
  select id, chamada, envio_inicio, envio_fim
    into v_base, v_chamada, v_inicio, v_fim
    from modulos_gendocs where slug = 'prouni';

  -- `combinacao` fica NULL: estes não são módulos de titular, e
  -- `modulo_do_candidato` só olha para os que têm combinação.
  insert into modulos_gendocs
    (slug, nome, descricao, perfil, chamada, envio_inicio, envio_fim,
     situacao, ativo, destaque, link_preenchimento, combinacao)
  values
    ('prouni-familiares-maioridade', 'PROUNI: Familiares maioridade',
     'Coleta documental dos membros do grupo familiar com 18 anos ou mais. ' ||
     'Identificação, estado civil, vínculo de trabalho e comprovação de renda.',
     'familiar_maior', v_chamada, v_inicio, v_fim, 'Iniciado', true, true, 'N/A', null),
    ('prouni-familiares-menoridade', 'PROUNI: Familiares menoridade',
     'Coleta documental dos membros do grupo familiar com menos de 18 anos. ' ||
     'Só identificação e estado civil — menor de idade não comprova renda.',
     'familiar_menor', v_chamada, v_inicio, v_fim, 'Iniciado', true, true, 'N/A', null)
  on conflict (slug) do nothing;

  select id into v_maior from modulos_gendocs where slug = 'prouni-familiares-maioridade';
  select id into v_menor from modulos_gendocs where slug = 'prouni-familiares-menoridade';

  insert into modulos_sla (modulo_id, status, horas)
  select v_maior, s.status, s.horas from modulos_sla s where s.modulo_id = v_base
  on conflict do nothing;
  insert into modulos_sla (modulo_id, status, horas)
  select v_menor, s.status, s.horas from modulos_sla s where s.modulo_id = v_base
  on conflict do nothing;

  -- Os documentos são os mesmos do titular, pelo nome: assim `verifica_ia`,
  -- `campos_ia`, descrição e obrigatoriedade vêm de uma fonte só, e mover um
  -- participante entre módulos continua funcionando pelo nome.
  insert into documentos_exigidos
    (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a, verifica_ia, campos_ia)
  select v_maior, x.seq, d.nome, d.obrigatorio, d.descricao, 'todos', d.verifica_ia, d.campos_ia
    from (values
      (1,  'CPF'),
      (2,  'RG'),
      (3,  'CNH'),
      (4,  'Comprovante de Estado Civil'),
      (5,  'Carteira de Trabalho - CTPS'),
      (6,  'Declaração de Imposto de Renda'),
      (7,  'Comprovante de renda - HOLERITE/CONTRACHEQUES'),
      (8,  'Comprovante de renda - SIMEI, DECORE, DECLARAÇÃO DE RENDIMENTOS'),
      (9,  'Comprovante de renda - CONTRATO SOCIAL + DECORE'),
      (10, 'Comprovante de renda - EXTRATOS PREVIDÊNCIA/INSS'),
      (11, 'Comprovante de renda - NOTA DE PRODUTOR'),
      (12, 'Comprovante de renda - RECIBOS DE ALUGUEL')
    ) as x(seq, nome)
    join documentos_exigidos d on d.modulo_id = v_base and d.nome = x.nome
  on conflict do nothing;

  insert into documentos_exigidos
    (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a, verifica_ia, campos_ia)
  select v_menor, x.seq, d.nome, true, d.descricao, 'todos', d.verifica_ia, d.campos_ia
    from (values
      (1, 'RG'),
      (2, 'CPF'),
      (3, 'Comprovante de Estado Civil')
    ) as x(seq, nome)
    join documentos_exigidos d on d.modulo_id = v_base and d.nome = x.nome
  on conflict do nothing;

  -- Equivalências do módulo de maioridade: a CNH cobre RG e CPF, e cada
  -- comprovante alternativo cobre o holerite. O de menoridade não tem CNH,
  -- então não tem equivalência nenhuma.
  insert into documentos_substituicao (documento_id, substituido_id)
  select novo_de.id, novo_alvo.id
    from documentos_substituicao s
    join documentos_exigidos base_de   on base_de.id = s.documento_id
    join documentos_exigidos base_alvo on base_alvo.id = s.substituido_id
    join documentos_exigidos novo_de   on novo_de.modulo_id = v_maior   and novo_de.nome   = base_de.nome
    join documentos_exigidos novo_alvo on novo_alvo.modulo_id = v_maior and novo_alvo.nome = base_alvo.nome
   where base_de.modulo_id = v_base
  on conflict do nothing;
end;
$$;


-- ---------------------------------------------------------------------------
-- 2. O familiar novo já nasce no módulo da idade dele
-- ---------------------------------------------------------------------------
create or replace function modulo_do_familiar(p_maior_de_idade boolean)
returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_slug text;
begin
  v_slug := case when p_maior_de_idade
                 then 'prouni-familiares-maioridade'
                 else 'prouni-familiares-menoridade' end;
  select id into v_id from modulos_gendocs where slug = v_slug and ativo;
  if v_id is null then
    raise exception 'Módulo de familiar "%" não encontrado ou inativo', v_slug
      using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;

create or replace function portal_inserir_familiar(
  p_token      uuid,
  p_nome       text,
  p_nascimento date,
  p_parentesco text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid := sessao_candidato(p_token);
  v_membro uuid;
  v_grupo  uuid;
  v_codigo text;
  v_email  text;
  v_maior  boolean := maior_de_idade(p_nascimento);
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

  -- A idade decide o módulo. O e-mail continua sendo o do titular: o familiar
  -- não tem e-mail próprio no sistema.
  perform gendocs_abrir_coleta(v_grupo, modulo_do_familiar(v_maior), false, null, v_membro,
                               p_nome, v_email, p_parentesco, v_maior);

  return jsonb_build_object(
    'membro_id', v_membro,
    'maior_de_idade', v_maior,
    'email_notificacao', v_email);
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Os familiares que já existem mudam de módulo
--
-- Mesma técnica da 16: move o participante e reaponta cada linha da coleta
-- para o documento homônimo do destino. Os 12 documentos do familiar maior
-- são exatamente os 12 `aplica_a = 'todos'` que ele já tinha no módulo do
-- titular, então nada se perde. Para o menor, o que sobra é apagado.
-- ---------------------------------------------------------------------------
do $$
declare
  f         record;
  v_destino uuid;
  v_movidos int := 0;
begin
  for f in
    select p.id, p.modulo_id, maior_de_idade(mf.nascimento) as maior
      from gendocs_participantes p
      join membros_grupo_familiar mf on mf.id = p.membro_id
     where not p.titular
  loop
    v_destino := modulo_do_familiar(f.maior);
    continue when f.modulo_id = v_destino;

    update gendocs_participantes set modulo_id = v_destino where id = f.id;

    update gendocs_documentos_coleta dc
       set documento_id = novo.id
      from documentos_exigidos velho, documentos_exigidos novo,
           gendocs_coletas ct
     where velho.id = dc.documento_id
       and ct.id = dc.coleta_id and ct.participante_id = f.id
       and novo.modulo_id = v_destino
       and novo.nome = velho.nome
       and novo.id <> velho.id;

    -- O que o destino não pede sai (caso do familiar menor).
    delete from gendocs_documentos_coleta dc
     using documentos_exigidos d, gendocs_coletas ct
     where d.id = dc.documento_id and ct.id = dc.coleta_id
       and ct.participante_id = f.id and d.modulo_id <> v_destino;

    -- E o que ele pede e ainda não tem linha entra.
    insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
    select ct.id, d.id, 'pendente'
      from gendocs_coletas ct
      join documentos_exigidos d on d.modulo_id = v_destino
     where ct.participante_id = f.id
       and not exists (select 1 from gendocs_documentos_coleta x
                        where x.coleta_id = ct.id and x.documento_id = d.id);

    v_movidos := v_movidos + 1;
  end loop;

  raise notice 'familiares movidos: %', v_movidos;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. Estado efetivo de um obrigatório
--
-- Um obrigatório coberto por substituto não está "pendente", e um substituto
-- recusado tem de aparecer como problema DO obrigatório que ele cobria —
-- senão o candidato vê "pendente" no holerite e não entende que o que foi
-- recusado é o SIMEI que ele mandou no lugar.
--
-- Precedência: aprovado > em análise > reprovado > pendente.
-- ---------------------------------------------------------------------------
create or replace function estado_efetivo(p_documento_coleta_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  with alvo as (
    select dc.id, dc.coleta_id, dc.documento_id, dc.status
      from gendocs_documentos_coleta dc where dc.id = p_documento_coleta_id
  ),
  -- O próprio, mais todos os que o substituem nesta coleta.
  familia as (
    select a.status from alvo a
    union all
    select d2.status
      from alvo a
      join documentos_substituicao s on s.substituido_id = a.documento_id
      join gendocs_documentos_coleta d2
        on d2.documento_id = s.documento_id and d2.coleta_id = a.coleta_id
  )
  select case
    when exists (select 1 from familia where status in ('aprovado', 'aprovado_ia'))  then 'aprovado'
    when exists (select 1 from familia where status in ('enviado', 'analise'))       then 'analise'
    when exists (select 1 from familia where status in ('reprovado', 'reprovado_ia')) then 'reprovado'
    else 'pendente'
  end;
$$;


-- ---------------------------------------------------------------------------
-- 5. As contagens passam a olhar só o que é obrigatório
-- ---------------------------------------------------------------------------

create or replace function portal_meu_grupo(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.titular desc, x.nome)
      from (
        select gp.id            as participante_id,
               gp.membro_id,
               gp.titular,
               gp.nome,
               gp.parentesco,
               gp.email,
               mf.nascimento,
               case when gp.titular then true
                    else maior_de_idade(mf.nascimento) end as maior_de_idade,
               m.nome           as modulo,
               m.slug           as modulo_slug,
               m.perfil::text   as perfil,
               ct.status::text  as status_coleta,
               ct.prazo_em,
               coalesce(d.total, 0)      as total_documentos,
               coalesce(d.aprovados, 0)  as aprovados,
               coalesce(d.analise, 0)    as em_analise,
               coalesce(d.reprovados, 0) as reprovados,
               coalesce(d.pendentes, 0)  as pendentes,
               coalesce(d.opcionais, 0)  as opcionais
          from gendocs_grupos g
          join gendocs_participantes gp on gp.grupo_id = g.id
          join modulos_gendocs m        on m.id = gp.modulo_id
          join gendocs_coletas ct       on ct.participante_id = gp.id
          left join membros_grupo_familiar mf on mf.id = gp.membro_id
          left join lateral (
            -- Denominador = obrigatórios. Os opcionais são caminhos para
            -- cumprir um obrigatório, não itens a mais na lista.
            select count(*) filter (where de.obrigatorio) as total,
                   count(*) filter (where de.obrigatorio and estado_efetivo(dc.id) = 'aprovado')  as aprovados,
                   count(*) filter (where de.obrigatorio and estado_efetivo(dc.id) = 'analise')   as analise,
                   count(*) filter (where de.obrigatorio and estado_efetivo(dc.id) = 'reprovado') as reprovados,
                   count(*) filter (where de.obrigatorio and estado_efetivo(dc.id) = 'pendente')  as pendentes,
                   count(*) filter (where not de.obrigatorio) as opcionais
              from gendocs_documentos_coleta dc
              join documentos_exigidos de on de.id = dc.documento_id
             where dc.coleta_id = ct.id
          ) d on true
         where g.candidato_id = v_id
      ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function portal_minhas_coletas(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sequencia)
      from (
        select m.slug, m.nome, m.descricao,
               case when p.titular then 1 else 2 end as sequencia,
               ct.status::text as status,
               count(dc.*) filter (where de.obrigatorio) as total,
               count(dc.*) filter (where de.obrigatorio and documento_resolvido(dc.id)) as resolvidos,
               count(dc.*) filter (where not de.obrigatorio) as opcionais
          from gendocs_participantes p
          join gendocs_grupos g on g.id = p.grupo_id
          join modulos_gendocs m on m.id = p.modulo_id
          join gendocs_coletas ct on ct.participante_id = p.id
          left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
          left join documentos_exigidos de on de.id = dc.documento_id
         where g.candidato_id = v_id and p.titular
         group by m.slug, m.nome, m.descricao, p.titular, ct.status
      ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function gendocs_consultar_coletas()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nome, x.modulo), '[]'::jsonb)
    from (
      select gp.id                        as participante_id,
             gp.nome, gp.email, gp.titular, gp.parentesco,
             gp.identificador_externo,
             g.protocolo,
             m.nome                       as modulo,
             m.slug                       as modulo_slug,
             m.ativo                      as modulo_ativo,
             ct.status::text              as status,
             ct.recebida_em,
             ct.prazo_em,
             ct.requer_verificacao_manual,
             sla.horas                    as sla_horas,
             (ct.prazo_em is not null
              and ct.prazo_em < now()
              and ct.status not in ('recebida', 'finalizada')) as vencido,
             -- Só obrigatórios: ver o comentário em portal_meu_grupo.
             count(dc.*) filter (where de.obrigatorio)                                as documentos,
             count(dc.*) filter (where de.obrigatorio and documento_resolvido(dc.id)) as resolvidos,
             count(dc.*) filter (where dc.bypass_ia)                                  as recursos
        from gendocs_participantes gp
        join gendocs_grupos g   on g.id = gp.grupo_id
        join modulos_gendocs m  on m.id = gp.modulo_id
        join gendocs_coletas ct on ct.participante_id = gp.id
        left join modulos_sla sla on sla.modulo_id = m.id and sla.status = ct.status
        left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
        left join documentos_exigidos de on de.id = dc.documento_id
       group by gp.id, gp.nome, gp.email, gp.titular, gp.parentesco,
                gp.identificador_externo, g.protocolo, m.nome, m.slug, m.ativo,
                ct.status, ct.recebida_em, ct.prazo_em, ct.requer_verificacao_manual,
                sla.horas
    ) x;
$$;

create or replace function erp_coletas_do_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.titular desc, x.ordem, x.nome), '[]'::jsonb)
    from (
      select gp.id                      as participante_id,
             gp.nome, gp.email, gp.titular, gp.parentesco,
             gp.identificador_externo,
             g.protocolo,
             m.slug                     as modulo_slug,
             m.nome                     as modulo,
             coalesce(m.link_preenchimento, 'N/A') as link_preenchimento,
             case when gp.titular then 1 else 2 end as ordem,
             ct.status::text            as status,
             ct.prazo_em,
             ct.recebida_em,
             ct.requer_verificacao_manual,
             count(dc.*) filter (where de.obrigatorio)                                as documentos,
             count(dc.*) filter (where de.obrigatorio and documento_resolvido(dc.id)) as resolvidos
        from gendocs_grupos g
        join gendocs_participantes gp on gp.grupo_id = g.id
        join modulos_gendocs m        on m.id = gp.modulo_id
        join gendocs_coletas ct       on ct.participante_id = gp.id
        left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
        left join documentos_exigidos de on de.id = dc.documento_id
       where g.candidato_id = p_id
       group by gp.id, gp.nome, gp.email, gp.titular, gp.parentesco,
                gp.identificador_externo, g.protocolo, m.slug, m.nome,
                m.link_preenchimento, ct.status, ct.prazo_em,
                ct.recebida_em, ct.requer_verificacao_manual
    ) x;
$$;

-- A lista do portal ganha o marcador de obrigatoriedade e a equivalência,
-- para a tela poder mostrar o "*" e o "(Opcional)".
create or replace function portal_documentos(p_token uuid, p_participante_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  if not exists (
    select 1 from gendocs_participantes p
      join gendocs_grupos g on g.id = p.grupo_id
     where p.id = p_participante_id and g.candidato_id = v_id
  ) then
    raise exception 'Participante não pertence ao seu grupo' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sequencia)
      from (
        select de.sequencia, de.nome, de.obrigatorio,
               dc.status::text as status, dc.enviado_em, dc.motivo_recusa,
               estado_efetivo(dc.id) as estado,
               documento_resolvido(dc.id) as resolvido,
               coalesce((select array_agg(alvo.nome order by alvo.sequencia)
                           from documentos_substituicao s
                           join documentos_exigidos alvo on alvo.id = s.substituido_id
                          where s.documento_id = de.id), '{}') as substitui,
               coalesce((select array_agg(outro.nome order by outro.sequencia)
                           from documentos_substituicao s
                           join documentos_exigidos outro on outro.id = s.documento_id
                          where s.substituido_id = de.id), '{}') as dispensado_por
          from gendocs_coletas ct
          join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
          join documentos_exigidos de on de.id = dc.documento_id
         where ct.participante_id = p_participante_id
      ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function estado_efetivo(uuid) from public;
revoke all on function modulo_do_familiar(boolean) from public;


-- ---------------------------------------------------------------------------
-- 6. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_maior int; v_menor int; v_familiar_fora int; v_orfaos int;
begin
  select count(*) into v_maior from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id
   where m.slug = 'prouni-familiares-maioridade';
  select count(*) into v_menor from documentos_exigidos d
    join modulos_gendocs m on m.id = d.modulo_id
   where m.slug = 'prouni-familiares-menoridade';

  -- Nenhum familiar pode ter sobrado num módulo de titular.
  select count(*) into v_familiar_fora
    from gendocs_participantes p
    join modulos_gendocs m on m.id = p.modulo_id
   where not p.titular and m.combinacao is not null;

  -- Nenhuma linha de coleta apontando para documento de outro módulo.
  select count(*) into v_orfaos
    from gendocs_documentos_coleta dc
    join documentos_exigidos d on d.id = dc.documento_id
    join gendocs_coletas ct on ct.id = dc.coleta_id
    join gendocs_participantes p on p.id = ct.participante_id
   where d.modulo_id <> p.modulo_id;

  if v_maior <> 12 then raise exception 'Maioridade deveria ter 12 documentos, tem %', v_maior; end if;
  if v_menor <> 3  then raise exception 'Menoridade deveria ter 3 documentos, tem %', v_menor; end if;
  if v_familiar_fora > 0 then raise exception '% familiar(es) ainda em módulo de titular', v_familiar_fora; end if;
  if v_orfaos > 0 then raise exception '% linha(s) apontando para módulo errado', v_orfaos; end if;

  raise notice 'módulos de familiar: 12 e 3 documentos; nenhum familiar fora do lugar';
end;
$$;
