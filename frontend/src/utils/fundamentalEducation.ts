export interface FundSectionInfo {
  what: string;
  sectors: string;
  caveats: string;
  country: string;
}

export const FUND_SECTION_INFO = {
  growth: {
    what: 'Mide a qué ritmo aumentan ingresos, beneficio y caja de la empresa. El YoY compara con el año anterior; el CAGR suaviza el crecimiento compuesto de varios años. El PEG relaciona el precio (P/E) con ese crecimiento: un PEG menor de 1 sugiere que no estás pagando el crecimiento esperado.',
    sectors: 'Clave en tecnología, consumo discrecional y biotecnología, donde la valoración depende de crecer. Menos relevante en utilities, banca o inmobiliario, que se comparan más por dividendo que por CAGR.',
    caveats: 'Un beneficio que crece por recompras, impuestos o adquisiciones no es crecimiento orgánico real. Con bases pequeñas o negativas, los porcentajes engañan y el PEG no aplica.',
    country: 'La inflación y la divisa distorsionan el crecimiento nominal: un país con inflación alta "crece" más en papel. En mercados emergentes el crecimiento suele ser mayor pero también más volátil.',
  },
  solvency: {
    what: 'Mide si la empresa puede pagar sus deudas. La deuda neta resta la caja a la deuda total; el ND/EBITDA indica los años de beneficio operativo que tardaría en pagarla; la cobertura de intereses, cuántas veces el beneficio cubre los intereses.',
    sectors: 'Utilities, telecom y REITs usan mucha deuda de forma natural: un apalancamiento alto ahí es normal. En banca estos ratios no se leen igual (sus "deudas" son depósitos). En tecnología lo habitual es poca o ninguna deuda neta.',
    caveats: 'Compara solo dentro del mismo sector. Deuda neta negativa = posición de caja neta. Una cobertura de intereses menor de 1 indica riesgo de no poder pagar los intereses.',
    country: 'El coste de la deuda depende de los tipos de interés del país y de la divisa en que está emitida. Si una empresa emergente debe en USD, un tipo de cambio adverso encarece su deuda.',
  },
  shareholder: {
    what: 'Cuánto de lo que genera la empresa vuelve a ti: dividendos y recompras de acciones. El payout es el % del beneficio repartido como dividendo; el shareholder yield suma dividendos y recompras sobre la capitalización.',
    sectors: 'Utilities y REITs destacan por dividendos altos (los REITs están obligados a repartir la mayor parte del beneficio). La tecnología prefiere recompras. Las financieras pagan dividendos ligados a la regulación.',
    caveats: 'Un payout por encima del 100% no es sostenible salvo beneficios puntuales. Las recompras solo crean valor si se hacen con la acción barata. El dividendo se paga con caja real: compáralo con el FCF.',
    country: 'En EE.UU. predominan las recompras; en Europa y Asia los dividendos son más altos. Los dividendos de empresas extranjeras suelen tener retenciones de impuestos en origen.',
  },
  efficiency: {
    what: 'Mide lo bien que usa la empresa sus recursos: márgenes (rentabilidad), rotaciones (cómo usa activos e inventario), DSO/DPO (días de cobro y pago) y conversión FCF (cuánto del beneficio es efectivo real). El DuPont descompone el ROE en margen × rotación × apalancamiento.',
    sectors: 'Rotación e inventario son decisivos en retail y gran consumo. El software tiene márgenes altos pero casi sin inventario (esa rotación no aplica). En industria pesa el CapEx. En banca el DuPont no se lee igual.',
    caveats: 'Un ciclo de caja (CCC) negativo puede ser poder de negociación (como Apple) o signo de pagar muy tarde. CapEx alto = negocio intensivo en capital. Conversión FCF menor de 1 = el beneficio no se está convirtiendo en caja.',
    country: 'Los hábitos de pago varían por país: en España se tarda más en cobrar (PEP), en el norte de Europa menos, lo que cambia el DSO. Normas contables distintas (IFRS vs US GAAP) alteran márgenes y depreciación.',
  },
  peers: {
    what: 'Compara los ratios de valoración de la empresa (P/E, P/B, P/S, EV/EBITDA, FCF yield) con la media de su sector y del mercado, para ver si es cara o barata.',
    sectors: 'Muy útil en sectores con empresas comparables (banca, energía, consumo). Pierde sentido en biotecnología o conglomerados, donde cada empresa es distinta. Los REITs se comparan con P/FFO más que con P/E.',
    caveats: 'Un P/E alto puede estar justificado por más crecimiento: el ratio solo no decide. La media esconde diferencias; fíjate también en el rango y en la mediana.',
    country: 'El promedio mezcla empresas de países con tipos, regulación y crecimiento muy distintos. Siempre que puedas, compara con empresas del mismo país o mercado.',
  },
  forward: {
    what: 'Resume las expectativas del mercado: la beta mide la volatilidad frente al mercado, el P/E forward valora con beneficios estimados, y el precio objetivo y la recomendación recogen el consenso de los analistas.',
    sectors: 'La cobertura de analistas es alta en grandes empresas de EE.UU. y menor en small caps y mercados emergentes. La beta sirve en cualquier sector para calibrar el riesgo.',
    caveats: 'La beta es histórica y no predice el futuro. El consenso de analistas tiende a ser optimista y la recomendación no es una garantía. El P/E forward depende de estimaciones que pueden fallar.',
    country: 'En EE.UU. hay muchos analistas; en Europa menos y en emergentes muy pocos (el consenso es menos fiable). La beta se calcula contra el índice local o el global según el mercado.',
  },
} satisfies Record<string, FundSectionInfo>;
