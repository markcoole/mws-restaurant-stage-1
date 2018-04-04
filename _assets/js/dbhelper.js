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
   * Reviews URL.
   */
  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/reviews`;
  } 

  /**
   * Open IndexedDB
   */
  static openIDB() {
    return idb.open('restaurantInfo', 1, function(upgradeDB) {
      if (!upgradeDB.objectStoreNames.contains('restaurants')) {
      var store = upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      });
    }
      if (!upgradeDB.objectStoreNames.contains('reviews')) {
        var store = upgradeDB.createObjectStore('reviews', {
          keyPath: 'id'
        });
    }
    });
  }

  /**
   * Insert data into indexedDB
   */
  static insertDB(data, t, o) {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction(t, 'readwrite');
      var store = tx.objectStore(o);
      for (let restaurant of data) {
        store.put(restaurant);
      }
      return tx.complete;
    });
  }

  /**
   * Read from indexedDB
   */
  static readDB(t, o) {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction(t);
      const store = tx.objectStore(o);
      return store.getAll();
    })
  }

  /**
   * Fetch from server
   */
  static fetchFromServer(t, o, url) {
    return fetch(url)
    .then(response => {  
      const json = response.json();
      return json;
    }).then(data => {
      DBHelper.insertDB(data, t, o);
      return data;
    })
  }
  /**
   * Fetch all restaurants. 
   * Read the DB then if none fetch from server
   */
  static fetchRestaurants(callback) {
    DBHelper.readDB('restaurants', 'restaurants')
    .then(data => {
      if (data.length == 0) {
        return DBHelper.fetchFromServer('restaurants', 'restaurants', DBHelper.DATABASE_URL);
      }
      return Promise.resolve(data);
    })
    .then(restaurants => {
      callback(null, restaurants);
    })
    .catch(err => {
      console.log(`ERROR DB: ${err.status}`);
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

  /**
   * Fetch a restaurants reviews by its ID.
   */
  static fetchReviewsById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchReviews((error, reviews) => {
      if (error) {
        callback(error, null);
      } else {
        let review = []; 
        for(let i = 0; i < reviews.length; i++) 
        {
          if(reviews[i].restaurant_id == id) {
            review.push(reviews[i])
          }
        }       
        if (review) { // Got the restaurant
          callback(null, review);
        } else { // review does not exist in the database
          callback('Review does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch all Reviews. 
   * Read the DB then if none fetch from server
   */
  static fetchReviews(callback) {
    DBHelper.readDB('reviews', 'reviews')
    .then(data => {
      if (data.length == 0) {
        return DBHelper.fetchFromServer('reviews', 'reviews', DBHelper.REVIEWS_URL);
      }
      return Promise.resolve(data);
    })
    .then(reviews => {
      callback(null, reviews);
    })
    .catch(err => {
      console.log(`ERROR DB: ${err.status}`);
      callback(error, null);
    });
  }

  /**
   * Add review
   */
  static addReview() {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');
      var item = {
      "id": 1,
      "restaurant_id": 1,
      "name": "Steve",
      "createdAt": 1504095567183,
      "updatedAt": 1504095567183,
      "rating": 4,
      "comments": "the best again"
      };
      store.put(item);
      return tx.complete;
    });
      
  }

}

