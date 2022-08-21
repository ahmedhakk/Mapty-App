'use strict';

class Workout {
    date = new Date();
    id = (Date.now() + '').slice(-10);
    clicks = 0;

    constructor(cooards, distance, duration) {
        // this.date = ...
        // this.id = ...

        this.cooards = cooards; // [latitude, longitude]
        this.distance = distance; // in Km
        this.duration = duration; // in min
    }

    _setDescription() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`; // this.date.getMonth() -> returns num from 0 to 11, date.getDate() -> returns the day
    }

    click() {
        this.clicks++;
    }
}

class Running extends Workout {
    type = 'running';

    constructor(cooards, distance, duration, cadence) {
        super(cooards, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}

class Cycling extends Workout {
    type = 'cycling';
    constructor(cooards, distance, duration, elevationGain) {
        super(cooards, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration) / 60;
        return this.speed;
    }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1);
// console.log(cycling1);

/* ========================================================= */
// Application Architecture
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App {
    // private instence properties
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];

    constructor() {
        // Get user's position
        this._getPosition(); // Once We make a new App the constructor loads - so the function excutes 

        // Get Data From Local Storage
        this._getLocalStorage();

        // Attach event handlers 
        form.addEventListener('submit', this._newWorkout.bind(this)); // because 'this' will refer to form , we want it to refer to the class
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    }

    _getPosition() {
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function () { // here _loadmap is called as a regular function call , in regular function call 'this' refers to undefined
                alert('Could not get your position');
            });
    }

    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        const coords = [latitude, longitude];
        // console.log(this); // undefined
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        // Handling Clicks on Map
        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(work => {
            this._renderWorkoutMarker(work);
        });
    }

    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm() {
        // Empty The Inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000);
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden'); // if it have it will delete the class 
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden'); // if it haven't the class it will add it
    }

    _newWorkout(e) {
        const validInput = (...inputs) => inputs.every(inp => Number.isFinite(inp));
        const allPositive = (...inputs) => inputs.every(inp => inp > 0);

        e.preventDefault();
        // == Get data from form == 
        const type = inputType.value;
        const distance = +inputDistance.value; // Number(inputDistance.value)
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;

        // == If workout activity running, create running object ==
        if (type === 'running') {
            const cadence = +inputCadence.value;
            // check data is valid
            /* Guard clause ? is we will check the opposite of what we are interested in 
            and if that opposite then we will return the function immediately */
            if (!validInput(distance, duration, cadence) || !allPositive(distance, duration, cadence))
                return alert('Inputs have to be positive number');
            workout = new Running([lat, lng], distance, duration, cadence);
        }

        // == If workout activity cycling, create cycling object ==
        if (type === 'cycling') {
            // check data is valid
            const elevation = +inputElevation.value;
            if (!validInput(distance, duration, elevation) || !allPositive(distance, duration))
                return alert('Inputs have to be positive number');
            workout = new Cycling([lat, lng], distance, duration, elevation);
        }

        // == Add new object to the workout array ==
        this.#workouts.push(workout);
        // console.log(workout);

        // == Render workout on map as pin marker ==
        this._renderWorkoutMarker(workout);

        // == Render workout on list ==
        this._renderWorkout(workout);

        // == Hide form + Clear input fields ==
        this._hideForm();

        // Set local Storage To All Workouts
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.cooards)
            .addTo(this.#map)
            .bindPopup(
                L.popup({
                    maxWidth: 250,
                    minWidth: 100,
                    autoClose: false,
                    closeOnClick: false,
                    className: `${workout.type}-popup`
                })
            )
            .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
            .openPopup();
    }

    _renderWorkout(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;
        if (workout.type === 'running') {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
        `;
        }

        if (workout.type === 'cycling') {
            html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
        `;
        }
        form.insertAdjacentHTML('afterend', html);
    }

    _moveToPopup(e) {
        const workoutEl = e.target.closest('.workout');
        // console.log(workoutEl);
        if (!workoutEl) return;

        const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
        // console.log(workout);

        // ** Make The Map Move Smoothly - Leaflet **
        // setView is a function in Leaflet
        // it needs => setView(cooards, zoom level);
        this.#map.setView(workout.cooards, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        });

        // using the public interface
        // workout.click();
    }

    _setLocalStorage() {
        // localStorage.setItem(key: string, value: string)
        // To Convert Any JS Object to a String - JSON.stringify()
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));
        // console.log(data);

        if (!data) return;

        this.#workouts = data;

        this.#workouts.forEach(work => {
            this._renderWorkout(work);
            // this._renderWorkoutMarker(work);
        });
    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}

const app = new App();