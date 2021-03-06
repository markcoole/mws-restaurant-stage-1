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
          autoIncrement : true
        });
    }
    if (!upgradeDB.objectStoreNames.contains('offlineReviews')) {
      var store = upgradeDB.createObjectStore('offlineReviews', {
        autoIncrement : true
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
   * Clear all from indexedDB
   */
  static clearDB(t, o) {
    return DBHelper.openIDB()
    .then(db => {
      const tx = db.transaction(t,'readwrite');
      const store = tx.objectStore(o);
      return store.clear();
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
   * Add Server review
   */
  static addServerReview() {
    DBHelper.readDB('offlineReviews', 'offlineReviews').then(data => 
    {
      console.log('step 1')
      return Promise.all(data.map(function(data){
        console.log('step 2')
        return fetch(
        DBHelper.REVIEWS_URL, {
          method: 'post',
          mode: 'cors',
          redirect: 'follow',
          headers: {
          "Content-type": "application/json"
        },
        body: JSON.stringify(data)
        })
        .catch((err) => {
          console.log('step 5')
          return Promise.reject(err);
        })
        .then((response) => 
        { 
          console.log('step 3')
          console.log(response)
          DBHelper.clearDB('offlineReviews', 'offlineReviews').then(() => {
            console.log("Offline Reviews cleared!")
          })
        }) 
    }))
  })
}

  /**
   * Add Offline review
   */
  static addOfflineReview(item) {
    /* handle response */
    DBHelper.openIDB().then(db => {
      const oltx = db.transaction('offlineReviews', 'readwrite');
      var olstore = oltx.objectStore('offlineReviews');
      olstore.put(item);

      const tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');
      store.put(item);
      rebuildReviews();
    });
  }

  /**
   * Toggle Favourite
   */
  static toggleFavourite() {
    let fav = document.getElementById("restaurant-favourite");
    const id = getParameterByName('id');
    if(fav.classList.contains('is-favourite')) {
      fav.className = "not-favourite";
      fav.innerText = "Like";
      fav = false;
    }
    else {
      fav.className = "is-favourite";
      fav.innerText = "Unlike";
      fav = true;
    }
    
    var item = {
      "is_favorite": fav
    };

    var req = new Request( DBHelper.DATABASE_URL + "/ " + id + "/", {
      method: 'post',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        "Content-type": "application/json"
      },
      body: JSON.stringify(item)
    });

// Use request as first parameter to fetch method
  fetch(req)
    .then(() => { 
    /* handle response */
    return DBHelper.openIDB()
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        var store = tx.objectStore('restaurants');
        return store.get(parseInt(id));
      }).then(function(data) {
        data.is_favorite = fav;
        return DBHelper.openIDB()
        .then(db => {
          const tx = db.transaction('restaurants', 'readwrite');
          var store = tx.objectStore('restaurants');
          store.put(data)
          return tx.complete;
        });
      });
    });
  }
}

