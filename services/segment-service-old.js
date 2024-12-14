const { Analytics } = require('@segment/analytics-node')
require('dotenv').config();
const axios = require('axios');

const profileToken = process.env.PROFILE_TOKEN;
const spaceID = process.env.SPACE_ID;
const analytics = new Analytics({ writeKey: process.env.WRITE_KEY });

const baseURL = 'https://profiles.segment.com/v1';

function addUser(id, name, phone, address) {
  console.log("add user start");
  try {
    analytics.identify({
      userId: id,
      traits: {
        name: name,
        phone: phone,
        address: address
      }
    });
  } catch (error) {
    console.error("Error adding user:", error);
  }
  console.log("add user done");
}

function addPizzaOrderedEvent(id, ts, order, price, shipment) {
  try {
    analytics.track({
      userId: id,
      event: 'Pizza Ordered',
      properties: {
        timestamp:ts,
        order: order,
        price: price,
        shippingMethod: shipment,
      }
    });
  } catch (error) {
    console.error("Error adding PizzaOrdered event:", error);
  }
  console.log("add PizzaOrdered event done");
}

function getProfile(id) {
  console.log(`getting profile from Segment for id: ${id}`);
  const username = profileToken;
  const password = '';
  const credentials = Buffer.from(`${username}:${password}`).toString('base64');

  const config = {
    headers: { 'Authorization': `Basic ${credentials}` }
  };

  return axios.get(`${baseURL}/spaces/${spaceID}/collections/users/profiles/user_id:${id}/traits`, config)
      .then(response => {
          const traits = response.data.traits;
          console.log(traits);
          return traits;
      })
      .catch(error => {
          console.error('get_profile error:', error);
          return '';
      });
}

function getEvents(id) {
    const axios = require('axios');
    const username =  profileToken;
  const password = '';
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    const config = {
      headers: { 'Authorization': `Basic ${credentials}` }
    };

  return axios.get(`${baseURL}/spaces/${spaceID}/collections/users/profiles/user_id:${id}/events`, config)
      .then(response => {
        //console.log('getEvents response data:', response.data); 
        return extractOrderData(response.data);
      })
      .catch(error => {
        console.log('Error in getEvents:', error);
      });
}

function extractOrderData(jsonData) {
  try {
    const result = [];
    jsonData.data.forEach(item => {
        const extractedData = {
            timestamp: item.properties.timestamp,
            order: item.properties.order,
            // orderID:item.properties.orderID,
            price: item.properties.price,
            shippingMethod: item.properties.shippingMethod
        };
        result.push(extractedData);
    });
    //console.log('extractOrderData result:', result); 
    console.log(result);
    return result;
  } catch (error) {
    console.error('Error parsing JSON data:', error);
    return result;
  }
}

// addUser('8967', 'john black', '+491234567', 'Berlin Germany');

// addPizzaOrderedEvent('8967', '2024-10-22', 'Medium eggplant pizza with sausages and AI sauce', 13, 'Delivery');

// getEvents('8967');

// getProfile('8967');

module.exports = {
  addUser,
  addPizzaOrderedEvent,
  getProfile,
  getEvents
};