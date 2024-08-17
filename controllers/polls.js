const Polls = require('../models/polls');
const User = require('../models/user');
const { ObjectId } = require('mongodb');
const { Io } = require('../utils/socket');

exports.newPoll = async (req, res, next) => {
    try {
        const user = req.user;
        const { question, options } = req.body;
        const optionsArr = [];
        for (let i of options) {
            optionsArr.push({ value: i });
        }
        const poll = await Polls.create({ question, options: optionsArr, user: user._id });
        await user.polls.push(poll._id);
        await user.save();
        const newPoll = await Polls.findById(poll._id).lean();
        const options1 = newPoll.options.map(option => {
            return {
                ...option,
                voted: option.votes.some(vote => vote.toString() === user._id.toString()) ? true : false,
                votes: option.votes.length,
            };
        });
        for (let j of newPoll.comments) {
            const commentUser = await User.findById(j.mainComment.user);
            j.mainComment = { comment: j.mainComment.comment, userName: commentUser.name };
            j.reComments = await Promise.all(j.reComments.map(async item => { const reCommentUser = await User.findById(item.user); return { comment: item.comment, userName: reCommentUser.name } }));
        }
        const resPoll = { ...newPoll, options: options1, voted: options1.some(item => item.voted) }
        // console.log(resPoll);
        Io.getIo().emit("new_poll", { data: resPoll });
        Io.getIo().to(Io.getSockets().find(item => item.id === user._id.toString()).id).emit("new_poll_user", { data: resPoll });
        res.status(200).json({ success: true, message: "Polls created successfully" });
    } catch (err) {
        // console.log(err);
        res.status(500).json({ success: false, message: err });
    }
};

exports.getPolls = async (req, res, next) => {
    try {
        const user = req.user;
        const polls = await Polls.find().lean();
        for (let i of polls) {
            let voted = false;
            const arr = [];
            for (let j of i.options) {
                j = { ...j, voted: false };
                for (let k of j.votes) {
                    if (k.toString() === user._id.toString()) {
                        j = { ...j, voted: true }
                        voted = true;
                        break;
                    }
                }
                j.votes = j.votes.length;
                arr.push(j);
                // console.log(j);
            }
            i.options = arr;
            i.voted = voted;
            for (let j of i.comments) {
                const commentUser = await User.findById(j.mainComment.user);
                j.mainComment = { comment: j.mainComment.comment, userName: commentUser.name };
                j.reComments = await Promise.all(j.reComments.map(async item => { const reCommentUser = await User.findById(item.user); return { comment: item.comment, userName: reCommentUser.name } }));
            }
        }
        // console.log(polls[0].options[0]);
        res.status(200).json({ success: true, data: polls });
    } catch (err) {
        res.status(500).json({ success: false, message: err });
    }
}

exports.getUserPolls = async (req, res, next) => {
    try {
        const user = req.user;

        const polls = user.polls;

        const resPolls = await Promise.all(polls.map(async (pollId) => {
            const poll = await Polls.findById(pollId).lean();
            const options = poll.options.map(option => {
                return {
                    ...option,
                    voted: option.votes.some(vote => vote.toString() === user._id.toString()) ? true : false,
                    votes: option.votes.length,
                };
            });
            for (let j of poll.comments) {
                const commentUser = await User.findById(j.mainComment.user);
                j.mainComment = { comment: j.mainComment.comment, userName: commentUser.name };
                j.reComments = await Promise.all(j.reComments.map(async item => { const reCommentUser = await User.findById(item.user); return { comment: item.comment, userName: reCommentUser.name } }));
            }

            return {
                ...poll,
                options: options,
                voted: options.some(item => item.voted),
            };
        }));
        // console.log(resPolls);
        // console.log(polls[0].options[0]);
        res.status(200).json({ success: true, data: resPolls });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: err })
    }
};

exports.votePoll = async (req, res, next) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { optionId } = req.body;
        const poll = await Polls.findById(new ObjectId(id));
        const options = poll.options;
        for (let i of options) {
            for (let j of i.votes) {
                if (j.toString() === user._id.toString()) {
                    res.status(400).json({ success: false, message: "Already Voted" });
                    return;
                }
            }
        }
        const option = options.id(optionId);
        if (option) {
            option.votes.push(user._id);
        }
        await poll.save();
        // console.log(Io.getSockets());
        const sockets = Io.getSockets();
        for (let i of sockets) {
            try {
                // console.log(i);
                const resPoll = await Polls.findById(new ObjectId(id)).lean();
                const updatedOptions = resPoll.options.map((opt) => {
                    return {
                        ...opt,
                        voted: opt.votes.findIndex(item => item.toString() === i.id) !== -1 ? true : false,
                        votes: opt.votes.length,
                    };
                });

                resPoll.options = updatedOptions;
                resPoll.voted = updatedOptions.some(opt => opt.voted);
                // console.log(resPoll);
                Io.getIo().to(i.id).emit('update_poll_votes', { id, data: resPoll });
            } catch (err) {
                console.log(`Error emitting to socket ${i.id}: `, err);
            }
        }
        res.status(200).json({ success: true, message: "Vote successful" });
    } catch (err) {
        res.status(500).json({ success: false, message: err });
    }
};

exports.commentPoll = async (req, res, next) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { comment } = req.body;
        const poll = await Polls.findById(id);
        const pollUser = await User.findById(poll.user)
        const pollUserId = pollUser._id.toString();
        poll.comments.push({ mainComment: { comment, user: user._id } });
        await poll.save();
        const newPoll = await Polls.findById(id).lean();
        const newComment = newPoll.comments[poll.comments.length - 1];
        const commentUser = await User.findById(newComment.mainComment.user);
        newComment.mainComment = { comment: newComment.mainComment.comment, userName: commentUser.name };
        newComment.reComments = await Promise.all(newComment.reComments.map(async item => { const reCommentUser = await User.findById(item.user); return { comment: item.comment, userName: reCommentUser.name } }));
        // update comments on client
        Io.getIo().emit('new_comment', { pollId: id, data: newComment });
        Io.getIo().to(pollUserId).emit('new_comment_user', { pollId: id, data: newComment });
        res.status(200).json({ success: true, message: "Comment added successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: err })
    }
}

exports.commentComment = async (req, res, next) => {
    try {
        const user = req.user;
        const { id } = req.params;
        const { comment, commentId } = req.body;
        const poll = await Polls.findById(id);
        const pollUser = await User.findById(poll.user)
        const pollUserId = pollUser._id.toString();
        poll.comments.id(commentId).reComments.push({ comment, user: user._id });
        await poll.save();
        const newPoll = await Polls.findById(id).lean()
        const newComment = newPoll.comments[poll.comments.length - 1];
        const commentUser = await User.findById(newComment.mainComment.user);
        newComment.mainComment = { comment: newComment.mainComment.comment, userName: commentUser.name };
        newComment.reComments = await Promise.all(newComment.reComments.map(async item => { const reCommentUser = await User.findById(item.user); return { comment: item.comment, userName: reCommentUser.name } }));
        // update recomments on client
        Io.getIo().emit('new_comment', { pollId: id, data: newComment });
        Io.getIo().to(pollUserId).emit('new_comment_user', { pollId: id, data: newComment });
        res.status(200).json({ success: true, message: "Comment added successfully" })
    } catch (err) {
        res.status(500).json({ success: true, message: err })
    }
}