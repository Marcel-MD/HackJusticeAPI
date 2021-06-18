require("dotenv").config();
const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../models/User.js");
const Game = require("../models/Game.js");
const auth = require("../middleware/auth.js");

/**
 * @swagger
 * components:
 *  schemas:
 *    Game:
 *      type: object
 *      required:
 *        - title
 *      properties:
 *        _id:
 *          type: string
 *          description: Auto generated game id.
 *        title:
 *          type: string
 *          description: Title of the game.
 *        icon:
 *          type: string
 *          description: Link for game icon.
 *        startText:
 *          type: string
 *          description: Some theory about the game.
 *        endText:
 *          type: string
 *          description: Some theory about the game.
 *        order:
 *          type: integer
 *          description: The order of the game in the menu list.
 *        questions:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              order:
 *                type: integer
 *                description: The order in which questions will be displayed.
 *              content:
 *                type: string
 *                description: The question itself.
 *              answers:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    correct:
 *                      type: boolean
 *                      description: True if it is the correct answer.
 *                    content:
 *                      type: string
 *                      description: The answer itself.
 *                description: Array of answers.
 *          description: Array of questions that user have completed.
 *        date:
 *          type: date
 *          description: The creation date of the game.
 */

/**
 * @swagger
 * /games:
 *  post:
 *    summary: Creates new game.
 *    tags: [Games]
 *    parameters:
 *      - in: header
 *        name: x-auth-token
 *        schema:
 *          type: string
 *        required: true
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            properties:
 *               title:
 *                 type: string
 *               icon:
 *                 type: string
 *               startText:
 *                 type: string
 *               endText:
 *                 type: string
 *               order:
 *                 type: integer
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     order:
 *                       type: integer
 *                     content:
 *                       type: string
 *                     answers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           correct:
 *                             type: boolean
 *                           content:
 *                             type: string
 *    responses:
 *      200:
 *        description: New game created
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: Game not found
 *      500:
 *        description: Server error
 */
router.post(
  "/",
  [auth, [check("title", "Title field can't be empty").notEmpty()]],
  async (req, res) => {
    // Data validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const admin = await User.findById(req.user.id).select("-password");
      if (!admin.admin) {
        return res.status(401).send({
          msg: "Not authorizend. Only administrators can add new games.",
        });
      }

      // Distruct request body
      const { title, icon, order, startText, endText, questions } = req.body;
      const newGame = new Game({
        title,
        icon,
        order,
        startText,
        endText,
        questions,
      });

      const game = await newGame.save();
      res.status(200).json(game);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

/**
 * @swagger
 * /games:
 *  get:
 *    summary: Get all games.
 *    tags: [Games]
 *    responses:
 *      200:
 *        description: User authorized
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: Game not found
 *      500:
 *        description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const game = await Game.find().sort({ date: -1 });
    res.status(200).json(game);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/**
 * @swagger
 * /games/{game_id}:
 *  get:
 *    summary: Get game by id.
 *    tags: [Games]
 *    parameters:
 *      - in: path
 *        name: game_id
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
 *        description: Game successfuly optained
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: Game not found
 *      500:
 *        description: Server error
 */
router.get("/:game_id", auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.game_id);

    if (!game) {
      return res.status(404).json({ msg: "Game not found" });
    }

    res.status(200).json(game);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Game not found" });
    }

    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/**
 * @swagger
 * /games/complete/{game_id}:
 *  put:
 *    summary: Complete game by id. Game will be added to current user completed games list.
 *    tags: [Games]
 *    parameters:
 *      - in: path
 *        name: game_id
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
 *        description: Game successfuly completed
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: Game not found
 *      500:
 *        description: Server error
 */
router.put("/complete/:game_id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const game = await Game.findById(req.params.game_id);

    if (!game) {
      return res.status(404).json({ msg: "Game not found" });
    }

    if (
      user.games.every((element) => {
        element.game != req.params.game_id;
      })
    ) {
      user.games.push({ game: req.params.game_id });
    }

    await user.save();

    return res.json(user);
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Game not found" });
    }

    console.error(err.message);
    res.status(500).send("Server error");
  }
});

/**
 * @swagger
 * /games/{game_id}:
 *  delete:
 *    summary: Delete game by id. Only admins are authorized.
 *    tags: [Games]
 *    parameters:
 *      - in: path
 *        name: game_id
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
 *        description: Game successfuly deleted
 *      400:
 *        description: Bad request
 *      401:
 *        description: Not authorized
 *      404:
 *        description: User not found
 *      500:
 *        description: Server error
 */
router.delete("/:game_id", auth, async (req, res) => {
  try {
    const game = await Game.findById(req.params.game_id);
    const admin = await User.findById(req.user.id);

    if (!game) {
      return res.status(404).json({ msg: "Game not found" });
    }

    if (admin.admin) {
      game.delete();
    } else {
      return res.status(401).json({ msg: "Not allowed to delete this game" });
    }

    res
      .status(200)
      .json({ msg: "Game successfully deleted from our platform" });
  } catch (err) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Game not found" });
    }

    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
