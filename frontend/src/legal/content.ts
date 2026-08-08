export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  shortTitle: string;
  updatedAt: string;
  sections: LegalSection[];
}

export const DEFAULT_UPDATED_AT = 'Agosto 2026';

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'terminos',
    title: 'Términos y Condiciones',
    shortTitle: 'Términos',
    updatedAt: '{FECHA_ACTUALIZACION}',
    sections: [
      {
        heading: '1. Identificación y objeto',
        paragraphs: [
          'Estos Términos y Condiciones regulan el acceso y uso del sitio web DataInvestments (en adelante, "el Sitio"), una plataforma de consulta y visualización de información financiera de empresas.',
          'El Sitio tiene una finalidad exclusivamente informativa y educativa. No presta servicios de asesoramiento financiero, ni de gestión de inversiones, ni emite recomendaciones de compra o venta de valores.',
          'Al acceder y utilizar el Sitio, el usuario acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con ellos, deberá abstenerse de utilizar el Sitio.',
        ],
      },
      {
        heading: '2. Naturaleza de la información',
        paragraphs: [
          'Toda la información mostrada (datos financieros, valoraciones, ratios, gráficos y textos) se ofrece únicamente con fines informativos y educativos.',
          'Los valores intrínsecos, márgenes de seguridad y veredictos ("subvalorada", "justa", "sobrevalorada") son el resultado de modelos matemáticos automáticos con hipótesis subjetivas. No constituyen una recomendación de inversión ni una invitación a comprar o vender valores.',
          'La información procede de fuentes de terceros (entre otras, SEC EDGAR, Yahoo Finance y sistemas de información regulada europeos) que pueden contener errores, retrasos u omisiones. DataInvestments no garantiza su exactitud, integridad ni actualidad.',
        ],
      },
      {
        heading: '3. Responsabilidad del usuario',
        paragraphs: [
          'El usuario es el único responsable de las decisiones que adopte basándose en la información del Sitio. Antes de cualquier decisión de inversión, debe contrastar los datos con fuentes oficiales y, en su caso, consultar a un asesor financiero autorizado.',
          'Invertir en valores implica riesgo, incluida la posible pérdida total del capital invertido. Los rendimientos pasados no garantizan resultados futuros.',
          'El usuario se compromete a utilizar el Sitio de forma lícita y a no realizar actividades que puedan dañar, sobrecargar o perjudicar su funcionamiento.',
        ],
      },
      {
        heading: '4. Limitación de responsabilidad',
        paragraphs: [
          'DataInvestments no será responsable de los daños o perjuicios derivados del uso de la información del Sitio, ni de las decisiones de inversión adoptadas por los usuarios, ni de la interrupción temporal o definitiva del servicio.',
          'El Sitio puede contener enlaces a sitios web de terceros. DataInvestments no controla su contenido y no se responsabiliza de ellos.',
        ],
      },
      {
        heading: '5. Propiedad intelectual',
        paragraphs: [
          'Los contenidos del Sitio (textos, gráficos, logotipos, diseño y código) son titularidad de DataInvestments o de sus legítimos titulares, y están protegidos por la normativa de propiedad intelectual.',
          'Queda prohibida la reproducción, distribución, transformación o comunicación pública de los contenidos sin autorización expresa, salvo para uso personal y no comercial.',
        ],
      },
      {
        heading: '6. Cuentas de usuario',
        paragraphs: [
          'El registro requiere datos personales (nombre y correo electrónico). El usuario es responsable de mantener la confidencialidad de sus credenciales y de todas las actividades realizadas con su cuenta.',
          'DataInvestments podrá suspender o eliminar cuentas que hagan un uso indebido del servicio.',
        ],
      },
      {
        heading: '7. Modificaciones',
        paragraphs: [
          'DataInvestments se reserva el derecho a modificar estos Términos y Condiciones en cualquier momento. Los cambios se publicarán en esta página y serán efectivos desde su publicación.',
        ],
      },
      {
        heading: '8. Legislación aplicable y jurisdicción',
        paragraphs: [
          'Estos Términos y Condiciones se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales del domicilio del titular, salvo que la ley disponga otra cosa.',
        ],
      },
    ],
  },
  {
    slug: 'privacidad',
    title: 'Política de Privacidad',
    shortTitle: 'Privacidad',
    updatedAt: '{FECHA_ACTUALIZACION}',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        paragraphs: [
          'En cumplimiento del Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), se informa al usuario de que los datos personales facilitados serán tratados por:',
          'Titular: {TITULAR}.',
          'NIF/CIF: {NIF}.',
          'Domicilio: {DOMICILIO}.',
          'Correo electrónico de contacto: {EMAIL}.',
        ],
      },
      {
        heading: '2. Datos recopilados',
        paragraphs: [
          'Datos facilitados por el usuario en el registro: nombre, dirección de correo electrónico y contraseña (almacenada de forma cifrada).',
          'Datos generados por el uso: favoritos, carteras de seguimiento, alarmas de valoración y preferencias de visualización (tema claro/oscuro).',
          'El Sitio no utiliza cookies de terceros ni sistemas de analítica externa. Únicamente se usa el almacenamiento local del navegador (localStorage) para conservar la sesión iniciada y la preferencia de tema.',
        ],
      },
      {
        heading: '3. Finalidad y base legal del tratamiento',
        paragraphs: [
          'Los datos se tratan con las siguientes finalidades y bases legales:',
          '(a) Gestión de la cuenta de usuario y del acceso al servicio: base legal, ejecución del contrato de servicios (art. 6.1.b RGPD).',
          '(b) Envío, en su caso, de comunicaciones relacionadas con el servicio: base legal, consentimiento del interesado (art. 6.1.a RGPD).',
          '(c) Cumplimiento de obligaciones legales (art. 6.1.c RGPD).',
          'El consentimiento se obtiene mediante la casilla de aceptación en el formulario de registro, que puede retirarse en cualquier momento sin efectos retroactivos.',
        ],
      },
      {
        heading: '4. Conservación de los datos',
        paragraphs: [
          'Los datos personales se conservarán mientras la cuenta esté activa y, después de su baja, durante los plazos legales aplicables o hasta que el interesado solicite su supresión.',
        ],
      },
      {
        heading: '5. Derechos de los interesados',
        paragraphs: [
          'El usuario puede ejercer en cualquier momento los derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de sus datos, así como el derecho a retirar el consentimiento prestado, dirigiendo su solicitud a {EMAIL} o por escrito a {DOMICILIO}.',
          'También tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).',
        ],
      },
      {
        heading: '6. Seguridad',
        paragraphs: [
          'DataInvestments aplica medidas técnicas y organizativas adecuadas para proteger los datos personales frente a accesos no autorizados, alteración, pérdida o tratamiento ilícito.',
        ],
      },
      {
        heading: '7. Cesión de datos',
        paragraphs: [
          'Los datos personales no se cederán a terceros, salvo obligación legal. El Sitio no vende ni comercializa datos personales.',
        ],
      },
      {
        heading: '8. Menores',
        paragraphs: [
          'El servicio no está dirigido a menores de 14 años. Si se detecta el registro de un menor de dicha edad, se procederá a la cancelación de su cuenta y de sus datos.',
        ],
      },
    ],
  },
  {
    slug: 'aviso-legal',
    title: 'Aviso Legal',
    shortTitle: 'Aviso Legal',
    updatedAt: '{FECHA_ACTUALIZACION}',
    sections: [
      {
        heading: '1. Titular del sitio web',
        paragraphs: [
          'En cumplimiento de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa de que el titular del sitio web DataInvestments es:',
          'Titular: {TITULAR}.',
          'NIF/CIF: {NIF}.',
          'Domicilio: {DOMICILIO}.',
          'Correo electrónico: {EMAIL}.',
          'Datos registrales: {REGISTRAL}.',
        ],
      },
      {
        heading: '2. Objeto',
        paragraphs: [
          'El sitio web tiene por objeto la consulta y visualización de información financiera de empresas cotizadas con fines informativos y educativos.',
          'El acceso y uso del sitio atribuye la condición de usuario e implica la aceptación plena de este Aviso Legal y de los Términos y Condiciones.',
        ],
      },
      {
        heading: '3. Exclusión de responsabilidad',
        paragraphs: [
          'DataInvestments no ofrece asesoramiento financiero ni de inversión. La información publicada no constituye recomendación de compra, venta o mantenimiento de valores, ni una oferta de contratación.',
          'El titular no se hace responsable de la exactitud de los datos de terceros mostrados ni de las decisiones adoptadas por los usuarios a partir de ellos. Tampoco se hace responsable de los daños derivados de la interrupción del servicio o de la existencia de virus o elementos dañinos en el sitio.',
        ],
      },
      {
        heading: '4. Propiedad intelectual e industrial',
        paragraphs: [
          'Todos los contenidos del sitio web, salvo indicación en contrario, son titularidad de DataInvestments y están protegidos por la normativa de propiedad intelectual e industrial.',
        ],
      },
      {
        heading: '5. Modificación y enlaces',
        paragraphs: [
          'El titular se reserva el derecho a modificar, en cualquier momento y sin previo aviso, la configuración y contenidos del sitio.',
          'Los enlaces a sitios de terceros no implican la existencia de relación con el titular, quien no responde del contenido de dichos sitios.',
        ],
      },
      {
        heading: '6. Legislación aplicable',
        paragraphs: [
          'El presente Aviso Legal se rige por la legislación española. Las partes se someten, con renuncia a cualquier otro fuero, a los juzgados y tribunales del domicilio del titular.',
        ],
      },
    ],
  },
  {
    slug: 'riesgos',
    title: 'Advertencia sobre Riesgos de Inversión',
    shortTitle: 'Riesgos',
    updatedAt: '{FECHA_ACTUALIZACION}',
    sections: [
      {
        heading: '1. Sin asesoramiento financiero',
        paragraphs: [
          'DataInvestments es una herramienta de consulta y visualización de datos financieros con fines informativos y educativos. Nada en este sitio web constituye asesoramiento financiero, asesoramiento de inversión, recomendación de compra, venta o mantenimiento de valores, ni una oferta de inversión.',
          'Los veredictos de valoración ("subvalorada", "justa", "sobrevalorada"), los márgenes de seguridad y los valores intrínsecos mostrados son estimaciones generadas automáticamente por modelos matemáticos con hipótesis subjetivas y configurables. No son opiniones de analistas y no deben interpretarse como una llamada a la acción.',
        ],
      },
      {
        heading: '2. Calidad y fiabilidad de los datos',
        paragraphs: [
          'La información financiera procede de fuentes de terceros (SEC EDGAR, Yahoo Finance y sistemas de información regulada europeos, entre otras). Estas fuentes pueden contener errores, retrasos, cifras ajustadas o datos ausentes.',
          'Es posible que algunos valores mostrados sean estimaciones, estén incompletos o correspondan a ejercicios anteriores. Cuando un dato presenta baja confianza o resulta poco realista, el sitio lo indica mediante avisos, pero no puede garantizarse la exactitud de ninguna cifra.',
          'El usuario debe contrastar siempre la información con las fuentes oficiales de cada emisor.',
        ],
      },
      {
        heading: '3. Riesgo de pérdida de capital',
        paragraphs: [
          'Invertir en valores implica asumir riesgos, entre ellos la posibilidad de pérdida total o parcial del capital invertido. Los rendimientos pasados no son garantía de resultados futuros.',
          'Las condiciones de mercado, los resultados empresariales y las valoraciones pueden variar de forma rápida e imprevisible. Una valoración estimada como "baja" o "subvalorada" no implica que el precio no pueda seguir bajando.',
        ],
      },
      {
        heading: '4. Responsabilidad individual',
        paragraphs: [
          'Cualquier decisión de inversión es exclusiva responsabilidad del usuario. Antes de invertir, se recomienda consultar con un asesor financiero autorizado y revisar la documentación oficial del emisor.',
          'DataInvestments no mantiene ninguna relación de asesoramiento, fiduciaria ni contractual de inversión con sus usuarios.',
        ],
      },
      {
        heading: '5. Impuestos y marco legal',
        paragraphs: [
          'Las consecuencias fiscales y legales de cada inversión dependen de la situación individual de cada usuario y de su jurisdicción. DataInvestments no presta asesoramiento fiscal ni legal.',
        ],
      },
    ],
  },
];

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}
