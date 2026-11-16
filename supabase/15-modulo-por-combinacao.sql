-- ============================================================================
-- 15 — Um módulo por combinação de declarações
--
-- Rode depois do 14.
--
-- O QUE MUDA E POR QUÊ
-- --------------------
-- Até aqui o candidato entrava no módulo PROUNI e em mais um módulo por
-- declaração marcada — quem marcasse as três aparecia em quatro módulos, com
-- quatro coletas, quatro prazos e quatro telas para acompanhar. O analista via
-- a mesma pessoa espalhada, e o candidato também.
--
-- Agora é um módulo por COMBINAÇÃO: o candidato tem uma coleta só, com a lista
-- documental exata do que ele declarou. Quem não marcou nada cai no PROUNI
-- puro; quem marcou cota e professor cai num módulo com os 14 documentos base
-- mais esses dois comprovantes.
--
-- AS COMBINAÇÕES
-- --------------
-- Quatro declarações independentes, com a entrada do professor da rede
-- pública: 2^4 = 16 módulos.
--
--   C = cota (PPI)                      M = encerramento de matrícula
--   B = encerramento de benefício       P = professor da rede pública
--
--   ''(nenhuma)  C     M     B     P
--   CM   CB   CP   MB   MP   BP
--   CMB  CMP  CBP  MBP
--   CMBP
--
-- A ordem C→M→B→P é canônica: 'CP' e 'PC' seriam o mesmo módulo, e sem uma
-- ordem fixa o banco criaria os dois.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. A quarta declaração
-- ---------------------------------------------------------------------------
alter table candidatos
  add column if not exists declara_professor_rede_publica boolean not null default false;

comment on column candidatos.declara_professor_rede_publica is
  'Professor da rede pública de educação básica — dispensa o limite de renda no ProUni, mas exige comprovação do vínculo.';

alter table modulos_gendocs
  add column if not exists combinacao text;

comment on column modulos_gendocs.combinacao is
  'Código canônico das declarações que este módulo atende: letras de CMBP em ordem, string vazia para o módulo sem condição. NULL nos módulos que não são do ProUni.';

-- `(chamada, perfil)` era único de quando um perfil valia um módulo. Os 16
-- módulos novos têm todos perfil 'prouni' — a identidade agora é a
-- combinação, e o índice logo abaixo é quem a garante.
alter table modulos_gendocs drop constraint if exists modulos_gendocs_chamada_perfil_key;

-- Duas linhas com a mesma combinação seriam dois destinos para o mesmo
-- candidato. O índice impede.
create unique index if not exists um_modulo_por_combinacao
    on modulos_gendocs (chamada, combinacao) where combinacao is not null;

update modulos_gendocs set combinacao = '' where slug = 'prouni';


-- ---------------------------------------------------------------------------
-- 2. Do candidato para o código
-- ---------------------------------------------------------------------------
create or replace function combinacao_do_candidato(p_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (case when c.aceite_cota                      then 'C' else '' end) ||
    (case when c.declara_encerramento_matricula   then 'M' else '' end) ||
    (case when c.declara_encerramento_beneficio   then 'B' else '' end) ||
    (case when c.declara_professor_rede_publica   then 'P' else '' end), '')
    from candidatos c where c.id = p_id;
$$;


-- ---------------------------------------------------------------------------
-- 3. Os 15 módulos novos
--
-- Cada um nasce copiando o PROUNI base: mesma chamada, mesmas datas, mesmo
-- SLA, mesma lista documental — e ganha os comprovantes da combinação.
-- ---------------------------------------------------------------------------
do $$
declare
  v_base      uuid;
  v_chamada   text;
  v_inicio    date;
  v_fim       date;
  v_letras    text[] := array['C','M','B','P'];
  v_rotulo    jsonb  := jsonb_build_object(
                          'C', 'Cota', 'M', 'Enc. Matrícula',
                          'B', 'Enc. Benefício', 'P', 'Professor Rede Pública');
  v_fatia     jsonb  := jsonb_build_object(
                          'C', 'cota', 'M', 'matricula',
                          'B', 'beneficio', 'P', 'professor');
  i           int;
  v_comb      text;
  v_letra     text;
  v_nome      text;
  v_slug      text;
  v_partes    text[];
  v_rotulos   text[];
  v_novo      uuid;
begin
  select id, chamada, envio_inicio, envio_fim
    into v_base, v_chamada, v_inicio, v_fim
    from modulos_gendocs where slug = 'prouni';

  -- 1..15 percorre todos os subconjuntos não vazios de {C,M,B,P}: o bit k do
  -- número diz se a letra k entra. Mantém a ordem canônica de graça.
  for i in 1..15 loop
    v_comb := ''; v_partes := '{}'; v_rotulos := '{}';
    for k in 1..4 loop
      if (i >> (k - 1)) & 1 = 1 then
        v_letra  := v_letras[k];
        v_comb   := v_comb || v_letra;
        v_partes := v_partes || (v_fatia ->> v_letra);
        v_rotulos := v_rotulos || (v_rotulo ->> v_letra);
      end if;
    end loop;

    v_slug := 'prouni-' || array_to_string(v_partes, '-');
    v_nome := 'PROUNI: ' || array_to_string(v_rotulos, ' + ');

    if exists (select 1 from modulos_gendocs where combinacao = v_comb and chamada = v_chamada) then
      continue;
    end if;

    insert into modulos_gendocs
      (slug, nome, descricao, perfil, chamada, envio_inicio, envio_fim,
       situacao, ativo, destaque, link_preenchimento, combinacao)
    values
      (v_slug, v_nome,
       'Coleta documental dos candidatos pré-selecionados que declararam: ' ||
         array_to_string(v_rotulos, ', ') ||
         '. Inclui a documentação base do ProUni mais o comprovante de cada declaração.',
       'prouni', v_chamada, v_inicio, v_fim,
       'Iniciado', true, true, 'N/A', v_comb)
    returning id into v_novo;

    -- SLA igual ao do base.
    insert into modulos_sla (modulo_id, status, horas)
    select v_novo, s.status, s.horas from modulos_sla s where s.modulo_id = v_base;

    -- Lista documental base, idêntica.
    insert into documentos_exigidos
      (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a, verifica_ia, campos_ia)
    select v_novo, d.sequencia, d.nome, d.obrigatorio, d.descricao, d.aplica_a,
           d.verifica_ia, d.campos_ia
      from documentos_exigidos d where d.modulo_id = v_base;

    -- As mesmas equivalências, agora entre os documentos deste módulo.
    insert into documentos_substituicao (documento_id, substituido_id)
    select novo_de.id, novo_alvo.id
      from documentos_substituicao s
      join documentos_exigidos base_de   on base_de.id = s.documento_id
      join documentos_exigidos base_alvo on base_alvo.id = s.substituido_id
      join documentos_exigidos novo_de   on novo_de.modulo_id = v_novo   and novo_de.nome   = base_de.nome
      join documentos_exigidos novo_alvo on novo_alvo.modulo_id = v_novo and novo_alvo.nome = base_alvo.nome
     where base_de.modulo_id = v_base
    on conflict do nothing;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. Os comprovantes de cada declaração
--
-- Entram depois dos 14 base, na ordem canônica. `aplica_a = 'titular'`: são
-- declarações do candidato, não do grupo familiar.
-- ---------------------------------------------------------------------------
do $$
declare
  v_docs jsonb := jsonb_build_object(
    'C', jsonb_build_array(
      'Documento comprobatório de Raça e Cor - PPI',
      'Autodeclaração de raça e cor assinada, conforme o modelo da Secretaria.'),
    'M', jsonb_build_array(
      'Documento comprobatório de encerramento de vínculo com outra instituição',
      'Declaração da instituição anterior confirmando o encerramento da matrícula.'),
    'B', jsonb_build_array(
      'Documento comprobatório de encerramento do usufruto da bolsa ProUni ou do FIES',
      'Declaração de encerramento emitida pela instituição que concedeu o benefício.'),
    'P', jsonb_build_array(
      'Documento comprobatório de vínculo como professor da rede pública',
      'Declaração ou certidão da secretaria de educação com o vínculo efetivo no magistério ' ||
      'da educação básica pública, acompanhada do último contracheque.'));
  m       record;
  v_letra text;
  v_seq   int;
begin
  for m in select id, combinacao from modulos_gendocs
            where combinacao is not null and combinacao <> '' loop
    select coalesce(max(sequencia), 0) into v_seq
      from documentos_exigidos where modulo_id = m.id;

    foreach v_letra in array regexp_split_to_array(m.combinacao, '') loop
      v_seq := v_seq + 1;
      insert into documentos_exigidos
        (modulo_id, sequencia, nome, obrigatorio, descricao, aplica_a)
      values
        (m.id, v_seq, v_docs -> v_letra ->> 0, true, v_docs -> v_letra ->> 1, 'titular')
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;


-- ---------------------------------------------------------------------------
-- 5. Abrir coleta passa a receber o MÓDULO, não o perfil
--
-- Com 16 módulos de perfil 'prouni', escolher por perfil deixou de identificar
-- um só. A função antiga sai; quem chamava passa a resolver o módulo antes.
-- ---------------------------------------------------------------------------
drop function if exists gendocs_abrir_coleta(
  uuid, perfil_modulo, boolean, uuid, uuid, text, text, text, boolean);

create or replace function gendocs_abrir_coleta(
  p_grupo_id       uuid,
  p_modulo_id      uuid,
  p_titular        boolean,
  p_candidato_id   uuid,
  p_membro_id      uuid,
  p_nome           text,
  p_email          text,
  p_parentesco     text,
  p_maior_de_idade boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_participante uuid;
  v_coleta       uuid;
  v_protocolo    text;
  v_sufixo       text;
  v_seq          int;
  v_sla          int;
begin
  if p_modulo_id is null then
    raise exception 'Módulo não informado' using errcode = 'P0002';
  end if;

  select protocolo into v_protocolo from gendocs_grupos where id = p_grupo_id;

  if p_titular then
    v_sufixo := '-T';
  else
    select count(*) + 1 into v_seq
      from gendocs_participantes p
     where p.grupo_id = p_grupo_id and not p.titular;
    v_sufixo := '-F' || v_seq;
  end if;

  -- Agora cada pessoa está em um módulo só, então o protocolo mais o sufixo
  -- já identifica sem precisar do nome do módulo no fim.
  insert into gendocs_participantes
    (modulo_id, grupo_id, titular, candidato_id, membro_id,
     nome, email, parentesco, identificador_externo)
  values
    (p_modulo_id, p_grupo_id, p_titular, p_candidato_id, p_membro_id,
     p_nome, p_email, p_parentesco, v_protocolo || v_sufixo)
  returning id into v_participante;

  select horas into v_sla
    from modulos_sla where modulo_id = p_modulo_id and status = 'aberta';

  insert into gendocs_coletas (participante_id, status, aberta_em, prazo_em)
  values (v_participante, 'aberta', now(),
          now() + (coalesce(v_sla, 72) || ' hours')::interval)
  returning id into v_coleta;

  insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
  select v_coleta, d.id, 'pendente'
    from documentos_exigidos d
   where d.modulo_id = p_modulo_id
     and (d.aplica_a = 'todos'
          or (d.aplica_a = 'titular'  and p_titular)
          or (d.aplica_a = 'maiores'  and (p_titular or p_maior_de_idade))
          or (d.aplica_a = 'menores'  and not p_titular and not p_maior_de_idade));

  return v_coleta;
end;
$$;


-- Qual módulo atende este candidato.
create or replace function modulo_do_candidato(p_candidato_id uuid)
returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid; v_comb text; v_chamada text;
begin
  v_comb := combinacao_do_candidato(p_candidato_id);

  select m.chamada into v_chamada
    from modulos_gendocs m where m.combinacao = '' and m.ativo limit 1;

  select m.id into v_id
    from modulos_gendocs m
   where m.combinacao = v_comb and m.chamada = v_chamada and m.ativo;

  if v_id is null then
    raise exception 'Não há módulo ativo para a combinação "%"', v_comb
      using errcode = 'P0002';
  end if;
  return v_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Distribuição: um módulo, uma coleta
-- ---------------------------------------------------------------------------
create or replace function gendocs_distribuir_candidato(p_candidato_id uuid)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_grupo   uuid;
  v_modulo  uuid := modulo_do_candidato(p_candidato_id);
  v_nome    text;
  v_email   text;
  v_prot    text;
  v_chamada text;
begin
  select c.nome, c.email, c.protocolo into v_nome, v_email, v_prot
    from candidatos c where c.id = p_candidato_id;

  if v_nome is null then
    raise exception 'Candidato % não encontrado', p_candidato_id using errcode = 'P0002';
  end if;

  select m.chamada into v_chamada from modulos_gendocs m where m.id = v_modulo;

  select g.id into v_grupo from gendocs_grupos g where g.candidato_id = p_candidato_id limit 1;
  if v_grupo is null then
    insert into gendocs_grupos (candidato_id, chamada, protocolo)
    values (p_candidato_id, v_chamada, v_prot)
    returning id into v_grupo;
  end if;

  if exists (select 1 from gendocs_participantes p
              where p.grupo_id = v_grupo and p.titular) then
    return 0;
  end if;

  perform gendocs_abrir_coleta(v_grupo, v_modulo, true, p_candidato_id, null,
                               v_nome, v_email, null, true);
  return 1;
end;
$$;


-- O familiar entra no mesmo módulo do titular — e só pega os documentos com
-- `aplica_a = 'todos'`, que a própria `gendocs_abrir_coleta` filtra.
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
  v_modulo uuid;
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

  -- O módulo é o do titular, não o base: se ele declarou cota, o familiar
  -- entra no módulo de cota — com a lista de 'todos' dele, sem o comprovante
  -- de cota, que é 'titular'.
  select p.modulo_id into v_modulo
    from gendocs_participantes p where p.grupo_id = v_grupo and p.titular limit 1;
  if v_modulo is null then
    v_modulo := modulo_do_candidato(v_id);
  end if;

  perform gendocs_abrir_coleta(v_grupo, v_modulo, false, null, v_membro,
                               p_nome, v_email, p_parentesco, v_maior);

  return jsonb_build_object(
    'membro_id', v_membro,
    'maior_de_idade', v_maior,
    'email_notificacao', v_email);
end;
$$;
