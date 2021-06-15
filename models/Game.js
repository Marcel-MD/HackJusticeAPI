const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  icon: {
    type: String,
  },

  order: {
    type: Number,
  },

  theory: {
    type: String,
  },

  questions: [
    {
      order: {
        type: Number,
      },
      content: {
        type: String,
        required: true,
      },
      answers: [
        {
          correct: {
            type: Boolean,
            required: true,
          },
          content: {
            type: String,
            required: true,
          },
        },
      ],
    },
  ],
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("game", GameSchema);
