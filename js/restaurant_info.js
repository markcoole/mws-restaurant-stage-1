// 'use strict';

(function() {
function toArray(arr) {
return Array.prototype.slice.call(arr);
}

function promisifyRequest(request) {
return new Promise(function(resolve, reject) {
request.onsuccess = function() {
resolve(request.result);
};

request.onerror = function() {
reject(request.error);
};
});
}

function promisifyRequestCall(obj, method, args) {
var request;
var p = new Promise(function(resolve, reject) {
request = obj[method].apply(obj, args);
promisifyRequest(request).then(resolve, reject);
});

p.request = request;
return p;
}

function promisifyCursorRequestCall(obj, method, args) {
var p = promisifyRequestCall(obj, method, args);
return p.then(function(value) {
if (!value) return;
return new Cursor(value, p.request);
});
}

function proxyProperties(ProxyClass, targetProp, properties) {
properties.forEach(function(prop) {
Object.defineProperty(ProxyClass.prototype, prop, {
get: function() {
return this[targetProp][prop];
},
set: function(val) {
this[targetProp][prop] = val;
}
});
});
}

function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
properties.forEach(function(prop) {
if (!(prop in Constructor.prototype)) return;
ProxyClass.prototype[prop] = function() {
return promisifyRequestCall(this[targetProp], prop, arguments);
};
});
}

function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
properties.forEach(function(prop) {
if (!(prop in Constructor.prototype)) return;
ProxyClass.prototype[prop] = function() {
return this[targetProp][prop].apply(this[targetProp], arguments);
};
});
}

function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
properties.forEach(function(prop) {
if (!(prop in Constructor.prototype)) return;
ProxyClass.prototype[prop] = function() {
return promisifyCursorRequestCall(this[targetProp], prop, arguments);
};
});
}

function Index(index) {
this._index = index;
}

proxyProperties(Index, '_index', [
'name',
'keyPath',
'multiEntry',
'unique'
]);

proxyRequestMethods(Index, '_index', IDBIndex, [
'get',
'getKey',
'getAll',
'getAllKeys',
'count'
]);

proxyCursorRequestMethods(Index, '_index', IDBIndex, [
'openCursor',
'openKeyCursor'
]);

function Cursor(cursor, request) {
this._cursor = cursor;
this._request = request;
}

proxyProperties(Cursor, '_cursor', [
'direction',
'key',
'primaryKey',
'value'
]);

proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
'update',
'delete'
]);

// proxy 'next' methods
['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
if (!(methodName in IDBCursor.prototype)) return;
Cursor.prototype[methodName] = function() {
var cursor = this;
var args = arguments;
return Promise.resolve().then(function() {
cursor._cursor[methodName].apply(cursor._cursor, args);
return promisifyRequest(cursor._request).then(function(value) {
if (!value) return;
return new Cursor(value, cursor._request);
});
});
};
});

function ObjectStore(store) {
this._store = store;
}

ObjectStore.prototype.createIndex = function() {
return new Index(this._store.createIndex.apply(this._store, arguments));
};

ObjectStore.prototype.index = function() {
return new Index(this._store.index.apply(this._store, arguments));
};

proxyProperties(ObjectStore, '_store', [
'name',
'keyPath',
'indexNames',
'autoIncrement'
]);

proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
'put',
'add',
'delete',
'clear',
'get',
'getAll',
'getKey',
'getAllKeys',
'count'
]);

proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
'openCursor',
'openKeyCursor'
]);

proxyMethods(ObjectStore, '_store', IDBObjectStore, [
'deleteIndex'
]);

function Transaction(idbTransaction) {
this._tx = idbTransaction;
this.complete = new Promise(function(resolve, reject) {
idbTransaction.oncomplete = function() {
resolve();
};
idbTransaction.onerror = function() {
reject(idbTransaction.error);
};
idbTransaction.onabort = function() {
reject(idbTransaction.error);
};
});
}

Transaction.prototype.objectStore = function() {
return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
};

proxyProperties(Transaction, '_tx', [
'objectStoreNames',
'mode'
]);

proxyMethods(Transaction, '_tx', IDBTransaction, [
'abort'
]);

function UpgradeDB(db, oldVersion, transaction) {
this._db = db;
this.oldVersion = oldVersion;
this.transaction = new Transaction(transaction);
}

UpgradeDB.prototype.createObjectStore = function() {
return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
};

proxyProperties(UpgradeDB, '_db', [
'name',
'version',
'objectStoreNames'
]);

proxyMethods(UpgradeDB, '_db', IDBDatabase, [
'deleteObjectStore',
'close'
]);

function DB(db) {
this._db = db;
}

DB.prototype.transaction = function() {
return new Transaction(this._db.transaction.apply(this._db, arguments));
};

proxyProperties(DB, '_db', [
'name',
'version',
'objectStoreNames'
]);

proxyMethods(DB, '_db', IDBDatabase, [
'close'
]);

// Add cursor iterators
// TODO: remove this once browsers do the right thing with promises
['openCursor', 'openKeyCursor'].forEach(function(funcName) {
[ObjectStore, Index].forEach(function(Constructor) {
Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
var args = toArray(arguments);
var callback = args[args.length - 1];
var nativeObject = this._store || this._index;
var request = nativeObject[funcName].apply(nativeObject, args.slice(0, -1));
request.onsuccess = function() {
callback(request.result);
};
};
});
});

// polyfill getAll
[Index, ObjectStore].forEach(function(Constructor) {
if (Constructor.prototype.getAll) return;
Constructor.prototype.getAll = function(query, count) {
var instance = this;
var items = [];

return new Promise(function(resolve) {
instance.iterateCursor(query, function(cursor) {
if (!cursor) {
resolve(items);
return;
}
items.push(cursor.value);

if (count !== undefined && items.length == count) {
resolve(items);
return;
}
cursor.continue();
});
});
};
});

var exp = {
open: function(name, version, upgradeCallback) {
var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
var request = p.request;

request.onupgradeneeded = function(event) {
if (upgradeCallback) {
upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
}
};

return p.then(function(db) {
return new DB(db);
});
},
delete: function(name) {
return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
}
};

if (typeof module !== 'undefined') {
module.exports = exp;
module.exports.default = module.exports;
}
else {
self.idb = exp;
}
}());


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
