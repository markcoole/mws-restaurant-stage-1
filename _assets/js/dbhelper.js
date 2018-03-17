//Register service worker
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('/sw.js').then(function() {
    console.log('Service worker succssfully registered!');
  })
  .catch(function () {
    console.log('Service worker registration failed!');
  });
} else {
  console.log('Service worker is not supported in this browser');
}

/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Open IndexedDB
   */
  static openIDB() {
    return idb.open('restaurants', 1, function(upgradeDB) {
      var store = upgradeDB.createObjectStore('keyval', {
        keyPath: 'id'
      });
    });
  }

  /**
   * Insert data into indexedDB
   */
  static insertDB(data) {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction('keyval', 'readwrite');
      var store = tx.objectStore('keyval');
      console.log(data);
      for (let restaurant of data) {
        store.put(restaurant);
      }
      return tx.complete;
    });
  }

  /**
   * Read from indexedDB
   */
  static readDB() {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction('keyval');
      const store = tx.objectStore('keyval');
      return store.getAll();
    })
  }

  /**
   * Fetch from server
   */
  static fetchFromServer() {
    return fetch(DBHelper.DATABASE_URL)
    .then(response => {  
      const json = response.json();
      return json;
    }).then(data => {
      DBHelper.insertDB(data);
      return data;
    })
  }

  /**
   * Fetch all restaurants. 
   * Read the DB then if none fetch from server
   */
  static fetchRestaurants(callback) {
    DBHelper.readDB()
    .then(data => {
      console.log(data);
      if (data.length == 0) {
        return DBHelper.fetchFromServer();
      }
      return Promise.resolve(data);
    })
    .then(restaurants => {
      console.log(restaurants);
      callback(null, restaurants);
    })
    .catch(err => {
      const error = `Request failed. Returned status of ${err.status}`;
      console.log('ERROR DB: ' + err);
      callback(error, null);
    });
  }


  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if(restaurant.photograph === undefined)
    {
      return (`/img/image-placeholder.webp`);
    }
    else 
    {
      return (`/img/${restaurant.photograph}.webp`);
    }
  }

  /**
   * Small restaurant image URL.
   */
  static smallImageUrlForRestaurant(restaurant) {
    if(restaurant.photograph === undefined)
    {
      return (`/img/image-placeholder.webp`);
    }
    else 
    {
      return (`/img/${restaurant.photograph}-250px.webp`);
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
