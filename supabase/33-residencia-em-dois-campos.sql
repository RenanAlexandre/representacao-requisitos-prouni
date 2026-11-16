-- ============================================================================
-- 33 — O comprovante de residência vira dois campos
--
-- Rode depois do 32.
--
-- POR QUÊ
-- -------
-- Um campo só carregava quatro situações diferentes num parágrafo enorme, e
-- duas delas pedem papéis completamente distintos: quem mora em imóvel da
-- família manda uma conta de luz; quem mora de aluguel ou em imóvel cedido
-- manda contrato ou declaração com firma reconhecida, mais o comprovante e o
-- documento do proprietário. Com tudo junto, o candidato lia o texto inteiro
-- procurando o caso dele.
--
-- COMO FICA
-- ---------
--   OBRIGATÓRIO  Comprovante de Residência - Em nome próprio ou de familiar
--                do grupo
--   OPCIONAL     Comprovante de Residência - Comprovação de Imóvel Alugado ou
--                cedido  → substitui o obrigatório
--
-- É a mesma mecânica dos comprovantes de renda: um obrigatório, e caminhos
-- alternativos que o dispensam quando enviados. Enviar um dos dois basta — e a
-- tela já apaga e trava o campo coberto (`mapearCobertura`, src/lib/cobertura).
--
-- Renomear preserva o `id`, e com ele os anexos que já existem: quem enviou o
-- comprovante continua com o arquivo no campo obrigatório.
--
-- Depois da migração 30 a residência só existe nos módulos do titular, então é
-- só neles que o campo novo entra.
-- ============================================================================

do $blk$
declare
  m           record;
  v_criados   int := 0;
  v_proprio   text :=
    'Envie UM comprovante recente (até três meses). Valem: conta de água, energia, gás ou '
 || 'telefone (fixo ou celular); boleto de condomínio, de mensalidade escolar ou de plano de '
 || 'saúde; fatura de cartão de crédito; IPTU ou IPVA. '
 || 'EM NOME DO CANDIDATO: quando ele declara independência financeira — mora sozinho e tem '
 || 'renda própria compatível com o padrão de vida informado. '
 || 'EM NOME DE ALGUÉM DO GRUPO FAMILIAR: quando o candidato mora com a família; nesse caso '
 || 'não é preciso comprovante no nome dele. '
 || 'Se o imóvel é alugado ou cedido, use o campo seguinte no lugar deste.';
  v_alugado   text :=
    'Use este campo quando o imóvel não é do candidato nem de alguém do grupo familiar. '
 || 'IMÓVEL ALUGADO: contrato de locação acompanhado de um comprovante de residência em nome '
 || 'do proprietário. '
 || 'IMÓVEL CEDIDO OU SEM CONTRATO DE LOCAÇÃO: Declaração de Imóvel Cedido preenchida e '
 || 'assinada pelo proprietário, com firma reconhecida, junto de um comprovante de residência '
 || 'e do documento de identificação dele. '
 || 'Enviar aqui dispensa o comprovante em nome próprio ou de familiar.';
begin
  -- 1. O campo que já existe fica com o caso "em nome próprio ou da família".
  update documentos_exigidos
     set nome = 'Comprovante de Residência - Em nome próprio ou de familiar do grupo',
         descricao = v_proprio
   where nome = 'Comprovante de Residência';

  -- 2. O campo novo entra logo abaixo, em cada módulo que tem o obrigatório.
  for m in
    select d.modulo_id as id
      from documentos_exigidos d
     where d.nome = 'Comprovante de Residência - Em nome próprio ou de familiar do grupo'
  loop
    if inserir_documento_apos(
         m.id,
         'Comprovante de Residência - Em nome próprio ou de familiar do grupo',
         'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido',
         false, v_alugado, 'todos', true)
    then
      v_criados := v_criados + 1;
    end if;
  end loop;

  raise notice 'campo de imóvel alugado/cedido criado em % módulo(s)', v_criados;
end;
$blk$;


-- ---------------------------------------------------------------------------
-- 3. Um dispensa o outro
--
-- Sem esta linha o candidato que mora de aluguel continuaria com o obrigatório
-- em aberto depois de mandar o contrato — e não teria como fechar a coleta.
-- ---------------------------------------------------------------------------
insert into documentos_substituicao (documento_id, substituido_id)
select alugado.id, proprio.id
  from documentos_exigidos alugado
  join documentos_exigidos proprio
    on proprio.modulo_id = alugado.modulo_id
   and proprio.nome = 'Comprovante de Residência - Em nome próprio ou de familiar do grupo'
 where alugado.nome = 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido'
on conflict do nothing;


-- ---------------------------------------------------------------------------
-- 4. As coletas já abertas recebem a linha do campo novo
--
-- `documentos_exigidos` é o molde; `gendocs_documentos_coleta` são as linhas
-- que cada pessoa vê. Criar o documento no módulo NÃO cria a linha nas coletas
-- que já existem — mesma pegadinha da migração 20, que resolveu assim.
--
-- Vale também para coleta finalizada: o item é opcional, então não reabre nada
-- nem entra na trava de finalização, e a lista continua igual à do módulo.
-- ---------------------------------------------------------------------------
insert into gendocs_documentos_coleta (coleta_id, documento_id, status)
select ct.id, d.id, 'pendente'
  from gendocs_participantes p
  join gendocs_coletas ct on ct.participante_id = p.id
  join documentos_exigidos d on d.modulo_id = p.modulo_id
 where (d.aplica_a = 'todos'
        or (d.aplica_a = 'titular'  and p.titular)
        or (d.aplica_a = 'maiores'  and p.titular)
        or (d.aplica_a = 'menores'  and not p.titular))
   and not exists (select 1 from gendocs_documentos_coleta x
                    where x.coleta_id = ct.id and x.documento_id = d.id);


-- ---------------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------------
do $blk$
declare
  v_velho   int;
  v_proprio int;
  v_alugado int;
  v_subs    int;
  v_buracos int;
  v_vizinho int;
begin
  select count(*) into v_velho from documentos_exigidos
   where nome = 'Comprovante de Residência';
  select count(*) into v_proprio from documentos_exigidos
   where nome = 'Comprovante de Residência - Em nome próprio ou de familiar do grupo';
  select count(*) into v_alugado from documentos_exigidos
   where nome = 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido'
     and not obrigatorio;

  select count(*) into v_subs
    from documentos_substituicao s
    join documentos_exigidos de on de.id = s.documento_id
   where de.nome = 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido';

  -- O opcional tem de ficar IMEDIATAMENTE abaixo do obrigatório: é o que faz
  -- o candidato ler os dois casos como alternativas um do outro.
  select count(*) into v_vizinho
    from documentos_exigidos a
    join documentos_exigidos b on b.modulo_id = a.modulo_id
   where a.nome = 'Comprovante de Residência - Em nome próprio ou de familiar do grupo'
     and b.nome = 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido'
     and b.sequencia = a.sequencia + 1;

  select count(*) into v_buracos from (
    select d.modulo_id from documentos_exigidos d
     group by d.modulo_id
    having min(d.sequencia) <> 1 or max(d.sequencia) <> count(*)
  ) x;

  if v_velho > 0 then
    raise exception 'Ainda restam % campos com o nome antigo', v_velho;
  end if;
  if v_proprio <> v_alugado then
    raise exception 'Descompasso: % obrigatórios e % opcionais', v_proprio, v_alugado;
  end if;
  if v_subs <> v_alugado then
    raise exception 'Só % dos % opcionais dispensam o obrigatório', v_subs, v_alugado;
  end if;
  if v_vizinho <> v_proprio then
    raise exception 'Em % módulo(s) o opcional não ficou logo abaixo do obrigatório',
      v_proprio - v_vizinho;
  end if;
  if v_buracos > 0 then
    raise exception '% módulo(s) com buraco na numeração', v_buracos;
  end if;

  -- O teste que faltou da primeira vez: existir no módulo não é existir na
  -- coleta de quem já estava com ela aberta.
  if exists (
    select 1 from gendocs_coletas ct
      join gendocs_participantes p on p.id = ct.participante_id
      join documentos_exigidos d on d.modulo_id = p.modulo_id
     where d.nome = 'Comprovante de Residência - Comprovação de Imóvel Alugado ou cedido'
       and not exists (select 1 from gendocs_documentos_coleta x
                        where x.coleta_id = ct.id and x.documento_id = d.id))
  then
    raise exception 'Há coleta aberta sem a linha do campo de imóvel alugado/cedido';
  end if;

  raise notice 'residência dividida em 2 campos, em % módulos', v_proprio;
end;
$blk$;
