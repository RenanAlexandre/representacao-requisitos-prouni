import type { DocumentoDaColeta } from './api'

/* ==================================================================
 * Equivalências entre documentos da coleta.
 *
 * A lista do ProUni tem substitutos: a CNH cobre RG e CPF; seis
 * comprovantes de renda opcionais cobrem o holerite. Quando um deles
 * entra, os campos que ele resolve deixam de fazer sentido — e um campo
 * que não faz mais sentido não deve continuar convidando o clique.
 *
 * Lógica pura, sem React, para poder ser conferida isoladamente.
 * ================================================================== */

/** Só o que interessa para o cálculo — facilita testar sem montar a coleta. */
export type DocParaCobertura = Pick<
  DocumentoDaColeta,
  'documento_coleta_id' | 'nome' | 'status' | 'resolvido' | 'nome_original' | 'substitui' | 'dispensado_por'
>

/**
 * Para cada documento SEM arquivo, quais anexos já cobrem aquele campo.
 * Chave é `documento_coleta_id`; ausência da chave significa que o campo
 * continua valendo.
 *
 * São duas situações, e para o candidato elas são a mesma coisa — o campo
 * deixou de ter função:
 *
 *  1. O campo foi SUBSTITUÍDO. Mandou a CNH, então RG e CPF saem de cena.
 *  2. O campo é uma ALTERNATIVA que perdeu o alvo. Os comprovantes de renda
 *     opcionais só existem para substituir o holerite; assim que a renda
 *     estiver comprovada — pelo holerite ou por qualquer um deles — os
 *     outros não têm mais o que substituir.
 *
 * Quem tem arquivo nunca é bloqueado: é preciso poder trocar ou remover o
 * que já foi enviado, senão a escolha vira armadilha.
 */
export function mapearCobertura(docs: DocParaCobertura[]): Record<string, string[]> {
  const porNome = new Map(docs.map((d) => [d.nome, d]))

  /* Ter arquivo não basta: um substituto RECUSADO não cobre nada, e bloquear
     o campo original por causa dele prenderia o candidato — sem poder mandar
     o original nem passar com o substituto. */
  const aceito = (nome: string) => {
    const a = porNome.get(nome)
    return !!a && !!a.nome_original && a.status !== 'reprovado' && a.status !== 'reprovado_ia'
  }

  const cobertura: Record<string, string[]> = {}

  for (const d of docs) {
    if (d.nome_original) continue

    // (1) Substituído por um anexo que já foi aceito.
    const substitutos = d.dispensado_por.filter(aceito)
    if (substitutos.length > 0) {
      cobertura[d.documento_coleta_id] = substitutos
      continue
    }

    // (2) Alternativa sem função: tudo o que ela substituiria já está
    //     resolvido. `every` num array vazio é verdadeiro, daí o length.
    if (d.substitui.length > 0 && d.substitui.every((n) => porNome.get(n)?.resolvido)) {
      const quem = new Set<string>()
      for (const alvo of d.substitui) {
        if (aceito(alvo)) quem.add(alvo)
        else porNome.get(alvo)?.dispensado_por.filter(aceito).forEach((n) => quem.add(n))
      }
      if (quem.size > 0) cobertura[d.documento_coleta_id] = [...quem]
    }
  }

  return cobertura
}

/** "A", "A e B", "A, B e C" — como se escreve, não como se junta array. */
export function listar(nomes: string[]) {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}
