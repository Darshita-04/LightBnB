//const properties = require("./json/properties.json");
const users = require("./json/users.json");


const { Pool } = require("pg");

const pool = new Pool({
  user: "development",
  password: "development",
  host: "localhost",
  database: "lightbnb",
});



/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {

  return pool
  .query(`SELECT * FROM users WHERE email = $1;`,[`${email}`])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    return Promise.reject(err);
  });
  // let resolvedUser = null;
  // for (const userId in users) {
  //   const user = users[userId];
  //   if (user && user.email.toLowerCase() === email.toLowerCase()) {
  //     resolvedUser = user;
  //   }
  // }
  // return Promise.resolve(resolvedUser);
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  // return Promise.resolve(users[id]);
  return pool
  .query(`SELECT * FROM users WHERE id = $1;`,[id])
  .then((result) => {
    return result.rows[0];
  })
  .catch((err) => {
    return Promise.reject(err);
  });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  // const userId = Object.keys(users).length + 1;
  // user.id = userId;
  // users[userId] = user;
  // return Promise.resolve(user);


  return pool
  .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *;`,[user.name, user.email, user.password])
  .then((result) => {
    console.log(result.rows);
    return result.rows[0];
  })
  .catch((err) => {
    return Promise.reject(err);
  });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  //return getAllProperties(null, 2);
  return pool
  .query(`SELECT reservations.id, 
    properties.title, 
    properties.cover_photo_url,
    properties.thumbnail_photo_url,
    properties.parking_spaces, 
    properties.number_of_bathrooms,
    properties.number_of_bedrooms, 
    properties.cost_per_night, 
    reservations.start_date, 
    reservations.end_date, 
    avg(rating) as average_rating
    FROM reservations
    JOIN properties ON reservations.property_id = properties.id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1 AND reservations.end_date < now()::date
    GROUP BY reservations.id, properties.id
    ORDER BY reservations.start_date
    LIMIT $2;`,[guest_id, limit])
  .then((result) => {
    console.log(result.rows);
    return result.rows;
  })
  .catch((err) => {
    return Promise.reject(err);
  });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = function (options, limit = 10) {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE 1 = 1 `;

  // 3
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `AND city LIKE $${queryParams.length} `;
  }
  // owner_id
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `AND properties.owner_id = $${queryParams.length} `;
  }
  // minimum_price_per_night
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night*100);
    queryString += `AND cost_per_night >= $${queryParams.length} `;
  }
  // maximum_price_per_night
  if (options.maximum_price_per_night) {    
    queryParams.push(options.maximum_price_per_night*100);
    queryString += `AND cost_per_night <= $${queryParams.length} `;
  }

  queryString += `GROUP BY properties.id `;

  // minimum_rating 
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
  }
   
  // 4
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows).catch((err) => { return Promise.reject(err); });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  // const propertyId = Object.keys(properties).length + 1;
  // property.id = propertyId;
  // properties[propertyId] = property;
  // return Promise.resolve(property);
  const queryString = `INSERT INTO properties 
                (title, 
                description, 
                owner_id, 
                cover_photo_url, 
                thumbnail_photo_url, 
                cost_per_night, 
                parking_spaces, 
                number_of_bathrooms, 
                number_of_bedrooms,  
                province, 
                city, 
                country, 
                street, 
                post_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14 ) RETURNING *;`;

  queryParams = [property.title,
    property.description,
    property.owner_id,
    property.cover_photo_url,
    property.thumbnail_photo_url,
    property.cost_per_night,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
    property.province,
    property.city,
    property.country,
    property.street,
    property.post_code]

    return pool.query(queryString, queryParams).then((res) => res.rows[0]).catch((err) => { return Promise.reject(err); });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
