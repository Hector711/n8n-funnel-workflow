function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const expr = (inner) => '=' + '{' + '{ ' + inner + ' }}';

const workflowDataInput = $('Workflow Data').first().json;
const projectNameSlug = workflowDataInput.workflow_name.trim().toLowerCase().replace(/\s+/g, '-');
const projectPageID = $('Data').first().json.projectPageID || '';

const ids = {
  Webhook: uuidv4(),
  'ID Project': uuidv4(),
  'Get Project': uuidv4(),
  'Get Bot': uuidv4(),
  ENV: uuidv4(),
  'Session Data': uuidv4(),
  'Event Type': uuidv4(),
  'Create Lead': uuidv4(),
  'Get Lead': uuidv4(),
  'Get Lead.': uuidv4(),
  Cancel: uuidv4(),
  Update: uuidv4(),
  Form: uuidv4(),
  'If': uuidv4(),
  'Formated Date': uuidv4(),
  'Data MSG-1': uuidv4(),
  'MSG-1': uuidv4(),
  'Get Not Bot': uuidv4(),
  'Data MSG-S': uuidv4(),
  'MSG-S': uuidv4()
};

const nodes = [
  {
    parameters: { httpMethod: 'POST', path: projectNameSlug, options: {} },
    type: 'n8n-nodes-base.webhook', typeVersion: 2,
    position: [0, 400], id: ids.Webhook, name: 'Webhook', webhookId: uuidv4()
  },
  {
    parameters: {
      assignments: {
        assignments: [{ id: uuidv4(), name: 'project_id', value: projectPageID, type: 'string' }]
      }, options: {}
    },
    type: 'n8n-nodes-base.set', typeVersion: 3.4,
    position: [180, 400], notesInFlow: true, id: ids['ID Project'], name: 'ID Project', notesInFlow: true
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'get',
      pageId: { __rl: true, value: expr('$json.project_id'), mode: 'id' }
    },
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [360, 400], notesInFlow: true, id: ids['Get Project'], name: 'Get Project',
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'get',
      pageId: { __rl: true, value: expr('$json.property_bot[0] || ""'), mode: 'id' }
    },
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [540, 400], notesInFlow: true, id: ids['Get Bot'], name: 'Get Bot',
    alwaysOutputData: true,
    onError: 'continue',
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: uuidv4(), name: 'evo_url', value: expr(`$node["Get Bot"].item.json.property_server_url || null`), type: 'string' },
          { id: uuidv4(), name: 'evo_apikey', value: expr(`$node["Get Bot"].item.json.property_api_key || null`), type: 'string' },
          { id: uuidv4(), name: 'bot_id', value: expr(`$node["Get Bot"].item.json.property_bot_id || null`), type: 'string' },
          { id: uuidv4(), name: 'db_id', value: expr(`$node["Get Project"].item.json.property_crm_db.split('/') [3].split('?')[0]`), type: 'string' },
          { id: uuidv4(), name: 'client_whatsapp', value: expr(`$node["Get Project"].item.json.property_notificaciones`), type: 'string' }
        ]
      }, options: {}
    },
    type: 'n8n-nodes-base.set', typeVersion: 3.4,
    position: [720, 400], id: ids.ENV, name: 'ENV'
  },
  {
    parameters: {
      jsCode: `// ──────────────────────────
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
        join_url:   metainput.videoCallUrl || '',
        timezone:   timeZone,
        cancel_url: 'https://app.cal.com/booking/' + uid + '?cancel=true',
      },
      questions_and_answers,
    },
  },
];`
    },
    id: ids['Session Data'], name: 'Session Data',
    type: 'n8n-nodes-base.code', typeVersion: 2, position: [900, 400], notesInFlow: true
  },
  {
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              combinator: 'and', options: { caseSensitive: true },
              conditions: [{ leftValue: expr('$node["Session Data"].json.event'), rightValue: 'BOOKING_CREATED', operator: { type: 'string', operation: 'equals' } }]
            }, renameOutput: true, outputKey: 'CREATE'
          },
          {
            conditions: {
              combinator: 'and', options: { caseSensitive: true },
              conditions: [{ leftValue: expr('$node["Session Data"].json.event'), rightValue: 'BOOKING_CANCELLED', operator: { type: 'string', operation: 'equals' } }]
            }, renameOutput: true, outputKey: 'CANCEL'
          },
          {
            conditions: {
              combinator: 'and', options: { caseSensitive: true },
              conditions: [{ leftValue: expr('$node["Session Data"].json.event'), rightValue: 'BOOKING_RESCHEDULED', operator: { type: 'string', operation: 'equals' } }]
            }, renameOutput: true, outputKey: 'RESCHEDULED'
          }
        ]
      }, options: {}
    },
    type: 'n8n-nodes-base.switch', typeVersion: 3,
    position: [1080, 400], id: ids['Event Type'], name: 'Event Type', notesInFlow: true
  },
  {
    parameters: {
      resource: 'databasePage',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      title: 'Lead',
      propertiesUi: {
        propertyValues: [
          { key: '=Nombre|title', title: expr('$node["Session Data"].json.user_info.full_name') },
          { key: '=Email|email', emailValue: expr('$node["Session Data"].json.user_info.email') },
          { key: '=WhatsApp|url', urlValue: expr('"https://wa.me/" + $node["Session Data"].json.user_info.telephone') },
          { key: '=Fecha Llamada|date', date: expr('$node["Session Data"].json.scheduled_event.start_time'), timezone: expr('$node["Session Data"].json.scheduled_event.timezone') },
          { key: '=Event ID|rich_text', textContent: expr('$node["Session Data"].json.event_id') },
          { key: '=Link Acceso|url', urlValue: expr('$node["Session Data"].json.scheduled_event.join_url') },
          { key: '=Link Cancelación|url', urlValue: expr('$node["Session Data"].json.scheduled_event.cancel_url') },
          { key: '=Teléfono|phone_number', phoneValue: expr('$node["Session Data"].json.user_info.telephone || "0"') }
        ]
      }, options: {}
    },
    id: ids['Create Lead'], name: 'Create Lead',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1260, 220], notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'getAll',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      returnAll: true, filterType: 'manual', matchType: 'allFilters', simple: false,
      filters: {
        conditions: [
          { key: '=Event ID|rich_text', condition: 'equals', richTextValue: expr('$node["Session Data"].json.event_id') }
        ]
      }, options: {}
    },
    id: ids['Get Lead'], name: 'Get Lead',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1260, 400], alwaysOutputData: true, notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'getAll',
      databaseId: { __rl: true, value: expr('$("ENV").item.json.db_id'), mode: 'id' },
      returnAll: true, filterType: 'manual', simple: false,
      filters: {
        conditions: [
          { key: 'Email|email', condition: 'equals', emailValue: expr('$node["Session Data"].json.user_info.email') }
        ]
      }, options: {}
    },
    id: ids['Get Lead.'], name: 'Get Lead.',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1260, 580], alwaysOutputData: true, notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'update',
      pageId: { __rl: true, value: expr('$node["Get Lead"].json.id'), mode: 'id' },
      propertiesUi: { propertyValues: [{ key: '=Estado|status', statusValue: '=Cancelado' }] },
      options: {}
    },
    id: ids.Cancel, name: 'Cancel',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1440, 400], notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'databasePage', operation: 'update',
      pageId: { __rl: true, value: expr('$node["Get Lead."].json.id'), mode: 'id' },
      propertiesUi: {
        propertyValues: [
          { key: '=Fecha Llamada|date', date: expr('$node["Session Data"].json.scheduled_event.start_time'), timezone: expr('$node["Session Data"].json.scheduled_event.timezone') },
          { key: '=Event ID|rich_text', textContent: expr('$node["Session Data"].json.event_id') },
          { key: '=Link Cancelación|url', urlValue: expr('$node["Session Data"].json.scheduled_event.cancel_url') }
        ]
      }, options: {}
    },
    id: ids.Update, name: 'Update',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1440, 580], notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      resource: 'block',
      blockId: { __rl: true, value: expr('$json.id'), mode: 'id' },
      blockUi: {
        blockValues: [
          {
            type: 'heading_2',
            textContent: 'Formulario Cualificación'
          },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[0]?.question ? "Pregunta 1: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[0]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[0]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[1]?.question ? "Pregunta 2: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[1]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[1]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[2]?.question ? "Pregunta 3: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[2]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[2]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[3]?.question ? "Pregunta 4: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[3]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[3]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[4]?.question ? "Pregunta 5: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[4]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[4]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[5]?.question ? "Pregunta 6: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[5]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[5]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[6]?.question ? "Pregunta 7: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[6]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[6]?.answer || " " }}' },
          {
            richText: true,
            text: {
              text: [
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[7]?.question ? "Pregunta 8: " : "" }}',
                  annotationUi: { bold: true, color: 'blue' }
                },
                {
                  text: '= {{ $("Session Data").item.json.questions_and_answers[7]?.question || "" }}',
                  annotationUi: { italic: true, color: 'gray' }
                }
              ]
            }
          },
          { type: 'bulleted_list_item', textContent: '= {{ $("Session Data").item.json.questions_and_answers[7]?.answer || " " }}' }
        ]
      }
    },
    id: ids.Form, name: 'Form',
    type: 'n8n-nodes-base.notion', typeVersion: 2.2,
    position: [1620, 220], notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2
        },
        conditions: [
          {
            leftValue: '={{ $node[\'ENV\'].json.bot_id }}',
            rightValue: '',
            operator: {
              type: 'string',
              operation: 'notEmpty',
              singleValue: true
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    type: 'n8n-nodes-base.if', typeVersion: 2.2,
    position: [1800, 220], id: ids['If'], name: 'If'
  },
  {
    parameters: {
      jsCode: `const session_date = $node["Session Data"].json.scheduled_event.start_time;\nconst fecha = new Date(session_date);\n\n// Configuración genérica para la zona horaria\nconst opciones = { timeZone: 'Europe/Madrid', hour12: false };\n\n// Obtenemos cada parte por separado usando el toLocaleString con las opciones adecuadas\nconst diaSemana = fecha.toLocaleString('es-ES', { ...opciones, weekday: 'long' });\nconst diaMes    = fecha.toLocaleString('es-ES', { ...opciones, day: 'numeric' });\nconst hora      = fecha.toLocaleString('es-ES', { ...opciones, hour: '2-digit' });\nconst minutos   = fecha.toLocaleString('es-ES', { ...opciones, minute: '2-digit' }).padStart(2, '0'); // Asegura dos dígitos\n\n// Construimos la cadena final\nconst fechaFormateada = \`el \${diaSemana} \${diaMes} a las \${hora}:\${minutos}\`;\n\nreturn [\n  {\n    fechaFormateada\n  }\n];`
    },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1980, 220],
    id: ids['Formated Date'],
    name: 'Formated Date'
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: uuidv4(), name: 'workflowName', value: expr('$workflow.name'), type: 'string' },
          { id: uuidv4(), name: 'apiKey', value: expr('$node["ENV"].json.evo_apikey'), type: 'string' },
          { id: uuidv4(), name: 'botURL', value: '=https://{{ $node[\'ENV\'].json.evo_url }}/message/sendText/{{ $node[\'ENV\'].json.bot_id }}', type: 'string' },
          { id: uuidv4(), name: 'messageType', value: 'MSG-1', type: 'string' },
          { id: uuidv4(), name: 'sessionDate', value: expr('$node["Session Data"].item.json.scheduled_event.start_time'), type: 'string' },
          { id: uuidv4(), name: 'number', value: expr('$node["Session Data"].item.json.user_info.telephone'), type: 'string' },
          { id: uuidv4(), name: 'text', value: `=¡Hola {{ $node['Session Data'].json.user_info.name }}! 👋\n\nEncantado de saludarte, te escribo por la llamada que tienes agendada conmigo.\n\nPronto te contactaré para confirmar algunos detalles importantes. Es fundamental que podamos hablar para dejar todo listo para tu sesión.\n\nPor favor, mantente atent@ a tu teléfono 📞\n\n⚠️ Si no logramos contactar en las próximas 24 horas, cancelaremos la llamada.`, type: 'string' },
          { id: uuidv4(), name: 'pageID', value: expr('$node["Create Lead"].item.json.id'), type: 'string' }
        ]
      },
      options: {}
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [2160, 220],
    id: ids['Data MSG-1'],
    name: 'Data MSG-1',
    notesInFlow: true
  },
  {
    parameters: {
      workflowId: { __rl: true, value: 'NFfhN6ZIxkpBW3Ph', mode: 'list', cachedResultName: 'MSG General EvolutionApi' },
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
          text: expr('$json.text')
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      },
      options: { waitForSubWorkflow: false }
    },
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [2340, 220],
    id: ids['MSG-1'],
    name: 'MSG-1',
    notesInFlow: true
  },
  {
    parameters: {
      resource: 'databasePage',
      operation: 'getAll',
      databaseId: { __rl: true, value: '1b1ea5f7-2f4a-8039-97a0-e27d8aeb1d86', mode: 'list', cachedResultName: 'Bots', cachedResultUrl: 'https://www.notion.so/1b1ea5f72f4a803997a0e27d8aeb1d86' },
      limit: 1,
      filterType: 'manual',
      filters: { conditions: [{ key: 'Notificaciones|checkbox', condition: 'equals', checkboxValue: true }] },
      options: {}
    },
    type: 'n8n-nodes-base.notion',
    typeVersion: 2.2,
    position: [1980, 400],
    id: ids['Get Not Bot'],
    name: 'Get Not Bot',
    notesInFlow: true,
    credentials: { notionApi: { id: '0vm51DaWqWGwtW9q' } }
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: uuidv4(), name: 'workflowName', value: expr('$workflow.name'), type: 'string' },
          { id: uuidv4(), name: 'apiKey', value: expr('$node["Get Not Bot"].json.property_api_key'), type: 'string' },
          { id: uuidv4(), name: 'botURL', value: '=https://{{ $node[\'Get Not Bot\'].json.property_server_url }}/message/sendText/{{ $node[\'Get Not Bot\'].json.property_bot_id }}', type: 'string' },
          { id: uuidv4(), name: 'messageType', value: 'MSG-S', type: 'string' },
          { id: uuidv4(), name: 'sessionDate', value: '', type: 'string' },
          { id: uuidv4(), name: 'number', value: expr('$node["ENV"].item.json.client_whatsapp'), type: 'string' },
          { id: uuidv4(), name: 'text', value: '🤖: Ha entrado un nuevo lead!', type: 'string' },
          { id: uuidv4(), name: 'pageID', value: '', type: 'string' }
        ]
      },
      options: {}
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [2160, 400],
    id: ids['Data MSG-S'],
    name: 'Data MSG-S',
    notesInFlow: true,
    executeOnce: true
  },
  {
    parameters: {
      workflowId: { __rl: true, value: 'NFfhN6ZIxkpBW3Ph', mode: 'list', cachedResultName: 'MSG General EvolutionApi' },
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
          text: expr('$json.text')
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      },
      options: { waitForSubWorkflow: false }
    },
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [2340, 400],
    id: ids['MSG-S'],
    name: 'MSG-S',
    notesInFlow: true
  },
  {
    parameters: { jsCode: `// Fuente: nodo "Session Data"\nconst sessionItems = $items('Session Data');\n\nreturn sessionItems.map(item => {\n\t// Hora de la sesión\n\tconst sessionTimeRaw = item.json.scheduled_event.start_time;\n\tconst sessionTime    = new Date(sessionTimeRaw);\n\n\t// Hora actual (n8n insertará su timestamp en $now)\n\tconst nowDate        = new Date($now);\n\n\t// Diferencia en horas\n\tconst differenceMs   = sessionTime - nowDate;\n\tconst hoursRemaining = Math.floor(differenceMs / (1000 * 60 * 60));\n\n\t// Devolvemos todo el JSON original + los campos calculados\n\treturn {\n\t\tjson: {\n\t\t\t...item.json,             // conserva todas las claves/valores originales\n\t\t\tnow: $now,\n\t\t\tstart_session: sessionTimeRaw,\n\t\t\thours_remaining: hoursRemaining\n\t\t}\n\t};\n});\n` },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1620, 760],
    id: '39bf231e-140e-4be7-a4d6-d2ced4e80427',
    name: 'Hours Remaining'
  },
  {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2
        },
        conditions: [
          {
            id: '862a5e54-0722-4dc6-994b-280234a4ccf9',
            leftValue: '={{ $json.hours_remaining }}',
            rightValue: 16,
            operator: { type: 'number', operation: 'lt' }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [1800, 760],
    id: 'e6e0f9e2-acb4-4856-aa2c-3974789ab5e1',
    name: 'If1'
  },
  {
    parameters: { jsCode: `const session_date = $node["Session Data"].json.scheduled_event.start_time;\nconst fecha = new Date(session_date);\n\n// Configuración genérica para la zona horaria\nconst opciones = { timeZone: 'Europe/Madrid', hour12: false };\n\n// Obtenemos cada parte por separado usando el toLocaleString con las opciones adecuadas\nconst diaSemana = fecha.toLocaleString('es-ES', { ...opciones, weekday: 'long' });\nconst diaMes    = fecha.toLocaleString('es-ES', { ...opciones, day: 'numeric' });\nconst hora      = fecha.toLocaleString('es-ES', { ...opciones, hour: '2-digit' });\nconst minutos   = fecha.toLocaleString('es-ES', { ...opciones, minute: '2-digit' }).padStart(2, '0'); // Asegura dos dígitos\n\n// Construimos la cadena final\nconst fechaFormateada = \`el \${diaSemana} \${diaMes} a las \${hora}:\${minutos}\`;\n\nreturn [\n  {\n    fechaFormateada\n  }\n];\n` },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1980, 580],
    id: '514ac874-8bc6-4494-a56b-aaa08d30e347',
    name: 'Formated Date4'
  },
  {
    parameters: { jsCode: `const session_date = $node["Session Data"].json.scheduled_event.start_time;\nconst fecha = new Date(session_date);\n\n// Configuración genérica para la zona horaria\nconst opciones = { timeZone: 'Europe/Madrid', hour12: false };\n\n// Obtenemos cada parte por separado usando el toLocaleString con las opciones adecuadas\nconst diaSemana = fecha.toLocaleString('es-ES', { ...opciones, weekday: 'long' });\nconst diaMes    = fecha.toLocaleString('es-ES', { ...opciones, day: 'numeric' });\nconst hora      = fecha.toLocaleString('es-ES', { ...opciones, hour: '2-digit' });\nconst minutos   = fecha.toLocaleString('es-ES', { ...opciones, minute: '2-digit' }).padStart(2, '0'); // Asegura dos dígitos\n\n// Construimos la cadena final\nconst fechaFormateada = \`el \${diaSemana} \${diaMes} a las \${hora}:\${minutos}\`;\n\nreturn [\n  {\n    fechaFormateada\n  }\n];\n` },
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [1980, 1000],
    id: 'a3191fc7-38cb-4a90-9c04-e93f1f56c6c3',
    name: 'Formated Date5'
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: '5a487ac3-0459-4104-a13d-0904fb24f48a', name: 'workflowName', value: '={{ $workflow.name }}', type: 'string' },
          { id: '2fc18e1d-1c54-462f-8504-cb6e61826ea5', name: 'apiKey', value: '={{ $node[\'ENV\'].json.evo_apikey }}', type: 'string' },
          { id: 'a32060c7-4e53-4f30-95be-ad2de2e13209', name: 'botURL', value: '=https://{{ $node[\'ENV\'].json.evo_url }}/message/sendText/{{ $node[\'ENV\'].json.bot_id }}', type: 'string' },
          { id: '6d6394f8-b07d-4fb6-9648-c13b6fa0dd3f', name: 'messageType', value: 'MSG-1', type: 'string' },
          { id: 'caa640c7-6d1a-4d64-865c-84c78c1df786', name: 'sessionDate', value: '={{ $(\'Session Data\').item.json.scheduled_event.start_time }}', type: 'string' },
          { id: '1736e866-b0f4-4634-814b-a6f3d87fb59b', name: 'number', value: '={{ $(\'Session Data\').item.json.user_info.telephone }}', type: 'string' },
          { id: 'a8535472-a454-44a7-bdbd-c64800d47e61', name: 'text', value: '=Llamada reagendada: \n\nNos vemos {{ $json.fechaFormateada }}.\n\nPD: Puede que te lleguen mensajes con la hora anterior, ignoralos.', type: 'string' },
          { id: 'b12c92dd-3280-4adb-b7d2-822ea93a1b8b', name: 'pageID', value: '={{ $(\'Get Lead.\').item.json.id }}', type: 'string' }
        ]
      },
      options: {}
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [2160, 580],
    id: 'a929502e-9ede-40b1-aa40-5f5eaa7287c2',
    name: 'Data MSG-5',
    notesInFlow: true
  },
  {
    parameters: {
      workflowId: {
        __rl: true,
        value: 'NFfhN6ZIxkpBW3Ph',
        mode: 'list',
        cachedResultName: 'MSG General EvolutionApi'
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
          text: '={{ $json.text }}'
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      },
      options: { waitForSubWorkflow: false }
    },
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [2340, 580],
    id: '576680a1-df0a-424f-b3de-4a6070fd7ab0',
    name: 'MSG-5',
    notesInFlow: true
  },
  {
    parameters: {
      assignments: {
        assignments: [
          { id: '5a487ac3-0459-4104-a13d-0904fb24f48a', name: 'workflowName', value: '={{ $workflow.name }}', type: 'string' },
          { id: '2fc18e1d-1c54-462f-8504-cb6e61826ea5', name: 'apiKey', value: '={{ $node[\'ENV\'].json.evo_apikey }}', type: 'string' },
          { id: 'a32060c7-4e53-4f30-95be-ad2de2e13209', name: 'botURL', value: '=https://{{ $node[\'ENV\'].json.evo_url }}/message/sendText/{{ $node[\'ENV\'].json.bot_id }}', type: 'string' },
          { id: '6d6394f8-b07d-4fb6-9648-c13b6fa0dd3f', name: 'messageType', value: 'MSG-1', type: 'string' },
          { id: 'caa640c7-6d1a-4d64-865c-84c78c1df786', name: 'sessionDate', value: '={{ $(\'Session Data\').item.json.scheduled_event.start_time }}', type: 'string' },
          { id: '1736e866-b0f4-4634-814b-a6f3d87fb59b', name: 'number', value: '={{ $(\'Session Data\').item.json.user_info.telephone }}', type: 'string' },
          { id: 'a8535472-a454-44a7-bdbd-c64800d47e61', name: 'text', value: '=Llamada reagendada: \n\nNos vemos {{ $json.fechaFormateada }}.\n\nPD: Puede que te lleguen mensajes con la hora anterior, ignoralos.', type: 'string' },
          { id: 'b12c92dd-3280-4adb-b7d2-822ea93a1b8b', name: 'pageID', value: '={{ $(\'Get Lead.\').item.json.id }}', type: 'string' }
        ]
      },
      options: {}
    },
    type: 'n8n-nodes-base.set',
    typeVersion: 3.4,
    position: [2160, 1000],
    id: '6480f602-e7c7-41e1-8ae7-40330323445d',
    name: 'Data MSG-4',
    notesInFlow: true
  },
  {
    parameters: {
      workflowId: {
        __rl: true,
        value: 'NFfhN6ZIxkpBW3Ph',
        mode: 'list',
        cachedResultName: 'MSG General EvolutionApi'
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
          text: '={{ $json.text }}'
        },
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      },
      options: { waitForSubWorkflow: false }
    },
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: 1.2,
    position: [2340, 1000],
    id: 'e1d7f217-9f61-4e2e-bddf-cc3f08f4ca05',
    name: 'MSG-4',
    notesInFlow: true
  },
  {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2
        },
        conditions: [
          {
            id: '68706d95-5dad-4795-b348-0e424ea1104c',
            leftValue: '={{ $node[\'ENV\'].json.bot_id }}',
            rightValue: '',
            operator: { type: 'string', operation: 'notEmpty', singleValue: true }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [1440, 760],
    id: '5ffb7523-b0f2-4a9d-92d1-6870e5b3dade',
    name: 'If2'
  }
];

const connections = {
  Webhook: { main: [[{ node: 'ID Project', type: 'main', index: 0 }]] },
  'ID Project': { main: [[{ node: 'Get Project', type: 'main', index: 0 }]] },
  'Get Project': { main: [[{ node: 'Get Bot', type: 'main', index: 0 }]] },
  'Get Bot': { main: [[{ node: 'ENV', type: 'main', index: 0 }]] },
  ENV: { main: [[{ node: 'Session Data', type: 'main', index: 0 }]] },
  'Session Data': { main: [[{ node: 'Event Type', type: 'main', index: 0 }]] },
  'Event Type': {
    main: [
      [{ node: 'Create Lead', type: 'main', index: 0 }],
      [{ node: 'Get Lead', type: 'main', index: 0 }],
      [{ node: 'Get Lead.', type: 'main', index: 0 }]
    ]
  },
  'Create Lead': { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
  'Get Lead': { main: [[{ node: 'Cancel', type: 'main', index: 0 }]] },
  'Get Lead.': { main: [[{ node: 'Update', type: 'main', index: 0 }]] },
  'Form': { main: [[{ node: 'If', type: 'main', index: 0 }]] },
  'If': {
    main: [
      [{ node: 'Formated Date', type: 'main', index: 0 }],
      [{ node: 'Get Not Bot', type: 'main', index: 0 }]
    ]
  },
  'Formated Date': { main: [[{ node: 'Data MSG-1', type: 'main', index: 0 }]] },
  'Data MSG-1': { main: [[{ node: 'MSG-1', type: 'main', index: 0 }]] },
  'MSG-1': { main: [[{ node: 'Get Not Bot', type: 'main', index: 0 }]] },
  'Get Not Bot': { main: [[{ node: 'Data MSG-S', type: 'main', index: 0 }]] },
  'Data MSG-S': { main: [[{ node: 'MSG-S', type: 'main', index: 0 }]] },
  'Update': { main: [[{ node: 'If2', type: 'main', index: 0 }]] },
  'If2': { main: [[{ node: 'Hours Remaining', type: 'main', index: 0 }]] },
  'Hours Remaining': { main: [[{ node: 'If1', type: 'main', index: 0 }]] },
  'If1': {
    main: [
      [{ node: 'Formated Date4', type: 'main', index: 0 }],
      [{ node: 'Formated Date5', type: 'main', index: 0 }]
    ]
  },
  'Formated Date4': { main: [[{ node: 'Data MSG-5', type: 'main', index: 0 }]] },
  'Data MSG-5': { main: [[{ node: 'MSG-5', type: 'main', index: 0 }]] },
  'Formated Date5': { main: [[{ node: 'Data MSG-4', type: 'main', index: 0 }]] },
  'Data MSG-4': { main: [[{ node: 'MSG-4', type: 'main', index: 0 }]] }
};

const workflow = {
  name: workflowDataInput.workflow_name,
  nodes,
  connections,
  settings: {
    executionOrder: 'v1',
    timezone: 'Europe/Madrid',
    errorWorkflow: 'cTGB7gdBc2cq8Gss'
  },
};

return [{ json: workflow }]