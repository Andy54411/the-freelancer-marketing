// GTM Subkategorie-Generator
// Generiert automatisch GTM-Trigger für alle Subkategorien

const fs = require('fs');
const path = require('path');

// Subkategorie-Mapping (vereinfacht)
const subcategoryMapping = {
  handwerk: [
    'maler_lackierer', 'elektriker', 'klempner', 'heizungsbau_sanitaer', 
    'fliesenleger', 'dachdecker', 'maurer', 'trockenbauer', 'schreiner',
    'zimmerer', 'bodenleger', 'glaser', 'schlosser', 'metallbauer',
    'fenster_tuerenbauer', 'tischler', 'reparaturen_haus', 'wartung_instandhaltung'
  ],
  reinigung: [
    'reinigungskraft', 'haushaltshilfe', 'fensterputzer', 'entruempelung',
    'hausmeisterdienste', 'teppichreinigung', 'bodenreinigung', 'hausreinigung',
    'moebelmontage', 'montageservice'
  ],
  transport_umzug: [
    'umzugshelfer', 'fahrer', 'kurierdienste', 'transportdienstleistungen',
    'lagerlogistik', 'umzug', 'moebel_transportieren'
  ],
  it_technik: [
    'webentwicklung', 'softwareentwicklung', 'app_entwicklung', 'datenbankentwicklung',
    'it_support', 'netzwerkadministration', 'it_beratung', 'systemintegration',
    'cloud_computing', 'cybersecurity', 'webdesign', 'ux_ui_design', 'grafikdesign',
    'online_marketing', 'social_media_marketing', 'content_marketing', 'fotografie', 'videografie'
  ],
  beratung_coaching: [
    'buchhaltung', 'steuerberatung', 'rechtsberatung', 'finanzberatung',
    'versicherungsberatung', 'unternehmensberatung', 'projektmanagement', 'coaching'
  ],
  garten_landschaft: [
    'garten_landschaftspflege', 'gartenpflege', 'landschaftsgaertner',
    'baumpflege', 'winterdienst', 'gartengestaltung'
  ],
  gesundheit_wellness: [
    'massage', 'physiotherapie', 'fitness_training', 'ernaehrungsberatung',
    'kosmetik', 'friseur'
  ],
  sonstiges: [
    'uebersetzungen', 'schreibdienste', 'recherche', 'datenerfassung',
    'telefonservice', 'verwaltung', 'archivierung', 'inventur',
    'marktforschung', 'qualitaetskontrolle', 'logistik', 'sicherheitsdienst'
  ]
};

// Basis-Konfiguration
const baseConfig = {
  name: "Komplette GTM Konfiguration - Alle Subkategorien",
  description: "Automatisch generierte GTM Konfiguration für alle Subkategorien",
  variables: [
    {
      name: "DSGVO - Analytics Consent Status",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "analytics_consent" }]
    },
    {
      name: "DSGVO - Marketing Consent Status",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "marketing_consent" }]
    },
    {
      name: "DSGVO - Functional Consent Status",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "functional_consent" }]
    },
    {
      name: "User Registration - Category",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "user_registration_category" }]
    },
    {
      name: "Order Creation - Category",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "order_category" }]
    },
    {
      name: "Order Creation - Subcategory",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "order_subcategory" }]
    },
    {
      name: "Order Creation - Value",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "order_value" }]
    },
    {
      name: "Order Creation - User ID",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "order_user_id" }]
    },
    {
      name: "Order Creation - Location",
      type: "v",
      parameter: [{ type: "TEMPLATE", key: "name", value: "order_location" }]
    }
  ],
  triggers: []
};

// DSGVO Triggers
const dsgvoTriggers = [
  {
    name: "DSGVO - Analytics Consent Gegeben",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "analytics_consent_granted" }
        ]
      }
    ]
  },
  {
    name: "DSGVO - Marketing Consent Gegeben",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "marketing_consent_granted" }
        ]
      }
    ]
  },
  {
    name: "DSGVO - Cookie Consent Banner Angezeigt",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "cookie_banner_shown" }
        ]
      }
    ]
  },
  {
    name: "DSGVO - Cookie Consent Akzeptiert",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "cookie_consent_accepted" }
        ]
      }
    ]
  },
  {
    name: "DSGVO - Cookie Consent Abgelehnt",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "cookie_consent_declined" }
        ]
      }
    ]
  }
];

// User Registration Triggers
const userTriggers = [
  {
    name: "User Registration - Alle Kategorien",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "user_registration" }
        ]
      }
    ]
  },
  {
    name: "User Registration - Kunde",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "user_registration" }
        ]
      }
    ],
    filter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{User Registration - Category}}" },
          { type: "TEMPLATE", key: "arg1", value: "kunde" }
        ]
      }
    ]
  },
  {
    name: "User Registration - Dienstleister",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "user_registration" }
        ]
      }
    ],
    filter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{User Registration - Category}}" },
          { type: "TEMPLATE", key: "arg1", value: "dienstleister" }
        ]
      }
    ]
  }
];

// Funktion zum Generieren der Trigger
function generateTriggers() {
  const triggers = [...dsgvoTriggers, ...userTriggers];
  
  // Alle Kategorien Trigger
  triggers.push({
    name: "Order Created - Alle Kategorien",
    type: "CUSTOM_EVENT",
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: "order_created" }
        ]
      }
    ]
  });

  // Kategorie-spezifische Trigger
  Object.keys(subcategoryMapping).forEach(category => {
    const categoryName = category.replace('_', ' & ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Kategorie-Trigger
    triggers.push({
      name: `Order Created - ${categoryName}`,
      type: "CUSTOM_EVENT",
      customEventFilter: [
        {
          type: "EQUALS",
          parameter: [
            { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
            { type: "TEMPLATE", key: "arg1", value: "order_created" }
          ]
        }
      ],
      filter: [
        {
          type: "EQUALS",
          parameter: [
            { type: "TEMPLATE", key: "arg0", value: "{{Order Creation - Category}}" },
            { type: "TEMPLATE", key: "arg1", value: category }
          ]
        }
      ]
    });

    // Subkategorie-Trigger (nur die wichtigsten)
    subcategoryMapping[category].slice(0, 5).forEach(subcategory => {
      const subcategoryName = subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      triggers.push({
        name: `Order Created - ${categoryName} - ${subcategoryName}`,
        type: "CUSTOM_EVENT",
        customEventFilter: [
          {
            type: "EQUALS",
            parameter: [
              { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
              { type: "TEMPLATE", key: "arg1", value: "order_created" }
            ]
          }
        ],
        filter: [
          {
            type: "EQUALS",
            parameter: [
              { type: "TEMPLATE", key: "arg0", value: "{{Order Creation - Category}}" },
              { type: "TEMPLATE", key: "arg1", value: category }
            ]
          },
          {
            type: "EQUALS",
            parameter: [
              { type: "TEMPLATE", key: "arg0", value: "{{Order Creation - Subcategory}}" },
              { type: "TEMPLATE", key: "arg1", value: subcategory }
            ]
          }
        ]
      });
    });
  });

  return triggers;
}

// Generiere die komplette Konfiguration
function generateConfig() {
  const config = { ...baseConfig };
  config.triggers = generateTriggers();
  
  console.log(`🎯 Generierte GTM-Konfiguration:`);
  console.log(`📊 Variablen: ${config.variables.length}`);
  console.log(`🎯 Trigger: ${config.triggers.length}`);
  console.log(`📈 Kategorien: ${Object.keys(subcategoryMapping).length}`);
  
  // Aufschlüsselung nach Trigger-Typen
  const dsgvoCount = config.triggers.filter(t => t.name.includes('DSGVO')).length;
  const userCount = config.triggers.filter(t => t.name.includes('User Registration')).length;
  const orderCount = config.triggers.filter(t => t.name.includes('Order Created')).length;
  
  console.log(`\n📋 Trigger-Aufschlüsselung:`);
  console.log(`  • DSGVO: ${dsgvoCount}`);
  console.log(`  • User Registration: ${userCount}`);
  console.log(`  • Order Creation: ${orderCount}`);
  
  return config;
}

// Hauptfunktion
function main() {
  const config = generateConfig();
  
  // Speichere die Konfiguration
  const outputPath = path.join(__dirname, '..', 'configs', 'gtm-all-subcategories-generated.json');
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  
  console.log(`\n✅ Konfiguration gespeichert: ${outputPath}`);
  console.log(`\n🚀 Upload mit:`);
  console.log(`node scripts/gtm-upload-fixed.js configs/gtm-all-subcategories-generated.json`);
}

// Ausführung
if (require.main === module) {
  main();
}

module.exports = { generateConfig, subcategoryMapping };
