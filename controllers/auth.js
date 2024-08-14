const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { streamToBuffer } = require('../services/files');

function generateAccessToken(id, name) {
    return jwt.sign({ userId: id, name: name }, process.env.JWT_PASSWORD)
}

exports.signUp = async (req, res, next) => {
    const { name, email, password, picture, pictureContentType } = req.body;
    const saltRounds = 15;
    bcrypt.hash(password, saltRounds, async (err, hash) => {
        console.log(err);
        const findUser = async () => {
            const user = await User.find({ email: email.toLowerCase() })
            // console.log(user, "user!!!");
            if (user.length === 0) return false
            else return true;
        }
        try {
            const exists = await findUser();
            if (!exists) {
                const pictureData = await streamToBuffer(picture);
                const user = await User.create({ name, email: email.toLowerCase(), password: hash, picture: { data: pictureData, contentType: pictureContentType } });
                res.status(201).json({
                    success: true,
                    message: 'USER_CREATED_SUCCESSFULLY',
                    token: generateAccessToken(user._id.toString(), user.name),
                    data: { userId: user._id.toString() }
                })
            } else {
                res.status(409).json({
                    success: false,
                    message: 'EMAIL_ALREADY_PRESENT'
                })
            }
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    })
};

exports.logIn = async (req, res, next) => {
    const { email, password } = req.body;
    const findUser = async () => {
        const user = await User.find({ email: email.toLowerCase() })
        // console.log(user, "user!!!");
        if (user.length === 0) return null;
        else return user[0];
    }
    try {
        const exists = await findUser();
        if (!exists) {
            res.status(404).json({
                success: false,
                message: "User not found"
            })
        } else {
            bcrypt.compare(password, exists.password, (err, result) => {
                if (err) {
                    throw new Error('Something went wrong')
                }
                if (result === true) {
                    res.json({
                        success: true,
                        message: "User login successful",
                        token: generateAccessToken(exists._id.toString(), exists.name),
                        data: { userId: exists._id.toString() }
                    })
                } else {
                    res.status(401).json({
                        success: false,
                        message: "User not authorized (Incorrect Password)"
                    })
                }
            })
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

exports.getDetails = async (req, res, next) => {
    // Encode the Buffer to Base64
    const base64Data = req.user.picture.data.toString('base64');

    const picture = { data: base64Data, contentType: req.user.picture.contentType }

    res.status(200).json({ name: req.user.name, email: req.user.email, picture });
};