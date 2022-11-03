/**
 * Mapty app for recording workouts...
 * Implemented by using OOP (focus on OOP)..
 * @author Ramy Sapry
 * @todo 1) Iplement the ability to edit workout.
 * @todo 2) Iplement the ability to sort workout.
 * @todo 3) Rebuild running and cycling objects that coming from local storage.
 */
"use strict";

// SELECTION
const workouts = document.querySelector(".workouts");
const geoErrorPopup = document.querySelector(".popup");
const popupInfo = document.querySelector(".popup__info");
const loading = document.querySelector(".loading");
const overlay = document.querySelector(".overlay");
const closeGeoPopup = document.querySelector(".span");
const textError = document.querySelector(".popup p");
const asideHeader = document.querySelector(".aside__header");
const workoutForm = document.querySelector(".workout__form");
const select = document.querySelector(".select__type");
const distanceInput = document.querySelector(".input__distance");
const durationInput = document.querySelector(".input__duration");
const cadence = document.querySelector(".cadence");
const cadenceInput = document.querySelector(".input__cadence");
const elevation = document.querySelector(".elvation");
const elevationInput = document.querySelector(".input__elvation");
const clearAllWorkouts = document.querySelector(".clear-all");

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Parent class for both running and cycling workouts..
 * @class Workouts parent
 */
class Workout {
  _id = Date.now().toString().slice(-10);
  _date = new Date();

  constructor(
    pointLine,
    coords,
    distance,
    duration,
    icon,
    iconUrl,
    city,
    cityCode
  ) {
    this.pointLine = pointLine;
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
    this.icon = icon;
    this.iconUrl = iconUrl;
    this.city = city;
    this.cityCode = cityCode;
  }

  _setDescription() {
    const locale = navigator.language;
    const option = {
      day: "numeric",
      month: "long",
    };
    const dateFormat = new Intl.DateTimeFormat(locale, option).format(
      this._date
    );

    this.description = `${this.type} on ${dateFormat}`;
  }
}

// 1) child => running workout
class Running extends Workout {
  type = "Running";

  constructor(
    pointLine,
    coords,
    distance,
    duration,
    icon,
    iconUrl,
    city,
    cityCode,
    cadence
  ) {
    super(pointLine, coords, distance, duration, icon, iconUrl, city, cityCode);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

// 2) child => cycling workout
class Cycling extends Workout {
  type = "Cycling";

  constructor(
    pointLine,
    coords,
    distance,
    duration,
    icon,
    iconUrl,
    city,
    cityCode,
    elevation
  ) {
    super(pointLine, coords, distance, duration, icon, iconUrl, city, cityCode);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
  }
}

/**
 * Main class that contain all functionality of the application..
 * @class Main class
 * @author Ramy Sapry
 */
class App {
  // main data
  #workouts = [];
  #map;
  #zoomLevel = 12;
  #coords = [];

  // weather and city data (API)
  #icon;
  #iconUrl;
  #iconImg;
  #city;
  #cityCode;
  #key = `da7f71fd5ec676bb6e2741765ed66748`;

  // data for line on map
  #linePointA;
  #linePointB;
  #pointList; // start and end point

  constructor() {
    // Functions that will excute on page load + Event handler
    this._loadMap(this._getPosition());
    this._getWorkoutsFromLocal();
    select.addEventListener("change", this._changeType);
    workoutForm.addEventListener("submit", this._submitForm.bind(this));
    workouts.addEventListener("click", this._displayPopupInfo.bind(this));
    workouts.addEventListener("click", this._moveToWorkout.bind(this));
    workouts.addEventListener("click", this._removeWorkout.bind(this));
    asideHeader.addEventListener("click", this._clearAllWorkouts);
    overlay.addEventListener("click", this._hiddenOverlayAndInfo);
    window.addEventListener("keydown", (e) =>
      e.key === "Escape" ? this._hiddenOverlayAndInfo() : ""
    );
  }

  _getPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }

  /**
   * @param {Object} position take position and show map on page at that position
   * @this {Object} App class
   */
  async _loadMap(position) {
    try {
      // get position
      const pos = await position;
      const { latitude: lat, longitude: long } = pos.coords;

      // display map rely on current position
      this.#map = L.map("map").setView([lat, long], this.#zoomLevel);
      L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(this.#map);

      // display circle on your current position
      this._circleOnCurrentPosition(lat, long);

      // display form when click on map
      this.#map.on("click", this._displayFrom.bind(this));

      // display marker on each workout in array (when get from local storage)
      this.#workouts.forEach((work) => this._renderMarker(work));

      // display weather and city name (when get from local storage)
      this.#workouts.forEach((work) => {
        this._addWeather(work.coords);
        this._addCityName(work.coords);
      });

      // display line between current position and the new workout (when get from local Storage)
      this.#workouts.forEach((work) => {
        // redefiend start point coords in localStorage when get it.
        // to avoid appearing in different place when get it.
        work.pointLine[0].lat = lat;
        work.pointLine[0].lng = long;
        this._lineToWorkout(work.pointLine, work);
      });
    } catch (err) {
      // when user block access to location
      this._popup(
        "Sorry, can not found your location, please allow us to access to it."
      );
    }
  }

  //////// HELPER METHOD ////////
  _popup(txt) {
    geoErrorPopup.classList.remove("hidden");
    overlay.classList.remove("hidden");
    textError.textContent = txt;
    closeGeoPopup.addEventListener("click", () => {
      geoErrorPopup.classList.add("hidden");
      overlay.classList.add("hidden");
      distanceInput.focus();
    });
  }

  _displayFrom(map) {
    this.#coords = []; // clear coords before adding new coords
    workoutForm.classList.remove("hidden__form");
    distanceInput.focus();

    // add new coords when user click on map
    const { lat, lng } = map.latlng;
    this.#coords.push(lat, lng);
    this.#linePointB = new L.LatLng(lat, lng); // line end point
    this.#pointList = [this.#linePointA, this.#linePointB]; // start and end point

    workoutForm.scrollIntoView({ behavior: "smooth" }); // move to form in phone
  }

  _displayPopupInfo(e) {
    const infoBtn = e.target.closest(".info");
    if (!infoBtn) return;
    const parent = infoBtn.parentElement;
    const parentId = parent.dataset.id;
    const workoutTarget = this.#workouts.find((work) => parentId === work._id);

    // get city info from api rely on city code that in local storage
    this._addCityInfo(workoutTarget.cityCode);

    // dispaly popup information
    popupInfo.classList.remove("hidden");
    overlay.classList.remove("hidden");

    // close popup information
    popupInfo.addEventListener("click", (e) => {
      const closeInfo = e.target.closest(".span");
      if (!closeInfo) return;
      this._hiddenOverlayAndInfo();
    });
  }

  _displayClearBtn() {
    clearAllWorkouts.classList.remove("hidden");
    asideHeader.classList.add("flex");
  }

  _emptyFormInputs() {
    distanceInput.value =
      durationInput.value =
      cadenceInput.value =
      elevationInput.value =
        "";
  }

  _changeType() {
    cadence.classList.toggle("hidden");
    elevation.classList.toggle("hidden");
  }

  _hiddenForm() {
    workoutForm.style.display = "none";
    workoutForm.classList.add("hidden__form");
    setTimeout(() => (workoutForm.style.display = "grid"), 1000);
  }

  _hiddenOverlayAndInfo() {
    geoErrorPopup.classList.add("hidden");
    popupInfo.classList.add("hidden");
    overlay.classList.add("hidden");
  }

  _emojiWorkout(workout) {
    return workout.type === "Running" ? "🏃‍♂️" : "🚴";
  }
  //////// HELPER METHOD ////////

  //////// MAIN METHOD ////////
  async _submitForm(e) {
    try {
      e.preventDefault();

      loading.classList.remove("hidden"); // display spinner untill get data
      // first add weather and city name (to get city and weather from api before the workouts use this data)
      await Promise.all([
        this._addWeather(this.#coords),
        this._addCityName(this.#coords),
      ]);
      await this._addCityInfo(this.#cityCode);

      // get data from form
      const distance = +distanceInput.value;
      const duration = +durationInput.value;
      let workout;

      const checkForNumber = (...inputs) =>
        inputs.every((inp) => Number.isFinite(inp));
      const checkForPositive = (...inputs) => inputs.every((inp) => inp > 0);

      // running
      if (select.value === "Running") {
        const cadence = +cadenceInput.value;

        if (
          !checkForNumber(distance, duration, cadence) ||
          !checkForPositive(distance, duration, cadence)
        )
          return this._popup("Inputs have to be positive numbers!");

        workout = new Running(
          this.#pointList,
          this.#coords,
          distance,
          duration,
          this.#icon,
          this.#iconUrl,
          this.#city,
          this.#cityCode,
          cadence
        );
      }

      // cycling
      if (select.value === "Cycling") {
        const elevation = +elevationInput.value;

        if (
          !checkForNumber(distance, duration, elevation) ||
          !checkForPositive(distance, duration)
        )
          return this._popup("Inputs have to be positive numbers!");

        workout = new Cycling(
          this.#pointList,
          this.#coords,
          distance,
          duration,
          this.#icon,
          this.#iconUrl,
          this.#city,
          this.#cityCode,
          elevation
        );
      }
      // push new workout to workout list
      this.#workouts.push(workout);

      // render workout in page
      this._renderWorkout(workout);

      // render marker and tooltip on map
      this._renderMarker(workout);

      // render line on map to workout
      this._lineToWorkout(this.#pointList, workout);

      // add (render) workout to localStorage
      this._addToLocalStorage(this.#workouts);

      // emty inputs value
      this._emptyFormInputs();

      // hidde form
      this._hiddenForm();

      // display clear btn and add effect to asideHeader
      this._displayClearBtn();
    } catch (err) {
      this._popup(`💥💥 ${err.message}`);
    } finally {
      loading.classList.add("hidden"); // hidden spinner after get data
    }
  }
  //////// MAIN METHOD ////////

  //////// WORKOUTS MANIPULATING ////////
  _renderWorkout(workout) {
    this.#iconImg = `<img class="icon" src="${workout.iconUrl}" alt="Icon">`;

    const checkType = workout.type === "Running" ? "#00c46a" : "#ffb545";
    const paceOrSpeed =
      workout.type === "Running"
        ? workout.pace.toFixed(1) + ` <span>MIN/KM</span>`
        : workout.speed.toFixed(1) + ` <span>KM/H</span>`;

    const cadenceOrElevation =
      workout.type === "Running"
        ? `🦶🏼 ` + workout.cadence + ` <span>SPM</span>`
        : `⛰ ` + workout.elevation + ` <span>M</span>`;

    const html = `
    <li class="${workout.type.toLowerCase()} workout" data-id=${workout._id}>
      <span style= "background-color: ${checkType}" class="info c-flex" title="Info">!</span>
      <span style= "background-color: ${checkType}" class="close__workout">X</span>
      <h3 class="workout__type">
        <span class="workout__date">
          ${workout.description} - ${workout.city} ${this.#iconImg}
        </span>
      </h3>
      <div class="workout__list flex">
        <p> 
          ${this._emojiWorkout(workout)} ${workout.distance} <span>KM</span>
        </p>
        <p>⏱️ ${workout.duration} <span>MIN</span></p>
        <p>⚡ ${paceOrSpeed} </p>
        <p>${cadenceOrElevation} </p>
      </div>
    </li>`;

    // add workout in the page
    workoutForm.insertAdjacentHTML("afterend", html);
  }

  _moveToWorkout(e) {
    const workout = e.target.closest(".workout");
    if (
      !workout ||
      e.target.closest(".close__workout") ||
      e.target.closest(".info")
    )
      return;

    const workoutId = workout.dataset.id;

    // find workout by id to get coords from there
    const findWorkout = this.#workouts.find((work) => workoutId === work._id);
    if (!this.#map) return;

    // move to coords view on map
    this.#map.setView(findWorkout.coords, this.#zoomLevel, {
      animation: true,
      pan: { duration: 1 },
    });
  }

  _removeWorkout(e) {
    const closeWorkout = e.target.closest(".close__workout");
    if (!closeWorkout) return;
    // parent Element
    const parent = closeWorkout.parentElement;
    const parentId = parent.dataset.id;
    parent.remove();

    const getFromLocal = JSON.parse(localStorage.getItem("workout"));
    if (!getFromLocal) return;

    // find workout index by id + remove it + re adding to local storage
    const findIndex = getFromLocal.findIndex(
      (workout) => parentId === workout._id
    );
    getFromLocal.splice(findIndex, 1);
    this._addToLocalStorage(getFromLocal);

    // reload page to render changes
    location.reload();
  }

  _clearAllWorkouts(e) {
    const btn = e.target.closest(".clear-all");
    if (!btn) return;

    // 1) remove all workouts from page
    workouts.innerHTML = "";

    // 2) remove all workouts from local storage
    localStorage.clear();

    // 3) reload page
    location.reload();
  }
  //////// WORKOUTS MANIPULATING ////////

  //////// THE RENDRING ON MAP ////////
  _renderMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 400,
          minWidth: 260,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type.toLowerCase()}__popup`,
        })
      )
      .setPopupContent(
        `${this._emojiWorkout(workout)} ${workout.description} ${this.#iconImg}`
      )
      .openPopup();
  }

  _circleOnCurrentPosition(lat, long) {
    L.circle([lat, long], {
      color: "#00c46a",
      stroke: false,
      fillOpacity: 0.4,
      radius: 2000,
    }).addTo(this.#map);
    this.#linePointA = new L.LatLng(lat, long); // line start point
  }

  _lineToWorkout(line, workout) {
    new L.Polyline(line, {
      color: `${workout.type === "Running" ? "#00c46a" : "#ffb545"}`,
      weight: 4,
      opacity: 0.7,
      fillOpacity: 0.1,
      smoothFactor: 1,
    }).addTo(this.#map);
  }
  //////// THE RENDRING ON MAP ////////

  //////// LOCAL STORAGE ////////
  _addToLocalStorage(workout) {
    localStorage.setItem("workout", JSON.stringify(workout));
  }

  _getWorkoutsFromLocal() {
    const getFromLocal = JSON.parse(localStorage.getItem("workout"));
    if (!getFromLocal) return;

    // display clear btn if there is workouts in local storage
    if (!getFromLocal || getFromLocal.length === 0) {
      clearAllWorkouts.classList.add("hidden");
      asideHeader.classList.remove("flex");
    } else {
      this._displayClearBtn();
    }

    this.#workouts = getFromLocal;
    this.#workouts.forEach((work) => this._renderWorkout(work));
  }
  //////// LOCAL STORAGE ////////

  //////// WEATHER AND CITY NAME API ////////
  async _getApi(url) {
    try {
      const api = await fetch(url);
      return await api.json();
    } catch (err) {
      throw err;
    }
  }

  async _addWeather(coords) {
    try {
      const data = await this._getApi(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords[0]}&lon=${
          coords[1]
        }&appid=${this.#key}`
      );

      this.#icon = data.weather[0].icon;
      this.#iconUrl = `http://openweathermap.org/img/w/${this.#icon}.png`;
    } catch (err) {
      this._popup(`💥💥 ${err.message}`);
    }
  }

  async _addCityName(coords) {
    try {
      const data = await this._getApi(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords[0]}&longitude=${coords[1]}`
      );

      this.#cityCode = data.countryCode;
      this.#city = data.locality;
    } catch (err) {
      this._popup(`💥💥 Cannot find city name, please try another location :)`);
    }
  }

  async _addCityInfo(cityCode) {
    try {
      popupInfo.innerHTML = ""; // empty popup info before adding another city data
      const data = await this._getApi(
        `https://restcountries.com/v3.1/alpha/${cityCode}`
      );

      // API DATA (Not allow to modifing)
      const cityInfo = Object.freeze({
        capital: data[0].capital[0],
        continent: data[0].continents[0],
        currSymbol: Object.entries(data[0].currencies)[0][1].symbol,
        flag: data[0].flags.png,
        language: Object.entries(data[0].languages)[0][1],
        name: data[0].name.common,
        population: (data[0].population / 1000000).toFixed(1),
      });

      const markup = `
      <span class="span">Close</span>
      <img src="${cityInfo.flag}" alt="flag" class="flag">
      <h2 class="name">${cityInfo.name}</h2>
      <ul class="data unlist">
        <li><span title="Capital">🌆</span> <span>${cityInfo.capital}</span></li>
        <li><span title="Continent">🗻</span> <span>${cityInfo.continent}</span></li>
        <li><span title="Language">🗣️</span> <span>${cityInfo.language}</span></li>
        <li><span title="Currency">💱</span> <span class="currSymbol">${cityInfo.currSymbol}</span></li>
        <li><span title="Population">👨‍👩🏻‍👧🏾‍👦🏽</span> <span>${cityInfo.population} M</span></li>
      </ul>
      `;

      popupInfo.insertAdjacentHTML("afterbegin", markup);
    } catch (err) {
      this._popup(
        `💥💥 Cannot find information about this city, please try another location :)`
      );
    }
  }
  //////// WEATHER AND CITY NAME API ////////
}

const user = new App();
