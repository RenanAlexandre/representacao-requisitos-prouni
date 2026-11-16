-- ============================================================================
-- 05 — Ajustes da landing page + tabela de usuários da demonstração
--
-- Rode depois do 04.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Escolaridade ganha `ativo`
--
-- As outras listas de domínio já tinham; esta não. Sem ela não dá para tirar
-- uma opção do formulário sem apagar a linha — e apagar quebraria o cadastro
-- de quem já escolheu aquela opção.
-- ---------------------------------------------------------------------------
alter table escolaridades
  add column if not exists ativo boolean not null default true;

-- Decisão da Secretaria: o ProUni aqui só recebe quem concluiu o Ensino Médio
-- ou já tem/está em curso superior. As demais saem do formulário, mas ficam na
-- tabela — quem já se inscreveu com elas continua com o cadastro íntegro.
update escolaridades set ativo = false
 where codigo in ('em_cursando', 'em_eja', 'em_enem');

-- Só a bolsa integral. As parciais ficam inativas pelo mesmo motivo.
update planos_pagamento set ativo = false
 where tipo_bolsa <> 'BOLSA INTEGRAL';


-- ---------------------------------------------------------------------------
-- 2. Usuários da demonstração
--
-- ⚠️ ESTA FUNÇÃO É ANDAIME DE DEMONSTRAÇÃO. Ela devolve CPF e data de
-- nascimento, que são exatamente o usuário e a senha do portal — ou seja,
-- lista credenciais em aberto. Existe só para dar acesso rápido ao protótipo
-- durante os testes.
--
-- ANTES DE QUALQUER USO COM DADO REAL: derrube a função.
--     drop function if exists demo_usuarios();
--
-- A tela que a consome (`/aluno/entrar`) também precisa sair.
-- ---------------------------------------------------------------------------
create or replace function demo_usuarios()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.criado_em desc), '[]'::jsonb)
    from (
      select c.id,
             c.protocolo,
             c.nome,
             c.cpf,
             c.nascimento,
             c.aceite_cota          as cota,
             c.created_at           as criado_em,
             ps.nome                as processo_seletivo
        from candidatos c
        left join inscricoes i on i.candidato_id = c.id
        left join concursos cc on cc.id = i.concurso_id
        left join processos_seletivos ps on ps.id = cc.processo_seletivo_id
    ) x;
$$;

comment on function demo_usuarios is
  'ANDAIME DE DEMONSTRAÇÃO — expõe CPF e nascimento, que são as credenciais do portal. Derrubar antes de qualquer uso com dado real.';

revoke all on function demo_usuarios() from public;
grant execute on function demo_usuarios() to anon;
