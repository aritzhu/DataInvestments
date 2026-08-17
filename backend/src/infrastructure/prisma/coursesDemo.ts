import type { PrismaClient } from '@prisma/client';

export const IMG_INTERES = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Compound_interest_chart.png';
export const IMG_INTERES2 = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Compound_interest.png/960px-Compound_interest.png';
export const IMG_CARTERA = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Asset_allocation.png';
export const IMG_GRAHAM = 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg';
export const IMG_CASHFLOW = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Expansion_Cash_Flow_Forecast_Chart.png/960px-Expansion_Cash_Flow_Forecast_Chart.png';

export interface DemoCourseSeed {
  slug: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  orden: number;
  imagen: string;
  contenido: any[];
}

export const DEMO_COURSES: DemoCourseSeed[] = [
  {
    slug: 'interes-compuesto',
    titulo: 'Interés compuesto, interés acumulado y ahorro',
    descripcion:
      'Descubre por qué Einstein llamaba al interés compuesto "la fuerza más poderosa del universo" y cómo convertirlo en tu mayor aliado con hábitos de ahorro.',
    categoria: 'finanzas',
    orden: 1,
    imagen: IMG_INTERES,
    contenido: [
      { tipo: 'heading', contenido: 'La fuerza más poderosa del universo' },
      {
        tipo: 'quote',
        contenido: 'El interés compuesto es la octava maravilla del mundo. El que lo entiende, se enriquece; el que no, lo paga.',
        author: 'Atribuido a Albert Einstein',
      },
      {
        tipo: 'text',
        titulo: '¿Qué es el interés compuesto?',
        contenido:
          'El interés compuesto es el interés que se calcula sobre el capital inicial y, además, sobre los intereses ya generados. Es decir: tus intereses también generan intereses. Mientras el interés simple solo paga sobre lo que invertiste, el compuesto hace crecer la base de cálculo cada año, como una bola de nieve que rueda cuesta abajo. Es la base de todo el crecimiento del ahorro a largo plazo.',
      },
      {
        tipo: 'image',
        imagen: IMG_INTERES,
        caption: 'La curva del interés compuesto: cuanto más tiempo pasa, más rápido crece el capital.',
      },
      {
        tipo: 'text',
        titulo: 'La fórmula que cambia tu futuro',
        contenido:
          'La fórmula es A = P × (1 + r)^n, donde P es el capital inicial, r es el interés anual y n es el número de años. Aunque parezca abstracta, tiene dos consecuencias prácticas: cada punto porcentual de rentabilidad importa muchísimo, y cada año extra de paciencia multiplica el resultado final de forma exponencial, no lineal.',
      },
      {
        tipo: 'text_image',
        titulo: 'Interés simple vs. interés acumulado',
        contenido:
          'Con interés simple de 5% anual, 100 € crecen en línea recta: 5 € cada año. Con interés compuesto, ese mismo 5% se acumula: el año 1 ganas 5 €, el año 2 ganas sobre 105 €, y así sucesivamente. En 30 años, la diferencia entre simple y compuesto puede superar el doble del capital. El tiempo es el ingrediente que no se puede comprar: empieza cuanto antes.',
        imagen: IMG_INTERES2,
        layout: 'right',
      },
      {
        tipo: 'text',
        titulo: 'El ahorro es el combustible',
        contenido:
          'Sin ahorro no hay interés compuesto. La clave está en pagarse a uno mismo primero: ahorrar un porcentaje fijo de cada ingreso antes de gastar. Aportaciones constantes (aunque sean pequeñas) combinadas con el paso del tiempo y una rentabilidad razonable construyen patrimonios sorprendentes. Un inversor que empieza con 100 € al mes a los 25 años puede acabar superando a uno que empieza con el triple a los 40.',
      },
      {
        tipo: 'text',
        titulo: 'Reglas de oro del ahorro compuesto',
        contenido:
          '1. Empieza hoy, aunque sea poco. 2. Sé constante: aporta cada mes, sin importar el clima del mercado. 3. No interrumpas la bola de nieve: retirar dinero a mitad de camino destruye el efecto compuesto. 4. Reinvierte los dividendos e intereses en lugar de gastarlos. 5. Deja trabajar al tiempo: el interés compuesto premia la paciencia con brutalidad.',
      },
      {
        tipo: 'books',
        titulo: 'Libros relacionados',
        contenido:
          'Profundiza sobre el interés compuesto y el ahorro a largo plazo con los libros que también recomendamos en la web.',
        libros: ['9780553384611', '9780060555665', '9780743200400'],
      },
    ],
  },
  {
    slug: 'reparticion-de-cartera',
    titulo: 'Repartición de cartera según tu perfil',
    descripcion:
      'Aprende a repartir tu dinero según tu edad, tu horizonte y los sectores que te interesan para construir una cartera equilibrada.',
    categoria: 'finanzas',
    orden: 2,
    imagen: IMG_CARTERA,
    contenido: [
      { tipo: 'heading', contenido: 'Reparte bien, gana con calma' },
      {
        tipo: 'quote',
        contenido: 'El reparto de activos (asset allocation) es la decisión más importante que tomarás como inversor: decide más del 90% de tus resultados.',
        author: 'Basado en estudios de Brinson, Hood y Beebower',
      },
      {
        tipo: 'text',
        titulo: 'Años del inversor: tu horizonte manda',
        contenido:
          'Tu reparto de cartera debe depender de tu horizonte temporal. Cuantos más años te falten para necesitar el dinero, más riesgo puedes permitirte, porque tendrás tiempo para recuperarte de las caídas. A los 25 años el horizonte puede ser de 40 años; a los 60, de 5. La regla clásica sugería restar tu edad a 100 para saber el % de acciones: a los 30 años, 70% en acciones y 30% en activos seguros. Ajusta la regla a tu tolerancia real.',
      },
      {
        tipo: 'text',
        titulo: 'Tolerancia al riesgo',
        contenido:
          'El reparto no sirve de nada si no puedes dormir. Tu tolerancia al riesgo es la cantidad de caída que puedes soportar sin vender en pánico. Las carteras con más acciones caen más en los malos momentos, pero a largo plazo suelen rendir más. Una prueba sencilla: si tu cartera pierde un 30% en un año, ¿seguirías comprando? Si la respuesta es no, baja el porcentaje en acciones.',
      },
      {
        tipo: 'image',
        imagen: IMG_CARTERA,
        caption: 'Un ejemplo de reparto objetivo entre activos para una cartera equilibrada.',
      },
      {
        tipo: 'text',
        titulo: 'Reparto por tipos de activo',
        contenido:
          'Una cartera equilibrada mezcla activos con comportamientos distintos: acciones (crecimiento), bonos y efectivo (estabilidad), y quizá algún activo real como inmuebles o materias primas. Cuando las acciones caen, los bonos suelen aguantar, y viceversa. Ese equilibrio reduce la volatilidad total y te permite mantener la calma en las correcciones, que es justo lo que el interés compuesto necesita.',
      },
      {
        tipo: 'text',
        titulo: 'Sectores que te interesan',
        contenido:
          'Dentro de la parte de acciones, distribuye entre sectores que entiendas y que te interesen: tecnología, consumo, salud, energía o financieras. Diversificar entre sectores evita depender de una sola moda o de un único negocio. En DataInvestments puedes filtrar las empresas por sector y crear carteras con las compañías que mejor conozcas. Recuerda la máxima de Peter Lynch: invierte en lo que entiendes.',
      },
      {
        tipo: 'text',
        titulo: 'Cómo configurarlo en DataInvestments',
        contenido:
          'En la sección Portfolios crea tu cartera e indica los años que te quedan de inversión: la app te ayuda a pensar en el largo plazo. Añade empresas de distintos sectores, revisa periódicamente que ninguna posición se haya desproporcionado y reequilibra una o dos veces al año, vendiendo un poco de lo que ha subido para comprar lo que ha quedado rezagado. Así mantienes tu reparto objetivo sin moverlo cada semana.',
      },
      {
        tipo: 'books',
        titulo: 'Libros relacionados',
        contenido:
          'Amplía tus conocimientos sobre reparto de cartera, riesgo y selección de sectores con los libros de la web.',
        libros: ['9780060555665', '9780470289634', '9780471445500'],
      },
    ],
  },
  {
    slug: 'value-investing',
    titulo: 'Value investing: compra valor, no humo',
    descripcion:
      'El método de Benjamin Graham y Warren Buffett paso a paso: valor intrínseco, margen de seguridad, ratios y estados financieros.',
    categoria: 'value-investing',
    orden: 3,
    imagen: IMG_GRAHAM,
    contenido: [
      { tipo: 'heading', contenido: 'El arte de comprar valor' },
      {
        tipo: 'quote',
        contenido: 'La inversión es más inteligente cuando es más empresarial.',
        author: 'Benjamin Graham',
      },
      {
        tipo: 'text_image',
        titulo: '¿Qué es el value investing?',
        contenido:
          'El value investing es una filosofía de inversión popularizada por Benjamin Graham y Warren Buffett. Consiste en comprar acciones de empresas sólidas por debajo de su valor intrínseco: pagar menos de lo que la empresa realmente vale. La idea es sencilla: si calculas que una empresa vale 100 € y el mercado la vende a 60 €, tienes margen de seguridad a tu favor.',
        imagen: IMG_GRAHAM,
        layout: 'right',
      },
      {
        tipo: 'text',
        titulo: 'Paso 1 · Entiende el valor intrínseco',
        contenido:
          'El valor intrínseco es el valor real de una empresa, calculado a partir de sus fundamentales: beneficios, flujos de caja, activos, deuda y perspectivas de crecimiento. El precio de mercado fluctúa cada día, pero el valor intrínseco cambia despacio. En la pestaña de Valoración de DataInvestments verás una estimación basada en varios modelos (DCF, P/E, P/B, entre otros).',
      },
      {
        tipo: 'text',
        titulo: 'Paso 2 · El margen de seguridad',
        contenido:
          'El margen de seguridad es la diferencia entre el precio y el valor intrínseco. Un margen positivo significa que compras con un colchón que te protege si tu estimación se equivoca. La regla de oro: nunca compres sin margen de seguridad. En la web verás las empresas infravaloradas ordenadas por este margen; la app lo calcula automáticamente con tus datos.',
      },
      {
        tipo: 'text',
        titulo: 'Paso 3 · Los ratios clave',
        contenido:
          'Para valorar una empresa rápidamente usa los múltiplos: P/E (precio entre beneficio), P/B (precio entre valor contable), P/S (precio entre ventas), EV/EBITDA y dividend yield. Compara cada ratio con su sector y con la propia historia de la empresa. Un P/E bajo no significa siempre ganga: puede que el mercado descuente una caída de beneficios.',
      },
      {
        tipo: 'text',
        titulo: 'Paso 4 · Analiza los estados financieros',
        contenido:
          'Los fundamentales cuentan la historia real. Mira la evolución de ingresos y beneficio neto en los últimos 5 años, el flujo de caja libre (FCF = flujo operativo - capex), la deuda neta frente al EBITDA y el retorno sobre el capital invertido (ROIC). Una empresa que genera caja, reduce deuda y reinvierte con rentabilidad es un buen candidato a largo plazo.',
      },
      {
        tipo: 'text',
        titulo: 'Paso 5 · Practica con DataInvestments',
        contenido:
          'Abre cualquier empresa del buscador y visita sus pestañas: Flujo de Caja para ver cómo se genera y consume el dinero, Estados Financieros para la evolución anual, y Valoración para el margen de seguridad. Crea una cartera con tus candidatas y usa las alarmas para que la app te avise cuando una acción alcance un precio interesante. Recuerda: esto es información educativa, no una recomendación de compra.',
      },
      {
        tipo: 'books',
        titulo: 'Libros relacionados',
        contenido:
          'Los clásicos del value investing que también recomendamos en la web. Empieza por el primero y ve subiendo de nivel.',
        libros: ['9780060555665', '9780071592536', '9780887305108', '9780471463399', '9780470289634'],
      },
    ],
  },
  {
    slug: 'la-aplicacion',
    titulo: 'La aplicación: los métodos de evaluación',
    descripcion:
      'Cómo calcula DataInvestments el valor intrínseco y el margen de seguridad: DCF, múltiplos, Altman Z, Piotroski y más.',
    categoria: 'guia',
    orden: 4,
    imagen: IMG_CASHFLOW,
    contenido: [
      { tipo: 'heading', contenido: 'Cómo evalúa la aplicación a cada empresa' },
      {
        tipo: 'quote',
        contenido: 'No hay método perfecto: todos son aproximaciones al valor. El arte está en usar varios y exigir descuento.',
        author: 'Principio de valoración',
      },
      {
        tipo: 'text',
        titulo: 'Varias ventanas al mismo edificio',
        contenido:
          'Ningún método de valoración es exacto. Por eso DataInvestments no te da una sola cifra, sino un conjunto de estimaciones que se apoyan mutuamente: descuento de flujos de caja, múltiplos de mercado, calidad financiera y solidez. Cuando todos los métodos apuntan en la misma dirección, la señal es más fiable. Cuando se contradicen, es hora de investigar por qué.',
      },
      {
        tipo: 'text',
        titulo: 'Método 1 · DCF (Descuento de flujos de caja)',
        contenido:
          'El DCF estima el valor intrínseco trayendo al presente todos los flujos de caja libres que se espera que genere la empresa en el futuro, descontados a una tasa que refleja el riesgo. Es el método favorito de los value investors porque se basa en lo que la empresa realmente produce en efectivo, no en la opinión del mercado. Sus puntos débiles: depende mucho de las hipótesis de crecimiento y de la tasa de descuento.',
      },
      {
        tipo: 'image',
        imagen: IMG_CASHFLOW,
        caption: 'Una previsión de flujo de caja: la base del método DCF.',
      },
      {
        tipo: 'text',
        titulo: 'Método 2 · Múltiplos de mercado',
        contenido:
          'Los múltiplos comparan el precio con una magnitud fundamental: P/E (precio/beneficio), P/B (precio/valor contable), P/S (precio/ventas) y EV/EBITDA (valor de empresa/beneficio antes de amortización). Son rápidos y útiles para comparar empresas del mismo sector, pero solo tienen sentido relativos a su historia y a su industria: un P/E de 40 es normal en una empresa que crece un 30% anual.',
      },
      {
        tipo: 'text',
        titulo: 'Método 3 · Calidad y solidez: Altman Z y Piotroski',
        contenido:
          'Para evitar trampas de valor (empresas baratas porque están en problemas), la app mide la calidad. El Altman Z-score estima el riesgo de quiebra con ratios de liquidez, rentabilidad y apalancamiento: cuanto más alto, más sana. El score de Piotroski puntúa la calidad financiera de 0 a 9 según cómo mejora la rentabilidad, el apalancamiento y la eficiencia operativa de un año a otro. Úsalos como filtro antes de comprar.',
      },
      {
        tipo: 'text',
        titulo: 'El margen de seguridad en la app',
        contenido:
          'Con esas estimaciones, la aplicación calcula el valor intrínseco y lo compara con el precio actual para darte el margen de seguridad. Un margen positivo (por ejemplo +20%) indica que el precio está por debajo del valor estimado. Cuanto mayor el margen, mayor el colchón ante errores. La web ordena las empresas infravaloradas por este margen para que empieces por las oportunidades más claras.',
      },
      {
        tipo: 'text',
        titulo: 'Cómo leer las pestañas de una empresa',
        contenido:
          'Estados Financieros te muestra la evolución anual de ingresos, beneficios y balance. Flujo de Caja desglosa cómo se genera y se gasta el dinero. Valoración concentra el valor intrínseco, los múltiplos y el margen de seguridad. Empieza siempre por el valor intrínseco y el margen, y confirma con los estados financieros que la empresa no es una trampa de valor. Recuerda: toda la información es educativa, no asesoramiento de compra.',
      },
      {
        tipo: 'books',
        titulo: 'Libros relacionados',
        contenido:
          'Para dominar los métodos de valoración que usa la aplicación, estos son los libros que recomendamos en la web.',
        libros: ['9780071592536', '9780470624159', '9780471463399'],
      },
    ],
  },
];

export async function seedCourses(prisma: PrismaClient, adminId: string) {
  const legacy = await prisma.course.findFirst({ where: { titulo: 'Curso de Value Investing', slug: null } });
  if (legacy) {
    await prisma.course.delete({ where: { id: legacy.id } });
    console.log('Legacy "Curso de Value Investing" removed (replaced by "value-investing")');
  }

  for (const curso of DEMO_COURSES) {
    const existing = await prisma.course.findFirst({ where: { slug: curso.slug } });
    const data = {
      userId: adminId,
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      contenido: JSON.stringify(curso.contenido),
      imagen: curso.imagen,
      categoria: curso.categoria,
      orden: curso.orden,
      activo: true,
      slug: curso.slug,
    };
    if (existing) {
      await prisma.course.update({ where: { id: existing.id }, data });
      console.log(`Course "${curso.titulo}" updated`);
    } else {
      await prisma.course.create({ data });
      console.log(`Course "${curso.titulo}" created`);
    }
  }
}
