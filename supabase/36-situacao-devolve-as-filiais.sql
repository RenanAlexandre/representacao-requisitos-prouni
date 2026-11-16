-- ============================================================================
-- 36 — A situação da matrícula devolve as filiais escolhidas
--
-- Rode depois do 35.
--
-- A 34 acrescentou `polo_praticas_id` e a tela de filiais, mas quem alimenta o
-- combo é `erp_situacao_matricula` — e ela não devolvia os IDs. Efeito: o
-- analista escolhia a filial, o banco gravava, e ao recarregar a ficha o campo
-- voltava para "Não informado". Só os NOMES apareciam, via `erp_candidato`.
--
-- Nome serve para ler; id serve para o combo saber qual opção está marcada.
-- Faltava o segundo.
--
-- O corpo abaixo é a definição VIVA com dois campos e um join a mais.
-- ============================================================================

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
    'polo_id',         c.polo_id,
    'polo_praticas',   pp.nome,
    'polo_praticas_id', c.polo_praticas_id,
    'chamada',         i.chamada,
    'tipo_bolsa',      coalesce(i.tipo_bolsa, 'BOLSA INTEGRAL'),
    'status',          coalesce(i.status::text, 'Inscrito'),
    'fluxo',           coalesce(i.fluxo::text, 'nao_definido'),
    'matriculado_wae', i.matriculado_wae,
    'matriculado_em',  i.matriculado_em,
    'matriculado_por', i.matriculado_por,
    'ra_wae',          i.ra_wae,
    'negado_em',   i.negado_em,
    'negado_por',  i.negado_por,
    'negacao_motivo', i.negacao_motivo,
    'coletas_total',     (select count(*) from gendocs_grupos g
                            join gendocs_participantes gp on gp.grupo_id = g.id
                            join gendocs_coletas ct on ct.participante_id = gp.id
                           where g.candidato_id = c.id),
    'coletas_pendentes', coletas_pendentes_do_candidato(c.id),
    -- Sem inscrição não há o que matricular; sem coleta nenhuma, "todas
    -- finalizadas" seria verdadeiro por vacuidade — e não é o que se quer.
    'pode_matricular', (
      i.id is not null
      and coalesce(i.status::text, 'Inscrito') not in ('Matriculado', 'Negado')
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
    left join polos pp on pp.id = c.polo_praticas_id
   where c.id = p_id;
$fn$;

grant execute on function erp_situacao_matricula(uuid) to anon;


do $blk$
declare v_id uuid; v_sit jsonb;
begin
  select id into v_id from candidatos limit 1;
  if v_id is null then
    raise notice 'sem candidato para exercitar';
    return;
  end if;
  v_sit := erp_situacao_matricula(v_id);
  if not (v_sit ? 'polo_id' and v_sit ? 'polo_praticas_id') then
    raise exception 'erp_situacao_matricula ainda não devolve os ids das filiais';
  end if;
  raise notice 'situação devolve polo_id e polo_praticas_id';
end;
$blk$;
