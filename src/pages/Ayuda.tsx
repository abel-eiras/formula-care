/**
 * Ayuda dentro de la app: guías cortas de cada servicio y de las tareas
 * menos evidentes (plantillas de correo, importación, copias…). Se puede
 * enlazar a un tema concreto con /ayuda?tema=<id>.
 */
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  DatabaseBackup,
  FileText,
  FlaskConical,
  Gift,
  HeartPulse,
  LifeBuoy,
  Lock,
  Mail,
  RefreshCw,
  Rocket,
  Salad,
  Search,
  Send,
  Shield,
  Sparkles,
  Upload,
  Users,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { abrirEnlaceExterno } from "@/lib/enlaceExterno";

/** Minúsculas y sin tildes, para buscar */
const normalizarTexto = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

interface Tema {
  id: string;
  titulo: string;
  icono: LucideIcon;
  /** Palabras extra para el buscador */
  claves: string;
  contenido: ReactNode;
}

// ---------- Piezas de texto ----------

function Pasos({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-1.5 pl-5">{children}</ol>;
}

function Lista({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function Consejo({ children }: { children: ReactNode }) {
  return <p className="rounded-md border-l-4 border-primary/60 bg-primary/5 px-3 py-2 text-sm">{children}</p>;
}

function Ruta({ children }: { children: ReactNode }) {
  return <strong className="whitespace-nowrap">{children}</strong>;
}

function Codigo({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>;
}

// ---------- Temas ----------

const TEMAS: Tema[] = [
  {
    id: "primeros-pasos",
    titulo: "Primeros pasos",
    icono: Rocket,
    claves: "empezar configurar inicio instalar",
    contenido: (
      <>
        <p>Antes de empezar a atender pacientes, conviene dejar lista la configuración básica (solo hace falta una vez):</p>
        <Pasos>
          <li><Ruta>Configuración → Datos de la Farmacia</Ruta>: nombre, dirección, teléfono y logo. Salen en los informes y en los correos.</li>
          <li><Ruta>Configuración → Correo</Ruta>: la cuenta desde la que se envían los correos a los pacientes. Pulsa «Enviar correo de prueba» para comprobarla.</li>
          <li><Ruta>Configuración → Copias de Seguridad</Ruta>: cada cuánto se hacen y, si puedes, una carpeta adicional fuera del ordenador.</li>
          <li><Ruta>Configuración → Usuarios</Ruta>: una cuenta para cada persona del equipo.</li>
          <li>Si ya tenías tus pacientes en Excel, impórtalos desde <Ruta>Pacientes → Importar desde Excel</Ruta>.</li>
        </Pasos>
      </>
    ),
  },
  {
    id: "pacientes",
    titulo: "Pacientes",
    icono: Users,
    claves: "ficha alta nuevo buscar historial borrar consentimiento",
    contenido: (
      <>
        <Lista>
          <li><strong>Alta:</strong> <Ruta>Pacientes → Nuevo Paciente</Ruta>. Son obligatorios el nombre, el teléfono, la fecha de nacimiento y el sexo. La edad se calcula sola.</li>
          <li><strong>Buscar:</strong> escribe parte del nombre, del teléfono o del email; no importan las mayúsculas ni las tildes. En «Filtros» puedes acotar por edad, sexo, servicio u origen.</li>
          <li><strong>Ficha:</strong> al pulsar un paciente ves sus datos, su historial de visitas y análisis, y las gráficas de evolución de peso, perímetros, tensión y demás medidas.</li>
          <li><strong>Nuevo servicio:</strong> desde la ficha puedes empezar un análisis o una visita ya con el paciente elegido.</li>
        </Lista>
        <Consejo>Al dar de alta a un paciente se le pide el consentimiento de protección de datos; la app guarda la fecha y la versión del texto que aceptó.</Consejo>
      </>
    ),
  },
  {
    id: "importar",
    titulo: "Importar pacientes desde Excel",
    icono: Upload,
    claves: "excel plantilla importar hoja calculo csv migrar",
    contenido: (
      <>
        <p>Si tenías tus pacientes en una hoja de cálculo, puedes pasarlos a la app de una vez (solo administradores). Solo se importan los datos del paciente, no medidas ni análisis.</p>
        <Pasos>
          <li>Ve a <Ruta>Pacientes → Importar desde Excel</Ruta> y pulsa <strong>Descargar plantilla</strong>.</li>
          <li>Ábrela con Excel o LibreOffice. En la hoja «Pacientes», escribe un paciente por fila (o copia y pega tus columnas debajo de cada encabezado). La hoja «Instrucciones» explica cada columna.</li>
          <li>Las columnas con <Codigo>*</Codigo> son obligatorias: nombre, teléfono, fecha de nacimiento (por ejemplo 15/03/1968) y sexo (elige Mujer, Hombre u Otro en el desplegable).</li>
          <li>Guarda el archivo como Excel (.xlsx), vuelve a la app y pulsa <strong>Elegir archivo</strong>.</li>
          <li>La app te enseña cuántos pacientes están listos, cuáles tienen datos que corregir (con el número de fila y el motivo) y cuáles ya existían.</li>
          <li>Pulsa <strong>Importar</strong>.</li>
        </Pasos>
        <Consejo>
          No cambies los encabezados de la primera fila: así la app sabe qué hay en cada columna. Un paciente que ya está (mismo teléfono, o mismo nombre y fecha de nacimiento) nunca se duplica, así que puedes corregir el Excel e importarlo otra vez sin miedo.
        </Consejo>
        <p>A los pacientes importados se les registra el consentimiento de protección de datos con la fecha de la importación. En la lista de pacientes puedes verlos con el filtro <Ruta>Origen → Importado desde Excel</Ruta>.</p>
      </>
    ),
  },
  {
    id: "dermo",
    titulo: "Análisis dermocosmético",
    icono: Sparkles,
    claves: "piel dermo rutina cosmetica hidratacion",
    contenido: (
      <>
        <Pasos>
          <li>Entra en <Ruta>Dermocosmética</Ruta> y elige el paciente.</li>
          <li>Marca la valoración de la piel, los hábitos, la medicación, las patologías y, en mujeres, la etapa hormonal.</li>
          <li>Rellena la rutina de día y de noche paso a paso, los cuidados semanales (exfoliante, mascarilla) y las recomendaciones.</li>
          <li>Guarda. Después puedes imprimir el informe, guardarlo en PDF o enviarlo por correo al paciente.</li>
        </Pasos>
        <Consejo>Cada análisis queda en el historial del paciente: en la siguiente visita puedes abrir el anterior para comparar.</Consejo>
      </>
    ),
  },
  {
    id: "bio",
    titulo: "Análisis bioquímico",
    icono: FlaskConical,
    claves: "glucemia colesterol tension analitica bioquimica parametros hba1c",
    contenido: (
      <>
        <Pasos>
          <li>Entra en <Ruta>Bioquímica</Ruta> y elige el paciente.</li>
          <li>Escribe solo los valores que hayas medido: glucemia, tensión, pulsaciones, colesterol, triglicéridos, HbA1c, peso, altura, cintura… El IMC se calcula solo.</li>
          <li>Si está activada la valoración, cada valor se colorea (verde, ámbar o rojo) según los rangos de referencia.</li>
          <li>Añade observaciones y recomendaciones, y guarda.</li>
        </Pasos>
        <p>En <Ruta>Configuración → Parámetros Bioquímicos</Ruta> puedes activar o desactivar la valoración por colores, ajustar los rangos de referencia y ocultar los parámetros que no uses.</p>
        <Consejo>La tensión, el peso y los perímetros se guardan en el historial único de medidas del paciente, junto con los de nutrición, para ver su evolución en una sola gráfica.</Consejo>
      </>
    ),
  },
  {
    id: "score2-findrisc",
    titulo: "Riesgo cardiovascular (SCORE2) y de diabetes (FINDRISC)",
    icono: HeartPulse,
    claves: "score2 findrisc riesgo cardiovascular diabetes tablas",
    contenido: (
      <>
        <p>Dentro del análisis bioquímico hay un apartado de riesgo que se rellena con los datos de la propia prueba.</p>
        <p className="font-semibold">SCORE2: riesgo cardiovascular a 10 años</p>
        <Lista>
          <li>Se calcula cuando la prueba incluye <strong>tensión sistólica, colesterol total y colesterol HDL</strong>, y respondes si el paciente fuma.</li>
          <li>Usa el modelo SCORE2 de la Sociedad Europea de Cardiología calibrado para España (región de riesgo bajo); a partir de 70 años, SCORE2-OP. Es válido de 40 a 89 años.</li>
          <li>El resultado es un porcentaje y una categoría (bajo-moderado, alto o muy alto) con los umbrales de su edad.</li>
          <li>No es aplicable a personas con diabetes, enfermedad cardiovascular, enfermedad renal crónica o hipercolesterolemia familiar. Si la glucemia o la HbA1c están en rango de diabetes, la app lo avisa.</li>
        </Lista>
        <p className="font-semibold">FINDRISC: riesgo de diabetes tipo 2 a 10 años</p>
        <Lista>
          <li>Se ofrece cuando has medido la glucemia o la hemoglobina glucosilada. Marca «Hacer el test FINDRISC».</li>
          <li>Edad, IMC y cintura se rellenan solas con los datos del análisis; las otras cinco preguntas se contestan con el paciente.</li>
          <li>Se guarda la respuesta y los puntos de cada pregunta, para poder comparar en las siguientes visitas.</li>
          <li>El resumen sale en el informe y el test completo va como anexo al final.</li>
        </Lista>
        <Consejo>Son herramientas de cribado para orientar la conversación y la derivación al médico, no un diagnóstico.</Consejo>
      </>
    ),
  },
  {
    id: "nutricion",
    titulo: "Nutrición y seguimiento GLP-1",
    icono: Salad,
    claves: "nutricion glp1 semaglutida tirzepatida peso dieta programa visita alimentacion",
    contenido: (
      <>
        <Pasos>
          <li>Entra en <Ruta>Nutrición</Ruta>, elige el paciente y crea un <strong>programa</strong>: motivo, objetivo, antecedentes y tratamientos (incluido si usa o ha usado un GLP-1).</li>
          <li>Registra la <strong>visita inicial</strong> y luego las de seguimiento: medidas, bioimpedancia, tensión, hábitos, actividad y, si toma GLP-1, dosis, adherencia y efectos secundarios.</li>
          <li>En cada visita verás la evolución respecto a la inicial: % de peso perdido, hitos del 5, 10 y 15 %, cintura y masa grasa frente a masa magra.</li>
          <li>Si el paciente trae su <strong>registro de alimentación</strong>, transcríbelo: la app analiza picoteo, hambre, saciedad y malestar.</li>
          <li>Revisa las <strong>sugerencias</strong>: cada una indica el dato que la dispara; tú decides qué recomendar.</li>
        </Pasos>
        <Consejo>Desde el programa puedes imprimir la hoja de registro de alimentación en blanco para que el paciente la rellene en casa.</Consejo>
      </>
    ),
  },
  {
    id: "calendario",
    titulo: "Calendario y citas",
    icono: CalendarDays,
    claves: "cita agenda recordatorio whatsapp taller evento cancelar",
    contenido: (
      <>
        <Lista>
          <li><strong>Nueva cita:</strong> en <Ruta>Calendario</Ruta>, elige el día y pulsa «Nueva Cita»: paciente, tipo de servicio, fecha y hora.</li>
          <li><strong>Estados:</strong> desde las acciones de cada cita puedes marcarla como realizada, «no se presentó» o cancelada, y también editarla o borrarla.</li>
          <li><strong>Correos automáticos:</strong> si el paciente tiene email, recibe la confirmación al darle cita, un aviso si cambia o se cancela y un recordatorio el día antes (hace falta tener configurado el correo).</li>
          <li><strong>WhatsApp:</strong> el botón de WhatsApp abre la conversación con el mensaje de recordatorio ya escrito; solo tienes que enviarlo.</li>
          <li><strong>Talleres y eventos:</strong> en <Ruta>Configuración → Calendario</Ruta> puedes crear eventos con fechas, horarios y plazas.</li>
        </Lista>
      </>
    ),
  },
  {
    id: "avisos",
    titulo: "Avisos y cumpleaños",
    icono: Gift,
    claves: "notificaciones revisiones cumpleanos felicitar dashboard inicio",
    contenido: (
      <Lista>
        <li>En el <Ruta>Dashboard</Ruta> ves los avisos: revisiones que tocan, cumpleaños del día y otras notificaciones.</li>
        <li>Los cumpleaños salen también en el calendario. Puedes felicitar por WhatsApp (mensaje ya escrito), por correo o registrar que le felicitaste en persona o por teléfono.</li>
        <li>El texto del correo de felicitación se cambia en <Ruta>Configuración → Plantillas Email</Ruta>.</li>
      </Lista>
    ),
  },
  {
    id: "informes",
    titulo: "Informes: imprimir, PDF y correo",
    icono: FileText,
    claves: "informe imprimir pdf enviar email exportar excel csv",
    contenido: (
      <>
        <Lista>
          <li>Cada servicio tiene su informe con el logo y los colores de la farmacia. Primero guarda el análisis o la visita.</li>
          <li><strong>Imprimir</strong> abre el informe listo para la impresora. <strong>Guardar PDF</strong> te deja elegir dónde guardarlo. <strong>Enviar por email</strong> se lo manda al paciente con el PDF adjunto.</li>
          <li>En <Ruta>Pacientes</Ruta> y en el <Ruta>Dashboard</Ruta>, «Exportar a Excel» saca listados que se abren con Excel o LibreOffice.</li>
        </Lista>
        <Consejo>Los colores del informe se eligen en <Ruta>Configuración → Apariencia</Ruta>.</Consejo>
      </>
    ),
  },
  {
    id: "plantillas",
    titulo: "Plantillas de correo",
    icono: Mail,
    claves: "plantilla email correo texto variables confirmacion recordatorio html editar",
    contenido: (
      <>
        <p>Son los textos de los correos que recibe el paciente: confirmación, recordatorio, modificación y cancelación de cita, envío de informe y felicitación de cumpleaños. Se editan en <Ruta>Configuración → Plantillas Email</Ruta>.</p>
        <p className="font-semibold">Cómo cambiar el texto sin estropear el diseño</p>
        <Pasos>
          <li>Elige la plantilla y cambia el <strong>asunto</strong> si quieres.</li>
          <li>En el contenido verás el texto rodeado de códigos entre <Codigo>&lt; &gt;</Codigo> (por ejemplo <Codigo>&lt;p&gt;</Codigo>, que marca un párrafo). Cambia solo las palabras que hay entre esos códigos; no borres los códigos.</li>
          <li>Pulsa la pestaña <strong>Vista previa</strong> para ver cómo quedará antes de guardar.</li>
          <li>Guarda. Si algo sale mal, <strong>Restaurar</strong> devuelve la plantilla original.</li>
        </Pasos>
        <p className="font-semibold">Variables</p>
        <p>Las palabras entre llaves dobles, como <Codigo>{"{{nombrePaciente}}"}</Codigo> o <Codigo>{"{{fechaCita}}"}</Codigo>, se sustituyen por el dato real al enviar. Debajo del editor tienes la lista completa: pulsa una para copiarla y pégala donde quieras que aparezca. Escríbelas exactamente igual, con las llaves.</p>
        <Consejo>Los datos de la farmacia (nombre, dirección, teléfono, web) se toman de <Ruta>Configuración → Datos de la Farmacia</Ruta>: si faltan, esas variables salen vacías.</Consejo>
      </>
    ),
  },
  {
    id: "correo",
    titulo: "Configurar el correo",
    icono: Send,
    claves: "correo email smtp gmail outlook resend enviar prueba contraseña aplicacion",
    contenido: (
      <>
        <Pasos>
          <li>Ve a <Ruta>Configuración → Correo</Ruta> (solo administradores).</li>
          <li>Escribe la dirección de correo de la farmacia y el nombre que verá el paciente.</li>
          <li>Elige tu proveedor: Gmail, Outlook/Microsoft 365 u otro (para otros, tu proveedor te dará el servidor de correo saliente y el puerto).</li>
          <li>Escribe usuario y contraseña, guarda y pulsa <strong>Enviar correo de prueba</strong>.</li>
        </Pasos>
        <Consejo>Gmail no acepta la contraseña normal: crea una «contraseña de aplicación» en tu cuenta de Google (Seguridad → Verificación en dos pasos → Contraseñas de aplicaciones). Si la prueba falla, la app te dice en qué paso y qué revisar.</Consejo>
      </>
    ),
  },
  {
    id: "copias",
    titulo: "Copias de seguridad y cambiar de ordenador",
    icono: DatabaseBackup,
    claves: "copia seguridad backup restaurar ordenador nuevo usb nube cifrar contraseña",
    contenido: (
      <>
        <Lista>
          <li>En <Ruta>Configuración → Copias de Seguridad</Ruta> eliges cada cuánto se hacen (diaria, semanal, mensual) y si se protegen con contraseña.</li>
          <li>Elige una <strong>carpeta adicional</strong> (disco externo o carpeta de OneDrive, Google Drive o Dropbox): cada copia se guardará también allí. Si el ordenador se estropea, esa es tu salvación.</li>
          <li>«Realizar copia ahora» hace una al momento; «Guardar en…» saca una copia concreta a donde quieras.</li>
        </Lista>
        <p className="font-semibold">Pasar a otro ordenador</p>
        <Pasos>
          <li>En el antiguo: realiza una copia y guárdala en un USB con «Guardar en…».</li>
          <li>En el nuevo: instala la app, crea una cuenta cualquiera y ve a <Ruta>Configuración → Copias de Seguridad → Restaurar una copia</Ruta>.</li>
          <li>Elige el archivo (termina en .fcbackup) y, si la protegiste, escribe la contraseña.</li>
          <li>Entra con tu usuario de siempre: se recupera todo, incluidos usuarios, correo y plantillas.</li>
        </Pasos>
        <Consejo>Si olvidas la contraseña de las copias cifradas, nadie puede abrirlas. Apúntala en un lugar seguro.</Consejo>
      </>
    ),
  },
  {
    id: "usuarios",
    titulo: "Usuarios y permisos",
    icono: UserCog,
    claves: "usuario rol administrador farmaceutico personal contraseña olvidada",
    contenido: (
      <>
        <Lista>
          <li>Los administradores crean y gestionan usuarios en <Ruta>Configuración → Usuarios</Ruta>.</li>
          <li><strong>Administrador:</strong> todo, incluidos usuarios, correo, seguridad, importación y restaurar copias. <strong>Farmacéutico/a</strong> y <strong>Personal:</strong> pacientes, servicios y calendario.</li>
          <li>Cada persona cambia su contraseña en <Ruta>Configuración → Mi cuenta</Ruta>.</li>
          <li>Si alguien olvida su contraseña, un administrador se la restablece desde Usuarios.</li>
        </Lista>
        <Consejo>Siempre queda al menos un administrador activo: la app no deja quitar el último.</Consejo>
      </>
    ),
  },
  {
    id: "seguridad",
    titulo: "Seguridad: cierre de sesión y registro de accesos",
    icono: Lock,
    claves: "seguridad inactividad cerrar sesion registro accesos quien auditoria",
    contenido: (
      <>
        <Lista>
          <li><strong>Cierre por inactividad:</strong> si nadie usa la app durante un tiempo (15 minutos por defecto), la sesión se cierra, con un aviso un minuto antes. Se cambia en <Ruta>Configuración → Seguridad</Ruta>; 0 = no cerrar nunca.</li>
          <li><strong>Registro de accesos:</strong> en la misma pestaña, los administradores ven quién consultó, creó, cambió, exportó o borró datos de cada paciente, y los inicios de sesión. Se puede filtrar y exportar. Se guarda dos años.</li>
        </Lista>
        <Consejo>Cada persona debe entrar con su propio usuario: así el registro refleja quién hizo cada cosa.</Consejo>
      </>
    ),
  },
  {
    id: "rgpd",
    titulo: "Protección de datos (RGPD)",
    icono: Shield,
    claves: "rgpd lopd proteccion datos consentimiento derechos exportar retencion legal privacidad",
    contenido: (
      <Lista>
        <li><strong>Textos legales:</strong> en <Ruta>Configuración → RGPD y Legal</Ruta> van los datos del responsable y los textos que acepta el paciente.</li>
        <li><strong>Consentimiento:</strong> se registra al dar de alta al paciente (fecha y versión del texto). En su ficha, el apartado «Protección de datos» muestra el estado y permite registrarlo si falta.</li>
        <li><strong>Derecho de acceso:</strong> desde la ficha, «Exportar todos sus datos» genera un archivo con toda su información.</li>
        <li><strong>Conservación:</strong> en RGPD y Legal verás los pacientes que han superado el periodo de conservación, para revisarlos.</li>
      </Lista>
    ),
  },
  {
    id: "actualizaciones",
    titulo: "Actualizaciones",
    icono: RefreshCw,
    claves: "actualizar version nueva",
    contenido: (
      <Lista>
        <li>Al abrir la app, si hay una versión nueva, aparece un aviso: pulsa «Actualizar ahora» y la app se descarga, se instala y se vuelve a abrir.</li>
        <li>También puedes comprobarlo en <Ruta>Configuración → Mi cuenta → Buscar actualizaciones</Ruta>.</li>
        <li>Tus datos se conservan, y antes de actualizar se guarda una copia por si acaso.</li>
      </Lista>
    ),
  },
  {
    id: "problemas",
    titulo: "Si algo no funciona",
    icono: LifeBuoy,
    claves: "error problema fallo diagnostico soporte ayuda",
    contenido: (
      <Lista>
        <li><strong>No llegan los correos:</strong> <Ruta>Configuración → Correo → Enviar correo de prueba</Ruta> y sigue la sugerencia del paso que falla. Mira también la carpeta de spam.</li>
        <li><strong>Otro problema:</strong> <Ruta>Configuración → Copias de Seguridad → Exportar diagnóstico</Ruta> genera un informe sin datos de pacientes que puedes enviar al pedir ayuda.</li>
        <li>Puedes contarnos el problema en{" "}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => void abrirEnlaceExterno("https://github.com/abel-eiras/formula-care/issues")}
          >
            la página del proyecto
          </button>.
        </li>
      </Lista>
    ),
  },
];

export default function Ayuda() {
  const [params, setParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState("");
  const temaActivo = TEMAS.find((t) => t.id === params.get("tema")) ?? TEMAS[0];

  const temasVisibles = useMemo(() => {
    const texto = normalizarTexto(busqueda.trim());
    if (!texto) return TEMAS;
    return TEMAS.filter((t) => normalizarTexto(`${t.titulo} ${t.claves}`).includes(texto));
  }, [busqueda]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
          <BookOpen className="h-7 w-7 text-primary" />
          Ayuda
        </h1>
        <p className="text-muted-foreground">Cómo usar cada parte de Formula Care</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card className="h-fit shadow-sm border-border/50">
          <CardContent className="space-y-3 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en la ayuda…" className="pl-9" />
            </div>
            <nav className="space-y-1">
              {temasVisibles.map((tema) => (
                <button
                  key={tema.id}
                  type="button"
                  onClick={() => setParams({ tema: tema.id })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    tema.id === temaActivo.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  <tema.icono className="h-4 w-4 shrink-0" />
                  {tema.titulo}
                </button>
              ))}
              {temasVisibles.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">Sin resultados.</p>}
            </nav>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/50">
          <CardContent className="space-y-4 p-6 leading-relaxed">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <temaActivo.icono className="h-6 w-6 text-primary" />
              {temaActivo.titulo}
            </h2>
            {temaActivo.contenido}
            <p className="pt-2 text-sm text-muted-foreground">
              ¿No encuentras lo que buscas? Mira <Link className="text-primary underline" to="/ayuda?tema=problemas">si algo no funciona</Link>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
