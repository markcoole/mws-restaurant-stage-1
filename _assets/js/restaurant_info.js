//Register service worker
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('/sw.js').then(function(reg) {
    console.log('Service worker succssfully registered!');
    if ('sync' in reg) {
      // do stuff here
    let form = document.querySelector('.js-background-sync');
    let idField = document.getElementById('rvId');
    let idName = document.getElementById('rvName');
    let idRating = document.getElementById('rvRating');
    let idComment = document.getElementById('rvComment');

    form.addEventListener('submit', function(event) {
      event.preventDefault();
      var item = {
        "restaurant_id": parseInt(idField.value),
        "name": idName.value,
        "rating": parseInt(idRating.value),
        "comments": idComment.value,
        "createdAt": Date.now()
      };

      idName.value = "";
      idRating.selectedIndex = 0;
      idComment.value = "";

      DBHelper.addOfflineReview(item);
      return reg.sync.register(('offlineSync'));
    });
  }
  
  })
  .catch(function () {
    console.log('Service worker registration failed!');
  });
} else {
  console.log('Service worker is not supported in this browser');
}

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      fillBreadcrumb();
    }
  })
});

let restaurant;
let reviews;
var map;

/**
 * Initialize Google map, called from HTML.
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
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
  image.alt = restaurant.cuisine_type + " food at the " + restaurant.name + " restaurant.";

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  const favourite = document.getElementById('restaurant-favourite');
  if(restaurant.is_favorite) {
    favourite.className = "is-favourite";
    favourite.innerText = "Unlike";
  }
  else {
    favourite.className = "not-favourite";
    favourite.innerText = "Like";
  }

  const reviewId = document.getElementById('rvId');
  reviewId.value = restaurant.id;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }

  fetchReviewsFromURL()

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
fillReviewsHTML = (reviews = self.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  ul.innerHTML = "";
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Rebuild the reviews HTML
 */
rebuildReviews = (reviews = self.reviews) => {
  const id = getParameterByName('id');
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');

  DBHelper.fetchReviewsById(id, (error, reviews) => {
    self.reviews = reviews;
    ul.innerHTML = "";
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  })
}


/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('tabindex', '0');
  const div = document.createElement('div');
  div.className = "name-date";
  div.setAttribute('aria-label', 'Reviewer name');

  const name = document.createElement('p');
  name.className = "name";
  name.innerHTML = review.name;

  const date = document.createElement('p');
  date.className = "date";
  date.setAttribute('aria-label', 'Review date');
  let reviewDate = new Date(review.createdAt);
  date.innerHTML = reviewDate.toDateString();

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
fillBreadcrumb = (restaurant = self.restaurant) => {
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

/**
 * Get reviews for current restaurant from page URL.
 */
fetchReviewsFromURL = (callback) => {
  if (self.reviews) { // restaurant already fetched!
    callback(null, self.reviews)
    return
    };
  
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchReviewsById(id, (error, reviews) => {
      self.reviews = reviews;
      if (!reviews) {
        console.error(error);
        return;
      }

      // fill reviews
      fillReviewsHTML();
    });
  }
}

document.getElementById('showMap').addEventListener('click', () => {
  initMap()
  document.getElementById('showMap').style.display = "none";
  document.getElementById('map-container').style.display = "block";
})
