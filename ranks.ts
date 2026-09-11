import type { RankInfo } from '../lib/types';

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rankFor(pct: number, revelia: boolean): RankInfo {
  if (revelia) {
    return {
      rank: 'Revel(a)',
      msg: pick([
        'Seus recursos se esgotaram e o processo foi julgado à revelia. Isso acontece até com os melhores estagiários — releia a fundamentação de cada questão e tente recorrer.',
        'A banca bateu o martelo antes da hora. Volte com mais preparo e recorra dessa sentença.',
        'Dez recursos não foram suficientes hoje. Mas todo processo admite recurso — bora de novo?',
      ]),
    };
  }
  if (pct >= 90) {
    return {
      rank: 'Juiz(a) Togado(a)',
      msg: pick([
        'Sentença mantida em todas as instâncias. Domínio sólido de Direito Empresarial — a banca está impressionada.',
        'Unanimidade da turma julgadora. Você não decide casos, você os antecipa.',
        'Jurisprudência formada em seu nome. Poucos chegam a esse patamar de fundamentação.',
      ]),
    };
  }
  if (pct >= 70) {
    return {
      rank: 'Sócio(a) Sênior',
      msg: pick([
        'Boa fundamentação na maioria dos processos. Falta pouco para a toga — revise os pontos que escaparam.',
        'Cliente satisfeito, honorários em dia. Só falta lapidar alguns detalhes técnicos.',
        'Você já discute de igual para igual com a banca. Mais um empurrão e vira magistrado(a).',
      ]),
    };
  }
  if (pct >= 40) {
    return {
      rank: 'Associado(a) Júnior',
      msg: pick([
        'Base razoável, mas alguns despachos saíram equivocados. Vale revisar sociedades, títulos de crédito e falência.',
        'Meio caminho andado. A petição tem argumento, mas precisa de mais lastro doutrinário.',
        'Está no caminho certo, mas a banca ainda pede mais fundamentação nas próximas teses.',
      ]),
    };
  }
  return {
    rank: 'Estagiário(a) em Apuros',
    msg: pick([
      'O processo foi turbulento, mas todo jurista começa assim. Releia as fundamentações e tente recorrer da sentença.',
      'Hoje não foi o dia da toga. Ninguém nasce sabendo — nem os desembargadores.',
      'A banca recomenda: revisão geral da matéria antes do próximo plantão.',
    ]),
  };
}
