var _extends=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e},_typeof="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e};!function(e,t){"object"===("undefined"==typeof exports?"undefined":_typeof(exports))&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.LazyLoad=t()}(this,function(){"use strict";var e=function(e){var t={elements_selector:"img",container:document,threshold:300,data_src:"src",data_srcset:"srcset",class_loading:"loading",class_loaded:"loaded",class_error:"error",callback_load:null,callback_error:null,callback_set:null,callback_enter:null};return _extends({},t,e)},t=function(e,t){return e.getAttribute("data-"+t)},n=function(e,t,n){return e.setAttribute("data-"+t,n)},r=function(e){return e.filter(function(e){return!t(e,"was-processed")})},s=function(e,t){var n,r=new e(t);try{n=new CustomEvent("LazyLoad::Initialized",{detail:{instance:r}})}catch(e){(n=document.createEvent("CustomEvent")).initCustomEvent("LazyLoad::Initialized",!1,!1,{instance:r})}window.dispatchEvent(n)},o=function(e,n){var r=n.data_srcset,s=e.parentNode;if(s&&"PICTURE"===s.tagName)for(var o,a=0;o=s.children[a];a+=1)if("SOURCE"===o.tagName){var i=t(o,r);i&&o.setAttribute("srcset",i)}},a=function(e,n){var r=n.data_src,s=n.data_srcset,a=e.tagName,i=t(e,r);if("IMG"===a){o(e,n);var c=t(e,s);return c&&e.setAttribute("srcset",c),void(i&&e.setAttribute("src",i))}"IFRAME"!==a?i&&(e.style.backgroundImage='url("'+i+'")'):i&&e.setAttribute("src",i)},i="undefined"!=typeof window,c=i&&"IntersectionObserver"in window,l=i&&"classList"in document.createElement("p"),u=function(e,t){l?e.classList.add(t):e.className+=(e.className?" ":"")+t},d=function(e,t){l?e.classList.remove(t):e.className=e.className.replace(new RegExp("(^|\\s+)"+t+"(\\s+|$)")," ").replace(/^\s+/,"").replace(/\s+$/,"")},f=function(e,t){e&&e(t)},_=function(e,t,n){e.removeEventListener("load",t),e.removeEventListener("error",n)},v=function(e,t){var n=function n(s){m(s,!0,t),_(e,n,r)},r=function r(s){m(s,!1,t),_(e,n,r)};e.addEventListener("load",n),e.addEventListener("error",r)},m=function(e,t,n){var r=e.target;d(r,n.class_loading),u(r,t?n.class_loaded:n.class_error),f(t?n.callback_load:n.callback_error,r)},b=function(e,t){f(t.callback_enter,e),["IMG","IFRAME"].indexOf(e.tagName)>-1&&(v(e,t),u(e,t.class_loading)),a(e,t),n(e,"was-processed",!0),f(t.callback_set,e)},p=function(e){return e.isIntersecting||e.intersectionRatio>0},h=function(t,n){this._settings=e(t),this._setObserver(),this.update(n)};h.prototype={_setObserver:function(){var e=this;if(c){var t=this._settings,n={root:t.container===document?null:t.container,rootMargin:t.threshold+"px"};this._observer=new IntersectionObserver(function(t){t.forEach(function(t){if(p(t)){var n=t.target;b(n,e._settings),e._observer.unobserve(n)}}),e._elements=r(e._elements)},n)}},update:function(e){var t=this,n=this._settings,s=e||n.container.querySelectorAll(n.elements_selector);this._elements=r(Array.prototype.slice.call(s)),this._observer?this._elements.forEach(function(e){t._observer.observe(e)}):(this._elements.forEach(function(e){b(e,n)}),this._elements=r(this._elements))},destroy:function(){var e=this;this._observer&&(r(this._elements).forEach(function(t){e._observer.unobserve(t)}),this._observer=null),this._elements=null,this._settings=null}};var y=window.lazyLoadOptions;return i&&y&&function(e,t){if(t.length)for(var n,r=0;n=t[r];r+=1)s(e,n);else s(e,t)}(h,y),h});

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
})
.catch(function () {
console.log('Service worker registration failed!');
});
} else {
console.log('Service worker is not supported in this browser');
}


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
updateRestaurants();
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
initMap = () => {
let loc = {
lat: 40.722216,
lng: -73.987501
};
self.map = new google.maps.Map(document.getElementById('map'), {
zoom: 12,
center: loc,
scrollwheel: false
});
fillRestaurantsHTML();
new LazyLoad();
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
image.className = 'restaurant-img';
image.setAttribute('data-src', DBHelper.smallImageUrlForRestaurant(restaurant));
image.setAttribute('data-srcset', DBHelper.imageUrlForRestaurant(restaurant) + ' 800w, ' + DBHelper.smallImageUrlForRestaurant(restaurant) + ' 250w');
image.sizes = "(max-width:1280px) 100vw, (min-width: 1281px) 20vw";
image.alt = restaurant.cuisine_type + "food served at " + restaurant.name;



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
more.setAttribute("tabindex", "0")
more.setAttribute('aria-label', 'View details about ' + restaurant.cuisine_type + ' restaurant called ' + restaurant.name + ' located in ' + restaurant.neighborhood)
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

document.onreadystatechange = function () {
if (document.readyState === "interactive") {
setTimeout(() => {
new LazyLoad()
}, 500);

}
}

document.getElementById('showMap').addEventListener('click', () => {
initMap()
document.getElementById('showMap').style.display = "none";
document.getElementById('map-container').style.display = "block";
})
