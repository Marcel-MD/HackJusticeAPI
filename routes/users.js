require("dotenv").config();
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const auth = require("../middleware/auth.js");

/**
 * @swagger
 * components:
 *  schemas:
 *    User:
 *      type: object
 *      required:
 *        - email
 *        - password
 *      properties:
 *        _id:
 *          type: string
 *          description: Auto generated user id.
 *        email:
 *          type: string
 *          description: Valid user email.
 *        password:
 *          type: string
 *          description: A password with at least 6 characters.
 *        admin:
 *          type: boolean
 *          description: True if user has admin rights.
 *        games:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              _id:
 *                type: string
 *                description: Auto generated game id.
 *          description: An array of games ids that user have completed.
 *        date:
 *          type: date
 *          description: The creation date of the user.
 *      example:
 *        _id: cg4312hjkh2k3h4kh
 *        email: user@mail.com
 *        password: 123456
 *        admin: false
 *        games:
 *            _id: jhg34jh123k4g1k2j
 */

/**
 * @swagger
 * /users:
 *  post:
 *    summary: Creates new user.
 *    tags: [Users]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *              password:
 *                type: string
 *    responses:
 *      200:
 *        description: New user created
 *      400:
 *        description: Bad request
 *      500:
 *        description: Server error
 */
router.post(
  "/",
  [
    // Express Validator
    check("email", "Please include a valid email").isEmail(),
    check(
      "password",
      "Please enter a password with 6 or more characters"
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    // Validate data
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Distruct request body
    const { email, password } = req.body;

    try {
      // Search for existing user in the database
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User already exists" }] });
      }

      // Create new user
      user = new User({
        email,
        password,
        admin: false,
      });

      // Hash the password with bcrypt
      const salt = await bcrypt.genSalt(5);
      user.password = await bcrypt.hash(password, salt);

      // Save the user
      await user.save();

      // JWT payload
      const payload = {
        user: {
          id: user.id,
        },
      };

      // Send JWT after registration
      jwt.sign(
        payload,
        process.env.SECRET,
        { expiresIn: "5d" },
        (err, token) => {
          if (err) throw err;
          res.send({ token });
        }
      );
      //
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  }
);

/**
 * @swagger
 * /users/auth:
 *  get:
 *    summary: Get current user details.
 *    tags: [Users]
 *    parameters:
 *      - in: header
 *        name: x-auth-token
 *        schema:
 *          type: string
 *        required: true
 *    responses:
 *      200:
 *        description: User authorized
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */
router.get("/auth", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.status(200).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/**
 * @swagger
 * /users:
 *  get:
 *    summary: Get all users details.
 *    tags: [Users]
 *    responses:
 *      200:
 *        description: User authorized
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

/**
 * @swagger
 * /users/auth:
 *  post:
 *    summary: Log in the user.
 *    tags: [Users]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *              email:
 *                type: string
 *              password:
 *                type: string
 *    responses:
 *      200:
 *        description: User successfuly logged in
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */
router.post(
  "/auth",
  [
    // Express Validator
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  async (req, res) => {
    // Data validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Distruct request body
    const { email, password } = req.body;

    try {
      // Search user in the database
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }

      // Check if password matches
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }

      // JWT payload
      const payload = {
        user: {
          id: user.id,
        },
      };

      // Send JWT
      jwt.sign(
        payload,
        process.env.SECRET,
        { expiresIn: "5 days" },
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
      //
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

/**
 * @swagger
 * /users/{user_id}:
 *  delete:
 *    summary: Delete user by id. Can be done only by administrator or the user himself.
 *    tags: [Users]
 *    parameters:
 *      - in: path
 *        name: user_id
 *        schema:
 *          type: string
 *        required: true
 *      - in: header
 *        name: x-auth-token
 *        schema:
 *          type: string
 *        required: true
 *    responses:
 *      200:
 *        description: User successfuly deleted
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */

router.delete("/:user_id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.user_id);
    const admin = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (admin.admin || req.params.user_id == req.user.id) {
      user.delete();
    } else {
      return res.status(401).json({ msg: "Not allowed to delete this user" });
    }

    res
      .status(200)
      .json({ msg: "User successfully deleted from our platform" });
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "User not found" });
    }

    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
