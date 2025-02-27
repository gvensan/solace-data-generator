import { faker } from '@faker-js/faker';

class SolaceDataGenerator {
  constructor() {
  }

  // eventConfig is a propirotiy object that is generated by stm
  static generateEvent(eventConfig) {
    let payload = SolaceDataGenerator.prototype.generateRandomPayload.call(this, eventConfig.payload);
    let {topic, topicValues, mappedTopicParams} = SolaceDataGenerator.prototype.generateRandomTopic.call(this, eventConfig, payload);
    topic = SolaceDataGenerator.prototype.applyMappings.call(this, eventConfig, topic, payload, topicValues, mappedTopicParams);
    return {
      topic: topic,
      payload: payload
    };
  }

  getSourceFieldValue (obj, path) {
    if (path.indexOf('.') < 0)
      return obj[path];
  
    let field = path.substring(0, path.indexOf('.'));
    let fieldName = field.replaceAll('[0]', '');
    var remaining = path.substring(path.indexOf('.')+1);
    return SolaceDataGenerator.prototype.getSourceFieldValue(field.includes('[0]') ? obj[fieldName][0] : obj[field], remaining);
  }

  setTargetFieldValue(payload, path, value) {
    var tokens = path.split('.');
    if (tokens.length <= 1) {
      if (Array.isArray(payload)) {
        payload.forEach(aObj => {
          if (aObj.hasOwnProperty(path))
            aObj[path] = value;
          else
          SolaceDataGenerator.prototype.setTargetFieldValue(aObj, path, value);
        })
      } else {
        payload[path] = value;
      }
      return payload;
    }
    let field = path.substring(0, path.indexOf('.'));
    let fieldName = field.replaceAll('[0]', '');
    var remaining = path.substring(path.indexOf('.')+1);
    SolaceDataGenerator.prototype.setTargetFieldValue(field.includes('[0]') ? payload[fieldName][0] : payload[field], remaining, value);
  }

  generateRandomPayload(payload) {
    const generateContent = (parameter) => SolaceDataGenerator.prototype.generateContent.call(this, parameter);
    function processObject(obj) {
      const result = {};
      for (const key in obj) {
        const value = obj[key];
        if (value.type === 'object') {
          result[key] = processObject(value.properties || {});
        } else if (value.type === 'array') {
          var arrayLength = value.rule?.count || 2;
          result[key] = Array.from({ length: arrayLength }, () =>
            // 2. Check the subtype here
            //    a. if its object --> process object
            //    b. if its array --> process array
            //    c. if its non object --> generate content
            value.subType === 'object'
              ? processObject(value?.items?.properties ? value.items.properties : value.properties || {})
              : value.subType === 'array' ? processArray(value?.items || {}) : generateContent(value)
          );
        } else if (typeof obj[key] === 'object' && !Object.keys(obj[key]).length) {
          result[key] = {}; // empty object (should we consider undefined!!)
        } else {
          value.rule
            ? (result[key] = generateContent(value))
            : (result[key] = generateContent({
                rule: { group: `${capitalize(value.type)}Rules` },
              }));
        }
      }
      return result;
    }

    function processArray(obj) {
      const data = [];
      if (!obj.items || Object.keys(obj.items).length === 0) return data;
      const count = obj.rule?.count || 2;
      for (let i = 0; i < count; i++) {
        if (obj.subType === 'object') {
          data.push(processObject(obj.items?.properties || obj.properties | {}));
        } else if (obj.subType === 'array') {
          data.push(processArray(obj?.items || {}));
        } else {
          data.push(generateContent(obj));
        }
      }
      return data;
    }

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return processObject(payload);
  }

  generateRandomTopic(eventConfig, payload) {
    let topic = eventConfig.topic;
    const mappedTopicParams = new Set();
    var topicValues = {};
    
    // Handle topic mappings if they exist
    if (eventConfig.mappings && eventConfig.mappings.length > 0) {
      // Process mappings for Topic Parameters
      for (const mapping of eventConfig.mappings) {
        if (mapping.target.type === 'Topic Parameter') {
          mappedTopicParams.add(mapping.target.fieldName);
        }
      }
    }
    // Handle remaining unmapped parameters with generated content
    for (const param of Object.keys(eventConfig.topicParameters)) {
      // Skip if parameter was already handled by mapping
      const content = SolaceDataGenerator.prototype.generateContent.call(this, eventConfig.topicParameters[param]);
      topicValues[`_${param}`] = content;
      if (!mappedTopicParams.has(param)) {
        topic = topic.replace(`{${param}}`, content);
      }
    }
    return {topic, topicValues, mappedTopicParams};
  }

  applyMappings(eventConfig, topic, payload, topicValues, mappedTopicParams) {
    let sourceVal = undefined
    // Process mappings for Payload Parameters
    if (eventConfig.mappings && eventConfig.mappings.length > 0) {
      for (const mapping of eventConfig.mappings) {
        if (mapping.source.type === 'Payload Parameter') {
          // Get the value from payload using source field name
          let sourceName = mapping.source.name.replaceAll('.properties', '').replaceAll('[]', '');
          sourceVal = SolaceDataGenerator.prototype.getSourceFieldValue(payload, sourceName);
        } else {
          sourceVal = topicValues[`_${mapping.source.name}`];
        }
        if (mapping.target.type === 'Payload Parameter') {
          let targetName = mapping.target.name.replaceAll('.properties', '').replaceAll('[]', '')
          SolaceDataGenerator.prototype.setTargetFieldValue(payload, targetName, sourceVal)
        } else {
          // Replace the corresponding parameter in topic string
          for (const param of Object.keys(eventConfig.topicParameters)) {
            if(param === mapping.target.name) {
              if (mappedTopicParams.has(param)) {
                topic = topic.replace(`{${param}}`, sourceVal);
              }
            }
          }
        }
      }
    }

    return topic;
  }

  getSourceFieldValue (obj, path) {
    if (path.indexOf('.') < 0)
      return obj[path];
  
    let field = path.substring(0, path.indexOf('.'));
    let fieldName = field.replaceAll('[0]', '');
    var remaining = path.substring(path.indexOf('.')+1);
    return SolaceDataGenerator.prototype.getSourceFieldValue(field.includes('[0]') ? obj[fieldName][0] : obj[field], remaining);
  }
  
  generateContent(parameter) {
    switch (parameter.rule?.group) {
      case 'StringRules':
        return SolaceDataGenerator.prototype.processStringRules.call(this, parameter.rule);
      case 'NullRules':
        return SolaceDataGenerator.prototype.processNullRules.call(this, parameter.rule);
      case 'NumberRules':
        return SolaceDataGenerator.prototype.processNumberRules.call(this, parameter.rule);
      case 'BooleanRules':
        return SolaceDataGenerator.prototype.processBooleanRules.call(this, parameter.rule);
      case 'DateRules':
        return SolaceDataGenerator.prototype.processDateRules.call(this, parameter.rule);
      case 'LoremRules':
        return SolaceDataGenerator.prototype.processLoremRules.call(this, parameter.rule);
      case 'PersonRules':
        return SolaceDataGenerator.prototype.processPersonRules.call(this, parameter.rule);
      case 'LocationRules':
        return SolaceDataGenerator.prototype.processLocationRules.call(this, parameter.rule);
      case 'FinanceRules':
        return SolaceDataGenerator.prototype.processFinanceRules.call(this, parameter.rule);
      case 'AirlineRules':
        return SolaceDataGenerator.prototype.processAirlineRules.call(this, parameter.rule);
      case 'CommerceRules':
        return SolaceDataGenerator.prototype.processCommerceRules.call(this, parameter.rule);
      case 'InternetRules':
        return SolaceDataGenerator.prototype.processInternetRules.call(this, parameter.rule);
      default:
        return 'NoRuleGroupFound';
    }
  }

  processStringRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'alpha':
        options = {
          length: {
            min: rule.minLength,
            max: rule.maxLength,
          },
          casing: rule.casing,
        };
        return faker.string.alpha(options);
      case 'alphanumeric':
        options = {
          length: {
            min: rule.minLength,
            max: rule.maxLength,
          },
          casing: rule.casing,
        };
        return faker.string.alphanumeric(options);
      case 'enum':
        let enumObj = {};
        rule.enum.forEach((t) => {
          enumObj[`'${t}'`] = t;
        });
        let val = faker.helpers.enumValue(Object.freeze(enumObj));
        switch (rule.type) {
          case 'integer':
            return parseInt(val);
          case 'number':
            return parseFloat(val);
          case 'boolean':
            return val.toLowerCase() === 'true';
          default:
            return val;
        }
      case 'words':
        return faker.lorem.words(rule.count);
      case 'nanoid':
        options = {
          min: rule.minLength,
          max: rule.maxLength,
        };
        return faker.string.nanoid(options);
      case 'numeric':
        options = {
          length: {
            min: rule.minLength,
            max: rule.maxLength,
          },
          allowLeadingZeros: rule.leadingZeros,
        };
        return faker.string.numeric(options);
      case 'symbol':
        options = {
          min: rule.minLength,
          max: rule.maxLength,
        };
        return faker.string.symbol(options);
      case 'uuid':
        return faker.string.uuid();
      case 'fromRegExp':
        return faker.helpers.fromRegExp(rule.pattern);
      case 'phoneNumber':
        return faker.phone.number();
      case 'json':
        return faker.datatype.json();
      case 'static':
        return rule.static;
      default:
        return faker.string.alpha(10);
    }
  }

  processNullRules(rule) {
    switch (rule.rule) {
      case 'null':
        return null;
      case 'empty':
        return '';
      default:
        return 'null';
    }
  }

  processNumberRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'int':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.number.int(options);
      case 'float':
        options = {
          min: rule.minimum,
          max: rule.maximum,
          fractionDigits: parseInt(rule.fractionDigits),
        };
        return faker.number.float(options);
      case 'countUp':
        var current = rule.current ?? rule.start;
        rule.current = current + rule.change;
        return current;
      case 'countDown':
        var current = rule.current ?? rule.start;
        rule.current = current - rule.change;
        return current;
      default:
        console.log('Invalid/missing number rule: ' + rule.rule);
        return faker.number.int(100);
    }
  }

  processBooleanRules(rule) {
    switch (rule.rule) {
      case 'boolean':
        return faker.datatype.boolean();
      default:
        return 'true';
    }
  }

  processDateRules(rule) {
    var options = {};
    var formatter = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    
    switch (rule.rule) {
      case 'timeStamp':
        return Date.now();
      case 'currentDate':
        formatter = new Intl.DateTimeFormat('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });
        var [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(new Date());
        if (rule.format === 'MM-DD-YYYY')
          return `${month}-${day}-${year}`;
        else if (rule.format === 'DD-MM-YYYY')
          return `${day}-${month}-${year}`;
        else
          return `${month}-${day}-${year}`;
      case 'currentDateWithTime':
        formatter = new Intl.DateTimeFormat("en-US", {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });

        var date = new Date();
        var [{ value: month }, , { value: day }, , { value: year }] = formatter.formatToParts(date);

        // Extract time components
        const hours24 = date.getHours();
        const hours12 = hours24 % 12 || 12; // Convert to 12-hour format
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const amPm = hours24 < 12 ? 'AM' : 'PM';
  
        if (rule.format === 'MM-DD-YYYY HH:mm:ss')
          return `${month}-${day}-${year} ${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`;
        else if (rule.format === 'MM-DD-YYYY hh:mm:ss a')
          return `${month}-${day}-${year} ${hours12}:${minutes}:${seconds} ${amPm}`;
        else if (rule.format === 'DD-MM-YYYY HH:mm:ss')
          return `${day}-${month}-${year} ${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`;
        else if (rule.format === 'DD-MM-YYYY hh:mm:ss a')
          return `${day}-${month}-${year} ${hours12}:${minutes}:${seconds} ${amPm}`;
        else
          return `${month}-${day}-${year} ${String(hours24).padStart(2, '0')}:${minutes}:${seconds}`;
      case 'currentTime':
        formatter = new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: rule.format.endsWith('a') ? true : false,
        });
    
        return formatter.format(new Date());
      case 'anytime':
        return new Date(faker.date.anytime()).toDateString();
      case 'future':
        options = { years: rule.years }
        return new Date(faker.date.future(options)).toDateString();
      case 'past':
        options = { years: rule.years }
        return new Date(faker.date.past(options)).toDateString();
      case 'recent':
        options = { days: rule.days };
        return new Date(faker.date.recent(options)).toDateString();
      case 'soon':
        options = { days: rule.days };
        return new Date(faker.date.soon(options)).toDateString();
      case 'month':
        options = { abbreviated: rule.abbreviated };
        return faker.date.month(options);
      case 'weekday':
        options = { abbreviated: rule.abbreviated };
        return faker.date.weekday(options);
      default:
        return faker.date.anytime();
    }
  }

  processLoremRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'lines':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.lorem.lines(options);
      case 'paragraph':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.lorem.paragraphs(options);
      case 'sentence':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.lorem.sentence(options);
      case 'text':
        return faker.lorem.text();
      case 'word':
        options = {
          length: {
            min: rule.minimum,
            max: rule.maximum,
          },
        };
        return faker.lorem.word(options);
      default:
        return faker.lorem.word(5);
    }
  }

  processPersonRules(rule) {
    switch (rule.rule) {
      case 'prefix':
        return faker.person.prefix();
      case 'firstName':
        return faker.person.firstName();
      case 'lastName':
        return faker.person.lastName();
      case 'middleName':
        return faker.person.middleName();
      case 'fullName':
        return faker.person.fullName();
      case 'suffix':
        return faker.person.suffix();
      case 'sex':
        return faker.person.sex();
      case 'jobTitle':
        return faker.person.jobTitle();
      case 'jobDescriptor':
        return faker.person.jobDescriptor();
      case 'jobType':
        return faker.person.jobType();
      default:
        return faker.person.firstName();
    }
  }

  processLocationRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'buildingNumber':
        return faker.location.buildingNumber();
      case 'street':
        return faker.location.street();
      case 'streetAddress':
        return faker.location.streetAddress();
      case 'city':
        return faker.location.city();
      case 'state':
        return faker.location.state();
      case 'zipCode':
        return faker.location.zipCode();
      case 'country':
        return faker.location.countryCode();
      case 'countryCode':
        return faker.location.countryCode();
      case 'latitude':
        options = {
          min: rule.minimum,
          max: rule.maximum,
          precision: parseInt(rule.precision),
        };
        return faker.location.latitude(options);
      case 'longitude':
        options = {
          min: rule.minimum,
          max: rule.maximum,
          precision: parseInt(rule.precision),
        };
        return faker.location.longitude(options);
      case 'timeZone':
        return faker.location.timeZone();
      default:
        return faker.location.city();
    }
  }

  processFinanceRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'accountNumber':
        return faker.finance.accountNumber();
      case 'amount':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.finance.amount(options);
      case 'swiftOrBic':
        return faker.finance.bic();
      case 'creditCardNumber':
        return faker.finance.creditCardNumber();
      case 'currencyCode':
        return faker.finance.currencyCode();
      case 'currencyName':
        return faker.finance.currencyName();
      case 'currencySymbol':
        return faker.finance.currencySymbol();
      case 'bitcoinAddress':
        return faker.finance.bitcoinAddress();
      case 'ethereumAddress':
        return faker.finance.ethereumAddress();
      case 'transactionDescription':
        return faker.finance.transactionDescription();
      case 'transactionType':
        return faker.finance.transactionType();
      default:
        return faker.finance.creditCardNumber();
    }
  }

  processAirlineRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'airline':
        return faker.airline.airline();
      case 'airplane':
        const airplane = faker.airline.airplane();
        return `${airplane.name} [${airplane.iataTypeCode}]`;
      case 'airport':
        const airport = faker.airline.airport();
        return `${airport.name} [${airport.iataCode}]`;
      case 'airportName':
        return faker.airline.airport().name;
      case 'airportCode':
        return faker.airline.airport().iataCode;
      case 'flightNumber':
        options = {
          length: {
            min: rule.minimum,
            max: rule.maximum,
          },
          addLeadingZeros: rule.leadingZeros,
        };
        return faker.airline.flightNumber(options);
      default:
        return faker.airline.airport().iataCode;
    }
  }

  processCommerceRules(rule) {
    var options = {};
    switch (rule.rule) {
      case 'companyName':
        return faker.company.name();
      case 'department':
        return faker.commerce.department();
      case 'isbn':
        return faker.commerce.isbn();
      case 'price':
        options = {
          min: rule.minimum,
          max: rule.maximum,
        };
        return faker.commerce.price(options);
      case 'product':
        return faker.commerce.product();
      case 'productDescription':
        return faker.commerce.productDescription();
      case 'productName':
        return faker.commerce.productName();
      default:
        return faker.commerce.productName();
    }
  }

  processInternetRules(rule) {
    switch (rule.rule) {
      case 'domainName':
        return rule.casing === 'mixed' ? faker.internet.domainName() : rule.casing === 'upper' ? faker.internet.domainName().toUpperCase() : faker.internet.domainName().toLowerCase();
      case 'domainWord':
        return rule.casing === 'mixed' ? faker.internet.domainWord() : rule.casing === 'upper' ? faker.internet.domainWord().toUpperCase() : faker.internet.domainWord().toLowerCase();
      case 'email':
        return rule.casing === 'mixed' ? faker.internet.email() : rule.casing === 'upper' ? faker.internet.email().toUpperCase() : faker.internet.email().toLowerCase();
      case 'emoji':
        return faker.internet.emoji();
      case 'ipv4':
        return faker.internet.ipv4();
      case 'ipv6':
        return faker.internet.ipv6();
      case 'mac':
        return faker.internet.mac();
      case 'url':
        return rule.casing === 'mixed' ? faker.internet.url() : rule.casing === 'upper' ? faker.internet.url().toUpperCase() : faker.internet.url().toLowerCase();
      case 'username':
        return rule.casing === 'mixed' ? faker.internet.username() : rule.casing === 'upper' ? faker.internet.username().toUpperCase() : faker.internet.username().toLowerCase();
    }
  }
}

export const generateEvent = SolaceDataGenerator.generateEvent;
