const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true
    },
    picture: {
        data: Buffer,
        contentType: String,
    },
    polls: [
        {
            type: Schema.Types.ObjectId,
            ref: "polls",
        }
    ]
})

const User = model('user', UserSchema);

module.exports = User;