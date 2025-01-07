// create metadata for all the available functions to pass to completions API
const tools = [
  {
    type: 'function',
    function: {
      name: 'getStyles',
      description: 'Check the styles of shoes available.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      returns: {
        type: 'array',
        items: {
          type: 'string',
        }
      }
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkInventory',
      say: 'Let me check our inventory right now.',
      description: 'Check the inventory of shoes based on style, color and size. Use this function when the customer asks if a specific style, color and size of shoe is available.',
      parameters: {
        type: 'object',
        properties: {
          style: {
            type: 'string',
            'enum': ['loafer', 'trainer', 'sandal'],
            description: 'The style of shoe',
          },
          color: {
            type: 'string',
            'enum': ['brown', 'black'],
            description: 'The color of shoe',
          },
          size: {
            type: 'integer',
            'enum': [8, 9, 10, 11, 12],
            description: 'The size of shoe',
          },
        },
        required: ['style', 'color', 'size'],
      },
      returns: {
        type: 'object',
        properties: {
          stock: {
            type: 'integer',
            description: 'An integer with the number of shoes currently in stock for the specified style, color and size.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getStoreAddress',
      say: 'Let me get that address for you.',
      description: 'Check the street address for a shoe store for a given city. Use this function when the customer needds the address of a physical store in a certain city.',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: 'The name of a city where an Owl Shoes store is located',
          },
        },
        required: ['city'],
      },
      returns: {
        type: 'object',
        properties: {
          street: {
            type: 'string',
            description: 'The street name and number for the store.'
          }
        }
      }
    },
  },

  // {
  //   type: 'function',
  //   function: {
  //     name: 'checkPrice',
  //     say: 'Let me check the price, one moment.',
  //     description: 'Check the price of given model of airpods, airpods pro or airpods max.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         model: {
  //           type: 'string',
  //           'enum': ['airpods', 'airpods pro', 'airpods max'],
  //           description: 'The model of airpods, either the airpods, airpods pro or airpods max',
  //         },
  //       },
  //       required: ['model'],
  //     },
  //     returns: {
  //       type: 'object',
  //       properties: {
  //         price: {
  //           type: 'integer',
  //           description: 'the price of the model'
  //         }
  //       }
  //     }
  //   },
  // },

  {
    type: 'function',
    function: {
      name: 'placeOrder',
      say: 'All right, I\'m just going to ring that up in our system.',
      description: 'Places an order for a set of shoes, after double confirmed with the customer.',
      parameters: {
        type: 'object',
        properties: {
          order: {
            type: 'string',
            description: 'The order summary including model of shoes, price, shipping method and shipping information',
          },
          number: {
            type: 'string',
            description: 'The user phone number in E.164 format',
          },
        },
        required: ['order', 'number'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'transferToLiveAgent',
      description: 'Transfers the customer to a live agent.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      returns: {
        type: 'object',
        properties: {},
      }
    },
  },

  {
    type: 'function',
    function: {
      name: "getWeather",
      description: "Get the current weather for a given location.",
      say: 'Let me check the weather for you.',
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "The city name (e.g., London, Paris)." },
        },
        required: ["location"],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: "changeLanguage",
      description: "Change the current conversation language to user preference, treat en-US, en-GB, es-ES, es-MX etc. as different languages.",
      parameters: {
        type: "object",
        properties: {
          language: { type: "string", description: "The language codes preferred by the user and should be changed to, the format like en-US, fr-FR etc. If the user requests language without specifying the region, default to the system's initial language with region if they are the same." },
        },
        required: ["language"],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: "askForExample",
      description: "Ask the system for an example of addressing a specific customer inquiry, issue or request. Call this whenever you need to generate an accurate response based on Owl Shoes specific products, orders, prices or policies.",
      parameters: {
        type: "object",
        properties: {
          inquiry: {
            type: "string",
            description: "Text of the customer inquiry, issue or request for which an example response is required."
          },
        },
        required: ["inquiry"],
      },
    },
  },

];

module.exports = tools;