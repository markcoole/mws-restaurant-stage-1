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
      if (data.length == 0) {
        return DBHelper.fetchFromServer();
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

}

/*
 * Responsively Lazy
 * http://ivopetkov.com/b/lazy-load-responsive-images/
 * Copyright 2015-2017, Ivo Petkov
 * Free to use under the MIT license.
 */

var responsivelyLazy = typeof responsivelyLazy !== 'undefined' ? responsivelyLazy : (function () {

    var hasWebPSupport = false;
    var hasSrcSetSupport = false;
    var windowWidth = null;
    var windowHeight = null;
    var hasIntersectionObserverSupport = typeof IntersectionObserver !== 'undefined';
    var mutationObserverIsDisabled = false;
    var doneElements = []; // elements that should never be updated again

    var isVisible = function (element) {
        if (windowWidth === null) {
            return false;
        }
        var rect = element.getBoundingClientRect();
        var elementTop = rect.top;
        var elementLeft = rect.left;
        var elementWidth = rect.width;
        var elementHeight = rect.height;
        return elementTop < windowHeight && elementTop + elementHeight > 0 && elementLeft < windowWidth && elementLeft + elementWidth > 0;
    };

    var evalScripts = function (scripts, startIndex) {
        var scriptsCount = scripts.length;
        for (var i = startIndex; i < scriptsCount; i++) {
            var breakAfterThisScript = false;
            var script = scripts[i];
            var newScript = document.createElement('script');
            var type = script.getAttribute('type');
            if (type !== null) {
                newScript.setAttribute("type", type);
            }
            var src = script.getAttribute('src');
            if (src !== null) {
                newScript.setAttribute("src", src);
                if ((typeof script.async === 'undefined' || script.async === false) && i + 1 < scriptsCount) {
                    breakAfterThisScript = true;
                    newScript.addEventListener('load', function () {
                        evalScripts(scripts, i + 1);
                    });
                }
            }
            newScript.innerHTML = script.innerHTML;
            script.parentNode.insertBefore(newScript, script);
            script.parentNode.removeChild(script);
            if (breakAfterThisScript) {
                break;
            }
        }
    };

    var updateImage = function (container, element) {
        var options = element.getAttribute('data-srcset');
        if (options !== null) {
            options = options.trim();
            if (options.length > 0) {
                options = options.split(',');
                var temp = [];
                var optionsCount = options.length;
                for (var j = 0; j < optionsCount; j++) {
                    var option = options[j].trim();
                    if (option.length === 0) {
                        continue;
                    }
                    var spaceIndex = option.lastIndexOf(' ');
                    if (spaceIndex === -1) {
                        var optionImage = option;
                        var optionWidth = 999998;
                    } else {
                        var optionImage = option.substr(0, spaceIndex);
                        var optionWidth = parseInt(option.substr(spaceIndex + 1, option.length - spaceIndex - 2), 10);
                    }
                    var add = false;
                    if (optionImage.indexOf('.webp', optionImage.length - 5) !== -1) {
                        if (hasWebPSupport) {
                            add = true;
                        }
                    } else {
                        add = true;
                    }
                    if (add) {
                        temp.push([optionImage, optionWidth]);
                    }
                }
                temp.sort(function (a, b) {
                    if (a[1] < b[1]) {
                        return -1;
                    }
                    if (a[1] > b[1]) {
                        return 1;
                    }
                    if (a[1] === b[1]) {
                        if (b[0].indexOf('.webp', b[0].length - 5) !== -1) {
                            return 1;
                        }
                        if (a[0].indexOf('.webp', a[0].length - 5) !== -1) {
                            return -1;
                        }
                    }
                    return 0;
                });
                options = temp;
            } else {
                options = [];
            }
        } else {
            options = [];
        }
        var containerWidth = container.offsetWidth * (typeof window.devicePixelRatio !== 'undefined' ? window.devicePixelRatio : 1);

        var bestSelectedOption = null;
        var optionsCount = options.length;
        for (var j = 0; j < optionsCount; j++) {
            var optionData = options[j];
            if (optionData[1] >= containerWidth) {
                bestSelectedOption = optionData;
                break;
            }
        }

        if (bestSelectedOption === null) {
            bestSelectedOption = [element.getAttribute('src'), 999999];
        }

        if (typeof container.responsivelyLazyLastSetOption === 'undefined') {
            container.responsivelyLazyLastSetOption = ['', 0];
        }
        if (container.responsivelyLazyLastSetOption[1] < bestSelectedOption[1]) {
            container.responsivelyLazyLastSetOption = bestSelectedOption;
            var url = bestSelectedOption[0];
            if (typeof container.responsivelyLazyEventsAttached === 'undefined') {
                container.responsivelyLazyEventsAttached = true;
                element.addEventListener('load', function () {
                    var handler = container.getAttribute('data-onlazyload');
                    if (handler !== null) {
                        (new Function(handler).bind(container))();
                    }
                }, false);
                element.addEventListener('error', function () {
                    container.responsivelyLazyLastSetOption = ['', 0];
                }, false);
            }
            if (url === element.getAttribute('src')) {
                element.removeAttribute('srcset');
            } else {
                element.setAttribute('srcset', url);
            }
        }
    };

    var updateWindowSize = function () {
        windowWidth = window.innerWidth;
        windowHeight = window.innerHeight;
    };

    var updateElement = function (element) {

        if (doneElements.indexOf(element) !== -1) {
            return;
        }

        if (!isVisible(element)) {
            return;
        }

        var lazyContent = element.getAttribute('data-lazycontent');
        if (lazyContent !== null) {
            doneElements.push(element);
            mutationObserverIsDisabled = true;
            element.innerHTML = lazyContent;
            var scripts = element.querySelectorAll('script');
            if (scripts.length > 0) {
                evalScripts(scripts, 0);
            }
            mutationObserverIsDisabled = false;
            return;
        }

        if (hasSrcSetSupport) {
            if (element.tagName.toLowerCase() === 'img') { // image with unknown height
                updateImage(element, element);
                return;
            }

            var imageElement = element.querySelector('img');
            if (imageElement !== null) { // image with parent container
                updateImage(element, imageElement);
                return;
            }
        }

    };

    var run = function () {
        var elements = document.querySelectorAll('.responsively-lazy');
        var elementsCount = elements.length;
        for (var i = 0; i < elementsCount; i++) {
            updateElement(elements[i]);
        }
    };

    if (typeof window.addEventListener !== 'undefined' && typeof document.querySelectorAll !== 'undefined') {

        updateWindowSize();

        var image = new Image();
        image.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoCAAEADMDOJaQAA3AA/uuuAAA=';
        image.onload = image.onerror = function () {
            hasWebPSupport = image.width === 2;
            hasSrcSetSupport = 'srcset' in document.createElement('img');

            var requestAnimationFrameFunction = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };

            var hasChange = true;
            var runIfHasChange = function () {
                if (hasChange) {
                    hasChange = false;
                    run();
                }
                requestAnimationFrameFunction.call(null, runIfHasChange);
            };

            runIfHasChange();

            if (hasIntersectionObserverSupport) {

                var updateIntersectionObservers = function () {
                    var elements = document.querySelectorAll('.responsively-lazy');
                    var elementsCount = elements.length;
                    for (var i = 0; i < elementsCount; i++) {
                        var element = elements[i];
                        if (typeof element.responsivelyLazyObserverAttached === 'undefined') {
                            element.responsivelyLazyObserverAttached = true;
                            intersectionObserver.observe(element);
                        }
                    }
                };

                var intersectionObserver = new IntersectionObserver(function (entries) {
                    for (var i in entries) {
                        var entry = entries[i];
                        if (entry.intersectionRatio > 0) {
                            updateElement(entry.target);
                        }
                    }
                });

                var changeTimeout = null;

            }

            var setChanged = function () {
                if (hasIntersectionObserverSupport) {
                    window.clearTimeout(changeTimeout);
                    changeTimeout = window.setTimeout(function () {
                        hasChange = true;
                    }, 300);
                } else {
                    hasChange = true;
                }
            };

            var updateParentNodesScrollListeners = function () {
                var elements = document.querySelectorAll('.responsively-lazy');
                var elementsCount = elements.length;
                for (var i = 0; i < elementsCount; i++) {
                    var parentNode = elements[i].parentNode;
                    while (parentNode && parentNode.tagName.toLowerCase() !== 'html') {
                        if (typeof parentNode.responsivelyLazyScrollAttached === 'undefined') {
                            parentNode.responsivelyLazyScrollAttached = true;
                            parentNode.addEventListener('scroll', setChanged);
                        }
                        parentNode = parentNode.parentNode;
                    }
                }
            };

            var initialize = function () {
                window.addEventListener('resize', function () {
                    updateWindowSize();
                    setChanged();
                });
                window.addEventListener('scroll', setChanged);
                window.addEventListener('load', setChanged);
                if (hasIntersectionObserverSupport) {
                    updateIntersectionObservers();
                }
                updateParentNodesScrollListeners();
                if (typeof MutationObserver !== 'undefined') {
                    var observer = new MutationObserver(function () {
                        if (!mutationObserverIsDisabled) {
                            if (hasIntersectionObserverSupport) {
                                updateIntersectionObservers();
                            }
                            updateParentNodesScrollListeners();
                            setChanged();
                        }
                    });
                    observer.observe(document.querySelector('body'), {childList: true, subtree: true});
                }
            };
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initialize);
            } else {
                initialize();
            }
        };
    }

    return {
        'run': run,
        'isVisible': isVisible
    };

}());
let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  select.setAttribute('aria-label', 'Filter Neighborhoods')
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  select.setAttribute('aria-label', 'Filter Cuisines')
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  
  const image = document.createElement('img');
  image.className = 'restaurant-img responsively-lazy';
  image.src = DBHelper.smallImageUrlForRestaurant(restaurant);
  image.srcset = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  image.sizes = "(max-width:1280px) 100vw, (min-width: 1281px) 20vw";
  image.setAttribute('data-src', DBHelper.imageUrlForRestaurant(restaurant) + ' 800w, ' + DBHelper.smallImageUrlForRestaurant(restaurant) + ' 250w');
  image.alt = "Image of " + restaurant.name;
  


  // a.appendChild(image)
  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.setAttribute('aria-label', 'View Details about ' + restaurant.name)
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

document.addEventListener("DOMContentLoaded", function(event) {
  document.getElementById("first-load").innerHTML = "";
});
