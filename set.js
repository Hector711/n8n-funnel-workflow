const setConfig = {
  workflowName: {
    name: 'workflowName',
    value: "$workflow.name",
  },
  apiKey: {
    name: 'apiKey',
    value: "$node['ENV'].json.evo_apikey",
  },
  botURL: {
    name: 'botURL',
    value: "=https://{{ $node['ENV'].json.evo_url }}/message/sendText/{{ $node['ENV'].json.bot_id }}",
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
    value: "$node['Session Data'].json.scheduled_event.start_time",
  },
  number: {
    name: 'number',
    value: "$node['Session Data'].json.user_info.telephone",
  },
  text: {
    name: 'text',
    value: {
      MSG_1: `=¡Hola {{ $node['Session Data'].json.user_info.name }}! 👋\n\nEncantado de saludarte, te escribo por la llamada que tienes agendada conmigo.\n\nPronto te contactaré para confirmar algunos detalles importantes. Es fundamental que podamos hablar para dejar todo listo para tu sesión.\n\nPor favor, mantente atent@ a tu teléfono 📞\n\n⚠️ Si no logramos contactar en las próximas 24 horas, cancelaremos la llamada.`,
      MSG_Reschedule: `Llamada reagendada: \n\nNos vemos {{ $json.fechaFormateada }}.{{ $json.hours_remaining > 18 ? "\n\nPD: Puede que te lleguen mensajes con la hora anterior, ignoralos." : "" }}`,
    }
  },
  pageID: {
    name: 'pageID',
    value: {
      MSG_1: "$node['Create Lead'].json.id",
      MSG_Reschedule: "={{ $node['Get Lead Reschedule'].json.id }}"
    },
  },
};
