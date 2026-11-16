-- ============================================================================
-- 39 — Os módulos do GenDocs ligados aos concursos
--
-- Rode depois do 38.
--
-- POR QUE UMA TABELA DE LIGAÇÃO
-- -----------------------------
-- `concursos.modulo_gendocs_id` guarda UM módulo. Isso valia quando o GenDocs
-- tinha um módulo por perfil; hoje são 19 — as 16 combinações de declarações
-- do titular mais os 3 módulos de familiar —, e um concurso usa TODOS eles: a
-- combinação que o candidato cai não depende da chamada em que ele entrou.
--
-- Apontar o concurso para o módulo "PROUNI" e deixar os outros 18 soltos
-- resolveria a tela e mentiria sobre o vínculo. Então o vínculo vira N:N, que
-- é o que ele é.
--
-- A coluna antiga fica onde está, sem uso: ela é do esquema original e apagá-la
-- exigiria mexer no embed que a tela do concurso já faz. O comentário abaixo
-- registra que ela foi substituída, para ninguém voltar a preenchê-la.
--
-- OS TRÊS CONCURSOS COMPARTILHAM OS MESMOS 19 MÓDULOS
-- ---------------------------------------------------
-- Não há módulo por chamada: o prazo de envio é um só (27/08 a 01/01) e a
-- lista documental de cada combinação é a mesma na 1ª chamada, na 2ª e na
-- lista de espera. Se um dia a janela de envio precisar acompanhar a janela do
-- concurso, aí sim cada chamada ganha o seu conjunto — e é esta tabela que
-- deixa de ter 19 linhas iguais por concurso.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. A ligação
-- ---------------------------------------------------------------------------
create table if not exists concursos_modulos_gendocs (
  concurso_id       uuid not null references concursos(id) on delete cascade,
  modulo_gendocs_id uuid not null references modulos_gendocs(id) on delete cascade,
  created_at        timestamptz not null default now(),
  primary key (concurso_id, modulo_gendocs_id)
);

comment on table concursos_modulos_gendocs is
  'Quais módulos de coleta valem em cada concurso. Substitui concursos.modulo_gendocs_id, que só cabia um.';

create index if not exists concursos_modulos_modulo_idx
  on concursos_modulos_gendocs (modulo_gendocs_id);

comment on column concursos.modulo_gendocs_id is
  'OBSOLETO desde a migração 39 — o vínculo virou N:N em concursos_modulos_gendocs. Não preencher.';

alter table concursos_modulos_gendocs enable row level security;


-- ---------------------------------------------------------------------------
-- 2. Os 19 módulos em cada um dos 3 concursos
--
-- `on conflict do nothing` para a migração poder ser repetida sem duplicar, e
-- para módulo novo entrar depois só rodando este insert de novo.
-- ---------------------------------------------------------------------------
insert into concursos_modulos_gendocs (concurso_id, modulo_gendocs_id)
select cc.id, m.id
  from concursos cc
  join processos_seletivos ps on ps.id = cc.processo_seletivo_id
 cross join modulos_gendocs m
 where ps.codigo = 'PROUNI.2027/1'
   and m.slug like 'prouni%'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 3. A consulta que a tela do concurso usa
--
-- Vai por RPC `security definer` e não por leitura direta: `modulos_gendocs` é
-- tabela de backoffice, fechada para o `anon` (ver `01-schema.sql`), e abrir a
-- tabela inteira para mostrar uma lista seria pagar caro por pouco.
--
-- Devolve o que serve para decidir: quantos documentos o módulo pede, quantos
-- são obrigatórios e quanta gente está nele — mais o slug, que é por onde a
-- tela leva para dentro do módulo.
-- ---------------------------------------------------------------------------
create or replace function erp_modulos_do_concurso(p_concurso_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.ordem, x.nome), '[]'::jsonb)
    from (
      select m.id,
             m.slug,
             m.nome,
             m.combinacao,
             m.situacao,
             m.ativo,
             m.envio_inicio,
             m.envio_fim,
             -- Titular primeiro (combinação, da mais simples para a mais
             -- composta), familiares depois.
             case when m.combinacao is null then 1 else 0 end as ordem_grupo,
             coalesce(length(m.combinacao), 9) as ordem,
             (select count(*) from documentos_exigidos d where d.modulo_id = m.id) as documentos,
             (select count(*) from documentos_exigidos d
               where d.modulo_id = m.id and d.obrigatorio)                          as obrigatorios,
             (select count(*) from gendocs_participantes p where p.modulo_id = m.id) as participantes
        from concursos_modulos_gendocs cm
        join modulos_gendocs m on m.id = cm.modulo_gendocs_id
       where cm.concurso_id = p_concurso_id
    ) x;
$fn$;

comment on function erp_modulos_do_concurso is
  'Módulos de coleta que valem neste concurso, com o tamanho da lista documental e quanta gente está em cada um.';

revoke all on function erp_modulos_do_concurso(uuid) from public;
grant execute on function erp_modulos_do_concurso(uuid) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_concursos int;
  v_modulos   int;
  v_ligacoes  int;
  v_soltos    int;
  v_amostra   jsonb;
  r           record;
begin
  select count(*) into v_concursos from concursos;
  select count(*) into v_modulos from modulos_gendocs where slug like 'prouni%';
  select count(*) into v_ligacoes from concursos_modulos_gendocs;

  if v_ligacoes <> v_concursos * v_modulos then
    raise exception 'Esperadas % ligações (% concursos x % módulos), há %',
      v_concursos * v_modulos, v_concursos, v_modulos, v_ligacoes;
  end if;

  -- Nenhum módulo do ProUni pode ficar fora de concurso nenhum.
  select count(*) into v_soltos
    from modulos_gendocs m
   where m.slug like 'prouni%'
     and not exists (select 1 from concursos_modulos_gendocs cm
                      where cm.modulo_gendocs_id = m.id);
  if v_soltos > 0 then
    raise exception '% módulo(s) do ProUni sem concurso', v_soltos;
  end if;

  for r in select id, nome from concursos order by inicio loop
    v_amostra := erp_modulos_do_concurso(r.id);
    raise notice '% -> % módulos', rpad(r.nome, 24), jsonb_array_length(v_amostra);
  end loop;
end;
$blk$;
