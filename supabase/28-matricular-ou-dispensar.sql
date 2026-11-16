-- ============================================================================
-- 28 — Matricular ou dispensar o candidato, na ficha do ERP
--
-- Rode depois do 27 (que precisa ir sozinho — leia o cabeçalho dele).
--
-- O QUE ESTA MIGRAÇÃO REPRESENTA
-- -----------------------------
-- O fim do funil. Com a documentação analisada e as coletas finalizadas, a
-- Secretaria toma uma de duas decisões na ficha do candidato:
--
--   MATRICULAR — e aqui há DOIS caminhos, escolhidos pelo sistema, não pela
--   pessoa que atende. O sistema pergunta ao WAE se aquele CPF já tem
--   matrícula vigente no curso em que o candidato foi contemplado:
--
--     • NÃO TEM  -> "nova matrícula". Chama a API do WAE e cria a matrícula.
--       Não há contrato anterior para tratar.
--
--     • JÁ TEM   -> "alteração de matrícula vigente". NÃO se cria matrícula
--       nova: troca-se o contrato que o aluno já tem naquele curso pelo
--       contrato do ProUni, isentando as mensalidades daí em diante e
--       estornando as que ele já pagou no período coberto pela bolsa. O
--       vínculo acadêmico (RA, histórico, turma) continua o mesmo — o que
--       muda é o contrato financeiro.
--
--   DISPENSAR — marca o candidato como dispensado. Nenhuma matrícula é
--   criada e nada é enviado ao WAE.
--
-- A TRAVA
-- -------
-- Só dá para matricular quando TODAS as coletas do grupo estão finalizadas —
-- as do titular e as de cada familiar. A regra vive aqui, não só no botão:
-- botão desabilitado é conveniência, guarda de servidor é garantia.
--
-- ⚠️ A INTEGRAÇÃO COM O WAE NÃO EXISTE. `demo_consultar_wae` é andaime, como
-- `demo_extrair_campos` e `demo_ia_ativa`: devolve uma resposta com o formato
-- que a API real teria, para o fluxo poder ser percorrido de ponta a ponta e
-- o time de desenvolvimento ver os dois caminhos. Quando o WAE for ligado,
-- só o corpo dessa função sai; as duas telas e o resto do banco não mudam.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. O que a decisão precisa guardar
--
-- `fluxo` e `matriculado_wae` já existiam no esquema desde o começo (seção 3.6
-- dos requisitos) e estavam sem uso — é exatamente este o momento deles.
-- ---------------------------------------------------------------------------
alter table inscricoes add column if not exists matriculado_em  timestamptz;
alter table inscricoes add column if not exists matriculado_por text;
alter table inscricoes add column if not exists ra_wae          text;
alter table inscricoes add column if not exists dispensado_em   timestamptz;
alter table inscricoes add column if not exists dispensado_por  text;
alter table inscricoes add column if not exists dispensa_motivo text;

comment on column inscricoes.ra_wae is
  'RA devolvido pelo WAE. Hoje vem de demo_ra_wae — andaime, não é RA real.';
comment on column inscricoes.fluxo is
  'Caminho escolhido pelo cruzamento com o WAE: aluno_novo (matrícula nova) ou ja_matriculado (troca de contrato).';


-- ---------------------------------------------------------------------------
-- 2. A trava: todas as coletas do grupo finalizadas
--
-- Função à parte porque três lugares precisam da mesma resposta — a tela
-- (para desabilitar o botão), a explicação do porquê, e a própria matrícula.
-- ---------------------------------------------------------------------------
create or replace function coletas_pendentes_do_candidato(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'nome', x.nome, 'modulo', x.modulo, 'status', x.status)
      order by x.titular desc, x.nome),
    '[]'::jsonb)
    from (
      select gp.nome, gp.titular, m.nome as modulo, ct.status::text as status
        from gendocs_grupos g
        join gendocs_participantes gp on gp.grupo_id = g.id
        join modulos_gendocs m        on m.id = gp.modulo_id
        join gendocs_coletas ct       on ct.participante_id = gp.id
       where g.candidato_id = p_id
         and ct.status <> 'finalizada'
    ) x;
$fn$;

comment on function coletas_pendentes_do_candidato is
  'Coletas do grupo que ainda não estão finalizadas. Vazio = pode matricular.';


-- ---------------------------------------------------------------------------
-- 3. ANDAIME — a consulta ao WAE
--
-- ⚠️ Não existe integração. O formato da resposta é o que a API real
-- devolveria; o conteúdo é decidido aqui.
--
-- Sem `p_forcar`, a resposta vem de um dado REAL do nosso próprio banco: o
-- candidato já tem outra inscrição matriculada? É o análogo mais honesto de
-- "este CPF já tem matrícula vigente no curso", já que o curso do candidato é
-- um só. Com `p_forcar`, quem está demonstrando escolhe o caminho — é como o
-- time de desenvolvimento vê os dois fluxos sem precisar de dois candidatos.
-- ---------------------------------------------------------------------------
create or replace function demo_ra_wae(p_cpf text)
returns text
language sql immutable as $fn$
  select 'RA' || lpad((abs(hashtext(coalesce(p_cpf, ''))) % 1000000)::text, 6, '0');
$fn$;

create or replace function demo_consultar_wae(p_id uuid, p_forcar text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_cpf     text;
  v_curso   text;
  v_ja      boolean;
  v_fluxo   text;
begin
  select c.cpf, rotulo_do_curso(c.curso_id) into v_cpf, v_curso
    from candidatos c where c.id = p_id;

  if v_cpf is null then
    raise exception 'Candidato não encontrado' using errcode = 'P0002';
  end if;

  if p_forcar in ('aluno_novo', 'ja_matriculado') then
    v_fluxo := p_forcar;
  else
    select exists (
      select 1 from inscricoes i
       where i.candidato_id = p_id and i.status = 'Matriculado'
    ) into v_ja;
    v_fluxo := case when v_ja then 'ja_matriculado' else 'aluno_novo' end;
  end if;

  return jsonb_build_object(
    'simulado', true,
    'endpoint', 'GET /wae/matriculas?cpf=' || v_cpf || '&curso=' || coalesce(v_curso, ''),
    'consultado_em', now(),
    'cpf', v_cpf,
    'curso', v_curso,
    'matricula_vigente', v_fluxo = 'ja_matriculado',
    'fluxo', v_fluxo,
    'ra', case when v_fluxo = 'ja_matriculado' then demo_ra_wae(v_cpf) end,
    'forcado', p_forcar is not null);
end;
$fn$;

comment on function demo_consultar_wae is
  'ANDAIME de demonstração. Não há integração com o WAE — devolve uma resposta no formato que a API real teria. Sai inteira quando a integração existir.';


-- ---------------------------------------------------------------------------
-- 4. A situação da matrícula, para a ficha do ERP
-- ---------------------------------------------------------------------------
create or replace function erp_situacao_matricula(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'candidato_id',    c.id,
    'inscricao_id',    i.id,
    'nome',            c.nome,
    'cpf',             c.cpf,
    'curso',           rotulo_do_curso(c.curso_id),
    'polo',            po.nome,
    'chamada',         i.chamada,
    'tipo_bolsa',      coalesce(i.tipo_bolsa, 'BOLSA INTEGRAL'),
    'status',          coalesce(i.status::text, 'Inscrito'),
    'fluxo',           coalesce(i.fluxo::text, 'nao_definido'),
    'matriculado_wae', i.matriculado_wae,
    'matriculado_em',  i.matriculado_em,
    'matriculado_por', i.matriculado_por,
    'ra_wae',          i.ra_wae,
    'dispensado_em',   i.dispensado_em,
    'dispensado_por',  i.dispensado_por,
    'dispensa_motivo', i.dispensa_motivo,
    'coletas_total',     (select count(*) from gendocs_grupos g
                            join gendocs_participantes gp on gp.grupo_id = g.id
                            join gendocs_coletas ct on ct.participante_id = gp.id
                           where g.candidato_id = c.id),
    'coletas_pendentes', coletas_pendentes_do_candidato(c.id),
    -- Sem inscrição não há o que matricular; sem coleta nenhuma, "todas
    -- finalizadas" seria verdadeiro por vacuidade — e não é o que se quer.
    'pode_matricular', (
      i.id is not null
      and coalesce(i.status::text, 'Inscrito') not in ('Matriculado', 'Dispensado')
      and (select count(*) from gendocs_grupos g
             join gendocs_participantes gp on gp.grupo_id = g.id
             join gendocs_coletas ct on ct.participante_id = gp.id
            where g.candidato_id = c.id) > 0
      and jsonb_array_length(coletas_pendentes_do_candidato(c.id)) = 0))
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
    left join polos po on po.id = c.polo_id
   where c.id = p_id;
$fn$;


-- ---------------------------------------------------------------------------
-- 5. Matricular
--
-- O `p_fluxo` vem da consulta ao WAE, não da escolha de quem atende — a tela
-- só repassa o que a consulta devolveu. A guarda de coletas é refeita aqui:
-- entre abrir a tela e clicar em confirmar, um analista pode ter reaberto uma
-- coleta do outro lado.
-- ---------------------------------------------------------------------------
create or replace function erp_matricular(
  p_id       uuid,
  p_fluxo    text,
  p_operador text default 'Secretaria'
) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_inscricao  uuid;
  v_status     text;
  v_cpf        text;
  v_pendentes  jsonb;
  v_ra         text;
begin
  if p_fluxo not in ('aluno_novo', 'ja_matriculado') then
    raise exception 'Fluxo inválido: % (esperado aluno_novo ou ja_matriculado)', p_fluxo
      using errcode = '22023';
  end if;

  select i.id, i.status::text, c.cpf into v_inscricao, v_status, v_cpf
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
   where c.id = p_id;

  if v_cpf is null then
    raise exception 'Candidato não encontrado' using errcode = 'P0002';
  end if;
  if v_inscricao is null then
    raise exception 'Este candidato não tem inscrição em concurso nenhum' using errcode = 'P0002';
  end if;
  if v_status = 'Matriculado' then
    return jsonb_build_object('ok', false, 'motivo', 'Este candidato já está matriculado');
  end if;
  if v_status = 'Dispensado' then
    return jsonb_build_object('ok', false, 'motivo', 'Este candidato foi dispensado');
  end if;

  v_pendentes := coletas_pendentes_do_candidato(p_id);
  if jsonb_array_length(v_pendentes) > 0 then
    return jsonb_build_object('ok', false, 'pendentes', v_pendentes,
      'motivo', 'A matrícula só é liberada com todas as coletas finalizadas');
  end if;

  v_ra := demo_ra_wae(v_cpf);

  update inscricoes
     set status          = 'Matriculado',
         fluxo           = p_fluxo::fluxo_pos_analise,
         matriculado_wae = (p_fluxo = 'ja_matriculado'),
         matriculado_em  = now(),
         matriculado_por = p_operador,
         ra_wae          = v_ra,
         dispensado_em   = null,
         dispensado_por  = null,
         dispensa_motivo = null
   where id = v_inscricao;

  return jsonb_build_object('ok', true, 'fluxo', p_fluxo, 'ra', v_ra,
    'matriculado_em', now());
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 6. Dispensar
--
-- Marca e pronto: nada vai para o WAE, nenhuma matrícula é criada. Não exige
-- coleta finalizada — dispensar é justamente o que se faz quando a
-- documentação não vai fechar.
-- ---------------------------------------------------------------------------
create or replace function erp_dispensar(
  p_id       uuid,
  p_motivo   text default null,
  p_operador text default 'Secretaria'
) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_inscricao uuid; v_status text;
begin
  select i.id, i.status::text into v_inscricao, v_status
    from candidatos c
    left join lateral (
      select * from inscricoes i0
       where i0.candidato_id = c.id
       order by i0.created_at desc, i0.id
       limit 1
    ) i on true
   where c.id = p_id;

  if v_inscricao is null then
    raise exception 'Inscrição não encontrada para este candidato' using errcode = 'P0002';
  end if;
  if v_status = 'Matriculado' then
    return jsonb_build_object('ok', false,
      'motivo', 'Este candidato já está matriculado — a matrícula precisa ser desfeita antes');
  end if;

  update inscricoes
     set status          = 'Dispensado',
         dispensado_em   = now(),
         dispensado_por  = p_operador,
         dispensa_motivo = nullif(btrim(coalesce(p_motivo, '')), '')
   where id = v_inscricao;

  return jsonb_build_object('ok', true, 'dispensado_em', now());
end;
$fn$;


-- ---------------------------------------------------------------------------
-- 7. ANDAIME — desfazer, para a demonstração poder rodar de novo
--
-- ⚠️ Não vai para produção. Desfazer matrícula no mundo real mexe em contrato,
-- cobrança e vínculo acadêmico; aqui é só para o protótipo poder mostrar o
-- fluxo mais de uma vez, já que a base de demonstração tem pouquíssimos
-- candidatos.
-- ---------------------------------------------------------------------------
create or replace function demo_reabrir_inscricao(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_inscricao uuid;
begin
  select i.id into v_inscricao from inscricoes i
   where i.candidato_id = p_id order by i.created_at desc, i.id limit 1;
  if v_inscricao is null then
    raise exception 'Inscrição não encontrada' using errcode = 'P0002';
  end if;

  update inscricoes
     set status = 'Em análise', fluxo = 'nao_definido', matriculado_wae = null,
         matriculado_em = null, matriculado_por = null, ra_wae = null,
         dispensado_em = null, dispensado_por = null, dispensa_motivo = null
   where id = v_inscricao;

  return jsonb_build_object('ok', true);
end;
$fn$;

comment on function demo_reabrir_inscricao is
  'ANDAIME de demonstração: devolve a inscrição para "Em análise" para o fluxo de matrícula poder ser mostrado de novo. Não existe no produto.';


-- ---------------------------------------------------------------------------
-- 8. Permissões
-- ---------------------------------------------------------------------------
revoke all on function coletas_pendentes_do_candidato(uuid) from public;
revoke all on function demo_ra_wae(text)                    from public;
revoke all on function demo_consultar_wae(uuid, text)       from public;
revoke all on function erp_situacao_matricula(uuid)         from public;
revoke all on function erp_matricular(uuid, text, text)     from public;
revoke all on function erp_dispensar(uuid, text, text)      from public;
revoke all on function demo_reabrir_inscricao(uuid)         from public;

grant execute on function demo_consultar_wae(uuid, text)   to anon;
grant execute on function erp_situacao_matricula(uuid)     to anon;
grant execute on function erp_matricular(uuid, text, text) to anon;
grant execute on function erp_dispensar(uuid, text, text)  to anon;
grant execute on function demo_reabrir_inscricao(uuid)     to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_cand   uuid;
  v_sit    jsonb;
  v_rotulo int;
begin
  select count(*) into v_rotulo
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
   where t.typname = 'status_candidato' and e.enumlabel = 'Dispensado';

  if v_rotulo <> 1 then
    raise exception 'O rótulo Dispensado não existe em status_candidato — rode a migração 27 antes';
  end if;

  select c.id into v_cand from candidatos c limit 1;
  if v_cand is null then
    raise notice 'Sem candidato na base: as funções foram criadas, nada foi exercitado.';
    return;
  end if;

  v_sit := erp_situacao_matricula(v_cand);
  if v_sit is null then
    raise exception 'erp_situacao_matricula devolveu nulo';
  end if;

  raise notice 'candidato %: status=% pode_matricular=% coletas=% pendentes=%',
    v_sit->>'nome', v_sit->>'status', v_sit->>'pode_matricular',
    v_sit->>'coletas_total', jsonb_array_length(v_sit->'coletas_pendentes');
  raise notice 'consulta simulada ao WAE: %', demo_consultar_wae(v_cand)->>'fluxo';
end;
$blk$;
