////////////////////////////////////////////////////////////////
// DATAMODEL.JS
// THIS IS YOUR "MODEL", IT INTERACTS WITH THE ROUTES ON YOUR
// SERVER TO FETCH AND SEND DATA.  IT DOES NOT INTERACT WITH
// THE VIEW (dashboard.html) OR THE CONTROLLER (dashboard.js)
// DIRECTLY.  IT IS A "MIDDLEMAN" BETWEEN THE SERVER AND THE
// CONTROLLER.  ALL IT DOES IS MANAGE DATA.
////////////////////////////////////////////////////////////////

const DataModel = (function () {
  // WE CAN STORE DATA HERE SO THAT WE DON'T HAVE TO FETCH IT
  // EVERY TIME WE NEED IT.  THIS IS CALLED "CACHING".
  // WE CAN ALSO STORE THINGS HERE TO MANAGE STATE, LIKE
  // WHEN THE USER SELECTS SOMETHING IN THE VIEW AND WE
  // NEED TO KEEP TRACK OF IT SO WE CAN USE THAT INFOMRATION
  // LATER.  RIGHT NOW, WE'RE JUST STORING THE JWT TOKEN
  // AND THE LIST OF USERS.
  let token = null;  // Holds the JWT token (optional local cache)
  let users = [];    // Holds the list of user emails

  // helper: always get a token (prefer local cache, else localStorage)
  function getToken() {
    return (
      token ||
      localStorage.getItem('jwtToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      ''
    );
  }

  // generic helpers for GET/POST with auth
  async function apiGet(path, params = {}) {
    const url = new URL(path, window.location.origin);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });

    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      throw new Error(`GET ${path} failed (${resp.status})`);
    }
    return resp.json();
  }

  async function apiPost(path, body = {}) {
    const resp = await fetch(path, {
      method: 'POST',
      headers: {
        'Authorization': getToken(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`POST ${path} failed (${resp.status})`);
    }
    return resp.json();
  }

  // WE CAN CREATE FUNCTIONS HERE TO FETCH DATA FROM THE SERVER
  // AND RETURN IT TO THE CONTROLLER.  THE CONTROLLER CAN THEN
  // USE THAT DATA TO UPDATE THE VIEW.  THE CONTROLLER CAN ALSO
  // SEND DATA TO THE SERVER TO BE STORED IN THE DATABASE BY
  // CALLING FUNCTIONS THAT WE DEFINE HERE.
  return {
    ////////////////////////////////////////////////////////////////
    // utility function to store the token so that we
    // can use it later to make authenticated requests
    ////////////////////////////////////////////////////////////////
    setToken: function (newToken) {
      token = newToken;
    },

    ////////////////////////////////////////////////////////////////
    // function to fetch the list of users from the server
    ////////////////////////////////////////////////////////////////
    getUsers: async function () {
      if (!getToken()) {
        console.error("Token is not set.");
        return [];
      }

      try {
        // this is our call to the /api/users route on the server
        const data = await apiGet('/api/users');

        // store the emails in the users variable so we can
        // use them again later without having to fetch them
        users = data.emails || [];

        // return the emails to the controller
        // so that it can update the view
        return users;
      } catch (error) {
        console.error("Error in API call:", error);
        return [];
      }
    },

    ////////////////////////////////////////////////////////////////
    // ACTIVITY (Fitness tab) — DATE-AWARE
    ////////////////////////////////////////////////////////////////

    // day: "YYYY-MM-DD" or undefined for today
    getActivityMetrics: async function (day) {
      const params = {};
      if (day) params.day = day;
      return apiGet('/api/activity', params);
    },

    // vals: { steps, distance, minutes, calories }, day: "YYYY-MM-DD"
    updateActivityValues: async function (vals, day) {
      const body = { ...vals };
      if (day) body.day = day;
      return apiPost('/api/activity/update', body);
    },

    // goals are not per-day
    updateActivityGoals: async function (goals) {
      return apiPost('/api/activity/goals', goals);
    },

    // ADD MORE FUNCTIONS HERE TO FETCH DATA FROM THE SERVER
    // AND SEND DATA TO THE SERVER AS NEEDED
  };
})();
