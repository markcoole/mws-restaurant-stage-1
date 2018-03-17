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
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Tidy up - Open IndexedDB
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
    .then(function(db) {
      const tx = db.transaction('keyval', 'readwrite');
      var store = tx.objectStore('keyval');
      console.log(data);
      for (let i=0; i<data.length; i++) {
        store.put(data[i]);
      }
      return tx.complete;
    });
  }

  /**
   * Read from indexedDB
   */
  static readDB() {
    return DBHelper.openIDB()
    .then(function(db) {
      const tx = db.transaction('keyval');
      const store = tx.objectStore('keyval');

      return store.getAll();
    })
  }

  /**
   * Fetch from server
   */
  static fetchFromServer(bool) {
    if (bool) {
      return fetch(DBHelper.DATABASE_URL)
      .then(function (response) {  
        const json = response.json();
        return json;
      }).then(function(data) {
        DBHelper.insertDB(data);
        return data;
      })
    }
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    DBHelper.readDB()
    .then(function(data) {
      console.log(data);
      if (data.length == 0) {
        return DBHelper.fetchFromServer(true);
      }
      return Promise.resolve(data);
    })
    .then(function(restaurants) {
      console.log(restaurants);
      callback(null, restaurants);
    })
    .catch(function (err) {
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

let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', 'Restaurant address.')

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img js-lazy-image'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = "Image of " + restaurant.name;

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  hours.setAttribute('aria-label', 'Restaurant opening hours.')
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const div = document.createElement('div');
  div.className = "name-date";
  div.setAttribute('aria-label', 'Reviewer name');

  const name = document.createElement('p');
  name.className = "name";
  name.innerHTML = review.name;

  //li.appendChild(name);

  const date = document.createElement('p');
  date.className = "date";
  date.setAttribute('aria-label', 'Review date');
  date.innerHTML = review.date;

  div.appendChild(name)
  div.appendChild(date);
  li.appendChild(div);

  const divp = document.createElement('div');
  divp.className = "content";

  const rating = document.createElement('p');
  rating.className = "rating";
  rating.setAttribute('aria-label', 'Review rating');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating)

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;

  divp.appendChild(comments);
  li.appendChild(divp);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.setAttribute('aria-current', 'page');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
