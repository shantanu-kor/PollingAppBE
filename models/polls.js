const { Schema, model } = require('mongoose');

const PollsSchema = new Schema({
    question: {
        type: String,
        required: true,
    },
    options: [
        {
            value: {
                type: String,
                required: true,
            },
            votes: [
                {
                    type: Schema.Types.ObjectId,
                    ref: "user",
                }
            ]
        }
    ],
    comments: [
        {
            mainComment: {
                comment: {
                    type: String,
                },
                user: {
                    type: Schema.Types.ObjectId,
                    ref: "user",
                }
            },
            reComments: [
                {
                    comment: {
                        type: String,
                        required: true,
                    },
                    user: {
                        type: Schema.Types.ObjectId,
                        ref: "user",
                    }
                }
            ]
        },
    ],
    user: {
        type: Schema.Types.ObjectId,
        ref: "user",
        required: true,
    }
})

const Polls = model('polls', PollsSchema);

module.exports = Polls;