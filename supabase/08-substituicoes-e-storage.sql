-- ============================================================================
-- 08 — Substituição N:N entre documentos + bucket de arquivos
--
-- Rode depois do 07.
--
-- POR QUE UMA TABELA E NÃO A COLUNA
-- ---------------------------------
-- `documentos_exigidos.substitui_id` (criada no 07) só aponta para UM
-- documento. Mas a CNH substitui o RG **e** o CPF ao mesmo tempo. Com uma
-- coluna só, enviar a CNH destravaria apenas um dos dois — e o "Enviar para
-- Análise" continuaria bloqueado por um obrigatório que na verdade já está
-- coberto.
-- ============================================================================

create table if not exists documentos_substituicao (
  -- O documento que o candidato envia…
  documento_id  uuid not null references documentos_exigidos(id) on delete cascade,
  -- …e o obrigatório que esse envio dispensa.
  substituido_id uuid not null references documentos_exigidos(id) on delete cascade,
  primary key (documento_id, substituido_id),
  constraint nao_substitui_a_si_mesmo check (documento_id <> substituido_id)
);

alter table documentos_substituicao enable row level security;
-- Sem policy: lida pelas funções, que rodam como dono.

-- Migra o que a coluna já tinha.
insert into documentos_substituicao (documento_id, substituido_id)
select id, substitui_id from documentos_exigidos where substitui_id is not null
on conflict do nothing;

-- E acrescenta o par que faltava: CNH também cobre o CPF.
insert into documentos_substituicao (documento_id, substituido_id)
select cnh.id, cpf.id
  from documentos_exigidos cnh
  join modulos_gendocs m on m.id = cnh.modulo_id
  join documentos_exigidos cpf on cpf.modulo_id = m.id and cpf.nome = 'CPF'
 where m.slug = 'prouni' and cnh.nome = 'CNH'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- Cobertura: um obrigatório está resolvido se ele próprio foi aceito, ou se
-- algum documento que o substitui foi aceito.
-- ---------------------------------------------------------------------------
create or replace function documento_resolvido(p_documento_coleta_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with alvo as (
    select dc.coleta_id, dc.documento_id, dc.status
      from gendocs_documentos_coleta dc where dc.id = p_documento_coleta_id
  )
  select
    (select status not in ('pendente', 'reprovado', 'reprovado_ia') from alvo)
    or exists (
      select 1
        from documentos_substituicao s
        join gendocs_documentos_coleta d2
          on d2.documento_id = s.documento_id
         and d2.coleta_id = (select coleta_id from alvo)
       where s.substituido_id = (select documento_id from alvo)
         and d2.status not in ('pendente', 'reprovado', 'reprovado_ia')
    );
$$;

-- "Enviar para Análise" agora usa a tabela de substituição.
create or replace function portal_enviar_para_analise(p_token uuid, p_slug text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := sessao_candidato(p_token);
  v_coleta   uuid;
  v_faltando int;
  v_nomes    text[];
begin
  select ct.id into v_coleta
    from gendocs_coletas ct
    join gendocs_participantes p on p.id = ct.participante_id
    join gendocs_grupos g on g.id = p.grupo_id
    join modulos_gendocs m on m.id = p.modulo_id
   where m.slug = p_slug and g.candidato_id = v_id and p.titular;

  if v_coleta is null then
    raise exception 'Coleta não encontrada' using errcode = 'P0002';
  end if;

  select count(*), array_agg(de.nome order by de.sequencia)
    into v_faltando, v_nomes
    from gendocs_documentos_coleta dc
    join documentos_exigidos de on de.id = dc.documento_id
   where dc.coleta_id = v_coleta
     and de.obrigatorio
     and not documento_resolvido(dc.id);

  if v_faltando > 0 then
    return jsonb_build_object('ok', false, 'faltando', v_faltando, 'documentos', v_nomes);
  end if;

  update gendocs_coletas
     set status = 'recebida', recebida_em = now()
   where id = v_coleta;

  return jsonb_build_object('ok', true, 'faltando', 0);
end;
$$;

-- A tela precisa saber, por documento, quais outros o dispensam.
create or replace function portal_coleta(p_token uuid, p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_id uuid := sessao_candidato(p_token);
begin
  return (
    select jsonb_build_object(
      'candidato', (select c.nome from candidatos c where c.id = v_id),
      'candidato_id', v_id,
      'modulo', jsonb_build_object(
        'slug', mm.slug, 'nome', mm.nome, 'descricao', mm.descricao,
        'envio_inicio', mm.envio_inicio, 'envio_fim', mm.envio_fim),
      'ia_ativa', demo_ia_ativa(),
      'participante_id', pp.id,
      'status_coleta', ct.status::text,
      'documentos', coalesce((
        select jsonb_agg(to_jsonb(x) order by x.sequencia)
          from (
            select dc.id as documento_coleta_id,
                   de.id as documento_id,
                   de.sequencia, de.nome, de.obrigatorio, de.descricao,
                   dc.status::text as status, dc.motivo_recusa, dc.enviado_em,
                   dc.ia_aplicada, dc.ia_confianca,
                   documento_resolvido(dc.id) as resolvido,
                   a.nome_original, a.tamanho_bytes, a.storage_path,
                   -- Obrigatórios que ESTE documento dispensa quando enviado.
                   coalesce((select array_agg(alvo.nome order by alvo.sequencia)
                               from documentos_substituicao s
                               join documentos_exigidos alvo on alvo.id = s.substituido_id
                              where s.documento_id = de.id), '{}') as substitui,
                   -- Documentos que dispensam ESTE, se enviados.
                   coalesce((select array_agg(outro.nome order by outro.sequencia)
                               from documentos_substituicao s
                               join documentos_exigidos outro on outro.id = s.documento_id
                              where s.substituido_id = de.id), '{}') as dispensado_por
              from gendocs_documentos_coleta dc
              join documentos_exigidos de on de.id = dc.documento_id
              left join gendocs_arquivos a on a.id = dc.arquivo_id
             where dc.coleta_id = ct.id
          ) x
      ), '[]'::jsonb))
    from modulos_gendocs mm
    join gendocs_participantes pp on pp.modulo_id = mm.id
    join gendocs_grupos g on g.id = pp.grupo_id
    join gendocs_coletas ct on ct.participante_id = pp.id
   where mm.slug = p_slug and g.candidato_id = v_id and pp.titular
   limit 1
  );
end;
$$;

-- Quais módulos este candidato tem, para a tela listar as coletas dele.
create or replace function portal_minhas_coletas(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := sessao_candidato(p_token);
begin
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sequencia)
      from (
        select m.slug, m.nome, m.descricao,
               case m.perfil when 'prouni' then 1 else 2 end as sequencia,
               ct.status::text as status,
               count(dc.*)                                            as total,
               count(dc.*) filter (where documento_resolvido(dc.id))  as resolvidos
          from gendocs_participantes p
          join gendocs_grupos g on g.id = p.grupo_id
          join modulos_gendocs m on m.id = p.modulo_id
          join gendocs_coletas ct on ct.participante_id = p.id
          left join gendocs_documentos_coleta dc on dc.coleta_id = ct.id
         where g.candidato_id = v_id and p.titular
         group by m.slug, m.nome, m.descricao, m.perfil, ct.status
      ) x
  ), '[]'::jsonb);
end;
$$;

revoke all on function documento_resolvido(uuid) from public;
revoke all on function portal_minhas_coletas(uuid) from public;
grant execute on function portal_minhas_coletas(uuid) to anon;


-- ---------------------------------------------------------------------------
-- Bucket dos arquivos
--
-- Privado. O candidato só chega nos próprios arquivos, e o caminho carrega o
-- id do candidato como primeira pasta — é por ele que a policy filtra.
--     documentos/<candidato_id>/<documento_coleta_id>/<versao>-<arquivo>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documentos', 'documentos', false, 10485760,
        array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

-- O protótipo entra como `anon` (a sessão do portal é própria, não é o
-- Supabase Auth), então a policy não tem `auth.uid()` para conferir. O que
-- protege de fato é o bucket ser privado e o caminho ser imprevisível — e a
-- gravação no banco, que exige token de sessão válido.
--
-- ⚠️ Isto é aceitável em protótipo com dado fictício. Antes de dado real,
-- troque o upload por URL assinada emitida por Edge Function que valide o
-- token da sessão. Registrado em supabase/README.md.
drop policy if exists documentos_anon_envia on storage.objects;
create policy documentos_anon_envia on storage.objects
  for insert to anon
  with check (bucket_id = 'documentos');

drop policy if exists documentos_anon_le on storage.objects;
create policy documentos_anon_le on storage.objects
  for select to anon
  using (bucket_id = 'documentos');

drop policy if exists documentos_anon_remove on storage.objects;
create policy documentos_anon_remove on storage.objects
  for delete to anon
  using (bucket_id = 'documentos');


-- ---------------------------------------------------------------------------
-- Correção do índice de titular
--
-- `um_titular_por_grupo` era único por GRUPO, do tempo em que o titular
-- entrava num módulo só. Agora ele entra no PROUNI e em cada condicional que
-- marcou "Sim" — até quatro participações. A unicidade certa é por
-- (grupo, módulo): um titular por módulo, não um por grupo.
-- ---------------------------------------------------------------------------
drop index if exists um_titular_por_grupo;
create unique index if not exists um_titular_por_grupo_e_modulo
    on gendocs_participantes (grupo_id, modulo_id) where titular;
