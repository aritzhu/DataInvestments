import type { InfoContent } from '../components/ui/InfoButton';

export const INFO = {
  'landing.undervalued': {
    title: '¿Qué significa "infravalorada"?',
    body: 'Una empresa está **infravalorada** cuando su precio en bolsa es inferior al valor intrínseco estimado por nuestros modelos. Dicho de otro modo: el mercado la valora por debajo de lo que sugieren sus fundamentales.\n\nEl **margen de seguridad** es la diferencia en porcentaje entre el precio actual y el valor intrínseco: un margen positivo indica descuento.',
    badges: [
      { label: 'Barata', tone: 'pos' },
      { label: 'Margen positivo', tone: 'pos' },
    ],
    tip: 'Ninguna valoración es una garantía: es una estimación con incertidumbre, no una promesa de retorno.',
  } as InfoContent,

  'landing.overvalued': {
    title: '¿Qué significa "sobrevalorada"?',
    body: 'Una empresa está **sobrevalorada** cuando su precio en bolsa supera el valor intrínseco estimado. El mercado está dispuesto a pagar más de lo que los fundamentales justifican.\n\nEl **margen de seguridad** es negativo: hay que pagar una prima por encima del valor estimado.',
    badges: [
      { label: 'Cara', tone: 'neg' },
      { label: 'Margen negativo', tone: 'neg' },
    ],
    tip: 'Una empresa cara no es necesariamente una mala inversión: puede estar justificada por su crecimiento futuro esperado.',
  } as InfoContent,

  'landing.books': {
    title: '¿Por qué estas lecturas?',
    body: 'Son lecturas y documentales que ayudan a entender la **filosofía de inversión** que aplicamos: análisis fundamental, margen de seguridad y visión a largo plazo.\n\nVerlas no es obligatorio, pero dan contexto a los números que ves en la app.',
    tip: 'Empieza por los clásicos del análisis fundamental: entender el valor intrínseco lo cambia todo.',
  } as InfoContent,

  'landing.features': {
    title: '¿Qué puedes analizar?',
    body: 'La app agrupa el análisis en **tres bloques**:\n\n**Flujo de Caja** — la caja real que genera el negocio, la base de toda valoración sólida.\n\n**Valoración** — el precio justo estimado a partir de distintos modelos.\n\n**Fundamental** — la salud financiera: márgenes, deuda, rentabilidad y crecimiento.',
    badges: [
      { label: 'Caja', tone: 'gold' },
      { label: 'Valor', tone: 'neutral' },
      { label: 'Fundamental', tone: 'neutral' },
    ],
  } as InfoContent,

  'landing.listMetrics': {
    title: '¿Qué significan estas métricas?',
    body: '**P/E** — `Precio ÷ Beneficio por acción`. Cuántos años de beneficios pagas por cada acción.\n\n**Margen neto** — `Beneficio neto ÷ Ingresos × 100`. Qué porcentaje de cada euro de ventas se convierte en beneficio.\n\n**FCF yield** — `Flujo de caja libre ÷ Capitalización × 100`. Rentabilidad en caja sobre el valor de mercado.\n\n**ND/EBITDA** — `Deuda neta ÷ EBITDA`. Veces de beneficio operativo necesarias para pagar la deuda. Por debajo de 3 suele considerarse sano.',
    badges: [
      { label: 'Valoración', tone: 'neutral' },
      { label: 'Rentabilidad', tone: 'gold' },
      { label: 'Deuda', tone: 'warn' },
    ],
    tip: 'Ninguna métrica aislada cuenta la historia completa: compáralas con el sector de la empresa.',
  } as InfoContent,

  'landing.pageSize': {
    title: 'Ver por página',
    body: 'Número de empresas que se muestran en cada página del listado.\n\nUn número mayor reduce la paginación, pero hace que la página tarde más en cargar.',
  } as InfoContent,

  'company.marketCap': {
    title: 'Capitalización bursátil',
    body: '`Market Cap = Precio × Acciones en circulación`.\n\nEs el **valor total de la empresa** según el mercado: cuánto costaría comprarla a precio actual.',
    badges: [{ label: 'Valor de mercado', tone: 'neutral' }],
  } as InfoContent,

  'company.ev': {
    title: 'Valor de empresa (EV)',
    body: '`EV = Market Cap + Deuda neta`.\n\nIndica cuánto costaría **adquirir toda la empresa libre de deuda**: lo que pagas por las acciones más lo que te llevas como deuda.',
    badges: [{ label: 'Incluye deuda', tone: 'warn' }],
  } as InfoContent,

  'company.netIncome': {
    title: 'Beneficio neto',
    body: 'El **resultado final** de la empresa tras descontar gastos, impuestos e intereses.\n\nEs lo que queda realmente para los accionistas.',
    badges: [{ label: 'Últimos 12 meses', tone: 'neutral' }],
  } as InfoContent,

  'company.fcf': {
    title: 'Free Cash Flow (FCF)',
    body: '`FCF = Flujo operativo − CapEx`.\n\nLa **caja real** que genera el negocio después de reinvertir en mantenimiento. Es la base de la mayoría de valoraciones porque es dinero que realmente se puede repartir o reinvertir.',
    badges: [{ label: 'Caja real', tone: 'pos' }],
  } as InfoContent,

  'company.grossMargin': {
    title: 'Margen bruto',
    body: '`(Ingresos − Coste de ventas) ÷ Ingresos × 100`.\n\nCuánto gana la empresa por cada venta **antes** de gastos operativos. Mide el poder de fijación de precios.',
  } as InfoContent,

  'company.netMargin': {
    title: 'Margen neto',
    body: '`Beneficio neto ÷ Ingresos × 100`.\n\nQué porcentaje de cada euro de ventas se convierte en **beneficio final**. Un margen alto y estable suele indicar ventaja competitiva.',
  } as InfoContent,

  'company.ebitdaMargin': {
    title: 'Margen EBITDA',
    body: '`EBITDA ÷ Ingresos × 100`.\n\nRentabilidad operativa **antes de intereses, impuestos, depreciación y amortización**. Útil para comparar empresas sin distorsiones contables.',
    badges: [{ label: 'Operativo', tone: 'neutral' }],
  } as InfoContent,

  'company.margins': {
    title: 'Márgenes',
    body: 'Tres niveles de rentabilidad sobre las ventas:\n\n**Margen bruto** — `(Ingresos − Coste de ventas) ÷ Ingresos`. Lo que queda antes de gastos operativos.\n\n**Margen neto** — `Beneficio neto ÷ Ingresos`. Lo que queda como beneficio final.\n\n**Margen EBITDA** — `EBITDA ÷ Ingresos`. Rentabilidad operativa sin distorsiones contables.',
    badges: [
      { label: 'Bruto', tone: 'neutral' },
      { label: 'Neto', tone: 'pos' },
      { label: 'EBITDA', tone: 'neutral' },
    ],
  } as InfoContent,

  'company.pe': {
    title: 'P/E (Precio / Beneficio)',
    body: '`Precio ÷ Beneficio por acción`.\n\nCuántos años de beneficios actuales pagas por cada acción. Un P/E bajo puede indicar barato, pero **debe compararse con el sector y el crecimiento**: una empresa que crece rápido justifica un P/E alto.',
    badges: [
      { label: 'P/E bajo', tone: 'pos' },
      { label: 'P/E alto', tone: 'warn' },
    ],
  } as InfoContent,

  'company.pb': {
    title: 'P/B (Precio / Valor contable)',
    body: '`Precio ÷ Valor contable por acción`.\n\nRelación entre el precio y el **valor de los activos netos** contables. Por encima de 1 el mercado paga más que los activos; por debajo suele indicar descuento (o problemas).',
  } as InfoContent,

  'company.roe': {
    title: 'ROE (Retorno sobre el patrimonio)',
    body: '`Beneficio neto ÷ Patrimonio neto × 100`.\n\nRentabilidad que obtiene la empresa sobre el **dinero de los accionistas**. Un ROE alto y consistente indica que el negocio genera valor de forma eficiente.',
    badges: [{ label: 'Rentabilidad', tone: 'gold' }],
  } as InfoContent,

  'company.roa': {
    title: 'ROA (Retorno sobre los activos)',
    body: '`Beneficio neto ÷ Activos totales × 100`.\n\nRentabilidad sobre **todo lo que la empresa posee**. Mide la eficiencia de la dirección usando sus activos para generar beneficio.',
  } as InfoContent,

  'valuation.hero': {
    title: 'Valor justo',
    body: 'Estimación ponderada del **precio razonable** de la empresa combinando varios modelos de valoración.\n\nEl **veredicto** compara ese valor con el precio actual: si el valor justo está por encima del precio, la empresa está infravalorada (y viceversa).',
    badges: [
      { label: 'Infravalorada', tone: 'pos' },
      { label: 'Justa', tone: 'neutral' },
      { label: 'Sobrevalorada', tone: 'neg' },
    ],
    tip: 'El promedio ponderado da más peso a los modelos más fiables según la calidad de los datos.',
  } as InfoContent,

  'valuation.marginOfSafety': {
    title: 'Margen de seguridad',
    body: '`(Valor intrínseco − Precio) ÷ Valor intrínseco × 100`.\n\nEl **colchón** que te queda si compras al precio actual y tu estimación se cumple. Un margen positivo protege contra errores de estimación.',
    badges: [
      { label: 'Positivo = descuento', tone: 'pos' },
      { label: 'Negativo = prima', tone: 'neg' },
    ],
    tip: 'El margen de seguridad es el principio central de la inversión en valor: compra con colchón.',
  } as InfoContent,

  'valuation.uncertainty': {
    title: 'Estimación con alta incertidumbre',
    body: 'Este resultado se calculó con **datos incompletos o antiguos**, por lo que la precisión del valor es limitada.\n\nTrata la cifra con cautela: es orientativa, no un precio objetivo firme.',
    badges: [{ label: 'Datos parciales', tone: 'warn' }],
  } as InfoContent,

  'valuation.dcfGrowth': {
    title: 'Crecimiento anual del flujo',
    body: 'Incremento **porcentual anual** esperado del flujo de caja durante el horizonte de valoración.\n\nUn crecimiento mayor aumenta el valor justo; úsalo con prudencia, porque también es más arriesgado.',
  } as InfoContent,

  'valuation.discountRate': {
    title: 'Tasa de descuento',
    body: 'Rentabilidad mínima que exiges a la inversión para compensar el **riesgo y el coste de oportunidad**.\n\n`Valor actual = Flujo futuro ÷ (1 + tasa)^año`. A mayor tasa, menor valor presente: es el "módulo de interés compuesto" en sentido inverso.',
    badges: [{ label: 'Alta = conservador', tone: 'warn' }],
    tip: 'Una tasa de descuento típica ronda el 8–12% para empresas consolidadas.',
  } as InfoContent,

  'valuation.horizon': {
    title: 'Horizonte (años)',
    body: 'Número de **años a futuro** que proyectas los flujos de caja para calcular el valor.\n\nUn horizonte largo captura más valor de crecimiento, pero añade más incertidumbre a la estimación.',
  } as InfoContent,

  'valuation.targetPE': {
    title: 'P/E objetivo',
    body: 'El **múltiplo P/E** que consideras razonable para esta empresa.\n\n`Valor justo = Beneficio por acción × P/E objetivo`. Refleja cuánto estás dispuesto a pagar por cada euro de beneficio.',
  } as InfoContent,

  'valuation.targetPB': {
    title: 'P/B objetivo',
    body: 'El **múltiplo precio/valor contable** que consideras razonable.\n\n`Valor justo = Valor contable por acción × P/B objetivo`. Útil para empresas con muchos activos tangibles.',
  } as InfoContent,

  'valuation.targetPS': {
    title: 'P/S objetivo',
    body: 'El **múltiplo precio/ventas** que consideras razonable.\n\n`Valor justo = Ventas por acción × P/S objetivo`. Útil para empresas sin beneficios aún.',
  } as InfoContent,

  'valuation.targetMultiple': {
    title: 'Múltiplo objetivo',
    body: 'El múltiplo que aplicas sobre la **métrica base del modelo** (EBITDA o EBIT) para estimar el valor de la empresa.\n\n`Valor de empresa = Métrica × Múltiplo objetivo`. Un múltiplo más alto asume mejores perspectivas.',
  } as InfoContent,

  'valuation.ddmGrowth': {
    title: 'Crecimiento de dividendos',
    body: 'Incremento **anual esperado del dividendo**.\n\nEn el modelo de descuento de dividendos, el valor de la acción depende del dividendo, su crecimiento y la rentabilidad exigida.',
  } as InfoContent,

  'valuation.ddmReturn': {
    title: 'Retorno requerido',
    body: 'Rentabilidad anual que exiges por mantener la acción.\n\n`Valor = Dividendo × (1 + g) ÷ (r − g)`, donde `r` es este retorno y `g` el crecimiento de dividendos. Debe ser mayor que el crecimiento.',
    badges: [{ label: 'r > g', tone: 'warn' }],
  } as InfoContent,

  'valuation.fcfYieldTarget': {
    title: 'Rentabilidad por caja (yield)',
    body: 'El **FCF yield objetivo**: rentabilidad mínima en flujo de caja que quieres obtener.\n\n`Valor justo = FCF ÷ yield objetivo`. Si exiges un 10% de yield, el valor justo es 10 veces el FCF.',
  } as InfoContent,

  'valuation.quality': {
    title: 'Calidad y solidez',
    body: 'Indicadores que miden **rentabilidad** (ROE, ROA, ROIC) y **solvencia** (Current Ratio, Deuda/Equity, Altman Z, Piotroski).\n\nUn negocio de calidad combina alta rentabilidad sostenida con una estructura financiera que aguanta crisis.',
    badges: [
      { label: 'Rentabilidad', tone: 'gold' },
      { label: 'Solvencia', tone: 'pos' },
    ],
  } as InfoContent,

  'compare.header': {
    title: 'Comparación con el mercado',
    body: 'Compara los múltiplos y métricas de esta empresa con la **media del sector**.\n\nUna empresa "sobrevalorada" frente a su sector puede seguir siendo buena inversión si su crecimiento lo justifica; una "infravalorada" puede tener motivos para el descuento. Usa los veredictos como punto de partida.',
    badges: [
      { label: 'Infravalorada', tone: 'pos' },
      { label: 'Justa', tone: 'neutral' },
      { label: 'Sobrevalorada', tone: 'neg' },
    ],
  } as InfoContent,

  'cashflow.fcfVerdict': {
    title: '¿Cuánto cuesta la caja que genera?',
    body: 'Tres formas de ver el mismo precio:\n\n**FCF yield** — `FCF ÷ Capitalización × 100`. Rentabilidad en caja: un 10% significa que la empresa genera caja equivalente al 10% de su valor cada año.\n\n**EV/FCF** — cuántas veces el valor de empresa pagas por cada euro de caja libre.\n\n**Payback** — `Valor de empresa ÷ FCF`. **Años** que tardarías en recuperar la inversión con la caja generada.',
    badges: [
      { label: 'Barato', tone: 'pos' },
      { label: 'Justo', tone: 'neutral' },
      { label: 'Caro', tone: 'neg' },
    ],
  } as InfoContent,

  'cashflow.balance': {
    title: 'Balance en resumen',
    body: '**Activos** — todo lo que la empresa posee. **Pasivos** — todo lo que debe. **Deuda neta** — deuda total menos caja disponible.\n\n**Ratio corriente** — `Activo corriente ÷ Pasivo corriente`. Por encima de 1 indica capacidad de pagar deudas a corto plazo.\n\n**Deuda/Equity** — proporción de financiación ajena frente a fondos propios.',
    badges: [{ label: 'Solvencia', tone: 'pos' }],
  } as InfoContent,

  'statements.fairPrice': {
    title: 'Precio justo por beneficios',
    body: 'Estimación del precio razonable a partir de la **capacidad de generar beneficios**:\n\n**P/E** — años de beneficios que pagas.\n\n**P/S** — precio frente a ventas, útil si no hay beneficios.\n\n**EV/EBITDA** — valor de empresa frente a beneficio operativo.\n\n**EPS** — beneficio por acción, la base sobre la que se calculan los múltiplos.',
  } as InfoContent,

  'portfolio.intro': {
    title: '¿Qué es un portfolio?',
    body: 'Un **portfolio (cartera)** agrupa las posiciones de inversión que sigues en una empresa o temática concreta.\n\nCada posición registra la cantidad comprada y su precio medio; la app calcula valor, rentabilidad y valoración agregada del conjunto.',
    tip: 'Puedes crear tantos portfolios como quieras: por objetivo, por sector o por estrategia.',
  } as InfoContent,

  'portfolio.invested': {
    title: 'Invertido',
    body: 'Capital **total aportado** a este portfolio: la suma de `cantidad × precio medio` de todas las posiciones.',
  } as InfoContent,

  'portfolio.value': {
    title: 'Valor actual',
    body: '**Valor de mercado** de todas las posiciones a precio actual: `cantidad × precio actual`.\n\nSi es mayor que lo invertido, estás en ganancias.',
  } as InfoContent,

  'portfolio.pl': {
    title: 'P&L Total',
    body: '**Ganancia o pérdida** en euros: `Valor actual − Invertido`.',
    badges: [
      { label: 'Ganancia', tone: 'pos' },
      { label: 'Pérdida', tone: 'neg' },
    ],
  } as InfoContent,

  'portfolio.profit': {
    title: 'Rentabilidad',
    body: 'Rendimiento **porcentual** sobre lo invertido: `(Valor actual − Invertido) ÷ Invertido × 100`.\n\nMide lo bien que ha rendido tu dinero, con independencia del importe.',
  } as InfoContent,

  'portfolio.undervalued': {
    title: 'Infravaloradas',
    body: 'Número de posiciones cuyo **valor intrínseco supera al precio actual** (margen de seguridad positivo) respecto al total de posiciones.\n\nIndica cuánta parte de tu cartera está "en descuento" según nuestros modelos.',
    badges: [{ label: 'En descuento', tone: 'pos' }],
  } as InfoContent,

  'portfolio.fairValue': {
    title: 'Valor intrínseco',
    body: 'Suma de los **valores justos estimados** de todas las posiciones.\n\nEs una estimación, no un precio garantizado.',
    tip: 'Compáralo con el valor actual: la diferencia es tu margen de seguridad agregado.',
  } as InfoContent,

  'portfolio.gap': {
    title: 'Gap vs cotización',
    body: 'Diferencia **porcentual entre el valor intrínseco agregado y el valor de mercado** del portfolio.\n\nPositivo = la cartera cotiza por debajo de su valor estimado (en descuento); negativo = cotiza por encima.',
    badges: [
      { label: 'Positivo', tone: 'pos' },
      { label: 'Negativo', tone: 'neg' },
    ],
  } as InfoContent,

  'portfolio.convergence': {
    title: 'Convergencia hacia el valor objetivo',
    body: 'Evolución del **valor de mercado** del portfolio frente a su **valor objetivo (intrínseco)** a lo largo del tiempo.\n\nSi el precio tiende a acercarse al valor objetivo, las líneas "convergen". La zona coloreada muestra el margen de seguridad actual.',
  } as InfoContent,

  'portfolio.priceChart': {
    title: 'Evolución de precios',
    body: 'Precio de cada posición a lo largo del tiempo.\n\nEn modo **relativo** se muestra el cambio porcentual desde el inicio; en modo **real**, el precio en euros. Útil para comparar el comportamiento de tus posiciones entre sí.',
  } as InfoContent,

  'portfolio.sectorValuation': {
    title: 'Valoración por sector',
    body: 'Compara el **valor objetivo frente al valor de mercado** agregando las posiciones por sector.\n\nTe muestra en qué sectores de tu cartera hay más "descuento" (verde) o "prima" (rojo) según los modelos.',
    badges: [{ label: 'Descuento', tone: 'pos' }],
  } as InfoContent,

  'portfolio.breakdown': {
    title: 'Desglose de la cartera',
    body: 'Distribución de la cartera por **sectores, países, segmentos de negocio e ingresos por país**.\n\nLa barra de cada fila representa el **peso** (en % y en euros) de esa categoría sobre el total. Te ayuda a ver la concentración y la diversificación real.',
  } as InfoContent,

  'portfolio.positions': {
    title: 'Posiciones',
    body: 'Cada fila es una **posición** con:\n\n**Qty** — cantidad de acciones.\n**Avg** — precio medio de compra.\n**Price** — precio actual.\n**P&L** — ganancia/pérdida en euros y %.\n**Fair Value** — valor justo por acción (modelo usado).\n**MOS** — margen de seguridad: `(Fair Value − Price) ÷ Fair Value`.\n**Peso** — porcentaje que representa en la cartera.',
    badges: [
      { label: 'MOS +', tone: 'pos' },
      { label: 'MOS −', tone: 'neg' },
    ],
  } as InfoContent,

  'portfolio.holdingQty': {
    title: 'Cantidad (Qty)',
    body: 'Número de **acciones** que tienes de esta empresa.\n\nCombinada con el precio medio, calcula tu inversión total en la posición.',
  } as InfoContent,

  'portfolio.holdingAvg': {
    title: 'Precio medio (Avg)',
    body: '**Precio medio de compra** por acción.\n\n`Avg = Total invertido ÷ Cantidad`. Si compraste en varias tandas, es el promedio ponderado de todas ellas.',
  } as InfoContent,

  'portfolio.addHolding': {
    title: 'Añadir Posición',
    body: 'Registra una compra en el portfolio.\n\nLa **cantidad** es el número de acciones y el **precio medio** lo que pagaste por acción. Con ambos, la app calcula el capital invertido y la valoración de la posición.',
    tip: 'Si compraste varias veces, usa el precio medio ponderado de todas tus compras.',
  } as InfoContent,

  'favorites.header': {
    title: 'Favoritos y Alarmas',
    body: 'Dos herramientas para **seguir de cerca** a tus empresas:\n\n**Favoritos** — un listado personal con el precio actual, valor intrínseco y margen de seguridad de cada empresa.\n\n**Alarmas** — avisos automáticos cuando el precio cruza el valor que tú defines.',
    badges: [
      { label: 'Seguimiento', tone: 'gold' },
      { label: 'Avisos', tone: 'neutral' },
    ],
  } as InfoContent,

  'favorites.card': {
    title: '¿Qué muestra cada tarjeta?',
    body: '**Precio actual** — última cotización.\n\n**Valor intrínseco** — precio justo estimado por los modelos.\n\n**Margen de seguridad** — descuento o prima entre ambos: positivo indica que la empresa cotiza por debajo de su valor estimado.',
    badges: [
      { label: '▲ Infravalorada', tone: 'pos' },
      { label: '● Justa', tone: 'neutral' },
      { label: '▼ Sobrevalorada', tone: 'neg' },
    ],
  } as InfoContent,

  'settings.profile': {
    title: 'Perfil',
    body: 'Datos identificativos de tu cuenta: **nombre, email y avatar**.\n\nEstos datos se usan para personalizar la app y para la correspondencia relacionada con tu cuenta.',
  } as InfoContent,

  'settings.security': {
    title: 'Seguridad',
    body: 'Gestiona tu **contraseña**.\n\nUna contraseña segura mezcla mayúsculas, minúsculas, números y símbolos, y no se reutiliza en otros sitios.',
    tip: 'Tras cambiarla, se te pedirá iniciar sesión con la nueva contraseña.',
  } as InfoContent,

  'settings.preferences': {
    title: 'Preferencias',
    body: 'El **tema** (claro u oscuro) que quieres usar.\n\nAl elegirlo aquí se **guarda en tu cuenta**, así que se aplicará en cualquier dispositivo donde entres. El selector de la barra superior refleja el tema que estás usando realmente en este momento.',
  } as InfoContent,

  'settings.dangerZone': {
    title: 'Zona de peligro',
    body: 'Acciones **irreversibles** sobre tu cuenta.\n\nEliminar la cuenta borra de forma permanente tu perfil, favoritos, alarmas y portfolios. Esta acción **no se puede deshacer**.',
    badges: [{ label: 'Irreversible', tone: 'neg' }],
  } as InfoContent,

  'fundamental.header': {
    title: 'Análisis Fundamental',
    body: 'El análisis se organiza en **seis pilares**:\n\n**1. Crecimiento** — cómo evolucionan ingresos, beneficio y caja.\n**2. Solvencia** — capacidad de pagar las deudas.\n**3. Retorno** — cómo reparte valor a los accionistas.\n**4. DuPont** — de dónde viene la rentabilidad (ROE).\n**5. Sector** — comparación con la media del mercado.\n**6. Prospectivo** — estimaciones de analistas.\n\nCada pilar incluye una **guía** desplegable con más detalle.',
    badges: [
      { label: 'Crecimiento', tone: 'pos' },
      { label: 'Solvencia', tone: 'neutral' },
      { label: 'Retorno', tone: 'gold' },
    ],
    tip: 'Abre la "Guía" de cada pilar para entender qué significa cada métrica antes de interpretar los números.',
  } as InfoContent,

  'fundamental.growth': {
    title: 'Pilar 1 — Crecimiento',
    body: 'Mide a qué ritmo está creciendo el negocio:\n\n**Rev/NI/FCF YoY** — variación interanual de ingresos, beneficio neto y flujo de caja libre.\n**CAGR 3A/5A** — crecimiento anual compuesto (suaviza las oscilaciones de un año).\n**PEG** — P/E entre crecimiento esperado: por debajo de 1 el precio no refleja el crecimiento.\n**G. Sostenible** — máximo crecimiento de beneficios que la empresa puede financiar sin endeudarse más.',
    badges: [
      { label: 'Ingresos', tone: 'pos' },
      { label: 'Beneficio', tone: 'gold' },
      { label: 'Caja', tone: 'neutral' },
    ],
    tip: 'Un crecimiento sin generación de caja suele ser insostenible a largo plazo.',
  } as InfoContent,

  'fundamental.solvency': {
    title: 'Pilar 2 — Solvencia',
    body: 'Comprueba que la empresa pueda pagar sus deudas:\n\n**Deuda neta** — deuda total menos caja disponible.\n**ND/EBITDA** — años de EBITDA necesarios para pagar la deuda: >3x empieza a ser alto.\n**Cobertura de interés** — veces que el EBIT cubre los intereses.\n**Ratios de liquidez** — capacidad de pagar obligaciones a corto plazo con activos corrientes.\n**D/E** — deuda total sobre patrimonio propio.',
    badges: [
      { label: 'Bajo ND/EBITDA', tone: 'pos' },
      { label: 'Cobertura >3x', tone: 'pos' },
      { label: 'ND/EBITDA >3x', tone: 'neg' },
    ],
    tip: 'En banca y aseguradoras la deuda es parte del negocio y estos ratios se interpretan de forma distinta.',
  } as InfoContent,

  'fundamental.returns': {
    title: 'Pilar 3 — Retorno al accionista',
    body: 'Cuánto devuelve la empresa a quien la posee:\n\n**Payout** — porcentaje del beneficio repartido como dividendo.\n**Cobertura de dividendo** — veces que el beneficio cubre el dividendo pagado.\n**Buyback** — recompras de acciones propias (reduce el número de títulos).\n**Shareholder Yield** — retorno total del dividendo + recompras.\n**Div/FCF** — el dividendo debe pagarse con caja real, no con beneficio contable.',
    badges: [
      { label: 'Payout 30–60%', tone: 'pos' },
      { label: 'Div/FCF ≥1x', tone: 'pos' },
      { label: 'Payout >90%', tone: 'neg' },
    ],
    tip: 'Un payout sostenido por encima de la caja generada es una señal de alerta.',
  } as InfoContent,

  'fundamental.efficiency': {
    title: 'Pilar 4 — Eficiencia y DuPont',
    body: 'Descompone el **ROE** (rentabilidad sobre el patrimonio) en tres palancas:\n\n**Margen neto** — cuánto gana por cada venta.\n**Rotación de activos** — cuántas veces vende el valor de sus activos al año.\n**Apalancamiento** — cuánta deuda usa para financiar los activos.\n\nUn ROE alto por apalancamiento es más frágil que uno alto por margen o rotación.',
    badges: [
      { label: 'Margen alto', tone: 'pos' },
      { label: 'Rotación alta', tone: 'pos' },
      { label: 'Apalancado', tone: 'amber' },
    ],
    tip: 'El margen FCF y la conversión de caja confirman que el beneficio se convierte en dinero real.',
  } as InfoContent,

  'fundamental.peers': {
    title: 'Pilar 5 — Comparación con el sector',
    body: 'Compara los ratios de la empresa con la **media del mercado** y con los **múltiplos clave**:\n\nUn P/E o EV/EBITDA por encima de la media puede indicar prima (expectativas de crecimiento) o sobrevaloración. Las barras muestran dónde se sitúa cada múltiplo frente al mercado.',
    badges: [
      { label: 'P/E', tone: 'neutral' },
      { label: 'EV/EBITDA', tone: 'neutral' },
      { label: 'P/B', tone: 'neutral' },
    ],
    tip: 'Compara siempre con el sector, no con el mercado entero: los múltiplos razonables varían mucho por industria.',
  } as InfoContent,

  'fundamental.forward': {
    title: 'Pilar 6 — Perspectiva y riesgo',
    body: 'Información prospectiva de analistas:\n\n**Beta** — sensibilidad al mercado: <1 defensiva, >1 agresiva.\n**P/E forward** — múltiplo basado en beneficios estimados.\n**Precio objetivo** — consenso de analistas sobre el valor futuro.\n**Recomendación** — promedio de las opiniones de los analistas.',
    badges: [
      { label: 'Beta <1', tone: 'pos' },
      { label: 'Beta >1.5', tone: 'neg' },
    ],
    tip: 'El consenso de analistas es orientativo: se basa en expectativas que pueden no cumplirse.',
  } as InfoContent,
} satisfies Record<string, InfoContent>;
