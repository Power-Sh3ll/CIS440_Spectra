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

// Route to redirect profile to dashboard (profile is now integrated)
app.get("/profile", (req, res) => {
  res.redirect("/dashboard#profile");
});

// Route to serve leaderboard.html
app.get("/leaderboard", (req, res) => {
  res.sendFile(__dirname + "/public/Leaderboard.html");
});

// Route to serve friends.html
app.get("/friends", (req, res) => {
  res.sendFile(__dirname + "/public/friends.html");
});

// Route to serve settings.html
app.get("/settings", (req, res) => {
  res.sendFile(__dirname + "/public/settings.html");
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
// Helper: award a badge to a user if they don't already have it
async function giveBadgeIfNotEarned(conn, email, badgeCode) {
  // check if user already has this badge
  const [existing] = await conn.execute(
    `SELECT ub.badge_id
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_email = ? AND b.code = ?`,
    [email, badgeCode]
  );
  if (existing.length > 0) {
    return; // already earned
  }

  // insert the badge for this user
  await conn.execute(
    `INSERT INTO user_badges (user_email, badge_id)
       SELECT ?, id
         FROM badges
        WHERE code = ?`,
    [email, badgeCode]
  );
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

// Route: Get Leaderboard (only self + accepted friends)
app.get("/api/leaderboard", authenticateToken, async (req, res) => {
  const day = req.query.day; // optional: "YYYY-MM-DD"
  const userEmail = req.user.email;

  // If a specific day is supplied, compare with that; otherwise use CURDATE()
  const dateClause = day ? "dc.day = ?" : "dc.day = CURDATE()";

  // Build params in the order the ?s appear in the query
  const params = [];
  if (day) params.push(day); // for dc.day = ?
  params.push(userEmail, userEmail, userEmail, userEmail);

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
    WHERE 
      -- always include the current user
      u.email = ?
      OR
      -- include only accepted friends of current user
      u.email IN (
        SELECT
          CASE 
            WHEN f.user_email = ? THEN f.friend_email
            ELSE f.user_email
          END AS friend_email
        FROM friendships f
        WHERE
          (f.user_email = ? OR f.friend_email = ?)
          AND f.status = 'accepted'
      )
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


// Route to serve badges/challenges page
app.get("/badges", (req, res) => {
  res.sendFile(__dirname + "/public/badges.html");
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
// Route: Get current friends and pending requests
app.get("/api/friends", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();
    const userEmail = req.user.email;

    // Get accepted friendships where user is involved (avoiding duplicates)
    const [friendsRows] = await connection.execute(`
      SELECT DISTINCT
        CASE 
          WHEN f.user_email = ? THEN f.friend_email 
          ELSE f.user_email 
        END as friend_email,
        CASE 
          WHEN f.user_email = ? THEN u2.first_name 
          ELSE u1.first_name 
        END as first_name,
        CASE 
          WHEN f.user_email = ? THEN u2.last_name 
          ELSE u1.last_name 
        END as last_name
      FROM friendships f
      LEFT JOIN user u1 ON f.user_email = u1.email
      LEFT JOIN user u2 ON f.friend_email = u2.email
      WHERE (f.user_email = ? OR f.friend_email = ?) 
      AND f.status = 'accepted'
    `, [userEmail, userEmail, userEmail, userEmail, userEmail]);

    // Get pending friend requests received (only where user is the recipient)
    const [receivedRows] = await connection.execute(`
      SELECT DISTINCT 
        f.user_email as requester_email, 
        f.created_at
      FROM friendships f
      WHERE f.friend_email = ? AND f.status = 'pending'
    `, [userEmail]);

    // Get pending friend requests sent (only where user is the sender)
    const [sentRows] = await connection.execute(`
      SELECT 
        f.friend_email as recipient_email, 
        f.created_at
      FROM friendships f
      WHERE f.user_email = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [userEmail]);

    // Remove any potential duplicates by recipient email
    const uniqueSentRows = sentRows.filter((request, index, self) => 
      index === self.findIndex(r => r.recipient_email === request.recipient_email)
    );

    await connection.end();

    res.status(200).json({
      friends: friendsRows,
      receivedRequests: receivedRows,
      sentRequests: uniqueSentRows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving friends data." });
  }
});

// Route: Send friend request
app.post("/api/friends/request", authenticateToken, async (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.user.email;

  if (!friendEmail) {
    return res.status(400).json({ message: "Friend email is required." });
  }

  if (friendEmail === userEmail) {
    return res.status(400).json({ message: "Cannot send friend request to yourself." });
  }

  try {
    const connection = await createConnection();

    // Check if friend exists
    const [userExists] = await connection.execute(
      'SELECT email FROM user WHERE email = ?',
      [friendEmail]
    );

    if (userExists.length === 0) {
      await connection.end();
      return res.status(404).json({ message: "User not found." });
    }

    // Check if friendship already exists (in either direction)
    const [existingFriendship] = await connection.execute(`
      SELECT * FROM friendships 
      WHERE (user_email = ? AND friend_email = ?) 
      OR (user_email = ? AND friend_email = ?)
    `, [userEmail, friendEmail, friendEmail, userEmail]);

    if (existingFriendship.length > 0) {
      await connection.end();
      return res.status(409).json({ message: "Friendship request already exists or you are already friends." });
    }

    // Create friend request (only one direction: sender -> recipient)
    await connection.execute(
      'INSERT INTO friendships (user_email, friend_email, requested_by, status) VALUES (?, ?, ?, ?)',
      [userEmail, friendEmail, userEmail, 'pending']
    );

    await connection.end();
    res.status(201).json({ message: "Friend request sent successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending friend request." });
  }
});

// Route: Accept friend request
app.post("/api/friends/accept", authenticateToken, async (req, res) => {
  const { requesterEmail } = req.body;
  const userEmail = req.user.email;

  if (!requesterEmail) {
    return res.status(400).json({ message: "Requester email is required." });
  }

  try {
    const connection = await createConnection();

    // Update the friend request to accepted
    const [result] = await connection.execute(`
      UPDATE friendships 
      SET status = 'accepted', updated_at = CURRENT_TIMESTAMP
      WHERE user_email = ? AND friend_email = ? AND status = 'pending'
    `, [requesterEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    res.status(200).json({ message: "Friend request accepted!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error accepting friend request." });
  }
});

// Route: Decline friend request
app.post("/api/friends/decline", authenticateToken, async (req, res) => {
  const { requesterEmail } = req.body;
  const userEmail = req.user.email;

  if (!requesterEmail) {
    return res.status(400).json({ message: "Requester email is required." });
  }

  try {
    const connection = await createConnection();

    // Delete the friend request
    const [result] = await connection.execute(`
      DELETE FROM friendships 
      WHERE user_email = ? AND friend_email = ? AND status = 'pending'
    `, [requesterEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    res.status(200).json({ message: "Friend request declined." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error declining friend request." });
  }
});

// Route: Remove friend
app.delete("/api/friends/remove", authenticateToken, async (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.user.email;

  if (!friendEmail) {
    return res.status(400).json({ message: "Friend email is required." });
  }

  try {
    const connection = await createConnection();

    // Remove friendship (works in both directions)
    const [result] = await connection.execute(`
      DELETE FROM friendships 
      WHERE ((user_email = ? AND friend_email = ?) OR (user_email = ? AND friend_email = ?))
      AND status = 'accepted'
    `, [userEmail, friendEmail, friendEmail, userEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friendship not found." });
    }

    res.status(200).json({ message: "Friend removed successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error removing friend." });
  }
});

// Route: Cancel sent friend request
app.delete("/api/friends/cancel", authenticateToken, async (req, res) => {
  const { friendEmail } = req.body;
  const userEmail = req.user.email;

  if (!friendEmail) {
    return res.status(400).json({ message: "Friend email is required." });
  }

  try {
    const connection = await createConnection();

    // Remove the pending request (only if current user sent it)
    const [result] = await connection.execute(`
      DELETE FROM friendships 
      WHERE user_email = ? AND friend_email = ? AND status = 'pending'
    `, [userEmail, friendEmail]);

    await connection.end();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pending friend request not found." });
    }

    res.status(200).json({ message: "Friend request cancelled successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error cancelling friend request." });
  }
});

// Route: Search for users
app.get("/api/users/search", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();
    const userEmail = req.user.email;
    const searchQuery = req.query.q;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return res.status(400).json({ message: "Search query must be at least 2 characters long." });
    }

    const searchTerm = `%${searchQuery.toLowerCase()}%`;

    // Search for users by email, first name, or last name
    // Exclude the current user and users who are already friends
    const [userRows] = await connection.execute(`
      SELECT DISTINCT u.email, u.first_name, u.last_name,
        CASE 
          WHEN f.status IS NULL THEN 'none'
          WHEN f.status = 'pending' AND f.user_email = ? THEN 'sent'
          WHEN f.status = 'pending' AND f.friend_email = ? THEN 'received'
          WHEN f.status = 'accepted' THEN 'friends'
          ELSE 'none'
        END as relationship_status
      FROM user u
      LEFT JOIN friendships f ON (
        (f.user_email = ? AND f.friend_email = u.email) OR
        (f.friend_email = ? AND f.user_email = u.email)
      )
      WHERE u.email != ? 
      AND (
        LOWER(u.email) LIKE ? OR 
        LOWER(u.first_name) LIKE ? OR 
        LOWER(u.last_name) LIKE ? OR
        LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE ?
      )
      ORDER BY 
        CASE 
          WHEN LOWER(u.email) = LOWER(?) THEN 1
          WHEN LOWER(u.email) LIKE ? THEN 2
          WHEN LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE ? THEN 3
          ELSE 4
        END,
        u.first_name, u.last_name
      LIMIT 20
    `, [
      userEmail, userEmail, userEmail, userEmail, userEmail,
      searchTerm, searchTerm, searchTerm, searchTerm,
      searchQuery.toLowerCase(), `${searchQuery.toLowerCase()}%`, `%${searchQuery.toLowerCase()}%`
    ]);

    await connection.end();

    res.status(200).json({
      users: userRows,
      query: searchQuery
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error searching for users." });
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

// Helper: award a badge to a user (if not already earned)
async function awardBadge(conn, userEmail, badgeCode) {
  // Find badge id by its code (e.g. 'MINUTES_150')
  const [badgeRows] = await conn.execute(
    "SELECT id FROM badges WHERE code = ?",
    [badgeCode]
  );

  if (!badgeRows.length) {
    console.warn("Badge code not found:", badgeCode);
    return;
  }

  const badgeId = badgeRows[0].id;

  // Insert only if not already present
  await conn.execute(
    `INSERT IGNORE INTO user_badges (user_email, badge_id)
     VALUES (?, ?)`,
    [userEmail, badgeId]
  );
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
// POST /api/activity/update  -> save values for the given day (or today)
// and award steps / minutes / calories badges
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

    if (!result.affectedRows) {
      await conn.end();
      return res.status(404).json({ message: 'Row not found.' });
    }

    // ---------- BADGE LOGIC (steps / minutes / calories) ----------

    // Steps badges
    if (steps >= 5000)  await giveBadgeIfNotEarned(conn, req.user.email, 'STEP_5K');
    if (steps >= 10000) await giveBadgeIfNotEarned(conn, req.user.email, 'STEP_10K');
    if (steps >= 20000) await giveBadgeIfNotEarned(conn, req.user.email, 'STEP_20K');

    // 150 minute day
    if (minutes >= 150) await giveBadgeIfNotEarned(conn, req.user.email, 'MINUTES_150');

    // Calories badges
    if (calories >= 500)  await giveBadgeIfNotEarned(conn, req.user.email, 'CAL_500');
    if (calories >= 1000) await giveBadgeIfNotEarned(conn, req.user.email, 'CAL_1000');

    // (streak badges can be added later with a 7-day check)

    // --------------------------------------------------------------

    await conn.end();
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

  // optional day from body (YYYY-MM-DD). If invalid or missing, use CURDATE().
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

    // Upsert today's carbon stats
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

    // ---------- BADGE LOGIC (CO₂ + distance totals) ----------

    const [aggRows] = await conn.execute(
      `SELECT 
         COALESCE(SUM(total_km), 0)  AS km_total,
         COALESCE(SUM(total_co2), 0) AS co2_total
         FROM daily_carbon
        WHERE user_email = ?`,
      [req.user.email]
    );

    const kmTotal  = aggRows[0].km_total  || 0;
    const co2Total = aggRows[0].co2_total || 0;

    // CO₂ badges
    if (co2Total >= 1)   await giveBadgeIfNotEarned(conn, req.user.email, 'CO2_1KG');
    if (co2Total >= 25)  await giveBadgeIfNotEarned(conn, req.user.email, 'CO2_25KG');
    if (co2Total >= 50)  await giveBadgeIfNotEarned(conn, req.user.email, 'CO2_50KG');

    // Distance badges (adjust thresholds if you want)
    if (kmTotal >= 42.2)  await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_MARATHON');
    if (kmTotal >= 446)   await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_GRANDCANYON');
    if (kmTotal >= 800)   await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_CAMINO');
    if (kmTotal >= 3500)  await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_APPALACHIAN');
    if (kmTotal >= 160)   await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_ANNAPURNA');
    if (kmTotal >= 4265)  await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_PCT');
    if (kmTotal >= 8850)  await giveBadgeIfNotEarned(conn, req.user.email, 'DIST_GREATWALL');

    // ---------------------------------------------------------

    await conn.end();
    res.json({ ok: true, message: "Carbon data saved successfully." });
  } catch (err) {
    console.error("POST /api/carbon/save error", err);
    res.status(500).json({ message: "Server error saving carbon data." });
  }
});

// ==========================================
// BADGE HELPERS
// ==========================================
async function awardBadgeByCode(conn, userEmail, badgeCode) {
  // Insert a row in user_badges if it doesn't already exist
  await conn.execute(
    `
    INSERT INTO user_badges (user_email, badge_id)
    SELECT ?, b.id
    FROM badges b
    WHERE b.code = ?
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub
        WHERE ub.user_email = ? AND ub.badge_id = b.id
      )
    `,
    [userEmail, badgeCode, userEmail]
  );
}

// Check activity-based badges (per-day stats)
async function checkActivityBadges(conn, userEmail, stats) {
  const { steps, minutes, calories } = stats;

  // 👉 make sure these codes match your badges table
  if (minutes >= 150) {
    await awardBadgeByCode(conn, userEmail, "ACTIVE_MINUTES_150");
  }

  if (steps >= 5000) {
    await awardBadgeByCode(conn, userEmail, "STEPS_5K");
  }
  if (steps >= 10000) {
    await awardBadgeByCode(conn, userEmail, "STEPS_10K");
  }
  if (steps >= 20000) {
    await awardBadgeByCode(conn, userEmail, "STEPS_20K");
  }

  if (calories >= 500) {
    await awardBadgeByCode(conn, userEmail, "CALORIES_500");
  }
  if (calories >= 1000) {
    await awardBadgeByCode(conn, userEmail, "CALORIES_1000");
  }

  // You can add more here later: streaks, leaderboard, etc.
}

// ==========================================
// BADGES API
// ==========================================

// Get all badges plus which ones the user has earned
app.get("/api/user/badges", authenticateToken, async (req, res) => {
  try {
    const conn = await createConnection();

    // All badge definitions
    const [allBadges] = await conn.execute(
      `SELECT id, code, name, description, category, icon
         FROM badges
         ORDER BY category, id`
    );

    // What this user has earned
    const [earnedRows] = await conn.execute(
      `SELECT badge_id, earned_at
         FROM user_badges
        WHERE user_email = ?`,
      [req.user.email]
    );

    await conn.end();

    const earnedMap = new Map(
      earnedRows.map(row => [row.badge_id, row.earned_at])
    );

    const earned = [];
    const locked = [];

    for (const b of allBadges) {
      const badgeObj = {
        id: b.id,
        code: b.code,
        name: b.name,
        description: b.description,
        category: b.category,
        icon: b.icon,
        earnedAt: earnedMap.get(b.id) || null
      };
      if (badgeObj.earnedAt) {
        earned.push(badgeObj);
      } else {
        locked.push(badgeObj);
      }
    }

    res.json({ earned, locked });
  } catch (err) {
    console.error("GET /api/user/badges error", err);
    res.status(500).json({ message: "Error fetching badges" });
  }
});

//////////////////////////////////////
// USER SETTINGS API ENDPOINTS
//////////////////////////////////////

// GET user settings
app.get("/api/settings", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();
    const userEmail = req.user.email;

    const [rows] = await connection.execute(
      "SELECT * FROM user_settings WHERE user_email = ?",
      [userEmail]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(404).json({ message: "No settings found" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Error fetching settings" });
  }
});

// POST/PUT user settings (create or update)
app.post("/api/settings", authenticateToken, async (req, res) => {
  try {
    const connection = await createConnection();
    const userEmail = req.user.email;
    
    const {
      theme = 'light',
      notifications_enabled = true,
      email_notifications = true,
      activity_privacy = 'public',
      units = 'metric',
      timezone = 'UTC',
      language = 'en',
      weekly_goal_steps = 70000,
      weekly_goal_distance = 50.0
    } = req.body;

    // Check if settings exist
    const [existing] = await connection.execute(
      "SELECT user_email FROM user_settings WHERE user_email = ?",
      [userEmail]
    );

    if (existing.length === 0) {
      // Create new settings
      await connection.execute(`
        INSERT INTO user_settings (
          user_email, theme, notifications_enabled, email_notifications,
          activity_privacy, units, timezone, language, 
          weekly_goal_steps, weekly_goal_distance, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [userEmail, theme, notifications_enabled, email_notifications,
          activity_privacy, units, timezone, language,
          weekly_goal_steps, weekly_goal_distance]);
    } else {
      // Update existing settings
      await connection.execute(`
        UPDATE user_settings SET 
          theme = ?, notifications_enabled = ?, email_notifications = ?,
          activity_privacy = ?, units = ?, timezone = ?, language = ?,
          weekly_goal_steps = ?, weekly_goal_distance = ?, updated_at = NOW()
        WHERE user_email = ?
      `, [theme, notifications_enabled, email_notifications,
          activity_privacy, units, timezone, language,
          weekly_goal_steps, weekly_goal_distance, userEmail]);
    }

    await connection.end();
    res.status(200).json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ message: "Error saving settings" });
  }
});

//////////////////////////////////////
// END ROUTES TO HANDLE API REQUESTS
//////////////////////////////////////
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
