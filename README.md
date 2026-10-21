# Customer Agent — eventos de atención al cliente

Servicio de procesamiento de solicitudes mediante **Kafka + LangGraph + OpenAI**. Consume mensajes JSON de `customer.requests`, categoriza intención y sentimiento, decide una respuesta y produce eventos JSON en `customer.decisions`. **No es un portal web**, ni un sistema de tickets listo para clientes finales; es un componente de backend que debe integrarse con una interfaz y políticas de atención existentes.

## Contrato de entrada

Cada mensaje debe ser JSON válido:

```json
{"customerId":"client-001","message":"Quiero hablar con soporte"}
```

`customerId` no puede estar vacío ni superar 128 caracteres. `message` no puede estar vacío ni superar 10 000 caracteres. Cualquier entrada inválida se rechaza y no se vuelca su contenido a los registros.

## Mensaje de salida

El servicio envía un JSON con `customerId`, `intent`, `sentiment`, `action`, `response`, `escalate`, `timestamp` y `source`. No garantiza por sí solo una respuesta correcta, su traducción, ni resolución automática: la salida de un modelo debe someterse a revisión y políticas humanas antes de tomar decisiones que afecten a personas.

## Desarrollo

Requisitos: Node.js 22+, broker Kafka accesible, y credenciales OpenAI válidas para `ChatOpenAI`. Copiar el contenido de `.env.example` a las variables de entorno del ejecutor (no versionar secretos).

```bash
npm install
npm run check
npm test
npm run build
npm start
```

La configuración `KAFKA_BROKERS`, `KAFKA_CLIENT_ID`, `KAFKA_GROUP_ID`, `INPUT_TOPIC`, `OUTPUT_TOPIC` y `OPENAI_API_KEY` es necesaria según el entorno. Los topics de Kafka deben existir y contar con permisos de consumo y producción adecuados.

## Fiabilidad y privacidad

El servicio no es una interfaz pública. No enviar datos bancarios, clínicos ni secretos a modelos externos sin base legal, evaluación de privacidad y controles de minimización. Para producción aún deben verificarse, con Kafka real: idempotencia, gestión de reintentos y dead-letter queue, recuperación tras desconexión, confirmación de entrega, retención de eventos, cumplimiento de protección de datos, observabilidad y límites por cliente. No afirmar que esto está implementado si no se ha comprobado.

## Release

La rama de mejora elimina delimitadores Markdown que invalidaban `package.json`, `tsconfig.json` y el código TypeScript; añade validación estricta de entrada, evita registrar contenido de clientes, incorpora configuración de ejemplo y ejecuta comprobaciones de integridad. **No publicar ni integrar hasta que la CI y los tests de Kafka reales estén confirmados.**
