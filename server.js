require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static("public"));

//////////////////////////////////////
//ROUTES TO SERVE HTML FILES
//////////////////////////////////////
// Default route to serve logon.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/logon.html");
});

// Route to serve dashboard.html
app.get("/dashboard", (req, res) => {
  res.sendFile(__dirname + "/public/dashboard.html");
});

// Route to serve profile.html
app.get("/profile", (req, res) => {
  res.sendFile(__dirname + "/public/profile.html");
});

// Route to serve leaderboard.html
app.get("/leaderboard", (req, res) => {
  res.sendFile(__dirname + "/public/Leaderboard.html");
});
//////////////////////////////////////
//END ROUTES TO SERVE HTML FILES
//////////////////////////////////////

/////////////////////////////////////////////////
//HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////
// Helper function to create a MySQL connection
async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// **Authorization Middleware: Verify JWT Token and Check User in Database**
async function authenticateToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token." });
    }

    try {
      const connection = await createConnection();

      // Query the database to verify that the email is associated with an active account
      const [rows] = await connection.execute(
        "SELECT email FROM user WHERE email = ?",
        [decoded.email]
      );

      await connection.end(); // Close connection

      if (rows.length === 0) {
        return res
          .status(403)
          .json({ message: "Account not found or deactivated." });
      }

      req.user = decoded; // Save the decoded email for use in the route
      next(); // Proceed to the next middleware or route handler
    } catch (dbError) {
      console.error(dbError);
      res
        .status(500)
        .json({ message: "Database error during authentication." });
    }
  });
}
/////////////////////////////////////////////////
//END HELPER FUNCTIONS AND AUTHENTICATION MIDDLEWARE
/////////////////////////////////////////////////

//////////////////////////////////////
//ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Route: Create Account
app.post("/api/create-account", async (req, res) => {
  const { email, password, firstName, lastName, dateOfBirth } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const connection = await createConnection();
    const hashedPassword = await bcrypt.hash(password, 10); // Hash password

    await connection.execute(
      "INSERT INTO user (email, password, first_name, last_name, date_of_birth) VALUES (?, ?, ?, ?, ?)",
      [email, hashedPassword, firstName, lastName, dateOfBirth]
    );

    await connection.end(); // Close connection

    res.status(201).json({ message: "Account created successfully!" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res
        .status(409)
        .json({ message: "An account with this email already exists." });
    } else {
      console.error(error);
      res.status(500).json({ message: "Error creating account." });
    }
  }
});

// Route: Logon
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const connection = await createConnection();

    const [rows] = await connection.execute(
      "SELECT * FROM user WHERE email = ?",
      [email]
    );

    await connection.end(); // Close connection

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in." });
  }
});

// Route: Get User Profile
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();

    const [rows] = await connection.execute(
      "SELECT email, first_name, last_name, date_of_birth FROM user WHERE email = ?",
      [req.user.email]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const user = rows[0];
    res.status(200).json({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      dateOfBirth: user.date_of_birth,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching profile." });
  }
});

app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  const day = req.query.day; // optional: "YYYY-MM-DD"

  // If a specific day is supplied, we compare with that.
  // Otherwise we use CURDATE() (today).
  const dateClause = day ? "dc.day = ?" : "dc.day = CURDATE()";
  const params = [];
  if (day) params.push(day);

  const query = `
    SELECT 
      u.email,
      u.first_name,
      u.last_name,
      COALESCE(dc.walk_hours, 0)  AS walk_hours,
      COALESCE(dc.run_hours, 0)   AS run_hours,
      COALESCE(dc.cycle_hours, 0) AS cycle_hours,
      COALESCE(dc.hike_hours, 0)  AS hike_hours,
      COALESCE(dc.swim_hours, 0)  AS swim_hours,
      COALESCE(dc.total_km, 0)    AS total_km,
      COALESCE(dc.total_co2, 0)   AS total_co2
    FROM user u
    LEFT JOIN daily_carbon dc
      ON dc.user_email = u.email
     AND ${dateClause}
    ORDER BY total_co2 DESC
  `;

  try {
    const conn = await createConnection();
    const [rows] = await conn.execute(query, params);
    await conn.end();
    res.status(200).json(rows);
  } catch (error) {
    console.error("GET /api/leaderboard error", error);
    res.status(500).json({ message: "Error fetching leaderboard." });
  }
});



// Route: Get All Email Addresses
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();

    const [rows] = await connection.execute("SELECT email FROM user");

    await connection.end(); // Close connection

    const emailList = rows.map((row) => row.email);
    res.status(200).json({ emails: emailList });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving email addresses." });
  }
});

// // Save/update activity footprint for the logged-in user
// app.post("/api/footprint/save", authenticateToken, async (req, res) => {
//   // numbers only; default to 0
//   const toNum = (v) => (isNaN(v) || v === "" || v == null ? 0 : Number(v));
//   const steps         = toNum(req.body.steps);
//   const walk_hours    = toNum(req.body.walk);
//   const run_hours     = toNum(req.body.run);
//   const cycle_hours   = toNum(req.body.cycle);
//   const hiking_hours  = toNum(req.body.hike);
//   const swimming_hours= toNum(req.body.swim);

//   try {
//     const conn = await createConnection();
//     const [result] = await conn.execute(
//       `UPDATE user
//          SET steps = ?,
//              walk_hours = ?,
//              run_hours = ?,
//              cycle_hours = ?,
//              hiking_hours = ?,
//              swimming_hours = ?
//        WHERE email = ?`,
//       [steps, walk_hours, run_hours, cycle_hours, hiking_hours, swimming_hours, req.user.email]
//     );
//     await conn.end();

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "User not found." });
//     }
//     res.json({ message: "Activity saved." });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Database error saving activity." });
//   }
// });

// // (Optional) fetch current values to prefill the form
// app.get("/api/footprint", authenticateToken, async (req, res) => {
//   try {
//     const conn = await createConnection();
//     const [rows] = await conn.execute(
//       `SELECT steps, walk_hours AS walk, run_hours AS run,
//               cycle_hours AS cycle, hiking_hours AS hike, swimming_hours AS swim
//          FROM user WHERE email = ?`,
//       [req.user.email]
//     );
//     await conn.end();
//     if (!rows.length) return res.status(404).json({ message: "User not found." });
//     res.json(rows[0]);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Database error fetching activity." });
//   }
// });

// ===== DAILY ACTIVITY (manual values; reset each day) =====

// helper: ensure a row for (user_email, today) exists and return it
// helper: ensure a row for (user_email, day) exists and return it
async function ensureDayRow(conn, email, day) {
  if (day) {
    // Specific day (YYYY-MM-DD)
    const [rows] = await conn.execute(
      'SELECT id, steps, distance_km, minutes, calories FROM daily_activity WHERE user_email = ? AND day = ? LIMIT 1',
      [email, day]
    );
    if (rows.length) return rows[0];

    await conn.execute(
      'INSERT INTO daily_activity (user_email, day) VALUES (?, ?)',
      [email, day]
    );
    const [rows2] = await conn.execute(
      'SELECT id, steps, distance_km, minutes, calories FROM daily_activity WHERE user_email = ? AND day = ? LIMIT 1',
      [email, day]
    );
    return rows2[0];
  } else {
    // Fallback: today on the DB side
    const [rows] = await conn.execute(
      'SELECT id, steps, distance_km, minutes, calories FROM daily_activity WHERE user_email = ? AND day = CURDATE() LIMIT 1',
      [email]
    );
    if (rows.length) return rows[0];

    await conn.execute(
      'INSERT INTO daily_activity (user_email, day) VALUES (?, CURDATE())',
      [email]
    );
    const [rows2] = await conn.execute(
      'SELECT id, steps, distance_km, minutes, calories FROM daily_activity WHERE user_email = ? AND day = CURDATE() LIMIT 1',
      [email]
    );
    return rows2[0];
  }
}


// GET /api/activity  -> today's values + goals
// GET /api/activity  -> values + goals for a given day (or today)
app.get('/api/activity', authenticateToken, async (req, res) => {
  // Optional day query param (YYYY-MM-DD)
  const rawDay = req.query.day;
  const day =
    typeof rawDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDay)
      ? rawDay
      : null;

  try {
    const conn = await createConnection();
    const todayRow = await ensureDayRow(conn, req.user.email, day);

    const [grows] = await conn.execute(
      `SELECT steps_goal, distance_goal_km, minutes_goal, calories_goal
         FROM user WHERE email = ?`,
      [req.user.email]
    );

    if (!grows.length) {
      await conn.end();
      return res.status(404).json({ message: 'User not found.' });
    }

    const g = grows[0];
    await conn.end();

    res.json({
      steps: Number(todayRow.steps ?? 0),
      distance: Number(todayRow.distance_km ?? 0),
      minutes: Number(todayRow.minutes ?? 0),
      calories: Number(todayRow.calories ?? 0),
      stepsTarget: Number(g.steps_goal ?? 10000),
      distanceTarget: Number(g.distance_goal_km ?? 8),
      minutesTarget: Number(g.minutes_goal ?? 60),
      caloriesTarget: Number(g.calories_goal ?? 650),
      day: day, // echo back if you want (optional)
    });
  } catch (err) {
    console.error('GET /api/activity error', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /api/activity/update  -> save today's manual values
// POST /api/activity/update  -> save values for the given day (or today)
app.post('/api/activity/update', authenticateToken, async (req, res) => {
  const toNum = (v, d = 0) =>
    v === '' || v == null || isNaN(v) ? d : Number(v);

  const rawDay = req.body.day;
  const day =
    typeof rawDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawDay)
      ? rawDay
      : null;

  const steps    = toNum(req.body.steps);
  const distance = toNum(req.body.distance);
  const minutes  = toNum(req.body.minutes);
  const calories = toNum(req.body.calories);

  try {
    const conn = await createConnection();
    await ensureDayRow(conn, req.user.email, day);

    let whereSql = 'user_email = ? AND day = CURDATE()';
    let params   = [steps, distance, minutes, calories, req.user.email];

    if (day) {
      whereSql = 'user_email = ? AND day = ?';
      params   = [steps, distance, minutes, calories, req.user.email, day];
    }

    const [result] = await conn.execute(
      `UPDATE daily_activity
          SET steps = ?, distance_km = ?, minutes = ?, calories = ?
        WHERE ${whereSql}`,
      params
    );

    await conn.end();

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Row not found.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/activity/update error', err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /api/activity/goals  -> update goals on user row
app.post('/api/activity/goals', authenticateToken, async (req, res) => {
  const toNum = (v, d=0) => (v === '' || v == null || isNaN(v) ? d : Number(v));
  const stepsGoal    = toNum(req.body.stepsTarget, 10000);
  const distanceGoal = toNum(req.body.distanceTarget, 8);
  const minutesGoal  = toNum(req.body.minutesTarget, 60);
  const caloriesGoal = toNum(req.body.caloriesTarget, 650);

  try {
    const conn = await createConnection();
    const [result] = await conn.execute(
      `UPDATE user
          SET steps_goal = ?, distance_goal_km = ?, minutes_goal = ?, calories_goal = ?
        WHERE email = ?`,
      [stepsGoal, distanceGoal, minutesGoal, caloriesGoal, req.user.email]
    );
    await conn.end();

    if (!result.affectedRows) return res.status(404).json({ message: 'User not found.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/activity/goals error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==========================================
// CARBON TRACKER (CO₂ savings) ROUTES
// ==========================================
app.post("/api/carbon/save", authenticateToken, async (req, res) => {
  const toNum = (v) => (isNaN(v) || v === "" || v == null ? 0 : Number(v));

  const walk   = toNum(req.body.walk);
  const run    = toNum(req.body.run);
  const cycle  = toNum(req.body.cycle);
  const hike   = toNum(req.body.hike);
  const swim   = toNum(req.body.swim);
  const totKm  = toNum(req.body.totKm);
  const totCO2 = toNum(req.body.totCO2);

  // NEW: optional day from body (YYYY-MM-DD). If invalid or missing, use CURDATE().
  let bodyDay = req.body.day;
  if (typeof bodyDay !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(bodyDay)) {
    bodyDay = null;
  }

  try {
    const conn = await createConnection();

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS daily_carbon (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_email VARCHAR(255),
        day DATE,
        walk_hours FLOAT DEFAULT 0,
        run_hours FLOAT DEFAULT 0,
        cycle_hours FLOAT DEFAULT 0,
        hike_hours FLOAT DEFAULT 0,
        swim_hours FLOAT DEFAULT 0,
        total_km FLOAT DEFAULT 0,
        total_co2 FLOAT DEFAULT 0,
        UNIQUE KEY (user_email, day)
      )
    `);

    // Use COALESCE(?, CURDATE()) so we can pass NULL and still get today
    await conn.execute(
      `INSERT INTO daily_carbon
         (user_email, day, walk_hours, run_hours, cycle_hours, hike_hours, swim_hours, total_km, total_co2)
       VALUES
         (?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         walk_hours = VALUES(walk_hours),
         run_hours  = VALUES(run_hours),
         cycle_hours= VALUES(cycle_hours),
         hike_hours = VALUES(hike_hours),
         swim_hours = VALUES(swim_hours),
         total_km   = VALUES(total_km),
         total_co2  = VALUES(total_co2)`,
      [req.user.email, bodyDay, walk, run, cycle, hike, swim, totKm, totCO2]
    );

    await conn.end();
    res.json({ ok: true, message: "Carbon data saved successfully." });
  } catch (err) {
    console.error("POST /api/carbon/save error", err);
    res.status(500).json({ message: "Server error saving carbon data." });
  }
});


//////////////////////////////////////
// END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
