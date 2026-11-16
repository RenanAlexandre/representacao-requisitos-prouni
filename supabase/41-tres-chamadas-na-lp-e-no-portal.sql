-- ============================================================================
-- 41 — A mesma landing, três chamadas: quem separa é a data
--
-- Rode depois do 40.
--
-- O QUE ESTA MIGRAÇÃO SUSTENTA
-- ----------------------------
-- A landing é UMA só e capta para os três concursos do PROUNI 2027. Quem
-- decide em qual o candidato entra é a DATA em que ele preenche — as janelas
-- são parametrizadas no ERP (início e fim de cada concurso) e o sistema faz o
-- resto. A migração 38 já criou `concurso_vigente()` com essa regra; faltava
-- expor o calendário para as duas telas que precisam contá-lo:
--
--   LANDING  — antes do formulário, o candidato precisa saber que existem três
--              chamadas, quais são as janelas e em qual ele vai cair se
--              enviar hoje. `lp_chamadas()` devolve exatamente isso.
--
--   PORTAL   — depois de inscrito, ele precisa ver a chamada em que entrou e a
--              janela DELA. `portal_meus_dados` passa a devolver o concurso,
--              com início, fim e quantos dias faltam para o fim da chamada.
--
-- As duas telas leem a MESMA `concurso_vigente()`: se a regra mudar, muda nos
-- dois lugares de uma vez. Duas cópias da regra divergem — é questão de tempo.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. O calendário das chamadas, para a landing
--
-- Aberta ao `anon` porque é informação pública de processo seletivo — as datas
-- estão no edital. Não devolve id nem nada de candidato.
-- ---------------------------------------------------------------------------
create or replace function lp_chamadas()
returns jsonb
language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.inicio), '[]'::jsonb)
    from (
      select cc.nome,
             cc.chamada,
             cc.inicio,
             cc.fim,
             ps.nome as processo_seletivo,
             cc.id = concurso_vigente() as vigente
        from concursos cc
        join processos_seletivos ps on ps.id = cc.processo_seletivo_id
       where cc.ativo and ps.ativo
    ) x;
$fn$;

comment on function lp_chamadas is
  'Calendário das chamadas para a landing: janelas parametrizadas no ERP e qual delas recebe quem se inscrever agora.';

revoke all on function lp_chamadas() from public;
grant execute on function lp_chamadas() to anon;


-- ---------------------------------------------------------------------------
-- 2. O portal passa a mostrar a chamada do candidato
--
-- Corpo abaixo é a definição VIVA com quatro campos a mais. `envio_inicio`,
-- `envio_fim` e `dias_restantes` continuam saindo — são o prazo de ENVIO da
-- documentação, do módulo do GenDocs, que é outra coisa e ainda é usado no
-- termo de responsabilidade.
-- ---------------------------------------------------------------------------
create or replace function portal_meus_dados(p_token uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_id uuid := sessao_candidato(p_token);
  v_out jsonb;
begin
  select to_jsonb(x) into v_out from (
    select c.protocolo, c.nome, c.cpf, c.rg, c.rg_orgao_expedidor,
           c.nascimento, c.sexo,
           r.nome as raca, r.ppi as raca_ppi,
           c.uf_naturalidade, c.municipio_naturalidade,
           c.email, c.ddd, c.telefone,
           c.cep, c.logradouro, c.numero, c.complemento, c.bairro, c.cidade, c.uf,
           e.nome as escolaridade, c.ano_conclusao_em,
           -- Sem `rotulo_do_curso` o candidato via o curso em branco: 75 dos
           -- 83 cursos não têm código e-MEC, e concatenar com NULL dá NULL.
           rotulo_do_curso(c.curso_id) as curso,
           cu.area_conhecimento, cu.tipo_formacao, cu.modalidade, cu.duracao,
           case when po.codigo_sispro is null then po.nome
                else po.codigo_sispro || ' – ' || po.nome end as polo,
           pl.nome as plano, pl.tipo_bolsa, pl.percentual as plano_percentual,
           c.aceite_contrato, c.aceite_contrato_em,
           c.aceite_contato,  c.aceite_contato_em,
           c.aceite_cota,     c.aceite_cota_em,
           c.declara_encerramento_matricula,
           c.declara_encerramento_beneficio,
           c.declara_professor_rede_publica,
           c.created_at as inscrito_em,
           i.modalidade_concorrencia as cota,
           i.chamada,
           -- O concurso em que a inscrição caiu: é a janela DELE que o
           -- candidato precisa ver, não a do processo inteiro.
           cc.nome         as concurso,
           cc.inicio       as concurso_inicio,
           cc.fim          as concurso_fim,
           greatest(0, ((cc.fim at time zone 'America/Sao_Paulo')::date
                        - (now() at time zone 'America/Sao_Paulo')::date)) as dias_na_chamada,
           i.status::text as status_inscricao,
           ps.nome as processo_seletivo,
           m.nome as modulo_coleta,
           m.envio_inicio, m.envio_fim,
           greatest(0, (m.envio_fim - current_date)) as dias_restantes
      from candidatos c
      left join racas r          on r.codigo = c.raca_codigo
      left join escolaridades e  on e.codigo = c.escolaridade_codigo
      left join cursos cu        on cu.id = c.curso_id
      left join polos po         on po.id = c.polo_id
      left join planos_pagamento pl on pl.id = c.plano_pagamento_id
      left join inscricoes i     on i.candidato_id = c.id
      left join concursos cc     on cc.id = i.concurso_id
      left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
      left join gendocs_grupos g on g.candidato_id = c.id
      left join gendocs_participantes gp on gp.grupo_id = g.id and gp.titular
      left join modulos_gendocs m on m.id = gp.modulo_id
     where c.id = v_id
     limit 1
  ) x;

  return v_out;
end;
$fn$;

grant execute on function portal_meus_dados(uuid) to anon;


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_chamadas jsonb;
  v_vigentes int;
  v_tok      uuid;
  v_dados    jsonb;
  v_cand     uuid;
begin
  v_chamadas := lp_chamadas();
  if jsonb_array_length(v_chamadas) <> 3 then
    raise exception 'lp_chamadas devolveu % chamadas', jsonb_array_length(v_chamadas);
  end if;

  select count(*) into v_vigentes
    from jsonb_array_elements(v_chamadas) e where (e->>'vigente')::boolean;
  if v_vigentes <> 1 then
    raise exception 'Deveria haver exatamente 1 chamada vigente, há %', v_vigentes;
  end if;

  select id into v_cand from candidatos limit 1;
  if v_cand is null then
    raise notice 'sem candidato para exercitar o portal';
    return;
  end if;

  insert into sessoes_portal (candidato_id) values (v_cand) returning token into v_tok;
  v_dados := portal_meus_dados(v_tok);
  delete from sessoes_portal where token = v_tok;

  if not (v_dados ? 'concurso' and v_dados ? 'concurso_inicio'
          and v_dados ? 'concurso_fim' and v_dados ? 'dias_na_chamada') then
    raise exception 'portal_meus_dados não devolveu os dados do concurso';
  end if;

  raise notice 'candidato de exemplo: % | % | % a %',
    v_dados->>'nome', v_dados->>'chamada',
    to_char((v_dados->>'concurso_inicio')::timestamptz at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'),
    to_char((v_dados->>'concurso_fim')::timestamptz    at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  raise notice 'chamada que recebe quem se inscrever agora: %',
    (select e->>'nome' from jsonb_array_elements(v_chamadas) e where (e->>'vigente')::boolean);
end;
$blk$;
