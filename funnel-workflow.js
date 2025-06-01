function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const expr = inner => '=' + '{' + '{ ' + inner + ' }}';

const workflowDataInput = $('Workflow Data').first().json;
const projectNameSlug = workflowDataInput.project_slug
const projectPageID = $('Data').first().json.projectPageID || '';

const nodesData = {
  Webhook: { id: uuidv4(), name: 'Webhook', position: [0, 400] },
  ID_Project: { id: uuidv4(), name: 'ID Project', position: [180, 400] },
  Get_Project: { id: uuidv4(), name: 'Get Project', position: [360, 400] },
  Get_Bot: { id: uuidv4(), name: 'Get Bot', position: [540, 400] },
  ENV: { id: uuidv4(), name: 'ENV', position: [720, 400] },
  Session_Data: { id: uuidv4(), name: 'Session Data', position: [900, 400] },
  Event_Type: { id: uuidv4(), name: 'Event Type', position: [1080, 400] },
  // ──────────── CREATE ──────────────
  Create_Lead: { id: uuidv4(), name: 'Create Lead', position: [1260, 220] },
  Form: { id: uuidv4(), name: 'Form', position: [1620, 220] },
  If_Bot_Create: { id: uuidv4(), name: 'If Bot Create', position: [1800, 220] },
  Data_MSG_1: { id: uuidv4(), name: 'Data MSG-1', position: [2160, 220] },
  MSG_1: { id: uuidv4(), name: 'MSG-1', position: [2340, 220] },
  Get_Not_Bot: { id: uuidv4(), name: 'Get Not Bot', position: [1980, 400] },
  Data_MSG_S: { id: uuidv4(), name: 'Data MSG-S', position: [2160, 400] },
  MSG_S: { id: uuidv4(), name: 'MSG-S', position: [2340, 400] },
  // ──────────── CANCEL ──────────────
  Get_Lead_Cancel: { id: uuidv4(), name: 'Get Lead Cancel', position: [1260, 400] },
  Cancel: { id: uuidv4(), name: 'Cancel', position: [1440, 400] },
  // ─────────── RESCHEDULE ───────────────
  Get_Lead_Reschedule: { id: uuidv4(), name: 'Get Lead Reschedule', position: [1260, 580] },
  Reschedule: { id: uuidv4(), name: 'Reschedule', position: [1440, 580] },
  If_Bot_Reschedule: { id: uuidv4(), name: 'If Bot Reschedule', position: [1620, 580] },
  // ──────────── Today ──────────────
  Data_MSG_Reschedule: { id: uuidv4(), name: 'Data MSG-Reschedule', position: [2160, 580] },
  MSG_Today: { id: uuidv4(), name: 'MSG-Today', position: [2340, 580] },
};

const credentials = {
  notion: {
    pbs: '0vm51DaWqWGwtW9q',
  },
};

const jsCode = {
  Session_Data: `// ──────────────────────────
// 1. Obtener y desestructurar datos del Webhook
// ──────────────────────────
const data = $('Webhook').first().json;

const {
  body: {
    triggerEvent = '',
    createdAt = '',
    payload: {
      uid,
      title = 'Evento sin nombre',
      startTime,
      endTime,
      metadata = {},
      organizer: {
        id: organizerId,
        username,
        name: organizerName,
        email: organizerEmail,
        timeZone = '',
        utcOffset = 0,
      } = {},
      responses = {},
    } = {},
  } = {},
} = data;

// ──────────────────────────
// 2. Normalizar teléfono y nombre
// ──────────────────────────
const phoneValue = responses.phone?.value ?? '';
const nameValue  = responses.name?.value  ?? '';
const emailValue = responses.email?.value ?? '';

const phone = phoneValue.replace(/[\s-]+/g, '');
const rawName = nameValue.trim();

const capitalizeWords = (s = '') =>
  s.split(' ')
   .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
   .join(' ');

// ──────────────────────────
// 3. Construir array de preguntas y respuestas (q1, q2…)
// ──────────────────────────
const questions_and_answers = Object.entries(responses)
  .filter(([k]) => /^q\d+$/i.test(k))
  .map(([, { label = '', value = '' }]) => ({
    question: label,
    answer:   value,
  }));

// ──────────────────────────
// 4. Conversión de fechas a ISO 8601 con offset ±HH:mm
// ──────────────────────────
function toISOWithOffset(dateStr, offset) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setMinutes(d.getMinutes() + offset);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hh  = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm  = String(abs % 60).padStart(2, '0');
  return d.toISOString().slice(0, -1) + sign + hh + ':' + mm;
}

// ──────────────────────────
// 5. Salida única combinada
// ──────────────────────────
return [
  {
    json: {
      event_id: uid,
      event:    triggerEvent,
      name_event: title,
      organizer: {
        id: organizerId,
        username,
        name: organizerName,
        email: organizerEmail,
        timezone: timeZone,
      },
      user_info: {
        name:       capitalizeWords(rawName.split(' ')[0] || ''),
        full_name:  capitalizeWords(rawName),
        email:      emailValue,
        telephone:  phone,
      },
      scheduled_event: {
        created_at: toISOWithOffset(createdAt, utcOffset),
        start_time: toISOWithOffset(startTime, utcOffset),
        end_time:   toISOWithOffset(endTime,   utcOffset),
        join_url:   metadata.videoCallUrl || '',
        timezone:   timeZone,
        cancel_url: 'https://app.cal.com/booking/' + uid + '?cancel=true',
      },
      questions_and_answers,
    },
  },
];`,
};

const setConfig = {
  workflowName: {
    name: 'workflowName',
    value: "={{ $workflow.name }}",
  },
  apiKey: {
    name: 'apiKey',
    value: "={{ $node['ENV.json.evo_apikey }}",
  },
  botURL: {
    name: 'botURL',
    value:
      "=https://{{ $node['ENV'].json.evo_url }}/message/sendText/{{ $node['ENV'].json.bot_id }}",
  },
  messageType: {
    name: 'messageType',
    value: {
      MSG_1: 'MSG-1',
      MSG_Reschedule: 'MSG-S',
    },
  },
  sessionDate: {
    name: 'sessionDate',
    value: "={{ $node['Session Data'].json.scheduled_event.start_time }}",
  },
  number: {
    name: 'number',
    value: "={{ $node['Session Data'].json.user_info.telephone }}",
  },
  text: {
    name: 'text',
    value: {
      MSG_1: `=¡Hola {{ $node['Session Data'].json.user_info.name }}! 👋\n\nEncantado de saludarte, te escribo por la llamada que tienes agendada conmigo.\n\nPronto te contactaré para confirmar algunos detalles importantes. Es fundamental que podamos hablar para dejar todo listo para tu sesión.\n\nPor favor, mantente atent@ a tu teléfono 📞\n\n⚠️ Si no logramos contactar en las próximas 24 horas, cancelaremos la llamada.`,
      MSG_Reschedule: `=Llamada reagendada: \n\nNos vemos {{ $json.fechaFormateada }}.{{ $json.hours_remaining > 18 ? "\n\nPD: Puede que te lleguen mensajes con la hora anterior, ignoralos." : "" }}`,
    },
  },
  pageID: {
    name: 'pageID',
    value: {
      MSG_1: "={{ $node['Create Lead'].json.id }}",
      MSG_Reschedule: "={{ $node['Get Lead Reschedule'].json.id }}",
    },
  },
};

const nodes = [
  {
    id: nodesData.Webhook.id,
    name: nodesData.Webhook.name,
    type: 'n8n-nodes-base.webhook',
    typeVersion: 2,
    position: nodesData.Webhook.position,
    webhookId: uuidv4(),
    parameters: { httpMethod: 'POST', path: projectNameSlug, options: {} },
  },
  {
    id: nodesData.ID_Project.id,
    name: nodesData.ID_Project.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: nodesData.ID_Project.position,
    notesInFlow: true,
    parameters: {
      assignments: {
        assignments: [{ id: uuidv4(), name: 'project_id', value: projectPageID, type: 'string' }],
      },
      options: {},
    },
  },
  {
    id: nodesData.Get_Project.id,
    name: nodesData.Get_Project.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Get_Project.position,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'get',
      pageId: { __rl: true, value: expr('$json.project_id'), mode: 'id' },
    },
  },
  {
    id: nodesData.Get_Bot.id,
    name: nodesData.Get_Bot.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Get_Bot.position,
    notesInFlow: true,
    alwaysOutputData: true,
    onError: 'continue',
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'get',
      pageId: { __rl: true, value: expr('$json.property_bot[0] || ""'), mode: 'id' },
    },
  },
  {
    id: nodesData.ENV.id,
    name: nodesData.ENV.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: nodesData.ENV.position,
    parameters: {
      assignments: {
        assignments: [
          {
            id: uuidv4(),
            name: 'evo_url',
            value: "={{ $node['Get Bot'].json.property_server_url || null }}",
            type: 'string',
          },
          {
            id: uuidv4(),
            name: 'evo_apikey',
            value: "={{ $node['Get Bot'].json.property_api_key || null }}",
            type: 'string',
          },
          {
            id: uuidv4(),
            name: 'bot_id',
            value: "={{ $node['Get Bot'].json.property_bot_id || null }}",
            type: 'string',
          },
          {
            id: uuidv4(),
            name: 'db_id',
            value: "={{ $node['Get Project'].json.property_crm_db.split('/')[3].split('?')[0] }}",
            type: 'string',
          },
          {
            id: uuidv4(),
            name: 'client_whatsapp',
            value: "={{ $node['Get Project'].json.property_notificaciones }}",
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.Session_Data.id,
    name: nodesData.Session_Data.name,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: nodesData.Session_Data.position,
    notesInFlow: true,
    parameters: {
      jsCode: jsCode.Session_Data,
    },
  },
  {
    id: nodesData.Event_Type.id,
    name: nodesData.Event_Type.name,
    type: 'n8n-nodes-base.switch',
    typeVersion: 3,
    position: nodesData.Event_Type.position,
    notesInFlow: true,
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              combinator: 'and',
              options: { caseSensitive: true },
              conditions: [
                {
                  leftValue: expr('$node["Session Data"].json.event'),
                  rightValue: 'BOOKING_CREATED',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
            },
            renameOutput: true,
            outputKey: 'CREATE',
          },
          {
            conditions: {
              combinator: 'and',
              options: { caseSensitive: true },
              conditions: [
                {
                  leftValue: expr('$node["Session Data"].json.event'),
                  rightValue: 'BOOKING_CANCELLED',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
            },
            renameOutput: true,
            outputKey: 'CANCEL',
          },
          {
            conditions: {
              combinator: 'and',
              options: { caseSensitive: true },
              conditions: [
                {
                  leftValue: expr('$node["Session Data"].json.event'),
                  rightValue: 'BOOKING_RESCHEDULED',
                  operator: { type: 'string', operation: 'equals' },
                },
              ],
            },
            renameOutput: true,
            outputKey: 'RESCHEDULED',
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.Create_Lead.id,
    name: nodesData.Create_Lead.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Create_Lead.position,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      title: 'Lead',
      propertiesUi: {
        propertyValues: [
          { key: '=Nombre|title', title: expr('$node["Session Data"].json.user_info.full_name') },
          { key: '=Email|email', emailValue: expr('$node["Session Data"].json.user_info.email') },
          {
            key: '=WhatsApp|url',
            urlValue: expr('"https://wa.me/" + $node["Session Data"].json.user_info.telephone'),
          },
          {
            key: '=Fecha Llamada|date',
            date: expr('$node["Session Data"].json.scheduled_event.start_time'),
            timezone: expr('$node["Session Data"].json.scheduled_event.timezone'),
          },
          { key: '=Event ID|rich_text', textContent: expr('$node["Session Data"].json.event_id') },
          {
            key: '=Link Acceso|url',
            urlValue: expr('$node["Session Data"].json.scheduled_event.join_url'),
          },
          {
            key: '=Link Cancelación|url',
            urlValue: expr('$node["Session Data"].json.scheduled_event.cancel_url'),
          },
          {
            key: '=Teléfono|phone_number',
            phoneValue: expr('$node["Session Data"].json.user_info.telephone || "0"'),
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.Form.id,
    name: nodesData.Form.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Form.position,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'block',
      blockId: { __rl: true, value: expr('$json.id'), mode: 'id' },
      blockUi: {
        blockValues: [
          {
            type: 'heading_2',
            textContent: 'Formulario Cualificación',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[0]?.question ? "Pregunta 1: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[0]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[0]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[1]?.question ? "Pregunta 2: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[1]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[1]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[2]?.question ? "Pregunta 3: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[2]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[2]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[3]?.question ? "Pregunta 4: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[3]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[3]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[4]?.question ? "Pregunta 5: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[4]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[4]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[5]?.question ? "Pregunta 6: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[5]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[5]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[6]?.question ? "Pregunta 7: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[6]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[6]?.answer || " " }}',
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[7]?.question ? "Pregunta 8: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' },
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[7]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' },
                },
              ],
            },
          },
          {
            type: 'bulleted_list_item',
            textContent:
              '= {{ $("Session Data").item.json.questions_and_answers[7]?.answer || " " }}',
          },
        ],
      },
    },
  },
  {
    id: nodesData.If_Bot_Create.id,
    name: nodesData.If_Bot_Create.name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: nodesData.If_Bot_Create.position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            leftValue: "={{ $node['ENV'].json.bot_id }}",
            rightValue: '',
            operator: {
              type: 'string',
              operation: 'notEmpty',
              singleValue: true,
            },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  },
  {
    id: nodesData.Data_MSG_1.id,
    name: nodesData.Data_MSG_1.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: nodesData.Data_MSG_1.position,
    notesInFlow: true,
    parameters: {
      assignments: {
        assignments: [
          {
            id: uuidv4(),
            name: setConfig.workflowName.name,
            value: setConfig.workflowName.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.apiKey.name,
            value: setConfig.apiKey.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.botURL.name,
            value: setConfig.botURL.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.messageType.name,
            value: setConfig.messageType.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.sessionDate.name,
            value: setConfig.sessionDate.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.number.name,
            value: setConfig.number.value,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.text.name,
            value: setConfig.text.value.MSG_1,
            type: 'string',
          },
          {
            id: uuidv4(),
            name: setConfig.pageID.name,
            value: setConfig.pageID.value.MSG_1,
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.MSG_1.id,
    name: nodesData.MSG_1.name,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: nodesData.MSG_1.position,
    notesInFlow: true,
    parameters: {
      workflowId: {
        __rl: true,
        value: 'NFfhN6ZIxkpBW3Ph',
        mode: 'list',
        cachedResultName: 'MSG General EvolutionApi',
      },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          workflowName: expr('$json.workflowName'),
          messageType: expr('$json.messageType'),
          number: expr('$json.number'),
          pageID: expr('$json.pageID'),
          sessionDate: expr('$json.sessionDate'),
          botURL: expr('$json.botURL'),
          apiKey: expr('$json.apiKey'),
          text: expr('$json.text'),
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { waitForSubWorkflow: false },
    },
  },
  {
    id: nodesData.Get_Not_Bot.id,
    name: nodesData.Get_Not_Bot.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Get_Not_Bot.position,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'getAll',
      databaseId: {
        __rl: true,
        value: '1b1ea5f7-2f4a-8039-97a0-e27d8aeb1d86',
        mode: 'list',
        cachedResultName: 'Bots',
        cachedResultUrl: 'https://www.notion.so/1b1ea5f72f4a803997a0e27d8aeb1d86',
      },
      limit: 1,
      filterType: 'manual',
      filters: {
        conditions: [{ key: 'Notificaciones|checkbox', condition: 'equals', checkboxValue: true }],
      },
      options: {},
    },
  },
  {
    id: nodesData.Data_MSG_S.id,
    name: nodesData.Data_MSG_S.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: nodesData.Data_MSG_S.position,
    notesInFlow: true,
    executeOnce: true,
    parameters: {
      assignments: {
        assignments: [
          { id: uuidv4(), name: 'workflowName', value: '$workflow.name', type: 'string' },
          {
            id: uuidv4(),
            name: 'apiKey',
            value: '$node["Get Not Bot"].json.property_api_key',
            type: 'string',
          },
          {
            id: uuidv4(),
            name: 'botURL',
            value:
              "=https://{{ $node['Get Not Bot'].json.property_server_url }}/message/sendText/{{ $node['Get Not Bot'].json.property_bot_id }}",
            type: 'string',
          },
          { id: uuidv4(), name: 'messageType', value: 'MSG-S', type: 'string' },
          { id: uuidv4(), name: 'sessionDate', value: '', type: 'string' },
          {
            id: uuidv4(),
            name: 'number',
            value: '$node["ENV"].json.client_whatsapp',
            type: 'string',
          },
          { id: uuidv4(), name: 'text', value: '🤖: Ha entrado un nuevo lead!', type: 'string' },
          { id: uuidv4(), name: 'pageID', value: '', type: 'string' },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.MSG_S.id,
    name: nodesData.MSG_S.name,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: nodesData.MSG_S.position,
    notesInFlow: true,
    parameters: {
      workflowId: {
        __rl: true,
        value: 'NFfhN6ZIxkpBW3Ph',
        mode: 'list',
        cachedResultName: 'MSG General EvolutionApi',
      },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          workflowName: expr('$json.workflowName'),
          messageType: expr('$json.messageType'),
          number: expr('$json.number'),
          pageID: expr('$json.pageID'),
          sessionDate: expr('$json.sessionDate'),
          botURL: expr('$json.botURL'),
          apiKey: expr('$json.apiKey'),
          text: expr('$json.text'),
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { waitForSubWorkflow: false },
    },
  },
  {
    id: nodesData.Get_Lead_Cancel.id,
    name: nodesData.Get_Lead_Cancel.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Get_Lead_Cancel.position,
    alwaysOutputData: true,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'getAll',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      returnAll: true,
      filterType: 'manual',
      matchType: 'allFilters',
      simple: false,
      filters: {
        conditions: [
          {
            key: '=Event ID|rich_text',
            condition: 'equals',
            richTextValue: expr('$node["Session Data"].json.event_id'),
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.Cancel.id,
    name: nodesData.Cancel.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Cancel.position,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'update',
      pageId: { __rl: true, value: expr('$node["Get Lead Cancel"].json.id'), mode: 'id' },
      propertiesUi: { propertyValues: [{ key: '=Estado|status', statusValue: '=Cancelado' }] },
      options: {},
    },
  },
  {
    id: nodesData.Get_Lead_Reschedule.id,
    name: nodesData.Get_Lead_Reschedule.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Get_Lead_Reschedule.position,
    alwaysOutputData: true,
    notesInFlow: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'getAll',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      returnAll: true,
      filterType: 'manual',
      simple: false,
      filters: {
        conditions: [
          {
            key: 'Email|email',
            condition: 'equals',
            emailValue: expr('$node["Session Data"].json.user_info.email'),
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.Reschedule.id,
    name: nodesData.Reschedule.name,
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: nodesData.Reschedule.position,
    notesInFlow: true,
    executeOnce: true,
    credentials: { notionApi: { id: credentials.notion.pbs } },
    parameters: {
      resource: 'databasePage',
      operation: 'update',
      pageId: { __rl: true, value: expr('$node["Get Lead Reschedule"].json.id'), mode: 'id' },
      propertiesUi: {
        propertyValues: [
          {
            key: '=Fecha Llamada|date',
            date: expr('$node["Session Data"].json.scheduled_event.start_time'),
            timezone: expr('$node["Session Data"].json.scheduled_event.timezone'),
          },
          { key: '=Event ID|rich_text', textContent: expr('$node["Session Data"].json.event_id') },
          {
            key: '=Link Cancelación|url',
            urlValue: expr('$node["Session Data"].json.scheduled_event.cancel_url'),
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.If_Bot_Reschedule.id,
    name: nodesData.If_Bot_Reschedule.name,
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: nodesData.If_Bot_Reschedule.position,
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: '68706d95-5dad-4795-b348-0e424ea1104c',
            leftValue: "={{ $node['ENV'].json.bot_id }}",
            rightValue: '',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
  },
  {
    id: nodesData.Data_MSG_Reschedule.id,
    name: nodesData.Data_MSG_Reschedule.name,
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: nodesData.Data_MSG_Reschedule.position,
    notesInFlow: true,
    parameters: {
      assignments: {
        assignments: [
          {
            id: '5a487ac3-0459-4104-a13d-0904fb24f48a',
            name: setConfig.workflowName.name,
            value: setConfig.workflowName.value,
            type: 'string',
          },
          {
            id: '2fc18e1d-1c54-462f-8504-cb6e61826ea5',
            name: setConfig.apiKey.name,
            value: setConfig.apiKey.value,
            type: 'string',
          },
          {
            id: 'a32060c7-4e53-4f30-95be-ad2de2e13209',
            name: setConfig.botURL.name,
            value: setConfig.botURL.value,
            type: 'string',
          },
          {
            id: '6d6394f8-b07d-4fb6-9648-c13b6fa0dd3f',
            name: 'messageType',
            value: 'MSG-1',
            type: 'string',
          },
          {
            id: 'caa640c7-6d1a-4d64-865c-84c78c1df786',
            name: setConfig.sessionDate.name,
            value: setConfig.sessionDate.value,
            type: 'string',
          },
          {
            id: '1736e866-b0f4-4634-814b-a6f3d87fb59b',
            name: setConfig.number.name,
            value: setConfig.number.value,
            type: 'string',
          },
          {
            id: 'a8535472-a454-44a7-bdbd-c64800d47e61',
            name: setConfig.text.name,
            value: setConfig.text.value.MSG_Reschedule,
            type: 'string',
          },
          {
            id: 'b12c92dd-3280-4adb-b7d2-822ea93a1b8b',
            name: 'pageID',
            value: setConfig.pageID.value.MSG_Reschedule,
            type: 'string',
          },
        ],
      },
      options: {},
    },
  },
  {
    id: nodesData.MSG_Today.id,
    name: nodesData.MSG_Today.name,
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: nodesData.MSG_Today.position,
    notesInFlow: true,
    parameters: {
      workflowId: {
        __rl: true,
        value: 'NFfhN6ZIxkpBW3Ph',
        mode: 'list',
        cachedResultName: 'MSG General EvolutionApi',
      },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: {
          workflowName: '={{ $json.workflowName }}',
          messageType: '={{ $json.messageType }}',
          number: '={{ $json.number }}',
          pageID: '={{ $json.pageID }}',
          sessionDate: '={{ $json.sessionDate }}',
          botURL: '={{ $json.botURL }}',
          apiKey: '={{ $json.apiKey }}',
          text: '={{ $json.text }}',
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      },
      options: { waitForSubWorkflow: false },
    },
  },
];

const connections = {
  Webhook: {
    main: [[{ node: nodesData.ID_Project.name, type: 'main', index: 0 }]],
  },
  'ID Project': {
    main: [[{ node: nodesData.Get_Project.name, type: 'main', index: 0 }]],
  },
  'Get Project': {
    main: [[{ node: nodesData.Get_Bot.name, type: 'main', index: 0 }]],
  },
  'Get Bot': {
    main: [[{ node: nodesData.ENV.name, type: 'main', index: 0 }]],
  },
  ENV: {
    main: [[{ node: nodesData.Session_Data.name, type: 'main', index: 0 }]],
  },
  'Session Data': {
    main: [[{ node: nodesData.Event_Type.name, type: 'main', index: 0 }]],
  },
  'Event Type': {
    main: [
      [{ node: nodesData.Create_Lead.name, type: 'main', index: 0 }],
      [{ node: nodesData.Get_Lead_Cancel.name, type: 'main', index: 0 }],
      [{ node: nodesData.Get_Lead_Reschedule.name, type: 'main', index: 0 }],
    ],
  },
  'Create Lead': {
    main: [[{ node: nodesData.Form.name, type: 'main', index: 0 }]],
  },
  'Get Lead Cancel': {
    main: [[{ node: nodesData.Cancel.name, type: 'main', index: 0 }]],
  },
  'Get Lead Reschedule': {
    main: [[{ node: nodesData.Reschedule.name, type: 'main', index: 0 }]],
  },
  Form: {
    main: [[{ node: nodesData.If_Bot_Create.name, type: 'main', index: 0 }]],
  },
  'If Bot Create': {
    main: [
      [{ node: nodesData.Data_MSG_1.name, type: 'main', index: 0 }],
      [{ node: nodesData.Get_Not_Bot.name, type: 'main', index: 0 }],
    ],
  },
  'Data MSG-1': {
    main: [[{ node: nodesData.MSG_1.name, type: 'main', index: 0 }]],
  },
  'MSG-1': {
    main: [[{ node: nodesData.Get_Not_Bot.name, type: 'main', index: 0 }]],
  },
  'Get Not Bot': {
    main: [[{ node: nodesData.Data_MSG_S.name, type: 'main', index: 0 }]],
  },
  'Data MSG-S': {
    main: [[{ node: nodesData.MSG_S.name, type: 'main', index: 0 }]],
  },
  Reschedule: {
    main: [[{ node: nodesData.If_Bot_Reschedule.name, type: 'main', index: 0 }]],
  },
  'If Bot Reschedule': {
    main: [[{ node: nodesData.Data_MSG_Reschedule.name, type: 'main', index: 0 }]],
  },
  'Data MSG-Reschedule': {
    main: [[{ node: nodesData.MSG_Today.name, type: 'main', index: 0 }]],
  },
};

const workflow = {
  name: workflowDataInput.workflow_name,
  nodes,
  connections,
  settings: {
    executionOrder: 'v1',
    timezone: 'Europe/Madrid',
    errorWorkflow: 'cTGB7gdBc2cq8Gss',
    saveExecutionProgress: true
  },
};

return [{ json: workflow }];
